# Guion v11 · re-speech

Tres cambios estructurales sobre v10, todos de la segunda ronda de jurado.

**Cabe en su tiempo.** v10 medía 398 palabras, que son 2:36 a 3:04 dichas, no los 2:10 que
prometía. v11 son ~300 palabras, que a 155 por minuto dan 1:56 de voz y unos 2:10 con pausas.

**Se acaba la contradicción de la red de pruebas.** v10 decía "esto pasó de verdad" en el
minuto uno y confesaba en el dos que no mueve dinero real. Ahora se dice al principio, una
vez, y deja de ser una confesión tardía.

**El producto aparece antes.** En v10 el primer píxel de software llegaba al 40% de la pieza.
Aquí llega al segundo 32.

## Pieza 1 · Pitch (~2:10)

| # | id | narración | qué se ve |
|---|---|---|---|
| 1 | cold | Quinientos dólares entran. Cuatrocientos sesenta llegan a tu cuenta y cuarenta quedan guardados para el impuesto que te va a tocar. Una transacción, seis segundos, en la red de pruebas de Stellar. | El reparto a pantalla completa. |
| 2 | brand | Honorarios. Cobra afuera, declara tranquilo. | Marca. |
| 3 | problem | Si le facturas a un cliente de fuera del país, nadie te descuenta impuestos. Cobras completo y la cuenta llega después. Pasando los cuatro mil diez soles en el mes, SUNAT te pide adelantar el ocho por ciento, y para entonces ese dinero ya se gastó. | S/ 4,010 grande y quieto, dos segundos. |
| 4 | solution | Honorarios parte el cobro cuando entra. Noventa y dos por ciento a tu cuenta, ocho por ciento guardado a tu nombre, donde solo entras tú. | Diagrama del reparto. |
| 5 | pay | Tu cliente abre un link y paga desde donde esté, en minutos, sin banco de por medio. Eso es lo que hace falta una red como Stellar y no una cuenta de ahorros. | El pago, en pantalla, ya con producto real. |
| 6 | chain | Y queda el comprobante público: quinientos entraron, cuatrocientos sesenta salieron a su cuenta, cuarenta al guardado. | Explorador con un rótulo encima traduciendo las tres cifras. |
| 7 | regla | La regla del reparto está en el contrato y no la puede mover nadie, ni nosotros. La comisión del servicio tiene un tope de uno por ciento escrito ahí mismo, y hoy corre en cero. | El tope en el código y el test que lo rechaza, en rojo. |
| 8 | panel | Tu panel lee de la red lo que llevas cobrado y estima lo que vas a deber. El umbral no lo inventamos: son los cuatro mil diez soles del artículo tres de la resolución de SUNAT de este año. Si eres director o síndico el tuyo es más bajo, tres mil doscientos ocho, y la app lo aplica. | Panel completo, el enlace a la resolución visible. |
| 9 | honesto | Estima, no declara. El mes se mide sobre todo lo que ganaste, así que si cobraste por fuera tienes que decírselo, y hasta que lo confirmes no te dice que estás tranquilo. Sacar el dinero guardado pide tu firma, y dos pruebas del contrato fijan que nadie más pueda. | El aviso de "falta confirmar" en pantalla. |
| 10 | region | El mismo adelanto existe en México, Colombia y Argentina. Lo que cambia por país son cien líneas de cálculo. | Tres banderas sobre el mismo contrato. |
| 11 | falta | Falta lo de siempre: salir de la red de pruebas y el tramo de convertir a soles en tu banco. | Una línea, cinco segundos. |
| 12 | close | Honorarios. Cobra afuera, declara tranquilo. | End card, URL y QR, cinco segundos. |

## Correcciones de exactitud respecto a v10

- **Los tests.** v10 decía "treinta y una" para el cálculo del impuesto. Son 24 del cálculo,
  7 del reparto y 23 del contrato. v11 solo afirma las dos pruebas de firma, que es literal.
- **El cambio de moneda.** v10 decía que Stellar cambia "la moneda equivocada". El código solo
  soporta XLM como origen. v11 no lo menciona.
- **El panel.** v10 decía "te dice cuánto vas a deber". Estima, y se queda corto si el usuario
  no declara sus otras rentas. La escena 9 lo dice en voz alta.

## Pieza 2 · Demo (~2:30)

**A pantalla completa, 1920x1080 nativos.** La actual es una grabación reducida en un lienzo
negro y proyectada no se lee.

**El explorador sube al minuto uno**, con un rótulo que traduce lo que se ve, porque un hash
solo no prueba nada a quien no es del gremio.

1. Huella digital, cuenta creada, sin frase que apuntar.
2. Link de cobro y el cliente pagando.
3. **El explorador, con rótulo:** registro público, 460 a tu cuenta, 40 al guardado.
4. El panel: lo cobrado, el umbral con su cita, el estimado, el aviso de confirmar.
5. El borrador del recibo.
6. El retiro con la huella.

## Jerga eliminada

wallet, testnet, constructor, desplegar, USDC, Freighter, hash, cadena, riel, dólar digital,
apartado como sustantivo. "Guardado" se usa siempre igual y se explica en la primera frase.
