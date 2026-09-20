<p><img src="brand/logo-1024-claro.png" width="72" alt="Honorarios"></p>

# Honorarios

Cobra a clientes del exterior en USDC sobre Stellar y separa automáticamente la reserva para tu pago a cuenta de cuarta categoría (SUNAT, Perú).

**App:** https://honorarios-pe.vercel.app · **Pitch (2:17):** https://www.youtube.com/watch?v=sALrFKb56xk · **Red:** Stellar testnet · **Track:** Real-World Assets & Compliant Rails

Proyecto para la hackathon Stellar Odyssey Perú (19 al 26 de septiembre de 2026). Todo el código se escribió durante el evento.

## Problema

Un freelancer peruano que cobra a clientes del exterior no tiene agente de retención. Si en el mes cobra más de S/ 4,010, le toca hacer por su cuenta el pago a cuenta del 8% (R.S. 000390-2025/SUNAT). Lo común es que cuando llega la fecha ese dinero ya se gastó, porque llegó mezclado con el resto del cobro.

## Solución

Un contrato Soroban recibe cada cobro en USDC y lo reparte en el mismo momento: el 92% va a la wallet del freelancer y el 8% queda reservado a su nombre dentro del contrato. Solo el freelancer puede retirar esa reserva, por ejemplo para pagar a SUNAT.

1. El freelancer crea su wallet con una passkey (huella o Face ID). No hay frase semilla y las comisiones las patrocina el relayer de SDF.
2. Genera un link de cobro con monto, N° de recibo y concepto, y se lo envía a su cliente.
3. El cliente paga con Freighter. Si no tiene USDC, la app lo compra con XLM mediante un path payment.
4. El contrato reparte 92/8 y emite un evento `Paid` con la referencia del recibo. La página que firma el cliente lee la comisión del contrato con `fee()` antes de mostrar el desglose, así que en pantalla aparece lo que el contrato va a hacer y no lo que el navegador supone.
5. El panel lee del contrato lo cobrado en el mes y estima el pago a cuenta (8% de las rentas de cuarta, si el total del mes supera S/ 4,010; cero si no), explica cómo se paga a SUNAT (Formulario Virtual 616, en soles) y arma un borrador del recibo por honorarios listo para copiar en SUNAT.

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

La tabla es la corrida que graba el video demo, de principio a fin y sin cortes. El video pitch usa su propia corrida contra el mismo contrato: wallet [`CD3P…FFOO`](https://stellar.expert/explorer/testnet/contract/CD3PIXX6S5MNQ6YXBB4XRERWGIWS56JB5CGA4YCJ4SUDZMGWEHLEFFOO), cobro [`1dc6e5f2…3ebf`](https://stellar.expert/explorer/testnet/tx/1dc6e5f29558665ed4bd51719b42c057176052bc696a3694853c01ea20e23ebf) y retiro [`7b947744…36e4`](https://stellar.expert/explorer/testnet/tx/7b947744797068ef3b9ffad33098e31f81ec34d55a774ede1fde09dd03f436e4).

| Qué | Enlace |
|---|---|
| Contrato | [`CCTU5SUS…X3EU`](https://stellar.expert/explorer/testnet/contract/CCTU5SUST4I6O5JIO6UHRGI2NW6FHWFNHVRGWPTKCGKCY7Z4X3CMX3EU) |
| Despliegue del contrato | [`2f2b281c…58f9`](https://stellar.expert/explorer/testnet/tx/2f2b281cbff0b063067e00b6f751fc1f504e7875f880456d29bb7a665d2f58f9) |
| Smart wallet creada con passkey | [`CCOE…PB4S`](https://stellar.expert/explorer/testnet/contract/CCOEUIDDOVYNHO4XMS2UOUVFD2S456DB3JTTY7YOJB2QVPV35FDXPB4S) |
| Cobro de 500 USDC: 460 al freelancer, 40 a la reserva, 0 de comisión | [`e89d764f…4923`](https://stellar.expert/explorer/testnet/tx/e89d764f0c60633546896a55cfdc113a52045bbca95b5bf578343375051c4923) |
| Retiro de la reserva firmado con passkey | [`da16e5ae…cc10`](https://stellar.expert/explorer/testnet/tx/da16e5ae79fd33b2a23642eb4b3a28f2dca06868d3d9cce21b7990b8f4dccc10) |

El flujo se puede repetir y cada corrida queda registrada en la cadena.

El panel de ejemplo de la app (botón "Ver un panel de ejemplo", sin instalar nada) lee esa misma
wallet en vivo. Para que enseñe el caso que justifica el producto, y no un mes por debajo del
umbral, se le añadieron dos cobros más contra el mismo contrato:
[`8956c26e…a47e`](https://stellar.expert/explorer/testnet/tx/8956c26e0a41c2e90bb77c36d26e8993f31ff10181645baeaa9ae611d2c6a47e) (620 USDC) y
[`dbc8f82c…abd5`](https://stellar.expert/explorer/testnet/tx/dbc8f82ca53471a8775384f634bb10389a58a6f2280b662e62143296204dabd5) (300 USDC).
Con los 500 del video son 1,420 USDC en el mes: S/ 5,325 y un pago a cuenta de S/ 426. La
reserva se queda corta frente a ese pago porque en la demo se retiraron 40 USDC antes del cierre
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
  --source-account <cuenta> --network testnet -- --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
```

Frontend:

```sh
cd web && npm install && npm run dev
npm test     # 26 tests: estimación del pago a cuenta y reparto del cobro
```

El link de cobro apunta al dominio de `VITE_PUBLIC_BASE` (ver `.env`), no a la máquina desde la que se genera: lo recibe un cliente en el extranjero.

Pruebas E2E en testnet. Usan un firmante de desarrollo que solo existe con `npm run dev` y lee llaves de testnet desde `web/.env.development.local` (fuera del repo):

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

**Este contrato está desplegado con la comisión en cero**, porque durante la hackathon no se cobra nada. No hay precio validado con usuarios y por eso no hay una cifra propuesta aquí: lo que existe es el mecanismo, auditable y con su límite escrito en el código. El contrato es MIT.

## De la reserva a SUNAT

SUNAT recibe soles, no USDC. El panel consulta en vivo el `stellar.toml` de un ancla que liquida soles por SEP-24 (Anclap, "Sol Digital" PEN) y lo muestra en el paso 1 de "Cómo se paga a SUNAT". Esa liquidación ocurre en la red principal; esta app corre en testnet, así que el retiro a un banco peruano no se ejecuta desde aquí.

## Límites conocidos

- Solo testnet. `smart-account-kit` y el relayer no tienen auditoría independiente, según su propio README.
- **El umbral se mide sobre todos tus ingresos del mes, no solo sobre lo que pasa por aquí.** El contrato solo puede sumar sus propios cobros, así que el panel pide a mano las otras rentas de cuarta, las de quinta y las retenciones ya practicadas. Con esos campos vacíos, el número que muestra se queda corto.
- El 8% es pago a cuenta, no impuesto final: en la declaración anual se recalcula sobre la renta neta y puede quedar saldo por pagar o a favor. La app no hace ese cálculo.
- El tope anual de suspensión son 8.75 UIT y el umbral mensual su doceava parte truncada; la UIT de 2026 (S/ 5,500) sí es fuente primaria, el [D.S. 301-2025-EF](https://busquedas.elperuano.pe/dispositivo/NL/2469116-1). La regla reproduce los montos de 2025 con la UIT de ese año, pero no hemos leído el texto de la resolución anual de SUNAT que los fija. La interfaz lo dice donde aparecen.
- `month_gross` cuenta lo que entra por el contrato y cualquiera puede pagar a nombre de un tercero, así que un extraño podría inflar ese acumulado regalando dinero. Es caro de hacer y no toca la reserva, pero el número no es resistente a manipulación.
- Las comisiones son gratis mientras el relayer público de SDF en testnet lo sea. No hay modelo de patrocinio en la red principal.
- La lógica tributaria está aislada en `web/src/tax.ts` y el reparto que se muestra antes de firmar en `web/src/split.test.ts`: 26 tests en total (`npm test`), más los 23 del contrato, todos en CI. El resto del frontend no tiene pruebas automatizadas: los archivos de `web/e2e/` son guiones de grabación, sin aserciones.
- Las rentas de cuarta por función de director, mandatario, regidor, síndico o albacea tienen un umbral mensual propio, más bajo, que no hemos verificado. El panel pregunta por ese caso y, si lo marcas, deja de estimar en vez de mostrar un "bajo el umbral" que no le corresponde.
- No encontramos una norma de SUNAT específica para honorarios cobrados en cripto. El tipo de cambio para medir el umbral lo ingresa el freelancer y la app no lo fija.
- La app no emite comprobantes: arma un borrador para copiar en SUNAT Operaciones en Línea.
- El ancla de soles vive en la red principal. Desde testnet solo se consulta su información, no se hace el retiro.
- La reserva del 8% es preventiva: si el mes no supera S/ 4,010 no hay pago a cuenta y el freelancer puede retirarla al cierre del mes. Con clientes peruanos que retienen, la retención se descuenta del pago del mes.
- La comisión del servicio se fija al desplegar y no se puede cambiar después. Un cambio de precio obliga a desplegar otro contrato, lo que es honesto con el usuario pero incómodo de operar.
- La cuenta que recibiría la comisión es, en este despliegue, la misma cuenta de pruebas que desplegó el contrato. Con la comisión en cero nunca recibe nada.
- El detalle de cada cobro se reconstruye desde los eventos del RPC, que en testnet guarda alrededor de una semana. Pasado ese plazo el panel lo dice de forma explícita y sigue mostrando las cifras del mes y la reserva, que viven en el contrato y no caducan, pero el borrador del recibo de un cobro antiguo deja de poder generarse.
- El borrador del recibo pregunta si el cliente está domiciliado en Perú, porque de eso depende que haya retención. No trae el monto mínimo a partir del cual el agente retiene: no lo tenemos contrastado y hay que verificarlo.
- El campo de retenciones ya practicadas no está acotado: un número mal escrito reduce el pago estimado y la app no lo cuestiona, porque las retenciones pueden venir de pagadores que no pasan por aquí.
- La reserva es una ayuda de organización y no reemplaza la asesoría de un contador.

## Licencia

[MIT](LICENSE)
