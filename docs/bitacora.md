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

## 2026-09-19 · Tercer jurado simulado

Tres jueces agnósticos (técnico, producto, negocio con cumplimiento) puntuaron 82, 79 y 79, y
los tres colocaron el proyecto en el podio. Dos de ellos, por separado, encontraron el mismo
error, que se había introducido ese mismo día al agregar los campos de otras rentas:

- **El 8% se aplicaba sobre una base que incluía las rentas de quinta categoría.** La quinta
  cuenta para saber si se cruza el umbral del mes, pero no entra en la base del pago a cuenta de
  cuarta, que retiene el empleador por su propio procedimiento. Con S/ 1,875 de cuarta y S/ 3,000
  de quinta el panel mostraba S/ 390 en vez de S/ 150. Corregido en `web/src/panel.ts`: se separan
  la base de cuarta y el total frente al umbral, y el desglose ahora muestra las dos líneas.

Otros hallazgos verificados y corregidos:

- El texto afirmaba que la reserva cubre el pago sin compararla con nada. Ahora convierte la
  reserva a soles con el tipo de cambio y dice cuánto falta o si alcanza.
- `ensureUsdc` calculaba el `sendMax` con la mejor ruta de Horizon y ejecutaba `path: []`. En
  testnet funciona porque hay pool directo, en la red principal habría fallado o ejecutado a peor
  precio. Ahora se ejecuta la misma ruta que fijó el precio (`web/src/stellar.ts`).
- `paidEvents` pedía 100 eventos por ventana sin paginar, así que a partir del cobro 101 la lista
  se quedaba corta sin avisar. Ahora pagina por cursor hasta agotar cada ventana.
- El botón de retiro deshabilitado y la reserva en cero del panel de ejemplo no explicaban nada.
- `docs/arquitectura.md` citaba el despliegue del contrato anterior; el README llamaba pruebas E2E
  a los guiones de grabación, decía "no paga comisiones" sin la condición del relayer, y atribuía
  la compra de USDC con XLM a la transacción del cobro. El path payment es la transacción
  `787ff6d5…6563`, verificada en Horizon: 437.22 XLM por 460 USDC, cinco segundos antes del cobro.
  Ahora aparece en su propia fila de la tabla de evidencia.

Queda abierto y declarado en los límites: el circuito a soles no se cierra desde testnet, el
umbral no contempla el tramo especial de directores y mandatarios, y no hay pruebas automatizadas
del frontend.

## 2026-09-19 · Video publicado

Video demo v7 (2:17) en https://www.youtube.com/watch?v=sALrFKb56xk. Corresponde a la corrida del
contrato `CDGZLOQD…5YETA` que cita el README. Fuentes en `video/`: `clips.py` corta la grabación,
`audio_gen.py` genera la narración y `remotion/` compone.

## 19 de septiembre de 2026, 23:10 · Comisión del servicio en el contrato

**Decisión:** el contrato cobra una comisión configurable al desplegar, con tope duro de 1%,
y se despliega en cero para la hackathon.

**Por qué:** los tres jueces de la última pasada agnóstica coincidieron en que el modelo de
negocio estaba escrito en el README pero no existía en el código. Dejarlo solo en prosa es una
promesa; ponerlo en el contrato con su límite y su getter público lo vuelve verificable.

**Dónde vive:** `contracts/split/src/lib.rs` — `MAX_FEE_BPS = 100`, `DataKey::Fee`,
`Error::FeeTooHigh = 5`, `__constructor(env, token, fee_bps, fee_to)` que rechaza pasarse del
tope, getter `fee()` y el cálculo `net = gross - tax - fee` dentro de `pay`. El evento `Paid`
publica el campo `fee`.

**Cómo se reparte:** la reserva del 8% se calcula primero y redondea hacia arriba; la comisión
se calcula sobre el bruto y trunca hacia abajo; el neto es lo que queda. La reserva nunca se
toca con la comisión, y hay un test (`the_tax_reserve_is_never_touched_by_the_fee`) que lo fija.

**Pruebas:** 23 en verde, cuatro nuevas. La del tope usa `#[should_panic(expected = "Error(Contract, #5)")]`
porque el crate es `no_std` y `catch_unwind` no existe ahí.

**Redespliegue:** contrato `CCTU5SUST4I6O5JIO6UHRGI2NW6FHWFNHVRGWPTKCGKCY7Z4X3CMX3EU`,
tx `2f2b281cbff0b063067e00b6f751fc1f504e7875f880456d29bb7a665d2f58f9`, ledger 4770618, con
`fee_bps = 0`. El contrato anterior (`CDGZLOQD…5YETA`) queda en la cadena y es el que se ve en
el video pitch; el README lo dice.

**Video demo regrabado** contra el contrato nuevo: wallet `CCOE…PB4S`, cobro
`e89d764f0c60633546896a55cfdc113a52045bbca95b5bf578343375051c4923`, retiro
`da16e5ae79fd33b2a23642eb4b3a28f2dca06868d3d9cce21b7990b8f4dccc10`. 2:57, sin cortes.

**Queda abierto:** el precio real. No hay usuarios con quienes validarlo, así que no se propone
ninguna cifra. Y la comisión no se puede cambiar sin redesplegar, que es una decisión de diseño
a favor de la transparencia y en contra de la comodidad de operación.

## 19 de septiembre de 2026, 23:25 · Pitch regrabado contra el contrato con comisión

**Decisión:** regrabar también el video pitch, no solo el demo, para que los dos muestren el
contrato vigente.

**Por qué:** el pitch enseña la transacción en Stellar Expert con el contrato invocado a la
vista. Dejarlo apuntando al contrato anterior obligaba a explicar en el README por qué hay dos
contratos, y un jurado que abre el enlace encuentra algo distinto de lo que dice el código.

**Qué cambió además de la grabación:**
- Narración de la escena `code`: diecinueve pruebas pasa a veintitrés, y la lista en pantalla
  incluye los tres tests de la comisión.
- Narración de la escena `negocio`: antes decía que la comisión era el plan; ahora dice que el
  contrato puede cobrarla con un tope de uno por ciento escrito en el código y que hoy está
  desplegado en cero. En pantalla: "sale del bruto, la reserva del 8% no se toca" y "tope de 1%
  en el código".
- Captura del explorador recapturada con la transacción nueva. Los recuadros que resaltan
  `5000000000` y `4600000000` siguen cayendo sobre los valores correctos.
- Offsets de `clips.py` reajustados a las marcas de la grabación nueva, que corre unos segundos
  por delante de la anterior.
- La música se quedaba corta: se alargó `music_src_pad2.mp3` con un crossfade interno para que
  el cierre no entre en silencio.

**Corrida del pitch:** wallet `CD3PIXX6S5MNQ6YXBB4XRERWGIWS56JB5CGA4YCJ4SUDZMGWEHLEFFOO`,
cobro `1dc6e5f29558665ed4bd51719b42c057176052bc696a3694853c01ea20e23ebf`, retiro
`7b947744797068ef3b9ffad33098e31f81ec34d55a774ede1fde09dd03f436e4`. 2:17.

**Queda abierto:** el video de YouTube enlazado en el README es la versión anterior. Hay que
reemplazarlo por este corte antes de enviar el formulario, o el enlace y el repositorio dirán
cosas distintas.

## 20 de septiembre de 2026 · Arreglos de la tercera ronda de jurado agnóstico

Cuatro jueces agnósticos (ingeniero de blockchain, inversor, diseñador de producto, contador
tributarista peruano) puntuaron 83, 72, 84 y 82, los cuatro colocándolo segundo o tercero de
diez. Lo que sigue son los hallazgos accionables y qué se hizo con cada uno.

**La pantalla de pago no leía `fee()`.** El contrato calcula `net = gross - tax - fee` y el
frontend replicaba la aritmética restando solo la reserva. Con la comisión en cero el número
coincidía, pero el mecanismo de transparencia no estaba conectado: si el contrato cobrase algo,
el cliente firmaría un desglose falso. Ahora `serviceFee()` lee la comisión de la cadena una vez
por carga, `split()` la recibe como parámetro, y el recibo muestra su fila y su porcentaje
cuando existe. Los cobros ya liquidados muestran las cifras del evento `Paid`, sin re-derivar.
Fuente: `web/src/stellar.ts`, `web/src/ui.ts`, `web/src/pay.ts`.

**La lógica tributaria no tenía pruebas.** Era el único sitio donde el producto puede
equivocarse contra SUNAT y el único sin red. Extraída a `web/src/tax.ts` como función pura, con
11 tests que fijan el operador estrictamente mayor del umbral, la exclusión de la quinta de la
base, el descuento de retenciones sin negativos y la ausencia de cifra cuando falta el tipo de
cambio.

**Omisión material: el umbral de directores y regidores.** El contador señaló que las rentas del
inciso b) del artículo 33 tienen históricamente un umbral mensual menor, que la app no conoce.
Aplicar el general le habría dicho "bajo el umbral, S/ 0" a alguien ya obligado, y en silencio.
No inventamos la cifra: el panel pregunta por ese caso y, al marcarlo, deja de estimar y lo
explica. La regla del proyecto manda marcar lo que no se puede citar, no rellenarlo.

**El link de cobro apuntaba a la máquina que lo generó.** Ahora usa `VITE_PUBLIC_BASE`. Es un
arreglo de producto, no de grabación: ese link se lo mandas a un cliente en el extranjero.

**Texto de interfaz.** La fila "Regla" se cortaba contra el borde en cinco fotogramas del video
demo; ahora ocupa su propia línea completa. La advertencia "estimado, no es tu declaración" se
partía a mitad de frase junto a la cifra grande; ahora va en su propio bloque. La barra del
umbral no decía dónde caía el corte; ahora lleva su escala.

**Suspensión y tope anual.** Se añadió que la suspensión rige desde que SUNAT la aprueba y no
hacia atrás, que caduca el 31 de diciembre, y que el tope anual no es doce veces el umbral
mensual porque salen de porcentajes distintos de la UIT.

**Lo que NO se hizo, y por qué.** Cambiar el contrato (comisión mutable con evento, consentimiento
del freelancer para evitar reservas huérfanas) obliga a redesplegar, y el contrato vigente es el
que aparece en la captura del explorador de los dos videos. Queda para la ronda de re-speech,
donde los videos se rehacen de todos modos.

**Crítica de fondo que ningún arreglo de código resuelve:** el track se llama Real-World Assets &
Compliant Rails y el rail de salida a soles no está cerrado. Dos jueces lo pusieron como el
motivo principal de no darle el primer puesto.

## 20 de septiembre de 2026, tarde · El panel de ejemplo estaba vacío

**Hallazgo, y es el peor de toda la revisión.** Dos jueces de la segunda ronda abrieron la app,
pulsaron "Ver un panel de ejemplo" (lo que el propio video demo invita a hacer en el segundo 16)
y vieron ceros en todas las casillas. El escaparate contradecía al video.

**Causa.** `DEMO_ADDRESS` apuntaba a `CD6EERWS…7GXD`, la wallet de la corrida del video pitch
original, que cobró contra el contrato **anterior**. Al redesplegar por la comisión, esa wallet
quedó con `month_gross` y `tax_reserve` en cero contra el contrato nuevo, y sus eventos `Paid`
llevan otro `contractId`, así que el filtro de `paidEvents` nunca los iba a ver. Una constante
que sobrevivió a un redespliegue y ninguna prueba que la ejercitara.

**Arreglos:**
- `DEMO_ADDRESS` apunta a `CCOE…PB4S`, la wallet que cobró contra el contrato vigente.
- `web/scripts/check-demo.mjs` falla si esa wallet no tiene nada en el contrato actual. El fallo
  era de una clase que va a repetirse en cada redespliegue.
- El panel distingue "el nodo ya no guarda esos eventos" de "no tienes cobros". Antes los dos
  casos pintaban el mismo vacío, con una reserva distinta de cero al lado desmintiéndolo.
- `web/scripts/seed-demo.mjs` añadió dos cobros reales (620 y 300 USDC) para que el mes del panel
  de ejemplo cruce el umbral: S/ 5,325 y S/ 426 de pago a cuenta. El caso aburrido era
  precisamente el mes en que el producto no hace falta.

**Otros arreglos de la misma ronda, del contador y del ingeniero:**
- Las rentas manuales se guardan por periodo tributario: lo tecleado en setiembre ya no aparece
  en octubre como si fuera del mes en curso.
- "Bajo el umbral" con los campos vacíos era una afirmación de cumplimiento construida sobre la
  ausencia de datos. Ahora hay un estado "falta confirmar tus otras rentas" hasta que el usuario
  confirme que eso es todo lo que ganó.
- El borrador del recibo afirmaba que no hubo retención sin saber dónde está el cliente. Ahora
  lo pregunta, y si el cliente es domiciliado avisa de que puede haber retención sin inventar el
  monto mínimo, que no tenemos contrastado.
- `estimate` sanea lo que teclea el usuario: un negativo en otras rentas reducía la base y
  producía una declaración corta. Y el monto a declarar se redondea a céntimos, que es como se
  declara. Cinco tests nuevos, 16 en total.
- La pantalla de éxito del pago podía enlazar a una transacción vacía si la red no devolvía el
  hash.
- La portada decía "el 92% llega a tu wallet" mientras la página de pago leía la comisión de la
  cadena. Dos cifras del mismo contrato no pueden salir de sitios distintos.

## 20 de septiembre de 2026, noche · Auditoría de interfaz

El juez de diseño de la segunda ronda revisó la app en vivo a 1440 y a 375 px. Lo que se
arregló, con su motivo:

- **La pantalla de firmar pintaba el reparto antes de leerlo.** `pay.ts` renderizaba con
  `feeBps ?? 0n` mientras el texto al lado decía que el desglose venía del contrato. En ese
  instante no era verdad. Ahora hay skeleton hasta que `fee()` responde, y si la lectura falla
  lo dice en vez de mostrar números por defecto con una afirmación que no los respalda. Es la
  única pantalla donde alguien firma dinero: es donde menos se puede afirmar de más.
- **Freighter es una extensión de escritorio** y la página ofrecía "Connect Freighter" a
  cualquiera. En móvil ahora avisa de que hay que abrir el link en la computadora.
- **La portada no explicaba nada.** Un jurado que aterriza veía un formulario para crear una
  wallet y nada más. Tres pasos y el enlace al contrato con su número de pruebas.
- Etiqueta y marcador del campo de retiro decían cosas contrarias (destino contra origen). El
  8 y su símbolo de porcentaje separados a lo ancho de la fila. La escala del medidor en un
  formato distinto al resto de cifras. El triángulo nativo del navegador dentro de una interfaz
  con un solo set de iconos. Un medidor a cero que se leía igual que uno lleno. El botón de
  retirar con el mismo borde y altura que los campos de encima.

## 20 de septiembre de 2026, cierre · Tercera ronda

Puntuaciones: 87 el ingeniero (subió de ~71), 84 el diseñador, 82 el jurado principal (subió de
74-76). Los tres lo ponen segundo. Lo hecho después de esa ronda:

**El umbral deja de ser una cifra suelta.** `tax.ts` ahora deriva el tope anual como 8.75 UIT y
el umbral mensual como su doceava parte truncada, partiendo de la UIT 2026 de S/ 5,500 fijada
por el D.S. 301-2025-EF, que sí está publicado en El Peruano y se enlaza desde la app. La regla
reproduce los montos de 2025 con la UIT de ese año, y eso explica la discrepancia que el contador
marcó como sospechosa: doce veces el umbral mensual no da el tope anual porque el mensual pierde
los céntimos al truncarse. Tres tests nuevos lo fijan. Sigue sin leerse el texto de la resolución
de SUNAT, y la interfaz lo sigue diciendo.

**Una transacción fallida se presentaba como pagada.** `signAndSend` del SDK solo lanza si el
envío no queda en PENDING o si expira el plazo: una transacción incluida y FAILED volvía por el
camino normal y la pantalla enseñaba "Pagado" con enlace al explorador. Es el único defecto que
podía hacer creer a alguien que cobró sin haber cobrado.

**Un fallo del RPC borraba datos que sí se habían leído.** El `Promise.all` del panel tiraba
reserva y acumulado cuando fallaba el escaneo de eventos, que es la llamada frágil. Ahora cada
lectura va por su cuenta y solo hay error cuando no se pudo leer nada del contrato.

**Negocio con fuentes.** `docs/negocio.md`: precio de 0.5%, los datos publicados que encontramos
(exportación de servicios de Mincetur, independientes con RUC del INEI, UIT del MEF) y, en tabla
aparte, nuestros supuestos con su rango. El dato que falta, qué parte de la exportación de
servicios la factura una persona natural, se declara como faltante en vez de rellenarse.

**CI.** `.github/workflows/ci.yml` corre los tests del contrato, los del frontend, el build y
`check-demo`. Este último existe porque el panel de ejemplo estuvo un día en ceros sin que nadie
lo notara.

**Interfaz.** El veredicto de la reserva ("faltan S/ 150 para cubrir el pago de S/ 426") pasa a
estar junto a la cifra y no en una nota a mil píxeles de scroll. El bloque fiscal se reparte en
dos columnas a partir de 1180 px y el formulario de link acompaña el scroll, que era el hueco
más visible del panel. Las cifras dejan de partirse a mitad en pantallas estrechas. El eje del
medidor decía "S/ 0.00" bajo una barra llena y se leía como el importe actual; ahora dice el
acumulado y cuántas veces supera el umbral. La página de pago titula con el nombre del
freelancer en vez de una dirección truncada, y el aviso de que Freighter no existe en móvil va
antes del botón, no después. Iconos con `aria-hidden`, mensajes de error traducidos, CSP
completa (verificada en el navegador: la primera versión bloqueaba las fuentes).

**Lo que se decidió NO hacer:** redesplegar el contrato. El jurado principal lo puso en negativo,
entre +1 y −5, porque invalidaría las transacciones enlazadas, el panel de ejemplo y la evidencia
de los dos videos, a cuatro días del cierre. Queda anotado lo que pediría: que `pay` exija
consentimiento del freelancer, para que el acumulado del mes no lo pueda inflar un tercero.

