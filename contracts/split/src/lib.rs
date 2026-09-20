#![no_std]
//! Honorarios: reparte cada cobro de un freelancer peruano en neto y reserva
//! para el pago a cuenta de cuarta categoria (8%, ver docs).
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
    String,
};

/// 8% expresado en puntos basicos. Tasa del pago a cuenta de cuarta categoria.
pub const TAX_BPS: i128 = 800;
const BPS_DENOMINATOR: i128 = 10_000;
/// Tope de la comision del servicio: 1%. El contrato no puede cobrar mas que esto,
/// y el valor real se fija al desplegar. Durante la hackathon se despliega en 0.
pub const MAX_FEE_BPS: i128 = 100;
/// Largo maximo del N de recibo (ej. "E001-12345").
pub const MAX_REF_LEN: u32 = 32;
// ~5 s por ledger: la reserva y la instancia se renuevan a ~30 dias cuando les quedan menos de ~7.
const DAY_LEDGERS: u32 = 17_280;
const TTL_THRESHOLD: u32 = 7 * DAY_LEDGERS;
const TTL_EXTEND_TO: u32 = 30 * DAY_LEDGERS;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Token,
    /// Comision del servicio en puntos basicos y wallet que la recibe.
    Fee,
    TaxReserve(Address),
    /// Bruto cobrado por un freelancer en un periodo (mes) determinado.
    MonthGross(Address, u32),
}

/// Huso horario de Peru: el mes tributario cierra a medianoche de Lima, no en UTC.
const PERU_UTC_OFFSET: u64 = 5 * 3_600;
/// Monto maximo por cobro. Deja margen de sobra sobre cualquier honorario real y
/// evita que la multiplicacion del 8% desborde en i128.
pub const MAX_GROSS: i128 = i128::MAX / BPS_DENOMINATOR;

/// Periodo tributario del ledger actual: anio * 12 + (mes - 1), en hora de Peru.
/// El umbral mensual de SUNAT se mide sobre lo percibido en el mes, asi que el
/// acumulado vive en el contrato y no depende de cuantos eventos guarde el RPC.
pub fn period_of(timestamp: u64) -> u32 {
    // Algoritmo civil_from_days de Howard Hinnant, con la era desplazada a 0000-03-01.
    let z = (timestamp.saturating_sub(PERU_UTC_OFFSET) / 86_400) as i64 + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y as u32) * 12 + (m as u32 - 1)
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    InsufficientReserve = 2,
    /// El freelancer no puede ser el pagador ni el propio contrato.
    InvalidParty = 3,
    ReceiptRefTooLong = 4,
    /// La comision supera MAX_FEE_BPS.
    FeeTooHigh = 5,
}

fn keep_alive(env: &Env, key: &DataKey) {
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    env.storage().persistent().extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

#[contractevent]
pub struct Paid {
    #[topic]
    pub freelancer: Address,
    pub payer: Address,
    pub gross: i128,
    pub net: i128,
    pub tax: i128,
    /// Comision del servicio cobrada en este pago. Cero mientras no se active.
    pub fee: i128,
    pub receipt_ref: String,
    /// Periodo tributario del cobro (anio * 12 + mes - 1).
    pub period: u32,
}

#[contractevent]
pub struct TaxWithdrawn {
    #[topic]
    pub freelancer: Address,
    pub to: Address,
    pub amount: i128,
}

#[contract]
pub struct Honorarios;

#[contractimpl]
impl Honorarios {
    /// `token` es el contrato SAC del USDC con el que se cobra. `fee_bps` es la
    /// comision del servicio, que se descuenta del bruto y llega a `fee_to`. Queda
    /// fija en el despliegue: nadie puede subirla despues.
    pub fn __constructor(env: Env, token: Address, fee_bps: i128, fee_to: Address) -> Result<(), Error> {
        if fee_bps < 0 || fee_bps > MAX_FEE_BPS {
            return Err(Error::FeeTooHigh);
        }
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Fee, &(fee_bps, fee_to));
        Ok(())
    }

    /// Comision del servicio: puntos basicos y wallet que la recibe.
    pub fn fee(env: Env) -> (i128, Address) {
        env.storage().instance().get(&DataKey::Fee).unwrap()
    }

    pub fn token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }

    /// El cliente paga `gross` al freelancer. El neto llega directo a su
    /// wallet y la reserva queda en el contrato a su nombre.
    pub fn pay(
        env: Env,
        payer: Address,
        freelancer: Address,
        gross: i128,
        receipt_ref: String,
    ) -> Result<i128, Error> {
        payer.require_auth();
        if gross <= 0 || gross > MAX_GROSS {
            return Err(Error::InvalidAmount);
        }
        if freelancer == payer || freelancer == env.current_contract_address() {
            return Err(Error::InvalidParty);
        }
        if receipt_ref.len() > MAX_REF_LEN {
            return Err(Error::ReceiptRefTooLong);
        }

        let period = period_of(env.ledger().timestamp());
        let month_key = DataKey::MonthGross(freelancer.clone(), period);
        let month: i128 = env.storage().persistent().get(&month_key).unwrap_or(0);
        env.storage().persistent().set(&month_key, &(month + gross));
        keep_alive(&env, &month_key);

        // Redondeo hacia arriba: ante un centavo de duda, que sobre en la reserva.
        let tax = (gross * TAX_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
        // La comision se trunca hacia abajo: la duda nunca cae del lado del servicio.
        let (fee_bps, fee_to) = Self::fee(env.clone());
        let fee = gross * fee_bps / BPS_DENOMINATOR;
        let net = gross - tax - fee;
        let client = token::Client::new(&env, &Self::token(env.clone()));

        client.transfer(&payer, &freelancer, &net);
        if fee > 0 {
            client.transfer(&payer, &fee_to, &fee);
        }
        if tax > 0 {
            client.transfer(&payer, &env.current_contract_address(), &tax);
            let key = DataKey::TaxReserve(freelancer.clone());
            let reserve: i128 = env.storage().persistent().get(&key).unwrap_or(0);
            env.storage().persistent().set(&key, &(reserve + tax));
            keep_alive(&env, &key);
        }

        Paid { freelancer, payer, gross, net, tax, fee, receipt_ref, period }.publish(&env);
        Ok(net)
    }

    pub fn tax_reserve(env: Env, freelancer: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TaxReserve(freelancer))
            .unwrap_or(0)
    }

    /// Renueva el TTL de la reserva sin mover fondos. Cualquiera puede llamarla:
    /// solo evita que una reserva inactiva quede archivada y haya que restaurarla.
    pub fn extend_reserve(env: Env, freelancer: Address) {
        keep_alive(&env, &DataKey::TaxReserve(freelancer));
    }

    /// Periodo tributario del ledger actual, para consultar el acumulado del mes.
    pub fn current_period(env: Env) -> u32 {
        period_of(env.ledger().timestamp())
    }

    /// Bruto cobrado por el freelancer en ese periodo. Es el numero que se compara
    /// contra el umbral mensual de SUNAT.
    pub fn month_gross(env: Env, freelancer: Address, period: u32) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::MonthGross(freelancer, period))
            .unwrap_or(0)
    }

    /// Solo el freelancer mueve su reserva, por ejemplo para pagar a SUNAT.
    pub fn withdraw_tax(
        env: Env,
        freelancer: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), Error> {
        freelancer.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let key = DataKey::TaxReserve(freelancer.clone());
        let reserve: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if amount > reserve {
            return Err(Error::InsufficientReserve);
        }

        env.storage().persistent().set(&key, &(reserve - amount));
        keep_alive(&env, &key);
        token::Client::new(&env, &Self::token(env.clone())).transfer(
            &env.current_contract_address(),
            &to,
            &amount,
        );

        TaxWithdrawn { freelancer, to, amount }.publish(&env);
        Ok(())
    }
}

mod test;
