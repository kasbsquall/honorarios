# Guion v12 · re-speech

Cambios sobre v11, de la tercera ronda.

**El precio vuelve al video.** v11 gastó una escena entera en la arquitectura del cobro sin
decir cuánto cuesta. El inversor salió sin saberlo, y estaba en el README.

**La red de pruebas sale del hook.** Estaba incrustada en la frase de apertura, que es lo
mejor del video, y llegaba como una advertencia legal sin traducir. Pasa al final de la
escena 1, dicha en cristiano.

**Se reparte el peso.** Tres escenas cargaban el triple de información que el resto. La de
la regla y el precio se queda en dos ideas; la del panel pierde una; la de los límites gana.

**Stellar se explica la primera vez que se nombra**, y el test en rojo desaparece, porque
para quien no programa un rojo en pantalla significa que algo falla.

## Pieza 1 · Pitch (~2:15)

| # | id | narración | qué se ve |
|---|---|---|---|
| 1 | cold | Quinientos dólares entran. Cuatrocientos sesenta llegan a tu cuenta y cuarenta quedan guardados para el impuesto que te va a tocar. Una transacción, seis segundos. Todavía con dinero de prueba, y el reparto es exactamente el que vas a ver. | El reparto a pantalla completa. |
| 2 | brand | Honorarios. Cobra afuera, declara tranquilo. | Marca. |
| 3 | problem | Si le facturas a un cliente de fuera del país, nadie te descuenta impuestos. Cobras completo y la cuenta llega después. Pasando los cuatro mil diez soles en el mes, SUNAT te pide adelantar el ocho por ciento, y para entonces ya te lo gastaste. | S/ 4,010 grande y quieto, dos segundos. |
| 4 | pay | Tu cliente abre un link y paga en minutos, sin bancos de por medio, porque el dinero viaja por Stellar, una red de pagos abierta. | El pago, con producto real en pantalla. |
| 5 | chain | Y queda el comprobante público: quinientos entraron, cuatrocientos sesenta a su cuenta, cuarenta al guardado. | Explorador con rótulo traduciendo las tres cifras. |
| 6 | regla | Quien reparte es un programa que vive en esa red. Guarda ese ocho por ciento a tu nombre, donde solo entras tú, y su regla no la cambia nadie, ni nosotros. Por eso puedes confiarle tus impuestos sin confiar en nosotros. | La regla en el código, sin tests en pantalla. |
| 7 | precio | Cobramos medio por ciento, solo cuando cobras. El tope de uno está escrito en ese mismo programa, así que tampoco podemos subirlo. Hoy corre en cero. | El tope, y el 0,5% grande. |
| 8 | panel | Tu panel lee lo que llevas cobrado y estima lo que vas a deber. El umbral no lo inventamos: son los cuatro mil diez soles del artículo tres de la resolución que SUNAT publicó en diciembre para este ejercicio. Si eres director el tuyo es más bajo, y la app lo aplica. | Panel completo, enlace a la resolución visible. |
| 9 | honesto | Estima, no declara. El mes se mide sobre todo lo que ganaste, así que si cobraste por fuera tienes que decírselo. Hasta que lo confirmes, no te dice que estás tranquilo. | El aviso de "falta confirmar" en pantalla. |
| 10 | region | Perú solo no es un negocio: da menos de cien mil dólares al año, y lo sabemos. Entramos por aquí porque es la norma más difícil. México, Colombia y Argentina tienen el mismo adelanto y muchos más freelancers en dólares. Para cada país hay que reescribir el programa y su norma. Lo que no cambia es Stellar. | Un contrato por bandera sobre el mismo riel, y la cifra de Perú escrita. |
| 11 | falta | Y falta lo que más pesa: nadie ha declarado todavía con esto, seguimos en la red de pruebas, y convertir a soles en tu banco es el tramo que no construimos. | Tres líneas, ocho segundos. |
| 12 | close | Honorarios. Cobra afuera, declara tranquilo. | End card, URL y QR, cinco segundos. |

## Correcciones de exactitud verificadas contra el código

- **El año de la resolución.** Es de diciembre de 2025 y rige el ejercicio 2026. En la escena
  cuyo argumento es "no lo inventamos, lo citamos", equivocarlo sería el peor sitio.
- **"Desde donde esté".** El cliente paga con una extensión de escritorio. La frase describía
  una app que todavía no existe.
- **La portabilidad regional.** El 8% y el cierre de mes en hora de Lima están escritos en el
  contrato, que la escena anterior presume inmutable. Cambiar de país obliga a desplegar otro
  contrato, no a tocar cien líneas. Decirlo mal contradecía al propio código.

## Lo que se quitó, y por qué

- **La escena que resumía el reparto en abstracto.** La primera ya lo demuestra con cifras
  concretas, y el jurado que no sabe del tema entendió el producto ahí. Repetirlo costaba
  doce segundos y no añadía nada.

- **Las dos pruebas de firma.** Eran literales y ciertas, y a quien no programa no le dicen
  nada. Viven en el README y en el demo.
- **El test en rojo de la escena 7 de v11.** Se lee como un fallo.
- **"Cien líneas de cálculo".** Le hablaba de esfuerzo de programación a un jurado que
  pregunta por barreras regulatorias.

## Pieza 2 · Demo (~2:30)

**A pantalla completa, 1920x1080 nativos.** La actual es una grabación reducida en un lienzo
negro y proyectada no se lee.

**El explorador sube al minuto uno**, con rótulo que traduce lo que se ve.

1. Huella digital, cuenta creada, sin frase que apuntar.
2. Link de cobro y el cliente pagando.
3. **El explorador, con rótulo:** registro público, 460 a tu cuenta, 40 al guardado.
4. El panel: lo cobrado, el umbral con su cita, el estimado, el aviso de confirmar.
5. El borrador del recibo.
6. El retiro con la huella.
