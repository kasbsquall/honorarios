# Honorarios

Cobra a clientes del exterior en USDC sobre Stellar y separa automáticamente la reserva para tu pago a cuenta de cuarta categoría (SUNAT, Perú).

Proyecto para la hackathon Stellar Odyssey Perú (19 al 26 de septiembre de 2026). Todo el código se escribió durante el evento.

## Problema

Un freelancer peruano que cobra a clientes del exterior no tiene agente de retención. Si en el mes cobra más de S/ 4,010 le toca hacer por su cuenta el pago a cuenta del 8% (R.S. 000390-2025/SUNAT), y lo normal es que ese dinero ya se haya gastado cuando llega la fecha.

## Solución

Un contrato Soroban recibe cada cobro en USDC y lo reparte en el mismo momento: 92% va a la wallet del freelancer y 8% queda reservado a su nombre. Solo el freelancer puede retirar esa reserva. Cada pago emite un evento con la referencia del recibo por honorarios.

## Evidencia on-chain (testnet)

- Contrato: [`CCYLKLKCXUOO2XSVC7O7HAIOT4CRYBZIS4NBOJATMGL4JOV3DRYUDLD5`](https://lab.stellar.org/r/testnet/contract/CCYLKLKCXUOO2XSVC7O7HAIOT4CRYBZIS4NBOJATMGL4JOV3DRYUDLD5)
- Pago de prueba de 10 USDC (9.2 neto, 0.8 reserva): [`44edbc20…01b5`](https://stellar.expert/explorer/testnet/tx/44edbc20936b141e8b6a343b6a4c4e3db6e891f503b23bd139f7422a151401b5)
- USDC testnet (Circle): `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`

- Smart wallet con passkey (OpenZeppelin, vía smart-account-kit): [`CCYPK3R3…EYO3`](https://stellar.expert/explorer/testnet/contract/CCYPK3R3RARYHSKZBZGMM4434JTNHTF4W7G5ZKXDCPAGKI7ZD375EYO3)
  - Cobro de 200 USDC hacia la smart wallet: [`037b846d…afaf`](https://stellar.expert/explorer/testnet/tx/037b846d8ef93c2f5143a7ba028952a39537b5f258e039928dff0d646d6fafaf)
  - Retiro de la reserva firmado con passkey, comisión pagada por el relayer: [`fd5a33d5…165d`](https://stellar.expert/explorer/testnet/tx/fd5a33d5537bef9a1b317b14914a73923afb222fe495f0c67d22a5d504f8165d)

## Frontend (`web/`)

- `pay.html`: link de pago para el cliente extranjero (Freighter). Si no tiene USDC, lo compra con XLM por path payment y luego llama a `pay`.
- `index.html`: panel del freelancer. Crea una smart wallet con passkey (sin frase semilla, comisiones patrocinadas por el relayer de SDF en testnet) o conecta Freighter. Muestra la reserva, el umbral mensual de S/ 4,010, los cobros leídos de los eventos `Paid` y permite retirar la reserva.

```sh
cd web && npm install && npm run dev
```

Pruebas E2E en testnet (requieren `web/.env.local` con llaves de prueba, ver `web/e2e/`):

```sh
node web/e2e/record.mjs    # cobro con Freighter (firmante de desarrollo)
node web/e2e/passkey.mjs   # passkey con autenticador WebAuthn virtual
```

## Contrato

`contracts/split/src/lib.rs`

| Función | Qué hace |
|---|---|
| `pay(payer, freelancer, gross, receipt_ref)` | Transfiere el neto al freelancer y retiene el 8% |
| `tax_reserve(freelancer)` | Saldo reservado del freelancer |
| `withdraw_tax(freelancer, to, amount)` | El freelancer mueve su reserva |

## Ejecutar

```sh
rustup target add wasm32v1-none
cargo test
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/split.wasm \
  --source-account <cuenta> --network testnet -- --token <SAC_USDC>
```

## Aviso

La reserva es una ayuda de organización y no reemplaza la asesoría de un contador.
