# Honorarios

Cobra a clientes del exterior en USDC sobre Stellar y separa automáticamente la reserva para tu pago a cuenta de cuarta categoría (SUNAT, Perú).

Proyecto para la hackathon Stellar Odyssey Perú (19 al 26 de septiembre de 2026). Todo el código se escribió durante el evento.

## Problema

Un freelancer peruano que cobra a clientes del exterior no tiene agente de retención. Si en el mes cobra más de S/ 4,010 le toca hacer por su cuenta el pago a cuenta del 8% (R.S. 000390-2025/SUNAT), y lo normal es que ese dinero ya se haya gastado cuando llega la fecha.

## Solución

Un contrato Soroban recibe cada cobro en USDC y lo reparte en el mismo momento: 92% va a la wallet del freelancer y 8% queda reservado a su nombre. Solo el freelancer puede retirar esa reserva. Cada pago emite un evento con la referencia del recibo por honorarios.

## Evidencia on-chain (testnet)

- Contrato: [`CAJAMA32YRPYHG5ZT2WDIRLRLPBTCKOXGOJNHIQ3IEMDUDXHGNYGBXSG`](https://lab.stellar.org/r/testnet/contract/CAJAMA32YRPYHG5ZT2WDIRLRLPBTCKOXGOJNHIQ3IEMDUDXHGNYGBXSG)
- Cobro de 500 USDC desde el link de pago (460 neto, 40 reserva): [`261cfebe…83e9`](https://stellar.expert/explorer/testnet/tx/261cfebeb681d143338f855bbfc10833b249ee0289aa15fe035305ec250583e9)
- USDC testnet (Circle): `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`

- Smart wallet con passkey (OpenZeppelin, vía smart-account-kit): [`CBNKXPVM…XHUP`](https://stellar.expert/explorer/testnet/contract/CBNKXPVM3XT5OJJSP6AQKIOYYKECMCGJEZLGB4LZB2XJ35AHWSUXXHUP)
  - Cobro de 200 USDC hacia la smart wallet: [`f93ea435…e0e6`](https://stellar.expert/explorer/testnet/tx/f93ea435cd96e2e344973fd4e16fc44041eacb0a2a0f79e33d383ff59a9ae0e6)
  - Retiro de la reserva firmado con passkey, comisión pagada por el relayer: [`417f8def…2a2b`](https://stellar.expert/explorer/testnet/tx/417f8defb56b14054d22ae63a45d711a60189d3227d69eb67be0c310492c2a2b)

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

## Arquitectura

Diagramas de componentes, flujo de cobro y retiro: [docs/arquitectura.md](docs/arquitectura.md)

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
