# Honorarios · Arquitectura y flujo

Checkpoint de Stellar Odyssey Perú, 23 de septiembre de 2026.

Honorarios permite que un freelancer peruano cobre a clientes del exterior en USDC sobre Stellar. Un contrato Soroban reparte cada cobro en el momento: 92% al freelancer y 8% en una reserva a su nombre para el pago a cuenta de cuarta categoría (SUNAT). Solo el freelancer puede retirar esa reserva.

## 1. Componentes

```mermaid
flowchart TB
  CL["Cliente en el exterior<br/>Freighter · cuenta G…"]
  PG["pay.html<br/>link de pago"]
  POOL["Pool XLM / USDC<br/>path payment"]
  H["Contrato Honorarios<br/>CAJAMA32…BXSG"]
  RES["Reserva 8%<br/>queda en el contrato"]
  SW["Smart wallet del freelancer<br/>cuenta C… · passkey"]
  D["Panel del freelancer<br/>index.html"]
  R["Relayer SDF<br/>paga comisiones"]

  CL --> PG
  PG -->|"si falta USDC: compra con XLM"| POOL
  PG -->|"pay(payer, freelancer, gross, ref)"| H
  H -->|"92% neto en USDC"| SW
  H -->|"8%"| RES
  D -.->|"lee tax_reserve y eventos Paid"| H
  D -->|"withdraw_tax firmado con passkey"| R
  R -->|"envía y paga la comisión"| RES
```

## 2. Flujo de un cobro

```mermaid
sequenceDiagram
  autonumber
  actor FL as Freelancer
  participant D as Panel
  actor CL as Cliente
  participant PG as Link de pago
  participant W as Freighter
  participant N as Stellar (Horizon / RPC)
  participant H as Contrato Honorarios

  FL->>D: Crea wallet con passkey
  D->>N: Despliega smart wallet vía relayer
  FL->>D: Monto, N° de recibo y concepto
  D-->>FL: Link pay.html?to=C…&amount=…&ref=…
  FL->>CL: Envía el link
  CL->>PG: Abre el link
  PG->>W: Conectar (testnet)
  alt El cliente no tiene USDC suficiente
    PG->>W: Firmar change_trust + path_payment_strict_receive
    W->>N: XLM → USDC por el pool
  end
  PG->>W: Firmar pay(payer, freelancer, gross, ref)
  W->>H: pay()
  H->>H: tax = gross × 8%, net = gross − tax
  H->>N: transfer(payer → freelancer, net)
  H->>N: transfer(payer → contrato, tax)
  H-->>N: Evento Paid {freelancer, payer, gross, net, tax, ref}
  PG-->>CL: Pagado, link a stellar.expert
  D->>N: getEvents(Paid, freelancer) + tax_reserve()
  D-->>FL: Talón del cobro, reserva y umbral mensual
```

## 3. Retiro de la reserva

```mermaid
sequenceDiagram
  autonumber
  actor FL as Freelancer
  participant D as Panel
  participant K as smart-account-kit
  participant R as Relayer SDF
  participant H as Contrato Honorarios

  FL->>D: Destino y monto a retirar
  D->>K: withdraw_tax(freelancer, to, amount)
  K->>FL: Pide la passkey
  FL-->>K: Firma WebAuthn (secp256r1)
  K->>R: {func, auth} firmados
  R->>H: Envía la transacción y paga la comisión
  H->>H: freelancer.require_auth(), amount ≤ reserva
  H-->>D: Evento TaxWithdrawn
```

## 4. Qué vive en la cadena y qué no

| On-chain (Soroban) | Off-chain (navegador) |
|---|---|
| Reparto 92/8 y transferencias de USDC | Link de pago y sus parámetros |
| Reserva por freelancer (`TaxReserve(Address)`) | Tipo de cambio que ingresa el freelancer |
| Eventos `Paid` y `TaxWithdrawn` | Cálculo del umbral mensual de S/ 4,010 |
| Autorización del retiro (`require_auth`) | Sesión de la passkey (IndexedDB) |

El contrato no guarda montos en soles ni tipos de cambio. La regla tributaria que usa es solo la tasa de 8%, porque es la del pago a cuenta de cuarta categoría. El umbral de S/ 4,010 (R.S. 000390-2025/SUNAT) se calcula en el panel con el tipo de cambio que declara el propio freelancer.

## 5. Contrato

| Función | Autoriza | Efecto |
|---|---|---|
| `__constructor(token)` | despliegue | Fija el USDC SAC |
| `pay(payer, freelancer, gross, receipt_ref)` | `payer` | Neto al freelancer, 8% al contrato, emite `Paid` |
| `tax_reserve(freelancer)` | lectura | Saldo reservado |
| `withdraw_tax(freelancer, to, amount)` | `freelancer` | Mueve reserva, emite `TaxWithdrawn` |

Errores: `InvalidAmount` (monto ≤ 0), `InsufficientReserve` (retiro mayor a la reserva), `InvalidParty` (el freelancer es el pagador o el propio contrato) y `ReceiptRefTooLong` (N° de recibo de más de 32 caracteres). La reserva y la instancia renuevan su TTL a ~30 días en cada `pay` y `withdraw_tax`. Cubiertos por 9 tests en `contracts/split/src/test.rs`.

## 6. Evidencia en testnet

| Qué | Enlace |
|---|---|
| Contrato | [CAJAMA32…BXSG](https://stellar.expert/explorer/testnet/contract/CAJAMA32YRPYHG5ZT2WDIRLRLPBTCKOXGOJNHIQ3IEMDUDXHGNYGBXSG) |
| Cobro de 500 USDC desde el link de pago | [261cfebe…83e9](https://stellar.expert/explorer/testnet/tx/261cfebeb681d143338f855bbfc10833b249ee0289aa15fe035305ec250583e9) |
| Smart wallet con passkey | [CBNKXPVM…XHUP](https://stellar.expert/explorer/testnet/contract/CBNKXPVM3XT5OJJSP6AQKIOYYKECMCGJEZLGB4LZB2XJ35AHWSUXXHUP) |
| Cobro de 200 USDC a la smart wallet | [f93ea435…e0e6](https://stellar.expert/explorer/testnet/tx/f93ea435cd96e2e344973fd4e16fc44041eacb0a2a0f79e33d383ff59a9ae0e6) |
| Retiro de reserva firmado con passkey | [417f8def…2a2b](https://stellar.expert/explorer/testnet/tx/417f8defb56b14054d22ae63a45d711a60189d3227d69eb67be0c310492c2a2b) |

## 7. Qué falta hasta la entrega (25 de septiembre)

- (Hecho) Borrador del recibo por honorarios por cada cobro, para copiar al emitirlo en SUNAT.
- Video demo y README final.

## Límites conocidos

- `smart-account-kit` y el relayer no tienen auditoría independiente (lo indica su propio README). Uso solo en testnet.
- No encontramos norma de SUNAT específica para honorarios cobrados en cripto. El tipo de cambio lo define el freelancer y la app no lo fija.
- La reserva es una ayuda de organización y no reemplaza a un contador.
