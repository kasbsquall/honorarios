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

## 2026-09-19 · Video demo v1

Video de 2:07 (límite de las bases: 3 minutos, stellar.mintedinpe.com/odyssey). Voz ElevenLabs "Jorge" (acento peruano), música ElevenLabs, sonidos CC0 de Kenney. Demo grabada en testnet con Playwright (`web/e2e/film.mjs`): wallet con passkey CCZ2…FJVT, cobro de 500 USDC tx 139b4f3c…9925 (el cliente compró USDC con XLM vía path payment), retiro de 40 USDC tx fa9e5215…. El tipo de cambio 3.75 que aparece en el panel es de ejemplo. Fuentes en `video/`.

## 2026-09-19 · Mejoras tras el jurado simulado

Un panel de tres jueces agnósticos (ingeniero Stellar, inversionista, producto) puntuó el proyecto en 85, 85 y 86 sobre 100, con la rúbrica oficial. Coincidieron en cuatro debilidades y se atacaron todas:

- **Autorización sin probar.** Los 9 tests corrían con `mock_all_auths`. Se agregaron tres pruebas que exigen firma real: retiro sin firma, retiro firmado por un tercero y pago sin firma del pagador. Ahora son 14 tests (`contracts/split/src/test.rs`).
- **Historial dependiente del RPC.** El panel sumaba eventos y el RPC solo guarda unos 7 días. El contrato ahora acumula el bruto por mes (`DataKey::MonthGross`, `month_gross`, `current_period`, periodo = año*12+mes-1 en UTC) y el panel lo lee de ahí.
- **Sin salida a soles.** El panel consulta en vivo el SEP-24 de Anclap (`api.anclap.com/transfer24/info`), que ofrece retiro en PEN ("Sol Digital") en la red principal. Se muestra en el paso 1 de "Cómo se paga a SUNAT", con la aclaración de que esta app corre en testnet.
- **Sin modelo de negocio y evidencia descoordinada.** Se agregó al README y al video la línea de sostenibilidad (comisión por cobro liquidado, sin precio validado) y se rehízo la demo entera contra el contrato nuevo, así el video y el README citan la misma corrida.

**Contrato nuevo:** `CD7M4P64BBNWUCTWIGRHFHSRPI3GH2PFREUPAESETG36KCVQODKYE4YL`, desplegado con el SDK de JavaScript porque el CLI de Stellar ya no está instalado en el equipo (tx `bf81a604…88cf`). El anterior, `CAJAMA32…BXSG`, queda obsoleto.

**Corrida de la demo:** wallet con passkey `CCZ2…FJVT`, cobro de 500 USDC `90ab3000…6832` (el cliente compró USDC con XLM), retiro de 40 USDC `55a1bd3e…2101`.

## 2026-09-19 · Segundo jurado simulado y endurecimiento del contrato

Cuatro jueces agnósticos (negocio, ingeniería Stellar, producto, cumplimiento tributario peruano)
puntuaron 68, 76, 82 y 62 sobre 100. Dos hallazgos se repitieron en todos y se corrigieron:

- **La app se caía en la primera pantalla sin wallet.** `connectWallet` esperaba a Freighter para
  siempre cuando la extensión no estaba instalada. Ahora se detecta con `isConnected()` y un
  tiempo de espera, el error enlaza a la instalación, y la portada ofrece un panel de ejemplo en
  solo lectura con la cuenta de la demo (`web/src/stellar.ts:68-85`, `web/src/panel.ts`).
- **El panel afirmaba un saldo falso cuando fallaba la red.** El `catch` de `load()` mostraba el
  aviso de error y `renderPanel()` lo volvía a ocultar al reescribir el HTML, y la reserva se
  pintaba como `0.00`. Ahora el estado de error vive en una variable que el render lee, los
  números se muestran como `—` y la lista dice que no se pudo leer la red, no que no haya cobros.

Del juez tributario (todo lo que sigue está en `web/src/panel.ts`):

- El umbral se mide sobre todos los ingresos del mes. Se agregaron campos para otras rentas de
  cuarta, rentas de quinta y retenciones ya practicadas, y el total del mes las suma. El número
  grande ya no se llama "pago a cuenta real" sino estimado, y dice que no es la declaración.
- Se añadió la advertencia de la regularización anual y la del riesgo cambiario, porque la
  reserva está en USDC y la deuda en soles.
- Las cifras de la resolución de SUNAT aparecen marcadas en la propia interfaz como leídas de una
  fuente secundaria y sin contrastar contra El Peruano. La tasa del 8% sí se cita por su norma:
  artículo 86 del TUO de la Ley del Impuesto a la Renta (D.S. 179-2004-EF).

Del juez técnico, con cambio de contrato y redespliegue:

- **El mes tributario cerraba en UTC.** Un cobro del último día del mes a las 19:00 de Lima caía
  en el mes siguiente. `period_of` ahora resta el huso de Perú (`contracts/split/src/lib.rs:29`).
- **La reserva podía quedar archivada sin rescate.** Se agregó `extend_reserve(freelancer)`, que
  renueva el TTL sin mover fondos y puede llamar cualquiera.
- **Un monto enorme reventaba por aritmética** en vez de devolver `InvalidAmount`. Se agregó
  `MAX_GROSS` y su validación.
- **El redondeo favorecía al pagador.** La reserva ahora redondea hacia arriba, y `split()` en el
  frontend hace lo mismo para no divergir del contrato.
- **Los tres tests de autorización usaban `#[should_panic]` sin `expected`**, así que cualquier
  pánico los aprobaba. Ahora exigen el error `Auth(InvalidAction)`, lo que además demuestra que
  `set_auths(&[])` sí desactiva el mock. Se agregaron la invariante de custodia (lo reservado a
  nombre de todos cabe en el balance del contrato), el redondeo, el desbordamiento, el TTL y la
  frontera del mes en Lima. Son 19 tests.

**Contrato nuevo:** `CDGZLOQDUVBC4SCX5HCNRCJ3OF56Y5SNBY2RP22CI7PSCR7CX245YETA`, despliegue
`9a23da89…429a`, ledger 4,766,344. El anterior, `CD7M4P64…E4YL`, queda obsoleto.

**Corrida de la demo, rehecha entera contra este contrato:** wallet con passkey `CD6E…7GXD`,
cobro de 500 USDC `1c41c40d…3e13` (el cliente compró USDC con XLM), retiro de 40 USDC
`76aca849…86b9`. El video v6 se regrabó y se volvió a narrar: la narración decía "nueve pruebas"
y "pago a cuenta real", y ninguna de las dos cosas era ya cierta.
