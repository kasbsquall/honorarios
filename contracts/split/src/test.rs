#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, token::StellarAssetClient, Address, Env, IntoVal, String};

struct Setup {
    env: Env,
    fee_to: Address,
    usdc: token::Client<'static>,
    contract: HonorariosClient<'static>,
    payer: Address,
    freelancer: Address,
}

fn setup() -> Setup {
    let env = Env::default();
    env.mock_all_auths();
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let payer = Address::generate(&env);
    StellarAssetClient::new(&env, &sac.address()).mint(&payer, &1_000_0000000);

    let fee_to = Address::generate(&env);
    let id = env.register(Honorarios, (sac.address(), 0i128, fee_to.clone()));
    Setup {
        usdc: token::Client::new(&env, &sac.address()),
        contract: HonorariosClient::new(&env, &id),
        freelancer: Address::generate(&env),
        payer,
        fee_to,
        env,
    }
}

/// Mismo montaje, con la comision del servicio activada.
fn setup_with_fee(fee_bps: i128) -> Setup {
    let env = Env::default();
    env.mock_all_auths();
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let payer = Address::generate(&env);
    StellarAssetClient::new(&env, &sac.address()).mint(&payer, &1_000_0000000);
    let fee_to = Address::generate(&env);
    let id = env.register(Honorarios, (sac.address(), fee_bps, fee_to.clone()));
    Setup {
        usdc: token::Client::new(&env, &sac.address()),
        contract: HonorariosClient::new(&env, &id),
        freelancer: Address::generate(&env),
        payer,
        fee_to,
        env,
    }
}

#[test]
fn pay_splits_net_and_tax_reserve() {
    let s = setup();
    let receipt = String::from_str(&s.env, "E001-12");

    let net = s.contract.pay(&s.payer, &s.freelancer, &500_0000000, &receipt);

    assert_eq!(net, 460_0000000);
    assert_eq!(s.usdc.balance(&s.freelancer), 460_0000000);
    assert_eq!(s.usdc.balance(&s.contract.address), 40_0000000);
    assert_eq!(s.contract.tax_reserve(&s.freelancer), 40_0000000);
    assert_eq!(s.usdc.balance(&s.payer), 500_0000000);
}

#[test]
fn reserve_accumulates_across_payments() {
    let s = setup();
    let receipt = String::from_str(&s.env, "E001-13");

    s.contract.pay(&s.payer, &s.freelancer, &100_0000000, &receipt);
    s.contract.pay(&s.payer, &s.freelancer, &200_0000000, &receipt);

    assert_eq!(s.contract.tax_reserve(&s.freelancer), 24_0000000);
}

#[test]
fn rejects_non_positive_amount() {
    let s = setup();
    let receipt = String::from_str(&s.env, "E001-14");

    let result = s.contract.try_pay(&s.payer, &s.freelancer, &0, &receipt);

    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn freelancer_withdraws_reserve() {
    let s = setup();
    let sunat = Address::generate(&s.env);
    s.contract
        .pay(&s.payer, &s.freelancer, &500_0000000, &String::from_str(&s.env, "E001-15"));

    s.contract.withdraw_tax(&s.freelancer, &sunat, &30_0000000);

    assert_eq!(s.usdc.balance(&sunat), 30_0000000);
    assert_eq!(s.contract.tax_reserve(&s.freelancer), 10_0000000);
}

#[test]
fn cannot_withdraw_more_than_reserve() {
    let s = setup();
    let sunat = Address::generate(&s.env);

    let result = s.contract.try_withdraw_tax(&s.freelancer, &sunat, &1);

    assert_eq!(result, Err(Ok(Error::InsufficientReserve)));
}

#[test]
fn rejects_payer_as_freelancer() {
    let s = setup();
    let receipt = String::from_str(&s.env, "E001-16");

    let result = s.contract.try_pay(&s.payer, &s.payer, &100_0000000, &receipt);

    assert_eq!(result, Err(Ok(Error::InvalidParty)));
}

#[test]
fn rejects_contract_as_freelancer() {
    let s = setup();
    let receipt = String::from_str(&s.env, "E001-17");

    let result = s.contract.try_pay(&s.payer, &s.contract.address, &100_0000000, &receipt);

    assert_eq!(result, Err(Ok(Error::InvalidParty)));
}

#[test]
fn rejects_long_receipt_ref() {
    let s = setup();
    let long = String::from_str(&s.env, "E001-000000000000000000000000000001");

    let result = s.contract.try_pay(&s.payer, &s.freelancer, &100_0000000, &long);

    assert_eq!(result, Err(Ok(Error::ReceiptRefTooLong)));
}

#[test]
fn pay_extends_reserve_ttl() {
    use soroban_sdk::testutils::storage::Persistent as _;
    let s = setup();
    s.contract.pay(&s.payer, &s.freelancer, &100_0000000, &String::from_str(&s.env, "E001-18"));

    let ttl = s.env.as_contract(&s.contract.address, || {
        s.env.storage().persistent().get_ttl(&DataKey::TaxReserve(s.freelancer.clone()))
    });

    assert!(ttl >= TTL_THRESHOLD);
}

// --- Autorizacion: aqui la firma se exige de verdad.
// set_auths(&[]) deja el entorno en modo estricto con cero firmas concedidas, asi que
// require_auth falla con Auth(InvalidAction). Las pruebas fijan ese error con `expected`:
// si el panico viniera de otra cosa, no pasarian.

fn setup_enforcing_auth() -> Setup {
    let env = Env::default();
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let payer = Address::generate(&env);
    env.mock_all_auths();
    StellarAssetClient::new(&env, &sac.address()).mint(&payer, &1_000_0000000);
    let fee_to = Address::generate(&env);
    let id = env.register(Honorarios, (sac.address(), 0i128, fee_to.clone()));
    let s = Setup {
        usdc: token::Client::new(&env, &sac.address()),
        contract: HonorariosClient::new(&env, &id),
        freelancer: Address::generate(&env),
        payer,
        fee_to,
        env,
    };
    s.contract
        .pay(&s.payer, &s.freelancer, &500_0000000, &String::from_str(&s.env, "E001-1"));
    s.env.set_auths(&[]); // a partir de aqui nadie tiene firma concedida
    s
}

#[test]
#[should_panic(expected = "InvalidAction")]
fn withdraw_requires_the_freelancer_signature() {
    let s = setup_enforcing_auth();
    // Sin ninguna firma concedida, el require_auth del freelancer detiene la llamada.
    s.contract.withdraw_tax(&s.freelancer, &s.payer, &10_0000000);
}

#[test]
#[should_panic(expected = "InvalidAction")]
fn a_third_party_cannot_withdraw_someone_elses_reserve() {
    let s = setup_enforcing_auth();
    let intruso = Address::generate(&s.env);
    // El intruso firma por si mismo, pero la reserva es del freelancer.
    s.env.mock_auths(&[soroban_sdk::testutils::MockAuth {
        address: &intruso,
        invoke: &soroban_sdk::testutils::MockAuthInvoke {
            contract: &s.contract.address,
            fn_name: "withdraw_tax",
            args: (s.freelancer.clone(), intruso.clone(), 10_0000000i128).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    s.contract.withdraw_tax(&s.freelancer, &intruso, &10_0000000);
}

#[test]
#[should_panic(expected = "InvalidAction")]
fn pay_requires_the_payer_signature() {
    let s = setup_enforcing_auth();
    s.contract
        .pay(&s.payer, &s.freelancer, &100_0000000, &String::from_str(&s.env, "E001-2"));
}

#[test]
fn month_gross_accumulates_and_separates_periods() {
    let s = setup();
    let period = s.contract.current_period();
    s.contract
        .pay(&s.payer, &s.freelancer, &300_0000000, &String::from_str(&s.env, "E001-3"));
    s.contract
        .pay(&s.payer, &s.freelancer, &200_0000000, &String::from_str(&s.env, "E001-4"));

    assert_eq!(s.contract.month_gross(&s.freelancer, &period), 500_0000000);
    assert_eq!(s.contract.month_gross(&s.freelancer, &(period + 1)), 0);
}

#[test]
fn period_of_maps_known_dates() {
    // 2026-09-19T00:00:00Z es el 18 de setiembre por la noche en Lima: setiembre.
    assert_eq!(period_of(1_789_776_000), 2026 * 12 + 8);
    // 2026-10-01T05:00:00Z es la medianoche del 1 de octubre en Lima: octubre.
    assert_eq!(period_of(1_790_830_800), 2026 * 12 + 9);
}

#[test]
fn the_month_closes_at_midnight_in_lima() {
    // 2026-10-01T00:00:00Z son las 19:00 del 30 de setiembre en Lima. Ese cobro
    // pertenece a setiembre, que es el mes que SUNAT mide.
    assert_eq!(period_of(1_790_812_800), 2026 * 12 + 8);
    // Cinco horas mas tarde ya es octubre en Lima.
    assert_eq!(period_of(1_790_812_800 + 5 * 3_600), 2026 * 12 + 9);
}

#[test]
fn the_contract_never_owes_more_than_it_holds() {
    let s = setup();
    let otro = Address::generate(&s.env);
    s.contract
        .pay(&s.payer, &s.freelancer, &500_0000000, &String::from_str(&s.env, "E001-8"));
    s.contract
        .pay(&s.payer, &otro, &250_0000000, &String::from_str(&s.env, "E001-9"));
    s.contract.withdraw_tax(&s.freelancer, &s.payer, &10_0000000);

    // Invariante de custodia: lo reservado a nombre de todos cabe en el balance del contrato.
    let reservado = s.contract.tax_reserve(&s.freelancer) + s.contract.tax_reserve(&otro);
    assert!(reservado <= s.usdc.balance(&s.contract.address));
}

#[test]
fn the_reserve_rounds_up() {
    let s = setup();
    // 9 unidades: el 8% exacto es 0.72 y el contrato aparta 1, nunca menos de lo debido.
    s.contract.pay(&s.payer, &s.freelancer, &9, &String::from_str(&s.env, "E001-10"));

    assert_eq!(s.contract.tax_reserve(&s.freelancer), 1);
    assert_eq!(s.usdc.balance(&s.freelancer), 8);
}

#[test]
fn rejects_amounts_that_would_overflow_the_tax() {
    let s = setup();
    let r = s.contract.try_pay(
        &s.payer,
        &s.freelancer,
        &(MAX_GROSS + 1),
        &String::from_str(&s.env, "E001-11"),
    );

    assert_eq!(r, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn extend_reserve_renews_the_ttl_without_moving_funds() {
    use soroban_sdk::testutils::storage::Persistent as _;
    let s = setup();
    s.contract
        .pay(&s.payer, &s.freelancer, &500_0000000, &String::from_str(&s.env, "E001-12"));
    let antes = s.contract.tax_reserve(&s.freelancer);

    s.contract.extend_reserve(&s.freelancer);

    let ttl = s.env.as_contract(&s.contract.address, || {
        s.env.storage().persistent().get_ttl(&DataKey::TaxReserve(s.freelancer.clone()))
    });
    assert!(ttl >= TTL_THRESHOLD);
    assert_eq!(s.contract.tax_reserve(&s.freelancer), antes);
}

#[test]
fn without_fee_the_whole_gross_stays_with_the_freelancer() {
    let s = setup();
    s.contract
        .pay(&s.payer, &s.freelancer, &500_0000000, &String::from_str(&s.env, "E001-13"));

    // 460 en su wallet y 40 reservados a su nombre: el contrato no se queda nada.
    assert_eq!(s.usdc.balance(&s.freelancer), 460_0000000);
    assert_eq!(s.contract.tax_reserve(&s.freelancer), 40_0000000);
    assert_eq!(s.usdc.balance(&s.fee_to), 0);
}

#[test]
fn the_service_fee_comes_out_of_the_gross() {
    // 50 puntos basicos: 0.5% de 500 USDC son 2.50.
    let s = setup_with_fee(50);
    s.contract
        .pay(&s.payer, &s.freelancer, &500_0000000, &String::from_str(&s.env, "E001-14"));

    assert_eq!(s.usdc.balance(&s.fee_to), 2_5000000);
    assert_eq!(s.contract.tax_reserve(&s.freelancer), 40_0000000);
    assert_eq!(s.usdc.balance(&s.freelancer), 457_5000000);
    // El bruto sigue cuadrando: neto + reserva + comision.
    assert_eq!(457_5000000i128 + 40_0000000 + 2_5000000, 500_0000000);
}

#[test]
fn the_tax_reserve_is_never_touched_by_the_fee() {
    let s = setup_with_fee(MAX_FEE_BPS);
    s.contract
        .pay(&s.payer, &s.freelancer, &500_0000000, &String::from_str(&s.env, "E001-15"));

    // Aun con la comision al tope, la reserva sigue siendo el 8% del bruto.
    assert_eq!(s.contract.tax_reserve(&s.freelancer), 40_0000000);
    assert_eq!(s.contract.month_gross(&s.freelancer, &s.contract.current_period()), 500_0000000);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn rejects_a_fee_above_the_cap() {
    // El constructor rechaza una comision mayor al tope, asi que ese contrato no existe.
    let env = Env::default();
    env.mock_all_auths();
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let fee_to = Address::generate(&env);

    env.register(Honorarios, (sac.address(), MAX_FEE_BPS + 1, fee_to));
}
