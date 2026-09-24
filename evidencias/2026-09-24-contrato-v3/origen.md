# Contrato v3: recibos emitidos en la cadena

Transacciones enviadas a Stellar testnet el 24 de septiembre de 2026 desde esta máquina, con las
cuentas de prueba de `web/.env.development.local`. Salen de `web/scripts/seed-demo.mjs`,
`web/scripts/rejections.mjs` y de los guiones `web/e2e/passkey.mjs` y `web/e2e/record.mjs`. Los
códigos de error se leyeron de los eventos de diagnóstico que devuelve el RPC de testnet
(`getTransaction`).

Contrato: `CAWIYCJAOXFIL5XHIIXK34XOSLSFTLUU5LP6JEL65QECGZM5WATUXDDF`, desplegado en el ledger
4842759 por la tx `471d45ca39453b968d1f0ce90af83719661f75030887d18e35b3b5e3547f7e41`.

Cuenta del panel de ejemplo (freelancer): `GCY5LQWZD36VIBSH6PSJOHJK4F3LSNFPTMJMRH7UWKI5L4PPKCXZHSSA`.
Cliente de prueba: `GAHH46EELOC673LW6UHWBQH3ZODMD3KZUZAAICJ7IK56MILIGUCDE5U2`.

## Flujo válido

| Paso | Transacción |
|---|---|
| Emite E001-1, 500 USDC | `e5b157ecba4b2d608610b3642b4dec111c0e2ac88842a58fe275c8ae6f564d01` |
| Paga E001-1 | `0fcccf3bf36bcee412c70f5ff72e2828a815360c60282c539a67c2627d19c68f` |
| Emite E001-2, 620 USDC | `72a80657ab40b4c2b32f145cb40870ed5dda9a72ea34e5bd8b71ae11d5ec5f57` |
| Paga E001-2 | `394b9bdf1f81e9e3c7e010fe0511ff1c3e1ea08cbce617951570918cf9fc22dd` |
| Emite E001-3, 300 USDC | `9c4026663f8e55fd9746bea4f452171acef0ce6e0e9a920e14559010972cb3d6` |
| Paga E001-3 | `448507ba79689de811e1f8de800137d8120f40282ea35b6f14d08ba8c4177569` |
| Emite E001-4, 180 USDC, queda sin pagar | `cceda239d89fc6a87471546c1ed75a9e13aac7e18a3385bda49f7b3c7ad79f09` |
| Retira 40 USDC de la reserva | `3832f863b2e8d13b83a076d7dc92d88393041f00ed7360265cd9ce8a362f426f` |
| Paga E001-668, 500 USDC (guion `record.mjs`, emitido con firma de Freighter) | `0f171e5135431f19e41bc0dcbb88529bb7bb875c51777f430233952dce27450d` |

Estado leído con `check-demo.mjs` tras este bloque: bruto del mes 1,920.00 USDC, reserva 113.60 USDC. Cambió después, ver abajo.

Recorrido con passkey (`passkey.mjs`, autenticador WebAuthn virtual, wallet
`CCKBHO3XD6R7SPFCRWZ3SGFB6QYQHMSCABOXTUUKP4LLYEADL6HKWWVP`): emisión
`3ca133a095cf45f41500aa1061dfa2e89b30bedc71fc732ff92f33402c6917a7`, pago
`51f402ea6f6389cfff25e686b95bd58fc32d11fc6751f9a08d5c4a5713ce8f10`, retiro con passkey
`55d10bf3a29f5f8d766c350544090787b74d7c195c316160e1e3b36748451866`.

## Ataques rechazados por la red

| Intento | Transacción | Ledger | Error |
|---|---|---|---|
| Un tercero retira la reserva del freelancer firmando por sí mismo | `c53e7694b8644a4062e5a45b108de5311494eecef70a7e47c63ccbf29ddf4fa5` | 4842839 | `Error(Auth, InvalidAction)` |
| El freelancer retira 1 unidad más de lo reservado | `14e63df7fefb5e09f72868b859320b5ddde2c6c268da575e2e01dc1d52f9a208` | 4842840 | `Error(Contract, #2)` InsufficientReserve |
| Un extraño emite un recibo de 5,000 USDC a nombre del freelancer | `6eb4fc4c1b1acffb8250ce34dd0bb845906f8ac669b7e7aa9410f9e5a6ccbb2d` | 4842841 | `Error(Auth, InvalidAction)` |
| El cliente paga un recibo que nadie emitió (E001-99) | `912ebbc85c90db2836aa5ceee6ea634f58a84ba64f72fbf51b5ea709449c9df0` | 4842842 | `Error(Contract, #7)` UnknownReceipt |
| El cliente paga otra vez E001-1, ya pagado | `63698263136ef2bca29ce9ab49689c03a4449785623e51412dce432a0160ee45` | 4842843 | `Error(Contract, #8)` AlreadyPaid |

## Retiro por el ancla de pruebas de SDF (SEP-24)

Guion `web/e2e/sep24.mjs`, cuenta del panel de ejemplo, 5 USDC. En el formulario del ancla se
pusieron datos ficticios (el ancla de pruebas no valida identidad ni mueve dinero real). El ancla
acepta de 1 a 10 USDC por retiro según su `https://testanchor.stellar.org/sep24/info`.

| Paso | Transacción |
|---|---|
| Retiro de 5 USDC de la reserva a la propia cuenta | `ab8235898915356276d3e59d23a5fec6915b75e2f2df31cb10fab3a8e3029e6c` |
| Pago de 5 USDC al ancla con el memo del retiro | `ab6c7806f6cd8bacaffdd777ad0a34ca5fa75db4d6cd1c20c5cf95782153e39b` |

Estado final que devolvió el ancla: `completed`.

## Recorridos repetidos tras la revisión de código

`passkey.mjs`: wallet `CBFYIHAX5TGGKTVEZBIANZBNLQYBUTISTQQIXLLTE5WGFGWYGNA7KVMN`, emisión
`49473884b1e55051b15b6b0dae78aff30f768a789fe76a1cd9ab72566c3f22d4`, pago
`950b7b7fd7d1dc927a71c7229f3f1841db3f21a4e639b27176998ccec7a20567`, retiro con passkey
`08e29091d3b3421e49c94b692e0bdedc54b7a459a65444f0d2c4834c7574fcf5`.

`record.mjs`: recibo E001-114 emitido con Freighter y pagado,
`3b638479f746a5d29ee95e05de719d7860550822819e4c93e213ff41c11f285f`.

Estado de la cuenta del panel de ejemplo al cierre: bruto del mes 2,420.00 USDC, reserva 148.60 USDC.
