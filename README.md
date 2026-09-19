<p><img src="brand/logo-1024-claro.png" width="72" alt="Honorarios"></p>

# Honorarios

Cobra a clientes del exterior en USDC sobre Stellar y separa automáticamente la reserva para tu pago a cuenta de cuarta categoría (SUNAT, Perú).

**App:** https://honorarios-pe.vercel.app · **Red:** Stellar testnet · **Track:** Real-World Assets & Compliant Rails

Proyecto para la hackathon Stellar Odyssey Perú (19 al 26 de septiembre de 2026). Todo el código se escribió durante el evento.

## Problema

Un freelancer peruano que cobra a clientes del exterior no tiene agente de retención. Si en el mes cobra más de S/ 4,010, le toca hacer por su cuenta el pago a cuenta del 8% (R.S. 000390-2025/SUNAT). Lo común es que cuando llega la fecha ese dinero ya se gastó, porque llegó mezclado con el resto del cobro.

## Solución

Un contrato Soroban recibe cada cobro en USDC y lo reparte en el mismo momento: el 92% va a la wallet del freelancer y el 8% queda reservado a su nombre dentro del contrato. Solo el freelancer puede retirar esa reserva, por ejemplo para pagar a SUNAT.

1. El freelancer crea su wallet con una passkey (huella o Face ID). No hay frase semilla y no paga comisiones.
2. Genera un link de cobro con monto, N° de recibo y concepto, y se lo envía a su cliente.
3. El cliente paga con Freighter. Si no tiene USDC, la app lo compra con XLM mediante un path payment.
4. El contrato reparte 92/8 y emite un evento `Paid` con la referencia del recibo.
5. El panel muestra la reserva, cuánto falta para el umbral mensual de S/ 4,010 y un borrador del recibo por honorarios listo para copiar en SUNAT.

## Cómo usa Stellar

| Pieza | Para qué |
|---|---|
| **Soroban** (contrato `split`) | Reparto 92/8, reserva por freelancer, autorización del retiro, eventos `Paid` y `TaxWithdrawn` |
| **USDC de Circle** vía Stellar Asset Contract | Moneda del cobro |
| **Path payments** (`path_payment_strict_receive`) | El cliente paga aunque solo tenga XLM |
| **Smart accounts de OpenZeppelin + passkeys** (secp256r1, `smart-account-kit`) | Wallet del freelancer sin frase semilla |
| **Relayer de SDF** (OpenZeppelin Channels) | Patrocina las comisiones de la smart wallet |
| **RPC `getEvents`** | El panel reconstruye los cobros desde la cadena, sin base de datos |

## Evidencia on-chain (testnet)

| Qué | Enlace |
|---|---|
| Contrato | [`CAJAMA32…BXSG`](https://stellar.expert/explorer/testnet/contract/CAJAMA32YRPYHG5ZT2WDIRLRLPBTCKOXGOJNHIQ3IEMDUDXHGNYGBXSG) |
| Cobro de 500 USDC desde el link de pago (460 neto, 40 reserva) | [`261cfebe…83e9`](https://stellar.expert/explorer/testnet/tx/261cfebeb681d143338f855bbfc10833b249ee0289aa15fe035305ec250583e9) |
| Smart wallet con passkey | [`CBNKXPVM…XHUP`](https://stellar.expert/explorer/testnet/contract/CBNKXPVM3XT5OJJSP6AQKIOYYKECMCGJEZLGB4LZB2XJ35AHWSUXXHUP) |
| Cobro de 200 USDC a la smart wallet | [`f93ea435…e0e6`](https://stellar.expert/explorer/testnet/tx/f93ea435cd96e2e344973fd4e16fc44041eacb0a2a0f79e33d383ff59a9ae0e6) |
| Retiro de la reserva firmado con passkey | [`417f8def…2a2b`](https://stellar.expert/explorer/testnet/tx/417f8defb56b14054d22ae63a45d711a60189d3227d69eb67be0c310492c2a2b) |

USDC testnet (Circle): `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.

## Arquitectura

Diagramas de componentes, flujo de cobro y retiro: [docs/arquitectura.md](docs/arquitectura.md).

```
contracts/split/   contrato Soroban (Rust) y sus 9 tests
web/               frontend (Vite + TypeScript): pay.html y panel
web/e2e/           pruebas E2E en testnet con Playwright
design/            tres propuestas de identidad visual
docs/              arquitectura y bitácora de decisiones
```

## Contrato

| Función | Autoriza | Qué hace |
|---|---|---|
| `pay(payer, freelancer, gross, receipt_ref)` | `payer` | Neto al freelancer, 8% al contrato, evento `Paid` |
| `tax_reserve(freelancer)` | lectura | Saldo reservado |
| `withdraw_tax(freelancer, to, amount)` | `freelancer` | Mueve la reserva, evento `TaxWithdrawn` |

Rechaza montos ≤ 0, retiros mayores a la reserva, pagos donde el freelancer es el pagador o el propio contrato, y N° de recibo de más de 32 caracteres. La reserva renueva su TTL en cada operación.

## Ejecutar

Contrato:

```sh
rustup target add wasm32v1-none
cargo test
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/split.wasm \
  --source-account <cuenta> --network testnet -- --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
```

Frontend:

```sh
cd web && npm install && npm run dev
```

Pruebas E2E en testnet. Usan un firmante de desarrollo que solo existe con `npm run dev` y lee llaves de testnet desde `web/.env.development.local` (fuera del repo):

```sh
node web/e2e/record.mjs    # cobro con Freighter
node web/e2e/passkey.mjs   # passkey con autenticador WebAuthn virtual
```

## Trabajo hecho durante el evento

Todo el repositorio. El historial de commits empieza el 19 de septiembre de 2026 y [docs/bitacora.md](docs/bitacora.md) registra cada decisión con su fuente: elección del proyecto, tasa y umbral tributario, liquidez de USDC en testnet, passkeys, revisión de seguridad y redespliegue del contrato.

## Límites conocidos

- Solo testnet. `smart-account-kit` y el relayer no tienen auditoría independiente, según su propio README.
- No encontramos una norma de SUNAT específica para honorarios cobrados en cripto. El tipo de cambio para medir el umbral lo ingresa el freelancer y la app no lo fija.
- La app no emite comprobantes: arma un borrador para copiar en SUNAT Operaciones en Línea.
- La reserva es una ayuda de organización y no reemplaza la asesoría de un contador.

## Licencia

[MIT](LICENSE)
