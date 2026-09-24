# Demo en vivo · guion, tiempos y plan B

Ensayado el 24 de septiembre de 2026 contra https://honorarios-pe.vercel.app con
`web/e2e/ensayo.mjs`: passkey con autenticador WebAuthn virtual, contrato v3. El único paso que
no corrió en producción es la firma del cliente con Freighter, que un navegador sin interfaz no
tiene; ese pago se firmó con la cuenta de prueba desde `npm run dev`, contra el mismo contrato y
el mismo recibo.

## Tiempos medidos

| Paso | Segundos |
|---|---|
| Abrir la portada | 1.0 |
| Crear la wallet con passkey (despliegue vía relayer de SDF) | 16.3 |
| Emitir el recibo con passkey | 10.6 |
| Abrir el link del cliente | 1.1 |
| Pago del cliente (conectar, preparar USDC, firmar) | 10.1 |
| El link muestra el recibo pagado | 2.1 |
| Panel con el cobro y la reserva | 3.6 |
| Retirar la reserva con passkey | 11.5 |
| Panel de ejemplo (`/?demo`) | 2.6 |

Suman unos 58 segundos de espera de red. Con la narración, el recorrido completo entra en unos
3 minutos. Las transacciones del ensayo están en `evidencias/2026-09-24-contrato-v3/origen.md`.

## Qué preparar antes

1. **Un navegador con Freighter en testnet para el cliente**, con una cuenta fondeada con XLM
   (se fondea gratis con friendbot, `https://friendbot.stellar.org/?addr=<cuenta>`). No hace falta USDC: la página de pago lo
   compra con XLM y agrega la trustline en la misma firma. Conviene una ventana o perfil aparte
   del que usa la passkey, para que se vea que son dos personas.
2. **La passkey del freelancer en el dispositivo de la demo.** Crear la wallet en vivo tarda unos
   16 segundos; si se prefiere ahorrarlos, crearla antes y entrar con "Ya tengo passkey".
3. **Comprobar el panel de ejemplo:** desde `web/`, `node scripts/check-demo.mjs`. Desde el 1 de
   octubre el mes nuevo empieza en cero y el panel de ejemplo sale vacío hasta volver a correr
   `node scripts/seed-demo.mjs`, que necesita las llaves de prueba de `web/.env.development.local`.
4. Tener abiertas en pestañas: el panel de ejemplo, el contrato en Stellar Expert y una de las
   transacciones rechazadas del README.

## Guion

1. **Portada.** Una frase: el 8% de cada cobro del exterior queda apartado para el pago a cuenta de
   SUNAT, y solo el freelancer lo puede mover.
2. **Crear la wallet con passkey** (16 s). Mientras espera: no hay frase semilla y las comisiones
   las paga el relayer de SDF.
3. **Emitir el recibo** con monto, N° y concepto (11 s). Mientras espera: el recibo queda en el
   contrato, y el cliente solo puede pagar ese monto, una vez.
4. **Abrir el link en el navegador del cliente.** El monto y el concepto salen de la cadena.
5. **Pagar con Freighter** (10 s más las firmas). Mostrar el reparto 92/8 en el talón.
6. **Volver al panel.** La reserva aparece a nombre del freelancer, con hasta cuándo la guarda la
   red.
7. **Abrir `/?demo`.** Un mes que cruza el umbral: pago a cuenta estimado en soles, la reserva que
   se quedó corta y el recibo pendiente.
8. **Cerrar con una transacción rechazada** en Stellar Expert: alguien intentó pagar dos veces el
   mismo recibo y la red lo impidió.

Si sobra tiempo, el retiro por el ancla de pruebas (SEP-24) funciona con Freighter desde "Cómo se
paga a SUNAT"; toma dos firmas más y el formulario del ancla.

## Plan B

| Si falla | Qué hacer |
|---|---|
| El relayer de SDF (no se crea la wallet o no se emite el recibo) | Entrar con "Prefiero usar Freighter" con una cuenta de freelancer que tenga trustline de USDC. Si no la tiene, la app ofrece agregarla antes de emitir |
| Freighter del cliente | Mostrar el recibo pendiente del panel de ejemplo y el pago ya hecho de un recibo pagado, que la página de pago enseña con su transacción |
| El RPC de testnet está lento o caído | Panel de ejemplo si responde; si no, el video (https://youtu.be/L0_wNoNNIJ0) y las transacciones del README, que Stellar Expert muestra aunque el RPC falle |
| No hay internet | Solo el video descargado. Llevarlo en local |

## Capturas

Tomadas en producción durante el ensayo, en `docs/capturas/`:

| Archivo | Qué muestra |
|---|---|
| `01-portada.png` | Portada |
| `02-recibo-emitido.png` | Recibo emitido en la cadena y su link |
| `03-pago-pendiente.png` | Lo que ve el cliente antes de pagar |
| `04-pago-hecho.png` | El mismo link después del pago |
| `05-panel-con-cobro.png` | Panel del freelancer con el cobro y la reserva |
| `06-panel-de-ejemplo.png` | Panel de ejemplo con un mes que cruza el umbral |
| `07-pago-a-cuenta.png` | Estimado del pago a cuenta en soles |
| `08-por-cobrar.png` | Recibos emitidos y sin pagar |
| `09-ataque-rechazado.png` | Segundo pago del mismo recibo, fallido en Stellar Expert |
