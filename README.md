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
5. El panel lee del contrato lo cobrado en el mes y calcula el pago a cuenta real (8% del total si supera S/ 4,010, cero si no), explica cómo se paga a SUNAT (Formulario Virtual 616, en soles) y arma un borrador del recibo por honorarios listo para copiar en SUNAT.

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

Es la misma corrida que se ve en el video demo, de principio a fin.

| Qué | Enlace |
|---|---|
| Contrato | [`CD7M4P64…E4YL`](https://stellar.expert/explorer/testnet/contract/CD7M4P64BBNWUCTWIGRHFHSRPI3GH2PFREUPAESETG36KCVQODKYE4YL) |
| Despliegue del contrato | [`bf81a604…88cf`](https://stellar.expert/explorer/testnet/tx/bf81a604603564519e1d4af8b3dd366a0dcafbcc258359ddfd7429e877ef88cf) |
| Smart wallet creada con passkey en la demo | [`CCZ2…FJVT`](https://stellar.expert/explorer/testnet/contract/CCZ2DVYZXP2PENOEDIFUMK5RXG44TVILVKAGC76XEHYYLRMD4YC5FJVT) |
| Cobro de 500 USDC (460 neto, 40 reserva), el cliente compró USDC con XLM | [`90ab3000…6832`](https://stellar.expert/explorer/testnet/tx/90ab3000636518aa5f7936d78770cc432cabb74a2dacabab6f4f90cf893e6832) |
| Retiro de la reserva firmado con passkey | [`55a1bd3e…2101`](https://stellar.expert/explorer/testnet/tx/55a1bd3e256829967120c1ddffd5b76405c5e304689bdc1ca754f0f8154c2101) |

USDC testnet (Circle): `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.

## Arquitectura

Diagramas de componentes, flujo de cobro y retiro: [docs/arquitectura.md](docs/arquitectura.md).

```
contracts/split/   contrato Soroban (Rust) y sus 14 tests
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
| `month_gross(freelancer, period)` | lectura | Bruto cobrado en un mes, para comparar con el umbral |
| `current_period()` | lectura | Periodo tributario del ledger actual |
| `withdraw_tax(freelancer, to, amount)` | `freelancer` | Mueve la reserva, evento `TaxWithdrawn` |

El acumulado del mes vive en el contrato, así el panel no depende de cuántos eventos guarde el RPC. Rechaza montos ≤ 0, retiros mayores a la reserva, pagos donde el freelancer es el pagador o el propio contrato, y N° de recibo de más de 32 caracteres. La reserva renueva su TTL en cada operación.

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

## Cómo se sostiene

El plan es cobrar una comisión pequeña por cada cobro liquidado, que paga el freelancer solo cuando cobra. Todavía no hay precio validado con usuarios y por eso no aparece ninguna cifra aquí. El contrato es MIT y cualquiera puede auditarlo.

## De la reserva a SUNAT

SUNAT recibe soles, no USDC. El panel consulta en vivo el `stellar.toml` de un ancla que liquida soles por SEP-24 (Anclap, "Sol Digital" PEN) y lo muestra en el paso 1 de "Cómo se paga a SUNAT". Esa liquidación ocurre en la red principal; esta app corre en testnet, así que el retiro a un banco peruano no se ejecuta desde aquí.

## Límites conocidos

- Solo testnet. `smart-account-kit` y el relayer no tienen auditoría independiente, según su propio README.
- No encontramos una norma de SUNAT específica para honorarios cobrados en cripto. El tipo de cambio para medir el umbral lo ingresa el freelancer y la app no lo fija.
- La app no emite comprobantes: arma un borrador para copiar en SUNAT Operaciones en Línea.
- El ancla de soles vive en la red principal. Desde testnet solo se consulta su información, no se hace el retiro.
- La reserva del 8% es preventiva: si el mes no supera S/ 4,010 no hay pago a cuenta y el freelancer puede retirarla al cierre del mes. Con clientes peruanos que retienen, la retención se descuenta del pago del mes.
- La reserva es una ayuda de organización y no reemplaza la asesoría de un contador.

## Licencia

[MIT](LICENSE)
