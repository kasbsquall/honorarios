# Guion v13 · final

Último pase. Los cambios vienen de la ronda sobre v12, donde los dos jurados coincidieron
en lo mismo: el video terminaba pidiendo disculpas.

**Lo que falta deja de ser lo último que se oye.** Estaba en la penúltima escena, así que la
frase que quedaba grabada era "nadie lo ha usado todavía". Sube al minuto uno, justo después
del comprobante, que es el momento de mayor confianza de la pieza. Mismo contenido, y ahora
el video acaba en producto.

**El tramo medio se parte.** Eran cuatro escenas de párrafo seguidas, unos 75 segundos sin
un respiro visual. Ahora lo que falta y el panel se intercalan entre las explicaciones.

**El precio pasa a tener aritmética.** "Medio por ciento" no es un negocio hasta que se dice
sobre cuánto. Va con un ejemplo, marcado como ejemplo.

**Se corrige un redondeo propio.** v12 decía "menos de cien mil dólares al año" cuando
nuestro propio rango estimado es de diez mil a sesenta y siete mil, y encima construido sobre
un supuesto que el documento marca como conjetura. Decir el rango cuesta lo mismo.

**Desaparece "el guardado"** como sustantivo. Era un término inventado por el video y se
repetía tres veces como si el espectador ya lo conociera.

## Pieza 1 · Pitch

| # | id | narración | qué se ve |
|---|---|---|---|
| 1 | cold | Quinientos dólares entran. Cuatrocientos sesenta llegan a tu cuenta y cuarenta se quedan separados para el impuesto que te va a tocar. Una transacción, seis segundos. Todavía con dinero de prueba, y el reparto es el mismo que verás. | El reparto a pantalla completa. |
| 2 | brand | Honorarios. Cobra afuera, declara tranquilo. | Marca. |
| 3 | problem | Si le facturas a un cliente de fuera del país, nadie te descuenta impuestos. Cobras completo y la cuenta llega después. Pasando los cuatro mil diez soles en el mes, SUNAT te pide adelantar el ocho por ciento, y para entonces ya te lo gastaste. | S/ 4,010 grande y quieto, dos segundos. |
| 4 | pay | Tu cliente abre un link y paga en minutos, sin bancos de por medio, porque el dinero viaja por Stellar, una red de pagos abierta. | El pago, con producto real. |
| 5 | chain | Y queda el comprobante público: quinientos entraron, cuatrocientos sesenta a su cuenta, cuarenta a la parte del impuesto. | Explorador con rótulo traduciendo las tres cifras. |
| 6 | falta | Eso ya funciona. Lo que falta, dicho de frente: seguimos en la red de pruebas, nadie ha declarado todavía con esto, y convertir a soles en tu banco es el tramo que no construimos. El siguiente hito es el primer freelancer que declare de verdad. | Tres líneas. Ocho segundos. |
| 7 | regla | Quien reparte es un programa que vive en esa red, y nadie puede tocar tu parte del impuesto. Tampoco nosotros. | Una sola idea en pantalla. |
| 8 | panel | Tu panel lee lo que llevas cobrado y estima lo que vas a deber. El umbral no lo inventamos: son los cuatro mil diez soles del artículo tres de la resolución que SUNAT publicó en diciembre para este ejercicio. Si eres director el tuyo es más bajo, y la app lo aplica. | Panel completo, enlace a la resolución visible. |
| 9 | honesto | Estima, no declara. El mes se mide sobre todo lo que ganaste, así que si cobraste por fuera tienes que decírselo. Hasta que lo confirmes, no te dice que estás tranquilo. | El aviso de "falta confirmar" en pantalla. |
| 10 | precio | Cobramos medio por ciento de lo que cobras, y solo cuando cobras. Quien factura dos mil dólares al mes paga ciento veinte al año. El tope de uno por ciento está escrito en el mismo programa, así que para subirlo tendríamos que desplegar otro y convencerte de mudarte. Hoy corre en cero. | El 0,5% grande y el tope. |
| 11 | region | Perú solo da entre diez y sesenta y siete mil dólares al año, con supuestos nuestros que están escritos. Entramos por aquí porque es la norma más difícil. México, Colombia y Argentina tienen el mismo adelanto y muchos más freelancers en dólares. Por cada país se reescribe el programa y su norma; Stellar no cambia. | Un contrato por bandera sobre el mismo riel. |
| 12 | close | Honorarios. Cobra afuera, declara tranquilo. | End card, URL y QR, cinco segundos. |

## Correcciones de exactitud verificadas contra el código

- **El año de la resolución.** Es de diciembre de 2025 y rige el ejercicio 2026. En la escena
  cuyo argumento es "no lo inventamos, lo citamos", equivocarlo sería el peor sitio.
- **"Desde donde esté".** El cliente paga con una extensión de escritorio. La frase describía
  una app que todavía no existe.
- **La portabilidad regional.** El 8% y el cierre de mes en hora de Lima están escritos en el
  contrato. Cambiar de país obliga a desplegar otro, no a tocar cien líneas.
- **El rango de Perú.** Es de 10,500 a 67,000 dólares al año en `docs/negocio.md`, sobre un
  supuesto que ese documento marca como conjetura. El video lo dice como rango.
- **Los tests.** No se nombran. Son 24 del cálculo, 7 del reparto y 23 del contrato, y viven
  en el README, donde se pueden contar.

## Pieza 2 · Demo

**A pantalla completa, 1920x1080 nativos.** La actual es una grabación reducida en un lienzo
negro y proyectada no se lee. Ese es el defecto más caro de todo el paquete.

**El explorador sube al minuto uno**, con rótulo que traduce lo que se ve.

1. Huella digital, cuenta creada, sin frase que apuntar.
2. Link de cobro y el cliente pagando.
3. **El explorador, con rótulo:** registro público, 460 a tu cuenta, 40 a la parte del impuesto.
4. El panel: lo cobrado, el umbral con su cita, el estimado, el aviso de confirmar.
5. El borrador del recibo.
6. El retiro con la huella.
