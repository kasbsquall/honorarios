# Bitácora de decisiones · Honorarios (Stellar Odyssey Perú)

Append-only. Cada entrada con su fuente.

## 2026-09-19

- **Proyecto elegido: Honorarios Sin Fronteras.** Freelancer peruano cobra a cliente extranjero en USDC; el contrato separa neto y reserva de impuesto. Salió primero (78.5/100) en un panel de jurado simulado con la rúbrica oficial (bases: funcionalidad 30, Stellar 25, originalidad 20, viabilidad 15, docs 10). Factoring tokenizado y API RUC x402 descartados por competencia existente (≥5 repos de invoice factoring en Soroban; RUC por x402 ya existe en Base).
- **Reserva de 8%.** Tasa del pago a cuenta de cuarta categoría. Umbral 2026 sin pago a cuenta: S/ 4,010 mensuales (R.S. 000390-2025/SUNAT, fuente secundaria lpderecho.pe). Pendiente: norma específica para cobros en cripto (no encontrada), código de documento para cliente no domiciliado en el RHE.
- **USDC testnet:** issuer Circle `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` (developers.circle.com). SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`. Path payment XLM→USDC funciona por pool de terceros. Próximo reset de testnet: 16 dic 2026.
- **Passkeys:** usar `smart-account-kit` + OpenZeppelin Channels (passkey-kit archivado jul 2026, Launchtube retirado). Requiere `@stellar/stellar-sdk` 16.3.x.
- **Contrato desplegado:** `CCYLKLKCXUOO2XSVC7O7HAIOT4CRYBZIS4NBOJATMGL4JOV3DRYUDLD5` (stellar-cli 28, soroban-sdk 27). Pago de prueba 10 USDC → 9.2 neto + 0.8 reserva, receipt_ref E001-1: tx `44edbc20936b141e8b6a343b6a4c4e3db6e891f503b23bd139f7422a151401b5`.

## Abierto
- Checkpoint obligatorio 23 sept 23:59: diagrama de flujo + repo público.
- Frontend: link de pago con Freighter + path payment; wallet passkey del freelancer; borrador de RHE; alerta de umbral S/ 4,010.

## 2026-09-19 (tarde)

- **Dirección visual:** sistema "Precisión suiza" (Archivo + IBM Plex Mono, bermellón #D2461E) con la tarjeta talón de la propuesta editorial. Elección del usuario. Propuestas en `design/`.
- **Frontend** en `web/` (Vite + TS). Prueba E2E con firmante de desarrollo: pago de 500 USDC, tx `c2584bac…987f`.
- **Eventos:** el RPC de testnet recorre ~10k ledgers por consulta; se lee por tramos desde el ledger de despliegue (4,762,900).
- **Passkey:** `smart-account-kit` 0.8.0 con los contratos OZ de testnet y el relayer público de SDF (`demo/.env.example` del repo stellar/smart-account-kit). Smart wallet `CCYPK3R3…EYO3`; retiro con passkey tx `fd5a33d5…165d`. El kit no está auditado (lo dice su README).
- Pendiente: borrador de recibo por honorarios, diagrama del checkpoint, prueba manual con Freighter real, modo oscuro sin verificar.

## 2026-09-19 (noche)

- **Revisión de seguridad** (agente security-reviewer). Aplicado: TTL de reserva e instancia (~30 días, umbral 7), `InvalidParty` (freelancer == payer o == contrato), `ReceiptRefTooLong` (> 32). 9 tests. Descartado: hallazgo sobre `.env` (ya cubierto por `.env*.local` en `web/.gitignore`). XSS, redondeo y overflow sin hallazgos.
- **Contrato redesplegado:** `CAJAMA32YRPYHG5ZT2WDIRLRLPBTCKOXGOJNHIQ3IEMDUDXHGNYGBXSG` (el anterior `CCYLKLKC…DLD5` queda obsoleto). Simulación con payer == freelancer devuelve `Error(Contract, #3)`.
- **Evidencia nueva:** cobro 500 USDC `261cfebe…83e9`; smart wallet `CBNKXPVM…XHUP`; cobro 200 `f93ea435…e0e6`; retiro con passkey `417f8def…2a2b`.
- **Deploy:** https://honorarios-pe.vercel.app (Vercel). Llaves de desarrollo movidas a `.env.development.local`; verificado que el bundle de producción no contiene ninguna.

## 2026-09-19 · Regla del pago a cuenta en el panel

Decisión: el contrato se mantiene (8% por cobro). El panel pasa a calcular el pago a cuenta real del mes: 8% del total percibido si supera S/ 4,010 y S/ 0 si no. La reserva se renombra "Reserva preventiva 8%" y el panel pide esperar al cierre del mes antes de liberarla, porque un cobro adicional puede cruzar el umbral y el 8% se aplica a todo el mes.

Por qué: la suma de los 8% por cobro coincide exactamente con la obligación cuando el mes supera el umbral. Antes el panel daba a entender que el 8% siempre era de SUNAT.

Fuentes: R.S. 000390-2025/SUNAT (umbral S/ 4,010 y S/ 48,125 para suspensión), D.S. 301-2025-EF (UIT 2026 S/ 5,500). Declaración y pago en Formulario Virtual 616 con Clave SOL, solo en soles. Suspensión con Formulario 1609 (número pendiente de verificar en fuente primaria).

Pendiente de verificar: fechas del cronograma por último dígito del RUC (se enlaza a sunat.gob.pe sin fijar fechas), tratamiento de cobros en cripto (sin criterio SUNAT publicado).
