# Cómo se sostiene Honorarios

Este documento separa a propósito lo que es **dato publicado** de lo que es **supuesto nuestro**.
Ninguna cifra sin fuente aparece aquí como si fuera un hecho.

## El precio

El contrato puede cobrar una comisión por cobro liquidado. Está implementada, probada y con un
tope duro del 1% que el constructor rechaza superar (`contracts/split/src/lib.rs`, test
`rejects_a_fee_above_the_cap`). **Hoy está desplegado en cero**, porque durante la hackathon no
se cobra nada.

El precio que proponemos para producción es **0.5% del bruto de cada cobro liquidado**, sin
cuota mensual. Se paga solo cuando hay ingreso, que es la única forma en que un freelancer con
meses flojos no abandona la herramienta.

**Con qué se compara.** Cobrar del exterior hoy cuesta, en la vía tradicional, la comisión de
la plataforma de pagos más el diferencial cambiario del banco al convertir a soles. El monto
exacto depende del banco y del corredor, y no tenemos una medición propia que citar, así que no
ponemos aquí un porcentaje de ahorro. Lo que sí es verificable en la cadena es lo que cuesta el
cobro con esta app: las comisiones de red de las transacciones de la tabla de evidencia del
README, que en testnet las patrocina el relayer de SDF.

## El tamaño del mercado

### Lo que es dato

| Dato | Valor | Fuente |
|---|---|---|
| Exportaciones peruanas de servicios, enero a junio de 2025 | US$ 3,634 millones (+7.5% interanual) | Mincetur, vía [Infobae, 11/11/2025](https://www.infobae.com/peru/2025/11/11/exportacion-de-servicios-cada-vez-mas-peruanos-trabajan-para-otros-paises-sin-salir-de-casa-estas-son-las-6-profesiones-mas-demandadas-en-el-extranjero-segun-mincetur/) |
| De ese total, servicios empresariales | US$ 698 millones en el semestre | misma fuente |
| Trabajadores independientes en Perú menores de 41 años | más de 2.5 millones | [INEI](https://m.inei.gob.pe/prensa/noticias/mas-de-2-millones-y-medio-de-trabajadores-independientes-de-menos-de-41-anos-son-potenciales-aportantes-a-las-administradoras-de-fondo-de-pensiones-7674/) |
| Trabajadores independientes que tienen RUC | 13.3% | INEI, [Perfil del Trabajador Independiente](https://www.inei.gob.pe/media/MenuRecursivo/publicaciones_digitales/Est/Lib1537/cap11.pdf) |
| UIT 2026 | S/ 5,500 | [D.S. 301-2025-EF, El Peruano](https://busquedas.elperuano.pe/dispositivo/NL/2469116-1) |

### Lo que es supuesto nuestro

No existe, que hayamos encontrado, un desglose público de qué parte de la exportación de
servicios la factura una persona natural independiente y no una empresa. Ese es el dato que
falta y lo decimos en vez de rellenarlo.

Partiendo de los servicios empresariales anualizados (US$ 698 M × 2 ≈ **US$ 1,396 millones**):

| Supuesto | Rango | Por qué |
|---|---|---|
| Fracción facturada por personas naturales independientes | 5% a 12% | El grueso lo exportan empresas; los independientes son la cola larga. Es nuestra estimación, no un dato. |
| Volumen anual en manos de freelancers | US$ 70 M a US$ 168 M | consecuencia del anterior |
| Fracción dispuesta a cobrar en USDC hoy | 3% a 8% | la barrera es la adopción de cripto, no el problema tributario |
| Volumen alcanzable a corto plazo | US$ 2.1 M a US$ 13.4 M al año | |
| Ingreso al 0.5% | **US$ 10,500 a US$ 67,000 al año** | |

Eso es un negocio de una persona, no de un fondo. **El caso grande no es Perú.** El pago a
cuenta sin agente de retención es un problema análogo en México, Colombia y Argentina, donde el
número de freelancers dolarizados es de otro orden. Perú es la cuña: la parte difícil, que es el
contrato y el cálculo con su norma citada, se reescribe por país; el rail de Stellar no cambia.

### Lo que falta para que esto sea defendible ante un inversor

1. El desglose de exportación de servicios por tipo de prestador. Sin eso, la primera fila de
   supuestos es una conjetura informada.
2. Diez entrevistas con freelancers que digan si pagarían 0.5% y a partir de qué monto.
3. Un usuario que haya cobrado y declarado con esto.

No tenemos ninguna de las tres. Con cuatro días de hackathon y una persona, decirlo es más útil
que inventar un TAM.

## Por qué la comisión vive en el contrato y no en un servidor

Porque el freelancer puede verificar lo que se le cobra antes de usar la herramienta: `fee()` es
una función pública, la página de pago la lee de la cadena antes de mostrar el desglose que el
cliente firma, y el evento `Paid` publica la comisión de cada cobro. El tope del 1% no es una
promesa de la web, está en el constructor y hay un test que lo fija.

El precio se fija al desplegar y no se puede cambiar después. Es incómodo de operar, porque
cambiar de precio obliga a desplegar otro contrato, y es deliberado: un usuario que aparta su
dinero de impuestos en un contrato necesita saber que las reglas no se mueven bajo sus pies.
