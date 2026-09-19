#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, token::StellarAssetClient, Address, Env, IntoVal, String};

struct Setup {
    env: Env,
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

    let id = env.register(Honorarios, (sac.address(),));
    Setup {
        usdc: token::Client::new(&env, &sac.address()),
        contract: HonorariosClient::new(&env, &id),
        freelancer: Address::generate(&env),
        payer,
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

// --- Autorizacion: estas pruebas NO usan mock_all_auths, asi que la firma se exige de verdad.

fn setup_no_mock() -> Setup {
    let env = Env::default();
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let payer = Address::generate(&env);
    env.mock_all_auths();
    StellarAssetClient::new(&env, &sac.address()).mint(&payer, &1_000_0000000);
    let id = env.register(Honorarios, (sac.address(),));
    let s = Setup {
        usdc: token::Client::new(&env, &sac.address()),
        contract: HonorariosClient::new(&env, &id),
        freelancer: Address::generate(&env),
        payer,
        env,
    };
    s.contract
        .pay(&s.payer, &s.freelancer, &500_0000000, &String::from_str(&s.env, "E001-1"));
    s.env.set_auths(&[]); // a partir de aqui nadie tiene firma concedida
    s
}

#[test]
#[should_panic]
fn withdraw_requires_the_freelancer_signature() {
    let s = setup_no_mock();
    // Sin ninguna firma concedida, el require_auth del freelancer detiene la llamada.
    s.contract.withdraw_tax(&s.freelancer, &s.payer, &10_0000000);
}

#[test]
#[should_panic]
fn a_third_party_cannot_withdraw_someone_elses_reserve() {
    let s = setup_no_mock();
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
#[should_panic]
fn pay_requires_the_payer_signature() {
    let s = setup_no_mock();
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
    // 2026-09-19T00:00:00Z y 2026-10-01T00:00:00Z caen en meses distintos.
    assert_eq!(period_of(1_789_776_000), 2026 * 12 + 8);
    assert_eq!(period_of(1_790_812_800), 2026 * 12 + 9);
}
