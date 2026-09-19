# Honorarios · Arquitectura y flujo

Stellar Odyssey Perú. Última revisión: 19 de septiembre de 2026.

Honorarios permite que un freelancer peruano cobre a clientes del exterior en USDC sobre Stellar. Un contrato Soroban reparte cada cobro en el momento: 92% al freelancer y 8% en una reserva a su nombre para el pago a cuenta de cuarta categoría (SUNAT). Solo el freelancer puede retirar esa reserva.

## 1. Componentes

```mermaid
flowchart TB
  CL["Cliente en el exterior<br/>Freighter · cuenta G…"]
  PG["pay.html<br/>link de pago"]
  POOL["Pool XLM / USDC<br/>path payment"]
  H["Contrato Honorarios<br/>CDGZLOQD…5YETA"]
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

Errores: `InvalidAmount` (monto ≤ 0), `InsufficientReserve` (retiro mayor a la reserva), `InvalidParty` (el freelancer es el pagador o el propio contrato) y `ReceiptRefTooLong` (N° de recibo de más de 32 caracteres). La reserva y la instancia renuevan su TTL a ~30 días en cada `pay` y `withdraw_tax`. Guarda además el bruto cobrado por mes (`month_gross`), que es lo que se compara con el umbral de SUNAT. Cubiertos por 19 tests en `contracts/split/src/test.rs`, tres de ellos de autorización sin `mock_all_auths`.

## 6. Evidencia en testnet

| Qué | Enlace |
|---|---|
| Contrato | [CDGZLOQD…5YETA](https://stellar.expert/explorer/testnet/contract/CDGZLOQDUVBC4SCX5HCNRCJ3OF56Y5SNBY2RP22CI7PSCR7CX245YETA) |
| Despliegue | [bf81a604…88cf](https://stellar.expert/explorer/testnet/tx/bf81a604603564519e1d4af8b3dd366a0dcafbcc258359ddfd7429e877ef88cf) |
| Smart wallet con passkey de la demo | [CD6E…7GXD](https://stellar.expert/explorer/testnet/contract/CD6EERWSWJMP4AIKW2E6ZIGO7FWLMX45IWZFJKGBZ4X6VOCYGV5K7GXD) |
| Cobro de 500 USDC con compra de USDC vía XLM | [1c41c40d…3e13](https://stellar.expert/explorer/testnet/tx/1c41c40d51f335f4a4c39b3b246748e675ca4cccfb38f4c243a7194aa6143e13) |
| Retiro de reserva firmado con passkey | [76aca849…86b9](https://stellar.expert/explorer/testnet/tx/76aca84969e050b397aafae6cce7372d6bfd59bc32dc1f14a63b0d0ffd5d86b9) |

Todos los enlaces salen de la misma corrida, la que se ve en el video demo.

## 7. Qué falta hasta la entrega

- (Hecho) Borrador del recibo por honorarios por cada cobro, para copiar al emitirlo en SUNAT.
- (Hecho) Video demo, README final, acumulado mensual en el contrato y consulta en vivo del ancla de soles.
- Subir el video a YouTube y enviar el formulario de entrega.

## Límites conocidos

- `smart-account-kit` y el relayer no tienen auditoría independiente (lo indica su propio README). Uso solo en testnet.
- No encontramos norma de SUNAT específica para honorarios cobrados en cripto. El tipo de cambio lo define el freelancer y la app no lo fija.
- La reserva es una ayuda de organización y no reemplaza a un contador.
