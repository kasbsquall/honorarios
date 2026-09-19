# Honorarios · storyboard v1

Evento: Stellar Odyssey Perú. Video demo de máximo 3 minutos. Rúbrica: funcionalidad 30, uso de Stellar 25, originalidad 20, viabilidad 15, documentación 10.
Duración objetivo: ~2:20. Voz en español peruano. Subtítulos quemados. Fondo oscuro cálido (#141412), acento bermellón.
Frase fija (3 veces): "Cobra afuera. Declara tranquilo."

| # | Escena | s | Narración | Prueba en pantalla |
|---|---|---|---|---|
| 0 | Apertura en frío | 7 | Quinientos dólares. Cuatrocientos sesenta para ti. Cuarenta apartados para tu pago a cuenta. En el mismo segundo. | Talón real de 500 USDC que se parte en 460 y 40, con el hash `261cfebe…` |
| 1 | Marca | 4 | Honorarios. Cobra afuera. Declara tranquilo. | Logo (anillo 92/8) y wordmark |
| 2 | Problema | 16 | Si eres freelancer en Perú y tus clientes están afuera, nadie te retiene impuestos. Pero si en un mes cobras más de cuatro mil diez soles, te toca pagar el ocho por ciento a SUNAT por tu cuenta. Y ese dinero llegó mezclado con todo lo demás. | Contador a S/ 4,010, medidor, fuente R.S. 000390-2025/SUNAT |
| 3 | Solución | 10 | Honorarios pone un contrato en Stellar entre tu cliente y tú. Cada cobro se reparte solo: noventa y dos por ciento a tu wallet, ocho por ciento a una reserva que solo tú puedes mover. | Barra 92/8 que se dibuja; firma de `pay()` y `withdraw_tax()` |
| 4 | Wallet con passkey | 18 | Empiezas con tu huella. Se crea una smart wallet sin frase semilla y sin pagar comisiones. | Grabación real: crear wallet con passkey, dirección C… aparece |
| 5 | Link y pago | 24 | Creas un link de cobro con monto y número de recibo. Tu cliente lo abre, conecta Freighter y paga en USDC. Si solo tiene XLM, la app lo convierte en el camino. | Grabación real: link, pago, confirmación con enlace a Stellar Expert |
| 6 | Prueba on-chain | 12 | El reparto pasa dentro del contrato, en una sola transacción. Cualquiera lo puede verificar. | Captura de Stellar Expert: tx con transferencias 460 / 40 y evento Paid |
| 7 | Panel y regla real | 20 | Tu panel lee los cobros directo de la red. Calcula tu pago a cuenta real del mes: el ocho por ciento del total si pasas el umbral, cero si no. Y te dice cómo pagarlo: en soles, con el Formulario 616. | Grabación del panel: bloque de pago a cuenta, pasos 616, borrador de recibo en dólares |
| 8 | Retiro con passkey | 10 | Cuando toca pagar, retiras la reserva firmando con tu huella. | Grabación: retiro, tx `417f8def…` |
| 9 | Cómo usa Stellar + hecho en el evento | 12 | Soroban, USDC de Circle, path payments, smart accounts con passkeys y el relayer de la Stellar Development Foundation. Todo construido esta semana. | Lista con iconos; montaje de commits desde el 19/09 |
| 10 | Cierre | 10 | Honorarios. Cobra afuera. Declara tranquilo. | URL + QR, repo, "Testnet. La app no emite comprobantes." |

Límites que se declaran en pantalla: testnet; el borrador de recibo no se emite desde la app; el 8% es reserva preventiva.
