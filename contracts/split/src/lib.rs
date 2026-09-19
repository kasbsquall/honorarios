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

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Token,
    TaxReserve(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    InsufficientReserve = 2,
}

#[contractevent]
pub struct Paid {
    #[topic]
    pub freelancer: Address,
    pub payer: Address,
    pub gross: i128,
    pub net: i128,
    pub tax: i128,
    pub receipt_ref: String,
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
    /// `token` es el contrato SAC del USDC con el que se cobra.
    pub fn __constructor(env: Env, token: Address) {
        env.storage().instance().set(&DataKey::Token, &token);
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
        if gross <= 0 {
            return Err(Error::InvalidAmount);
        }

        let tax = gross * TAX_BPS / BPS_DENOMINATOR;
        let net = gross - tax;
        let client = token::Client::new(&env, &Self::token(env.clone()));

        client.transfer(&payer, &freelancer, &net);
        if tax > 0 {
            client.transfer(&payer, &env.current_contract_address(), &tax);
            let key = DataKey::TaxReserve(freelancer.clone());
            let reserve: i128 = env.storage().persistent().get(&key).unwrap_or(0);
            env.storage().persistent().set(&key, &(reserve + tax));
        }

        Paid { freelancer, payer, gross, net, tax, receipt_ref }.publish(&env);
        Ok(net)
    }

    pub fn tax_reserve(env: Env, freelancer: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TaxReserve(freelancer))
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
