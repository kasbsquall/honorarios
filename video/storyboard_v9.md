# Guion v9 · re-speech

Dos piezas. El pitch se reestructura, el demo se regraba entero a pantalla completa.

## Pieza 1 · Pitch (~2:15)

Cambios respecto a v8: el bloque de negocio sube del 2:05 al 1:25, entra un tramo
nuevo de "lo que no sabemos" antes del cierre, y el umbral permanece en pantalla
dos segundos completos la primera vez que se nombra.

| # | id | narración | qué se ve |
|---|---|---|---|
| 1 | cold | Quinientos dólares entran. Cuatrocientos sesenta llegan a tu cuenta y cuarenta se quedan apartados para tu impuesto. Una sola transacción, seis segundos. | El reparto animándose en pantalla completa. Sin logo todavía. |
| 2 | brand | Honorarios. Cobra afuera, declara tranquilo. | Marca. |
| 3 | problem | Si facturas al extranjero, nadie te retiene nada. Tú cobras completo y el impuesto aparece después. Pasando los cuatro mil diez soles en el mes, SUNAT te pide un pago a cuenta del ocho por ciento. Para entonces el dinero ya se gastó. | El umbral S/ 4,010 grande, quieto, dos segundos. |
| 4 | solution | Honorarios mete un contrato de Stellar entre tu cliente y tú. El cobro se parte en el momento de cobrar: noventa y dos por ciento a tu wallet, ocho por ciento a una reserva que solo tú puedes mover. | Diagrama del reparto. |
| 5 | pay | Tu cliente abre un link y paga con su wallet. Si tiene XLM y no USDC, Stellar lo convierte en el camino. | Captura del pago. |
| 6 | chain | El contrato reparte en una sola llamada y deja el rastro público. Este hash es de una transacción real en testnet. | Explorador, hash legible. |
| 7 | panel | Tu panel lee lo cobrado desde la red, lo pasa a soles y te dice cuánto debes este mes. Si no llega al umbral, dice cero. Si no puede leer la cadena, no dice nada, que es lo que hay que hacer cuando no se sabe. | Panel a pantalla completa. |
| 8 | negocio | Cómo se sostiene: el contrato puede cobrar medio por ciento por cobro liquidado, con un tope de uno por ciento escrito en el constructor. Hoy está desplegado en cero. El precio se fija al desplegar y no se puede cambiar después, y eso es a propósito. | fee() en el código y el test del tope. |
| 9 | code | La reserva solo se mueve con tu firma. Veintitrés pruebas del contrato lo fijan, y veintisiete más cubren el cálculo del impuesto. | Suite de tests corriendo. |
| 10 | limites | Lo que todavía no sabemos. Esto está en testnet y no mueve dinero real. El umbral lo derivamos de la UIT y cuadra con lo que SUNAT publicó los dos últimos años, pero no hemos leído la resolución que lo fija, y lo decimos en la propia pantalla. Y falta el tramo de USDC a soles. | Los tres avisos, tal como salen en la app. |
| 11 | close | Honorarios. Cobra afuera, declara tranquilo. Está en línea, el código está abierto. | End card, URL y QR, cinco segundos. |

## Pieza 2 · Demo (~2:30)

Un solo cambio estructural y uno de forma, ambos grandes.

**Forma:** se graba a pantalla completa, 1920x1080 nativos. La versión actual es una
grabación reducida dentro de un lienzo negro y proyectada en una sala no se lee.

**Estructura:** el corte al explorador se adelanta del final al minuto uno, justo
después del cobro, que es cuando el espectador se pregunta si eso pasó de verdad.

1. Huella y wallet creada, sin frase semilla.
2. Link de cobro y el cliente pagando con Freighter.
3. **El explorador, inmediatamente.** La transacción, el reparto, las tres partes.
4. El panel: lo cobrado, el umbral, el pago estimado.
5. El borrador del recibo.
6. El retiro de la reserva con la huella.
