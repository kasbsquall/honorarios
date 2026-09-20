<p><img src="brand/logo-1024-claro.png" width="72" alt="Honorarios"></p>

# Honorarios

Cobra a clientes del exterior en USDC sobre Stellar y separa automáticamente la reserva para tu pago a cuenta de cuarta categoría (SUNAT, Perú).

**App:** https://honorarios-pe.vercel.app · **Video (2:38):** pendiente de subir a YouTube · el archivo es `honorarios-1080p.mp4`, en la raiz · **Red:** Stellar testnet · **Track:** Real-World Assets & Compliant Rails

Proyecto para la hackathon Stellar Odyssey Perú (19 al 26 de septiembre de 2026). Todo el código se escribió durante el evento.

## Problema

Un freelancer peruano que cobra a clientes del exterior no tiene agente de retención. Si en el mes cobra más de S/ 4,010, le toca hacer por su cuenta el pago a cuenta del 8% (artículo 86 del TUO de la LIR; el umbral es el del artículo 3.a de la [R.S. 000390-2025/SUNAT](https://www.sunat.gob.pe/legislacion/superin/2025/000390-2025.pdf), con copia en `evidencias/`). Lo común es que cuando llega la fecha ese dinero ya se gastó, porque llegó mezclado con el resto del cobro.

## Solución

Un contrato Soroban recibe cada cobro en USDC y lo reparte en el mismo momento: el 92% va a la wallet del freelancer y el 8% queda reservado a su nombre dentro del contrato. Solo el freelancer puede retirar esa reserva, por ejemplo para pagar a SUNAT.

1. El freelancer crea su wallet con una passkey (huella o Face ID). No hay frase semilla y las comisiones las patrocina el relayer de SDF.
2. Genera un link de cobro con monto, N° de recibo y concepto, y se lo envía a su cliente.
3. El cliente paga con Freighter. Si no tiene USDC, la app lo compra con XLM mediante un path payment.
4. El contrato reparte 92/8 y emite un evento `Paid` con la referencia del recibo. La página que firma el cliente lee la comisión del contrato con `fee()` antes de mostrar el desglose, así que en pantalla aparece lo que el contrato va a hacer y no lo que el navegador supone.
5. El panel lee del contrato lo cobrado en el mes y estima el pago a cuenta (8% de las rentas de cuarta, si el total del mes supera S/ 4,010, o S/ 3,208 si son rentas de director, síndico, mandatario, gestor de negocios, albacea o regidor; cero si no), explica cómo se paga a SUNAT (Formulario Virtual 616, en soles) y arma un borrador del recibo por honorarios listo para copiar en SUNAT.

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

La tabla es la corrida que se ve en el video, de principio a fin y sin cortes: la wallet se crea
en el minuto 0:31 y el retiro ocurre en el 1:48.

| Qué | Enlace |
|---|---|
| Contrato | [`CCTU5SUS…X3EU`](https://stellar.expert/explorer/testnet/contract/CCTU5SUST4I6O5JIO6UHRGI2NW6FHWFNHVRGWPTKCGKCY7Z4X3CMX3EU) |
| Despliegue del contrato | [`2f2b281c…58f9`](https://stellar.expert/explorer/testnet/tx/2f2b281cbff0b063067e00b6f751fc1f504e7875f880456d29bb7a665d2f58f9) |
| Smart wallet creada con passkey en el video | [`CATN…J5FR`](https://stellar.expert/explorer/testnet/contract/CATNE6YKD72P5OTSW5N6U3SR7AOAQ7R5GQYVX66B6VKV5IDIY6R7J5FR) |
| Cobro de 500 USDC: 460 al freelancer, 40 a la reserva, 0 de comisión | [`4668b6f3…c8f9`](https://stellar.expert/explorer/testnet/tx/4668b6f344a715d3cdd3f943ff398873c657241a3fb8ffed1efe4c3efc03c8f9) |
| Retiro de la reserva firmado con passkey | [`b47aa15e…d913`](https://stellar.expert/explorer/testnet/tx/b47aa15ee86b4df29336159ee89d5fad2b441afae61cf9037eb38d73782d913e) |

El flujo se puede repetir y cada corrida queda registrada en la cadena.

El panel de ejemplo de la app (botón "Ver un panel de ejemplo", sin instalar nada) lee en vivo
otra wallet, [`CCOE…PB4S`](https://stellar.expert/explorer/testnet/contract/CCOEUIDDOVYNHO4XMS2UOUVFD2S456DB3JTTY7YOJB2QVPV35FDXPB4S). Para que enseñe el caso que justifica el producto, y no un mes por debajo del
umbral, se le añadieron dos cobros más contra el mismo contrato:
[`8956c26e…a47e`](https://stellar.expert/explorer/testnet/tx/8956c26e0a41c2e90bb77c36d26e8993f31ff10181645baeaa9ae611d2c6a47e) (620 USDC) y
[`dbc8f82c…abd5`](https://stellar.expert/explorer/testnet/tx/dbc8f82ca53471a8775384f634bb10389a58a6f2280b662e62143296204dabd5) (300 USDC).
Con un cobro de 500 son 1,420 USDC en el mes: S/ 5,325 y un pago a cuenta de S/ 426. La
reserva se queda corta frente a ese pago porque en esa cuenta se retiraron 40 USDC antes del cierre
del mes, que es justo lo que la app advierte que no conviene hacer. El script que los generó es
`web/scripts/seed-demo.mjs`.

USDC testnet (Circle): `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.

## Arquitectura

Diagramas de componentes, flujo de cobro y retiro: [docs/arquitectura.md](docs/arquitectura.md).

```
contracts/split/   contrato Soroban (Rust) y sus 23 tests
web/               frontend (Vite + TypeScript): pay.html y panel
web/src/tax.ts     estimación del pago a cuenta, aislada de la interfaz y con sus tests
web/e2e/           guiones de Playwright que ejecutan el flujo en testnet y lo graban
design/            tres propuestas de identidad visual
docs/              arquitectura y bitácora de decisiones
```

## Contrato

| Función | Autoriza | Qué hace |
|---|---|---|
| `pay(payer, freelancer, gross, receipt_ref)` | `payer` | 8% del bruto a la reserva, la comisión del servicio si la hay, el resto al freelancer, evento `Paid` |
| `fee()` | lectura | Comisión del servicio con la que se desplegó el contrato, y a dónde va |
| `tax_reserve(freelancer)` | lectura | Saldo reservado |
| `month_gross(freelancer, period)` | lectura | Bruto cobrado en un mes, para comparar con el umbral |
| `current_period()` | lectura | Periodo tributario del ledger actual |
| `withdraw_tax(freelancer, to, amount)` | `freelancer` | Mueve la reserva, evento `TaxWithdrawn` |
| `extend_reserve(freelancer)` | nadie | Renueva el TTL de una reserva inactiva, sin mover fondos |

El mes tributario cierra a medianoche de Lima, no en UTC, porque es el mes que SUNAT mide. La reserva redondea hacia arriba: ante un céntimo de duda, sobra en la reserva y no falta. El acumulado del mes vive en el contrato, así el panel no depende de cuántos eventos guarde el RPC. Rechaza montos ≤ 0, retiros mayores a la reserva, pagos donde el freelancer es el pagador o el propio contrato, y N° de recibo de más de 32 caracteres. La reserva renueva su TTL en cada operación.

## Ejecutar

Contrato:

```sh
rustup target add wasm32v1-none
cargo test
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/split.wasm \
  --source-account <cuenta> --network testnet -- \n  --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA \n  --fee_bps 0 --fee_to <cuenta que recibiria la comision>
```

Frontend:

```sh
cd web && npm install && npm run dev
npm test     # 31 tests: estimación del pago a cuenta y reparto del cobro
```

El link de cobro apunta al dominio de `VITE_PUBLIC_BASE` (ver `web/.env.example`), no a la máquina desde la que se genera: lo recibe un cliente en el extranjero.

Guiones de recorrido en testnet, sin aserciones: sirven para grabar y para comprobar a ojo que el flujo completo sigue funcionando. Usan un firmante de desarrollo que solo existe con `npm run dev` y lee llaves de testnet desde `web/.env.development.local` (fuera del repo):

```sh
node web/e2e/record.mjs    # cobro con Freighter
node web/e2e/passkey.mjs   # passkey con autenticador WebAuthn virtual
node web/e2e/demo.mjs      # recorrido completo, grabado sin cortes para el video
```

Dos utilidades más, desde `web/`:

```sh
node scripts/check-demo.mjs   # ¿la wallet del panel de ejemplo cobró en el contrato vigente?
node scripts/seed-demo.mjs    # cobros reales para que el panel de ejemplo cruce el umbral
```

`check-demo` existe porque un redespliegue del contrato dejó esa constante apuntando a un
despliegue muerto y el panel de ejemplo mostró ceros hasta que alguien lo abrió.

## Trabajo hecho durante el evento

Todo el repositorio. El historial de commits empieza el 19 de septiembre de 2026 y [docs/bitacora.md](docs/bitacora.md) registra cada decisión con su fuente: elección del proyecto, tasa y umbral tributario, liquidez de USDC en testnet, passkeys, revisión de seguridad y redespliegue del contrato.

## Cómo se sostiene

**0.5% por cobro liquidado, sin cuota mensual.** Con los supuestos de abajo, Perú solo da entre
US$ 10,500 y US$ 67,000 al año: es un negocio de una persona, y lo decimos. El caso grande es que
el pago a cuenta sin agente de retención es el mismo problema en México, Colombia y Argentina,
donde hay un orden de magnitud más de freelancers dolarizados. El rail de Stellar no cambia entre
países; lo que se reescribe es el contrato y la norma que cita. Perú es la cuña.

Precio, tamaño de mercado con sus fuentes, y la lista de lo que **no** sabemos:
[docs/negocio.md](docs/negocio.md).

En corto: 0.5% por cobro liquidado, sin cuota mensual. El contrato puede cobrar una comisión por cobro liquidado, que sale del bruto junto al neto y la reserva. La página de pago la lee de la cadena con `fee()` y la muestra desglosada antes de que el cliente firme. Está implementada y probada: `fee_bps` se fija al desplegar, tiene un tope duro de 1% que el constructor rechaza superar, el evento `Paid` publica cuánto se cobró, y la función `fee()` deja el valor a la vista de cualquiera antes de usar el contrato. La reserva del 8% nunca se toca con la comisión.

**Este contrato está desplegado con la comisión en cero**, porque durante la hackathon no se cobra nada. El 0.5% es una propuesta sin validar: no hemos hecho ni una entrevista de precio, y eso está en la lista de lo que falta. Lo que sí existe es el mecanismo, auditable y con su límite escrito en el código. El contrato es MIT.

## Qué de esto ya existe

Apartar un porcentaje para el impuesto en el momento del cobro no es una idea nueva. En Estados
Unidos lo hacen [Found](https://found.com/taxes) y Lili partiendo cada depósito al entrar, y
[Qapital](https://www.qapital.com/blog/qapital-freelancer-rule-taxes/) lo tiene como regla desde
2015. Found además paga los estimados trimestrales al IRS desde dentro de la app, que es justo la
pieza que aquí falta. En cripto, los contratos de reparto de pagos con envío de una parte a una
segunda dirección llevan años funcionando en EVM, y en Stellar hay proyectos de reparto y de
nómina para freelancers.

Lo que no encontramos hecho es la parte peruana: la tasa del 8% y el mes tributario que cierra a
medianoche de Lima dentro del contrato, los cuatro umbrales del artículo 3 de la resolución
citados con su número en vez de derivados de la UIT, el caso del inciso b) del artículo 33 con su
umbral propio, y el borrador del recibo por honorarios. Eso es localización, no una primitiva
nueva, y conviene decirlo así: el mecanismo está resuelto en otras partes y lo que aporta este
proyecto es aterrizarlo en una norma concreta, con la fuente a la vista.

## Lo que este proyecto no ha resuelto

- **Encender el precio obliga a desplegar otro contrato.** `fee_bps` se fija en el constructor y no
  hay setter, ni admin, ni upgrade. Está desplegado en cero. La consecuencia, que no estaba escrita
  hasta ahora: las reservas vivas y el acumulado del mes quedan en el contrato viejo, así que un
  cambio de precio parte el estado de cada usuario en dos justo en el número que se compara contra
  el umbral. La alternativa sensata sería una comisión modificable con el mismo tope duro de 1%, un
  plazo de espera antes de que aplique y un evento que lo anuncie, de modo que quien no esté de
  acuerdo pueda retirar antes. No está implementado.
- **Custodiar fondos de terceros tiene consecuencias regulatorias en Perú.** La administración de
  activos virtuales convierte al prestador en sujeto obligado ante la UIF. Que el contrato sea
  inmutable y que solo el dueño pueda retirar es un argumento defendible para sostener que aquí no
  hay custodia discrecional, pero es un argumento, no un análisis legal, y no lo hemos hecho.
- **Cero entrevistas de precio.** El 0.5% sale de comparar con lo que cobra un procesador de pagos,
  no de preguntarle a nadie.

## De la reserva a SUNAT

SUNAT recibe soles, no USDC. El panel consulta en vivo el `stellar.toml` de un ancla que liquida soles por SEP-24 (Anclap, "Sol Digital" PEN) y lo muestra en el paso 1 de "Cómo se paga a SUNAT". Esa liquidación ocurre en la red principal; esta app corre en testnet, así que el retiro a un banco peruano no se ejecuta desde aquí.

## Límites conocidos

- Solo testnet. `smart-account-kit` y el relayer no tienen auditoría independiente, según su propio README.
- **El umbral se mide sobre todos tus ingresos del mes, no solo sobre lo que pasa por aquí.** El contrato solo puede sumar sus propios cobros, así que el panel pide a mano las otras rentas de cuarta, las de quinta y las retenciones ya practicadas. Con esos campos vacíos, el número que muestra se queda corto.
- El 8% es pago a cuenta, no impuesto final: en la declaración anual se recalcula sobre la renta neta y puede quedar saldo por pagar o a favor. La app no hace ese cálculo.
- Los cuatro umbrales se copian del artículo 3 de la [R.S. 000390-2025/SUNAT](https://www.sunat.gob.pe/legislacion/superin/2025/000390-2025.pdf) (copia en `evidencias/2026-09-20-resolucion-umbral/`): S/ 4,010 y S/ 48,125 en el régimen general, S/ 3,208 y S/ 38,500 para las rentas del inciso b) del art. 33. Hasta el 20 de septiembre los derivábamos de la UIT y la app avisaba de ello; ahora se citan.
- `month_gross` cuenta lo que entra por el contrato y cualquiera puede pagar a nombre de un tercero, así que un extraño podría inflar ese acumulado regalando dinero. Ese pago también aumenta la reserva ([`lib.rs:162`](contracts/split/src/lib.rs)), con dinero del atacante y bajo la llave del freelancer, así que el daño no es un robo sino un acumulado inflado que exagera la estimación del mes. El número no es resistente a manipulación.
- Las comisiones son gratis mientras el relayer público de SDF en testnet lo sea. No hay modelo de patrocinio en la red principal.
- La lógica tributaria está aislada en `web/src/tax.ts` y el reparto que se muestra antes de firmar en `web/src/split.test.ts`: 31 tests en total (24 del cálculo tributario y 7 del reparto, `npm test`), más los 23 del contrato, todos en CI. El resto del frontend no tiene pruebas automatizadas: los archivos de `web/e2e/` son guiones de grabación, sin aserciones.
- Las rentas de cuarta por función de director, mandatario, regidor, síndico, albacea o gestor de negocios tienen umbral propio, S/ 3,208 al mes. El panel pregunta por ese caso y aplica ese umbral, no el general.
- No encontramos una norma de SUNAT específica para honorarios cobrados en cripto. El tipo de cambio para medir el umbral lo ingresa el freelancer y la app no lo fija.
- La app no emite comprobantes: arma un borrador para copiar en SUNAT Operaciones en Línea.
- El ancla de soles vive en la red principal. Desde testnet solo se consulta su información, no se hace el retiro.
- La reserva del 8% es preventiva: si el mes no supera S/ 4,010 no hay pago a cuenta y el freelancer puede retirarla al cierre del mes. Con clientes peruanos que retienen, la retención se descuenta del pago del mes.
- `extend_reserve` está escrita en el contrato y el frontend no la llama nunca. Renueva el TTL de
  una reserva sin mover fondos, así que una reserva inactiva unos treinta días queda archivada y
  el panel muestra el estado de error genérico, sin camino de restauración. La salida de
  emergencia existe y no está conectada a la puerta.
- Un freelancer que entra con Freighter y cuya cuenta no tiene trustline de USDC puede generar un
  link de cobro que se ve bien y falla al firmar. El error lo ve su cliente, no él. Con smart
  wallet no ocurre, porque los balances del SAC no necesitan trustline.
- La comisión del servicio se fija al desplegar y no se puede cambiar después. Un cambio de precio obliga a desplegar otro contrato, lo que es honesto con el usuario pero incómodo de operar.
- La cuenta que recibiría la comisión es, en este despliegue, la misma cuenta de pruebas que desplegó el contrato. Con la comisión en cero nunca recibe nada.
- El detalle de cada cobro se reconstruye desde los eventos del RPC, que en testnet guarda alrededor de una semana. Pasado ese plazo el panel lo dice de forma explícita y sigue mostrando las cifras del mes y la reserva, que viven en el contrato y no caducan, pero el borrador del recibo de un cobro antiguo deja de poder generarse.
- El borrador del recibo pregunta si el cliente está domiciliado en Perú, porque de eso depende que haya retención. No trae el monto mínimo a partir del cual el agente retiene: no lo tenemos contrastado y hay que verificarlo.
- El campo de retenciones ya practicadas no está acotado: un número mal escrito reduce el pago estimado y la app no lo cuestiona, porque las retenciones pueden venir de pagadores que no pasan por aquí.
- La reserva es una ayuda de organización y no reemplaza la asesoría de un contador.

## Licencia

[MIT](LICENSE)
