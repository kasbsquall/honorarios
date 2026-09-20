# Instrucciones para agentes

Honorarios: un contrato Soroban que parte cada cobro en USDC de un freelancer peruano en neto y
reserva para el pago a cuenta de cuarta categoría, y una app Vite que lee ese estado de la cadena.

Este archivo era la plantilla de ejemplo de Soroban y describía un contrato `hello_world` que
nunca existió aquí. Lo que sigue es el proyecto real.

## Estructura

- `contracts/split/src/lib.rs` — el contrato, `#![no_std]`
- `contracts/split/src/test.rs` — tests de host
- `web/src/` — la app: `stellar.ts` (red), `panel.ts` (panel del freelancer), `pay.ts` (página
  que abre el cliente), `tax.ts` (cálculo del pago a cuenta), `rhe.ts` (borrador del recibo)
- `docs/` — arquitectura, negocio y bitácora de decisiones
- `video/` — guion, síntesis de voz y montaje en Remotion

## Contrato

```sh
cargo test                    # desde contracts/split
stellar contract build        # artefacto de despliegue, en target/wasm32v1-none/release/
```

El artefacto que se despliega se genera con `stellar contract build`, que aplica los metadatos que
la red espera. El CI usa `cargo build --target wasm32v1-none` porque ahí solo interesa saber si
compila, y así no hace falta instalar el CLI de Stellar en el runner. Para desplegar, `cargo build`
no sirve.

El constructor recibe tres argumentos: el SAC del USDC, la comisión en puntos básicos y la wallet
que la recibe. La comisión queda fija en el despliegue y tiene un tope duro de 1% que el propio
constructor rechaza superar.

## Frontend

```sh
cd web && npm install && npm run dev
npm test                      # 31 tests: cálculo tributario y reparto
npx tsc --noEmit
```

Las llaves de desarrollo viven en `web/.env.development.local`, fuera del repositorio, y el
firmante de desarrollo solo existe con `npm run dev`.

## Reglas de este repositorio

- **Ningún dato tributario sin fuente.** Los umbrales y la tasa se copian de la resolución citada,
  con el PDF en `evidencias/`. Si algo no se puede citar, va a la lista de límites conocidos del
  README y no se afirma en la interfaz.
- **La app estima, no declara.** Nada en la interfaz puede dar a entender que presenta o paga algo
  ante SUNAT.
- **Nunca pintar un valor por defecto mientras se carga.** Un cero o un guion durante el fetch
  afirma algo falso sobre el dato; se usa un esqueleto.
- **Cada decisión que no sea obvia se escribe en `docs/bitacora.md`**, con su fuente y su fecha.
  La bitácora no se reescribe: si algo cambia, se añade una entrada que anula la anterior.
- Sin emojis en el código, la interfaz ni los mensajes de commit.

## Referencias

- https://developers.stellar.org/docs/build/smart-contracts/overview
