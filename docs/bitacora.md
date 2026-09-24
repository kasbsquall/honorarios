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

## 20 de septiembre de 2026 · Los dos últimos caminos hacia un "no debes nada" falso

La cuarta ronda cerró en 84 y 86, con el jurado principal diciendo que el proyecto está cerrado
y que lo que quedaba sumaba 2 puntos. El juez técnico-tributario encontró dos excepciones, y
tenía razón: eran los dos únicos sitios donde el código todavía podía hacer que alguien
declarara de menos, que es justo el error que este producto no se puede permitir.

**Si fallaba solo la lectura del acumulado del mes, el panel sumaba los eventos del RPC.** Esos
eventos duran alrededor de una semana en testnet, así que la base salía corta y el badge podía
decir "bajo el umbral" sobre un dato incompleto, sin ningún aviso. Ahora, sin el acumulado del
contrato no se estima nada y se explica por qué no se usa la lista de cobros para reemplazarlo.

**En el caso de director seguía pintándose el umbral general.** La cifra desaparecía, pero la
barra, la comparación "de S/ 4,010" y la regla general seguían ahí. Un director con S/ 3,500 en
el mes veía su barra por debajo de un corte que no es el suyo, y la lectura natural de eso es
"no debo nada". Ahora desaparecen la barra y la escala, y la fila de la regla dice explícitamente
que ese umbral no le corresponde. Un test nuevo lo fija.

**Menores de la misma ronda:** el neto y el contador de cobros del panel sumaban todos los
eventos disponibles dentro de un marco mensual; ahora cuentan solo el mes. Las fechas del
borrador del recibo usaban el huso del navegador en vez del de Lima.

**Sobre la derivación del umbral**, el mismo juez la calificó de defendible como derivación y no
como cita, y señaló un riesgo de redondeo: SUNAT publicó 46,813 donde el cálculo de 2025 daba
46,812.50, así que si para 2026 redondea el mensual hacia arriba, la app quedaría un sol baja.
Está advertido en pantalla y en el módulo.

**Techo declarado:** alrededor de 90 sin tocar el contrato desplegado ni los videos. Lo que falta
para pasar de ahí no es código: una cita literal de la resolución anual de SUNAT, un camino real
de USDC a soles, y salir de testnet.

## 20 de septiembre de 2026 · La resolución aparece, y con ella el umbral de director

Durante toda la semana la app dijo en pantalla que el umbral lo derivaba de la UIT y que no
habíamos leído la resolución que lo fija. Era honesto y era el techo del proyecto: tres jurados
distintos lo señalaron como el dato principal sin confirmar de un producto de impuestos.

Hoy la encontramos. **R.S. 000390-2025/SUNAT**, del 30 de diciembre de 2025, descargada del
propio sitio de SUNAT y guardada en `evidencias/2026-09-20-resolucion-umbral/`. Su artículo 3
fija cuatro importes para 2026, y la derivación acertaba en los dos que ya usábamos:

| literal | importe | a quién |
|---|---|---|
| a) | S/ 4,010 mensuales | régimen general de cuarta |
| b) | S/ 3,208 mensuales | rentas del inciso b) del art. 33 |
| c) | S/ 48,125 anuales | régimen general |
| d) | S/ 38,500 anuales | rentas del inciso b) |

**El literal b) es el hallazgo.** Era exactamente el número que la app declaraba no conocer, y
por no conocerlo dejaba a un director sin estimación, con un cartel de "fuera de lo que calcula
esta app". Ahora se compara contra su propio umbral y recibe su cifra. Un director con S/ 3,500
en el mes pasa de no tener respuesta a saber que debe S/ 280.

Las constantes dejaron de derivarse y ahora se copian de la resolución, con la cita en el
código y el enlace al PDF en la pantalla. Los tests fijan los cuatro importes por separado y que
el del inciso b) sea menor que el general, que es la razón de distinguirlos. 31 tests.

**Lo otro de la misma ronda.** La cifra en soles cuelga entera de un tipo de cambio que se
teclea, y eso no se veía junto al número: ahora la línea bajo el monto dice con qué tipo de
cambio se calculó y si es el de ejemplo o el que ingresó el usuario. Y cuando el mes no llega al
umbral, el panel explica que el contrato apartó el 8% igual, porque la reserva es una regla fija
que no consulta el umbral, y que ese dinero se puede retirar.

El README citaba la resolución en firme mientras la app decía no haberla leído. Esa
contradicción se acabó por el lado bueno.

## 20 de septiembre de 2026 · Tres fallos que solo se ven mirando la pantalla entera

Citar la resolución destapó incoherencias entre partes de la interfaz que hasta ahora decían
lo mismo por casualidad.

**El tag verde de la reserva no miraba `provisional`.** El bloque de abajo llevaba días
diciendo "falta confirmar tus otras rentas", y el elemento más grande de la pantalla, junto a
la cifra de la reserva, seguía afirmando en verde y con un check que este mes no había nada que
cubrir. El dato para evitarlo estaba calculado cuatro líneas más arriba. Era el último camino
que quedaba hacia una calma que la app no puede sostener.

**El mismo KPI citaba S/ 4,010 aunque el usuario fuera director.** El bloque de abajo aplicaba
correctamente S/ 3,208 y el de arriba le mentía por 802 soles. Ahora los dos leen el mismo
`thresholdPen`.

**El tipo de cambio no tenía rango de cordura.** Un 0.375 en vez de 3.75 hunde el total en
soles y produce un "no llegas al umbral" perfectamente falso. No lo bloqueamos, porque no nos
corresponde decidir qué tipo de cambio es válido, pero se avisa cuando cae fuera de 2 a 6. Y
bajo el monto estimado se ve ahora con qué tipo de cambio se calculó y si lo puso el usuario.

Probado en producción el peor caso de los tres a la vez: mes bajo umbral, sin confirmar otras
rentas y con el tipo de cambio absurdo. Sale el aviso ámbar, el aviso del tipo de cambio y la
procedencia de la cifra. Antes salía un visto verde.

## 20 de septiembre de 2026 · Re-speech: las dos piezas, rehechas

Cuatro versiones de guion y tres rondas de jurado antes de grabar un solo segundo, que es
justo el orden correcto: las palabras son gratis y el render cuesta media hora.

**El pitch pasa de trece escenas a doce y de 2:17 a 2:36.** Los cambios que movieron la aguja:
el precio vuelve a estar en el video (en la versión intermedia lo comprimí tanto que
desapareció, y era lo primero que buscaba el jurado inversor, con su aritmética: medio por
ciento son ciento veinte dólares al año para quien factura dos mil al mes); la mención a la red
de pruebas sale de la frase de apertura, donde mataba el mejor momento de la pieza; lo que
falta deja de ser lo último que se oye, porque el video terminaba disculpándose; Stellar se
explica la primera vez que se nombra; y desaparece el test en rojo, que para quien no programa
se lee como un fallo.

Tres correcciones de exactitud que un juez verificó contra el código: la resolución es de
diciembre de 2025 y rige 2026, el cliente paga con una extensión de escritorio y no "desde
donde esté", y la portabilidad regional no son cien líneas, porque el 8% y el cierre de mes en
hora de Lima están escritos en el contrato. Los tests dejaron de nombrarse con una cifra
redonda que no cuadraba con ningún corte real.

**El demo se regrabó entero.** El anterior mostraba una app que ya no existe, con el contrato
anterior al redespliegue, y no decía nada de lo que la narración afirmaba. Ahora incluye el
caso de director, con su umbral de S/ 3,208 y la cita en pantalla.

**Sobre la legibilidad, que era el defecto más caro del paquete.** Cuatro intentos fallidos
antes de dar con la solución. Grabar a 1280 o 1440 de ancho rompe la tercera columna del panel.
El zoom de página a 1.3 rompe el grid entero. Grabar a un tamaño y pedir el vídeo a otro hace
que Playwright componga la página en una esquina. Y adivinar el encuadre desde el montaje no
funciona porque depende de dónde quedó el scroll en ese instante. Lo que funciona: la grabación
anota el rectángulo de la zona viva de cada etapa con `boundingBox()`, y el montaje encuadra
ese rectángulo exacto. El texto se lee y no hay que acertar de memoria.


## 2026-09-20 · Pieza única de video, 2:47

**Decisión:** un solo video de 2 minutos 47 sirve a la vez como pitch y como demo, dentro
del límite de 3 minutos del Stellar Odyssey. El recorrido completo del producto va dentro
del pitch, no en una pieza aparte. Solo se entrega la versión 1080p.

**Voz:** Cartesia, modelo `sonic-3`, idioma `es`, voz Ramón
`9b67072c-d46c-465d-87dc-f7a1c6db2bf3`. La anotación anterior de la bitácora que citaba
ElevenLabs correspondía a un video viejo de 2:07 y era incorrecta: ElevenLabs no se usó en
ningún momento de este proyecto. `sonic-3` no repite la misma toma con el mismo texto, así
que las frases que no cambiaban (`brand`, `close`) se reutilizan tal cual desde
`video/audio_v4/scenes/` en vez de volver a sintetizarlas. Ver `video/audio_gen.py`, `REUSE`.

**Sincronía:** lo que estaba mal no era el audio sino la imagen. El pitch anterior reusaba
recortes de `rec_v2` cortados con los tiempos de un guion previo y enseñaba el contrato de
antes del redespliegue. Ahora cada clip dura exactamente lo que dura su escena, calculado
desde el audio ya sintetizado (`video/clips_final.py`): la velocidad de cada tramo es una
consecuencia del ajuste, no una elección.

**Legibilidad de la demo:** la grabación anota con `boundingBox()` el rectángulo vivo de
cada etapa (`web/e2e/demo.mjs`) y el montaje encuadra ese rectángulo. Para las pantallas de
panel y límites se usa la caja de ancho completo del contenido, no la de la columna central:
esa mide 511px y recortaba por la derecha la cita de la R.S. 000390-2025/SUNAT, que es
justo lo que hay que poder leer.

**Pendiente:** subir a YouTube y completar el enlace del README. Rotar la clave de Cartesia.

## 2026-09-20 · Segunda pasada sobre la pieza única

**Un defecto del video destapó uno de la app.** El texto de la regla tributaria se cortaba
por el borde derecho de la pantalla. No era el encuadre: el bloque fiscal partía en dos
columnas según el ancho de la *ventana* (`@media (min-width: 1180px)`), no según el ancho
del bloque, que mide unos 500px. A pantalla completa quedaban dos columnas de 240px con las
etiquetas rotas palabra a palabra y la cita de la R.S. desbordando. Se cambió a container
query sobre `.block` y el `white-space: nowrap` de los importes se anuló en la fila de la
regla, que es prosa. Ver `web/src/panel.css`.

**Encuadre.** Las pantallas grabadas van a tamaño casi real (1.15x, centrado en el contenido
en x=1080): ampliar más recorta la cita, que es justo lo que hay que poder leer. La marca
persistente del video se oculta en las escenas de pantalla, porque la app ya muestra la suya
en su cabecera y se veía "Honorarios" dos veces.

**Logo de SUNAT.** Kevin lo pidió expresamente. Va en la escena del problema, junto a la
cita de la resolución, sobre su chip blanco. Se descartó superponerlo a la grabación: en
esa pantalla siempre tapa un control, y la propia app ya muestra el número de la resolución.

**Escena "Lo que falta" eliminada.** Lo que decía pasa al cierre en una línea: "en pruebas,
sin usuarios todavía". El video queda en 2:38.

**Banderas** dibujadas con sus franjas y sin escudos, para Perú, México, Colombia y
Argentina. No se usan logotipos de instituciones más allá del de SUNAT.

## 2026-09-20 · Jurado agnóstico sobre la entrega completa

Tres revisores independientes puntuaron el proyecto con la rúbrica oficial (funcionalidad 30,
Stellar 25, originalidad 20, viabilidad 15, documentación 10): **81, 80.5 y 75 sobre 100**, con
puestos 1, 2 y 4 de diez finalistas. Dos dan podio y uno no. Los tres puntúan funcionalidad y uso
de Stellar casi igual, entre 23 y 25; la diferencia está en documentación y viabilidad.

**Lo más caro, y no era el código.** La app desplegada no era HEAD. Dos revisores descargaron el
bundle de producción y encontraron que seguía diciendo que ante rentas de director la app "deja de
estimar", cuando `web/src/tax.ts` ya aplica el umbral de S/ 3,208. Un jurado que no clone el repo
solo ve eso.

**Contradicciones corregidas en el README:** decía 26 tests donde el comando de al lado imprime 31;
llamaba "pruebas E2E" a unos guiones que el propio README describe doce líneas después como "sin
aserciones"; proponía el 0.5% dos veces en negrita y luego afirmaba que no había cifra propuesta; y
el comando de despliegue omitía los dos argumentos que el constructor exige desde que existe la
comisión, así que no arrancaba.

**Una afirmación falsa.** El README decía que un pago de un extraño a nombre de otro "no toca la
reserva". `contracts/split/src/lib.rs:162` escribe en `TaxReserve` en todo pago con impuesto mayor
que cero. El efecto real es un acumulado inflado con dinero del atacante bajo la llave del
freelancer, no un robo, pero la frase tranquilizadora era falsa y está corregida.

**La evidencia on-chain apuntaba a otra corrida.** Al regrabar el recorrido dos veces, los hashes
del README quedaron desfasados respecto a lo que se ve en el video. La tabla ahora cita la corrida
del video: cobro `4668b6f3…c8f9` y retiro `b47aa15e…d913`, ambos verificados contra Horizon.

**Lo que se añadió porque callarlo era peor:** una sección de comparables (Found, Lili, Qapital
hacen esto mismo en Estados Unidos, y el reparto en el momento del cobro lleva años en EVM), y otra
de lo no resuelto, con la consecuencia de la comisión inmutable escrita por fin: encender el precio
obliga a desplegar otro contrato y eso parte en dos el estado de cada usuario, incluido el
acumulado del mes en curso que se compara contra el umbral.

**Queda abierto:** el off-ramp a soles, las entrevistas de precio, `extend_reserve` sin conectar, y
el fallo silencioso de trustline para quien entra con Freighter. Los cuatro están en el README.

**Anula la entrada del 19 de septiembre sobre la evidencia del video.** Aquella citaba la wallet
`CCOE…PB4S` y las transacciones `e89d764f…4923` y `da16e5ae…cc10` como la corrida que se ve en el
video. Dejó de ser cierto al regrabar el recorrido: la corrida vigente es la de la tabla del README
(`4668b6f3…c8f9` y `b47aa15e…d913`). `CCOE…PB4S` sigue siendo la wallet del panel de ejemplo, que
es otra cosa. `docs/arquitectura.md` ya apunta a la corrida vigente.

**Producción redesplegada y verificada.** El bundle público coincide con HEAD, ya no hay
desbordamiento horizontal (antes se salían 43 elementos del ancho a 1440px), Archivo y Phosphor
cargan, y la consola queda limpia. El estado de carga del panel dice "Leyendo la cadena" con un
esqueleto en lugar de acusar de faltar un tipo de cambio que sí está puesto. Lo mismo en la ruta
de fallo: con la red caída el panel dice que no pudo leer lo cobrado, y lo sigue diciendo después
de que el usuario toque cualquier campo, que antes era cuando volvía a mentir. El estado de la
lectura se deriva ahora del módulo y no de argumentos que las relecturas perdían.

**Falso positivo descartado.** Un revisor dio por bloqueadas las hojas de estilo de Google Fonts y
Phosphor. No lo están: la CSP de `vercel.json` las permite, y quitarlas habría dejado la app con
fuentes del sistema y medio centenar de iconos en blanco, porque no están autoalojadas. Queda
anotado que son una dependencia de CDN en el camino crítico, sin SRI.

## 20 de septiembre · revisión cuadro a cuadro de la pieza, antes del render final

Se rindieron 63 fotogramas del montaje, uno cada 2,5 segundos, y se repartieron en tres lotes
entre revisores que solo tenían la instrucción de buscar defectos: texto encimado, rótulos sobre
la banda de subtítulo, elementos congelados a media animación, huecos que se leen como fallo y
errores de montaje. Lo que encontraron, y lo que se hizo:

**El 8% de la escena del problema salía impreso dos veces.** No era una duplicación del elemento
ni una estela: en IBM Plex Mono el signo de porcentaje se dibuja apilado en dos alturas, y a 260px
eso se lee como una cifra con doble exposición. Se comprobó rindiendo el glifo solo. La cifra
protagonista pasa a Archivo, que lo dibuja en una línea. Fuente: `video/remotion/src/scenes/Story.tsx`.

**El rótulo del tipo de cambio tapaba justo el párrafo del que hablaba.** Colocado sobre el
contenido, se comía la mitad izquierda de cinco líneas y dejaba sus finales colgando. Lo mismo en
la escena del retiro, donde partía el chip y lo dejaba leyendo "ALTA CONFIRMAR TUS OTRAS RENTAS".
La aplicación deja libre una franja estable de unos 360px a la izquierda del cuadro en las tres
escenas de panel: los rótulos se mudan ahí, estrechos, y no tapan nada.

**El rótulo del umbral de director contradecía la pantalla durante diez segundos.** En la grabación
la casilla se desmarca a los nueve segundos del clip y la app vuelve a mostrar S/ 4,010, pero la
tarjeta con el 3,208 seguía en pantalla. Ahora se retira a los 8,4 segundos, antes del desmarcado.

**El empuje de cámara era del 12,5%, no del 0,7% que decía su comentario.** `0.00022` por fotograma
sobre 570 fotogramas. Por eso la cabecera de la aplicación aparecía rebanada por el borde superior
en la segunda mitad de cada escena de panel. Corregido a `0.000018`.

**Las tres tarjetas del explorador dejaban asomar el bloque Summary entre una y otra.** Jirones de
"Ledger" y "Transaction size" a media altura, que no se leen como superposición sino como algo que
no terminó de ocultarse. Pasan a ser un bloque opaco y continuo. La captura, además, se amplía 1.3
porque su contenido acababa a media altura y el pie de página se cruzaba con el subtítulo.

**El subtítulo era semitransparente y la mitad derecha del cuadro estaba vacía.** El texto de la
aplicación se transparentaba por debajo de la banda y se leían dos capas a la vez. La banda pasa a
ser opaca. El hueco de la derecha, que es estable porque la columna del formulario se queda corta,
lo ocupa ahora la cita de la resolución, que es lo que la voz está diciendo en ese momento.

**Una línea de subtítulo se pintaba segundo y medio antes de oírse.** Las líneas se agrupaban por
longitud sin mirar el cambio de escena, así que la última palabra del problema arrastraba a las
primeras de la wallet. Ahora la línea corta también en el límite de escena.

**El QR estaba invertido**, módulos crema sobre fondo oscuro. La cámara de un móvil suele
resolverlo, pero no todas. Se generó `qr-oscuro.svg` y va sobre lámina clara. Verificado: el
fotograma final rendido a 1080p decodifica `https://honorarios-pe.vercel.app`.

**Dos afirmaciones sin fuente salieron de la escena de región.** Las tres tarjetas de países decían
"un orden de magnitud más grande", idéntico en las tres y sin término de comparación; se quitó. Y
el rango en dólares ahora dice de dónde sale: estimación propia, no un dato de mercado. La serie
"contrato 2, 3, 4" empezaba en 2 sin que el 1 apareciera en ninguna parte: la cabecera de Perú lo
declara.

**Huecos largos rellenados con lo que la voz ya estaba diciendo.** Los seis primeros segundos de la
escena del problema eran tres distintivos sueltos y el 85% del cuadro en negro; ahora la frase que
se oye ocupa ese espacio y se repliega cuando llega el umbral. El ejemplo de precio y las tarjetas
de países entran antes de que la voz los nombre, para que el jurado los lea y la voz llegue a
ellos, y no al revés.

**Descartado como defecto:** el talón perforado de la apertura, que se separa del cuerpo a
propósito, y el esqueleto de carga del panel en la escena de la wallet, que es el comportamiento
real de la aplicación mientras lee la cadena.

**Queda sin resolver y no se toca a cinco días del cierre:** el cuerpo de texto de la aplicación
ronda el 1,4% de la altura del cuadro y proyectado en sala no se lee. Los datos que importan van
duplicados a tamaño de titular en los rótulos, que es la mitigación posible sin regrabar el
recorrido entero a otra escala.

**Segunda pasada, sobre el mp4 ya codificado.** Se extrajeron 28 fotogramas del archivo
entregable, no del proyecto, y se revisaron con el mismo criterio. Lo que salió y se corrigió:

El subtítulo mide 1360px y va centrado, así que por sus costados asomaban finales de línea de
la aplicación sin su principio ("o es agente de retención.", suelto), y su borde recto cortaba
las filas de importes a media altura. Se añadió un velo degradado en los 250px inferiores de
todo el metraje: la franja de abajo se apaga y el subtítulo se lee como tratamiento y no como
una caja pegada encima del texto.

En la escena de precio convivían dos cifras para la misma comisión: "0,5 %" en grande y "Hoy
desplegado en cero" justo debajo. Ahora una está etiquetada "El plan de precio" y la otra dice
"Hoy el contrato está desplegado en 0%", que es lo que la voz afirma. De paso el separador
decimal se unificó en punto, como en toda la aplicación y como en la propia escena de región.

Las tarjetas de países tenían un hueco de 120px bajo el nombre durante diez segundos, porque su
línea de pie esperaba a la palabra "reescribe". Entra con la tarjeta.

El bloque del explorador cortaba por su borde inferior la línea "Valid before" de la página. Se
midió dónde acaba ese texto (y=506) y el distintivo "Captura real" pasó a ser el pie del propio
bloque, que así llega hasta y=570 y no deja nada asomando.

**Descartado tras medirlo:** las bandas negras a los lados en las escenas de wallet y de pago.
El contenido de la aplicación ocupa 1023px de ancho en las cuatro escenas de navegador, medido
sobre la grabación, porque la página está centrada con ancho máximo. Llenar el cuadro exigiría
ampliar a 1.88 y eso recortaría un tercio de la altura. Las bandas son la forma real del
producto en una ventana de 1920, no un encuadre mal hecho.

**Verificado sobre el archivo final:** el QR decodifica `https://honorarios-pe.vercel.app` desde
el fotograma codificado a 1080p, no solo desde el render. Duración 2:38, bt709, rango limitado.

**Tercera pasada, y último render.** Un revisor ajeno al proyecto, sin saber de quién era, leyó
otra tanda de fotogramas del mp4 codificado. Lo que encontró y se corrigió:

El fallo que justificaba por sí solo volver a renderizar: la escena del explorador mostraba la
transacción `973f5dec…`, de una corrida de las 17:07 UTC, mientras el README y la apertura del
video citan `4668b6f3…c8f9`, de la corrida de las 19:04. Las tres transacciones existen y se
comprobaron una por una contra Horizon, así que no era un dato inventado, pero un jurado que
abriera el enlace del README habría encontrado una transacción distinta a la que vio en pantalla.
Se reemplazó la captura por la de la corrida correcta. Ahora la apertura, la escena de cadena y
la tabla de evidencias del README nombran la misma transacción, y la llamada `pay` que se ve en
pantalla usa la wallet `CATN…J5FR` que la misma tabla lista.

La tarjeta del umbral decía "director, síndico, mandatario, albacea y regidor": cinco figuras. El
literal b) del artículo 3 tiene seis, y la propia app, debajo de la tarjeta, las listaba todas.
Faltaba "gestor de negocios". Corregido.

"Pagas US$ 120 al año" contradecía a la línea de al lado, que dice que el contrato está
desplegado en 0%. La voz dice "pagaría", en condicional. El texto ahora dice "Pagarías".

**Comprobado sobre el archivo entregable, no sobre el render:** 4753 fotogramas, los mismos que
salieron del render, sin ninguno caído ni duplicado. 158.485 s, bt709, rango limitado. El QR
decodifica `https://honorarios-pe.vercel.app` desde tres fotogramas distintos del cierre. Audio a
48 kHz, media de -23.2 dBFS y pico de -5.0 dBFS, sin muestras saturadas, y la pista de audio mide
exactamente lo mismo que la de video, así que no hay desfase.

**Cuarta pasada.** Un cuarto revisor ajeno marcó "no publicar" por un defecto que las tres
pasadas anteriores habían dado por bueno, y tenía razón: en la apertura el borde y el fondo del
recibo estaban puestos en la rejilla que contiene las dos piezas, no en cada pieza. El talón se
aparta por la perforación con `translate(36px,14px) rotate(4deg)`, pero el borde del padre seguía
dibujando la silueta sin rasgar, así que quedaba una esquina de borde flotando y el talón asomaba
por fuera sin contorno. Se leía como dos rectángulos mal encajados, sobre el objeto protagonista,
del segundo 10 al 14. El borde y el fondo pasaron a cada una de las dos piezas.

Ese mismo fallo estructural existe en el CSS de la aplicación y se ve en la grabación del
navegador (segundo 53). Ahí el desborde son 22px sobre una tarjeta de 460px. No se corrige, porque
hacerlo obliga a regrabar el recorrido entero en testnet, lo que genera una transacción nueva e
invalida el hash que cita la tabla de evidencias del README. Queda anotado como deuda de la web.

De la misma revisión: "13 %" pasó a "13%", porque convivía con "0.5%" en el mismo cuadro, y el
bloque "Se fija al desplegar" tenía los descendentes del titular apoyados en la primera línea del
cuerpo.

**Descartado con motivo:** el recuadro sobre la captura del explorador, que tapa la columna de
etiquetas a propósito para dejar a la vista el hash, la llamada al contrato y las firmas; el chip
claro bajo el logotipo de SUNAT, que el archivo a color necesita; y el contador rodando a mitad
de giro en el fotograma 60, que es un estado transitorio de la animación y no se percibe en
movimiento.

**Contrastado con las bases del evento (PDF del workshop, 55 páginas).** Los tres entregables
obligatorios están cubiertos: repositorio público con README, video de 2:38 contra un tope de 3
minutos, y contrato desplegado y verificable. De los seis criterios del jurado, el video cubre
problema real, Stellar como pieza central, demo funcional y el bonus de claridad. Queda sin
nombrar el track dentro del video, que sí está en el README. Y "ejecución" se evalúa mostrando el
producto funcionando en vivo en las jornadas presenciales, lo que es trabajo de ensayo, no de
montaje.

**Discrepancia sin resolver:** este PDF da seis criterios sin peso. La rúbrica con pesos que
registra la entrada del 19 de septiembre (funcionalidad 30, Stellar 25, originalidad 20,
viabilidad 15, documentación 10) no aparece en él. Puede venir de las bases, que son un documento
distinto y no lo tenemos. Queda por verificar cuál gobierna.

## 2026-09-21 · Video final publicado

Video final (2:38) en https://youtu.be/L0_wNoNNIJ0. Reemplaza al v7 (2:17) de la entrada del 19 de
septiembre, que mostraba el contrato anterior `CDGZLOQD…5YETA`. El final muestra el contrato vigente
`CCTU5SUS…X3EU` y la transacción `4668b6f3…c8f9` que cita la tabla de evidencias. El README ya no
remite al archivo local.

El formulario de entrega pide dos videos: uno de demo sin límite de duración, que es el que evalúa
el jurado, y uno de pitch de máximo 3 minutos que se proyecta en el Demo Day. Este sirve para los
dos: muestra el producto funcionando en grabación real y dura menos del tope.

Al preparar los textos del formulario apareció un dato viejo: decía 19 tests del contrato. Hoy son
23 (`contracts/split/src/test.rs`), tres de ellos con autenticación estricta vía `set_auths(&[])`
sin firma simulada: `withdraw_requires_the_freelancer_signature`,
`a_third_party_cannot_withdraw_someone_elses_reserve` y `pay_requires_the_payer_signature`.

## 2026-09-24 · Contrato v3 con recibo en la cadena (pausa de la noche)

Decidido por el usuario tras el jurado simulado (`rivals/06-jurado.md`, fuera del repo): aplicar las
cuatro líneas de mejora. Hecho y en commits locales `f803d1f` y `b9a9298`, sin push ni despliegue:

- Contrato v3 `CAWIYCJA…XDDF` (ledger 4842759): `issue()` con firma del freelancer, `pay()` solo
  sobre recibos emitidos y sin pagar. 31 tests. Evidencia en `evidencias/2026-09-24-contrato-v3/`.
- Cinco ataques rechazados en testnet (`web/scripts/rejections.mjs`), errores leídos del RPC.
- App: emisión al crear el link, página de pago que lee el recibo de la cadena, "Por cobrar",
  trustline antes de emitir, TTL de la reserva con `extend_reserve`, enlace `?demo`.
- README y `docs/arquitectura.md` reescritos. El video sigue mostrando el v2; el README lo dice.

Sin commit todavía: dos arreglos de la revisión de código (trustline comprobada al enviar, "Por
cobrar" leído del contrato), el texto nuevo de la portada y el retiro SEP-24 contra el ancla de
pruebas de SDF (`web/src/sep24.ts`, `web/e2e/sep24.mjs`). El SEP-24 falla después de enviar el
formulario del ancla: el panel no llega a mostrar el botón de envío. El ancla acepta de 1 a 10 USDC
por retiro (`/sep24/info`).

Descartado: pagador con passkey. No resuelve cómo entran los dólares del cliente y en testnet no
hay forma de cargar USDC a una smart wallet sin otra wallet.

Pendiente: terminar o cortar SEP-24, repetir e2e, actualizar cifras del panel de ejemplo en el
README (hoy 1,920 USDC y reserva 113.60, pero cambian con cada recorrido), commit, y push más
despliegue en Vercel con OK explícito del usuario. Desde el 1 de octubre el panel de ejemplo
queda vacío hasta volver a correr `seed-demo.mjs`.

## 2026-09-25 · Retiro SEP-24 con el ancla de pruebas y cierre del v3

- El fallo de la noche: al pasar el ancla a `pending_user_transfer_start` el panel seguía marcado
  como ocupado y no pintaba el botón de envío. Corregido en `web/src/panel.ts` (`pollSep24`).
- El ancla de pruebas acepta de 1 a 10 USDC por retiro (`/sep24/info`); la app lee esos límites y
  los dice en pantalla. Corrida completa de 5 USDC con estado final `completed`, hashes en
  `evidencias/2026-09-24-contrato-v3/origen.md`. Solo con Freighter: la passkey necesitaría SEP-45.
- La CSP de `web/vercel.json` no permitía `testanchor.stellar.org`; en producción el retiro habría
  quedado bloqueado. Agregado y comprobado sirviendo el build con esas cabeceras.
- Recorridos `passkey.mjs` y `record.mjs` repetidos tras los arreglos de la revisión: pasan.
- Cuenta del panel de ejemplo al cierre: 2,420 USDC en el mes, reserva 148.60 USDC. El README
  fecha esas cifras porque cambian cuando alguien paga el recibo pendiente.

## 2026-09-25 · Publicado el v3

Con OK explícito del usuario: push de `f803d1f`, `b9a9298` y `a24ee7c` a `main` (CI verde) y
despliegue de producción en Vercel. `vercel deploy --prod` no movió `honorarios-pe.vercel.app`,
que era un alias fijado a mano a un despliegue anterior; se reasignó con `vercel alias set` a
`web-1n95m7pb0-kevins-projects-03009f90.vercel.app`. Verificado en el dominio público: contrato
`CAWIYCJA…XDDF`, panel de ejemplo con reserva 148.60 USDC y pago a cuenta S/ 726, página de pago
de E001-4 por 180 USDC, CSP con el ancla de pruebas y sin violaciones. El panel de ejemplo tarda
entre 2.5 y 3.5 s en producción (cuatro mediciones); el README decía 2 y se corrigió a 3.

Video: la recomendación fue no rehacerlo, y el usuario no pidió rehacerlo. Muestra el v2, que sigue verificable, y un video nuevo cambiaría el
link que ya está en el formulario enviado.

## 2026-09-24 · Ensayo de la demo en vivo y capturas

Corrección de fecha: las dos entradas anteriores fechadas 2026-09-25 son del 24 de septiembre;
`date` en esta máquina dice jueves 24.

El usuario pidió que el ensayo lo hiciera Claude. `web/e2e/ensayo.mjs` recorrió la demo en el
dominio público con passkey: crear wallet 16.3 s, emitir recibo 10.6 s, pago 10.1 s, retiro
11.5 s. El pago lo firmó la cuenta de prueba desde local porque Freighter no existe sin interfaz.
Guion, tiempos y plan B en `docs/demo-en-vivo.md`; capturas en `docs/capturas/` y cinco de ellas
en el README. El usuario pidió no rotar ninguna clave.

## 2026-09-24 · Formulario de entrega actualizado

El usuario editó y guardó la entrega en la plataforma (editable hasta el 25 de septiembre, 11:59 p. m.
de Lima): descripción en una línea que abre con la reserva, "¿Cómo usa Stellar?" con el recibo en
la cadena, 31 tests, los ataques rechazados y SEP-24, evidencia on-chain apuntando al contrato v3
`CAWIYCJA…XDDF` y link de la app `https://honorarios-pe.vercel.app`. Los videos no cambiaron. La
edición la hizo el usuario; Claude no entró a la plataforma.
