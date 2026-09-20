/** Estimacion del pago a cuenta de cuarta categoria, separada de la interfaz para poder probarla.
 *
 * Toda la responsabilidad tributaria del producto vive aqui. Es el unico sitio donde una
 * equivocacion se traduce en que alguien declare de menos, asi que no tiene DOM ni red.
 */

/** UIT 2026: S/ 5,500, fijada por el D.S. 301-2025-EF. La resolucion de SUNAT la cita
 *  como el motivo del ajuste, y aqui queda como referencia de donde salen los importes. */
export const UIT_PEN = 5500;

/* Los cuatro importes de abajo NO se derivan: son los que fija el articulo 3 de la
 * Resolucion de Superintendencia N.o 000390-2025/SUNAT (Lima, 30 de diciembre de 2025),
 * "Excepcion de la obligacion de efectuar pagos a cuenta y suspension de la obligacion de
 * efectuar retenciones y/o pagos a cuenta por rentas de cuarta categoria correspondientes
 * al ejercicio gravable 2026". Copia en evidencias/2026-09-20-resolucion-umbral/.
 *
 * Hasta hoy la app los derivaba de la UIT (8.75 y 7 UIT) y lo advertia en pantalla. La
 * derivacion daba los mismos numeros, pero una app de impuestos no deberia estar
 * adivinando su propia constante principal. */

/** Articulo 3.a): umbral mensual del regimen general de cuarta categoria. */
export const THRESHOLD_PEN = 4010;

/** Articulo 3.b): umbral mensual de las rentas del inciso b) del articulo 33 de la LIR,
 *  esto es director, sindico, mandatario, gestor de negocios, albacea y regidor. */
export const DIRECTOR_THRESHOLD_PEN = 3208;

/** Articulo 3.c): tope anual proyectado para pedir la suspension (Formulario 1609). */
export const SUSPENSION_CAP_PEN = 48_125;

/** Articulo 3.d): el mismo tope anual para las rentas del inciso b). */
export const DIRECTOR_CAP_PEN = 38_500;

export const PAYMENT_RATE = 0.08;

export type TaxInput = {
  /** Cobrado por la app en el mes, ya convertido a soles. null si todavia no se puede saber. */
  appGrossPen: number | null;
  /** Rentas de cuarta del mes cobradas fuera de la app. */
  otherFourthPen: number;
  /** Rentas de quinta del mes. Cuentan para el umbral, no para la base del 8%. */
  fifthPen: number;
  /** Retenciones de cuarta ya practicadas este mes. */
  withheldPen: number;
  /** Rentas del inciso b) del articulo 33: director, mandatario, regidor, sindico, albacea.
   *  Ese grupo tiene su propio umbral mensual, menor, en el articulo 3.b) de la resolucion. */
  isDirectorIncome: boolean;
  /** El usuario confirmo que los campos manuales del mes estan completos.
   *  Sin esa confirmacion, "no llegas al umbral" se estaria afirmando sobre la nada. */
  confirmedComplete?: boolean;
};

export type TaxEstimate = {
  /** Base del pago a cuenta: solo rentas de cuarta. */
  fourthBasePen: number | null;
  /** Total del mes que se compara contra el umbral: cuarta mas quinta. */
  monthTotalPen: number | null;
  overThreshold: boolean;
  /** Pago a cuenta estimado. null cuando la app no puede afirmar una cifra. */
  duePen: number | null;
  /** El umbral contra el que se comparo este mes, para poder mostrarlo en pantalla. */
  thresholdPen: number;
  /** true cuando el resultado es "no hay pago a cuenta" pero el usuario no ha confirmado
   *  que declaro todas sus rentas del mes. La interfaz no debe dar por buena esa calma. */
  provisional: boolean;
  /** Por que no hay cifra, cuando duePen es null. */
  reason: "missing-fx" | null;
};

/** Un importe que el usuario teclea: negativo, NaN o infinito valen cero.
 *  Un negativo colado en otras rentas reduciria la base y produciria una declaracion corta. */
const amount = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

export function estimate(input: TaxInput): TaxEstimate {
  const { appGrossPen: rawGross, isDirectorIncome } = input;
  const otherFourthPen = amount(input.otherFourthPen);
  const fifthPen = amount(input.fifthPen);
  const withheldPen = amount(input.withheldPen);
  // Un tipo de cambio en blanco llega como 0 y no sirve para convertir nada.
  const appGrossPen = rawGross === null || !Number.isFinite(rawGross) || rawGross < 0 ? null : rawGross;

  // Las rentas del inciso b) se comparan contra su propio umbral, mas bajo. Aplicarles el
  // general les daria un "no llegas" tranquilizador cuando ya estan obligadas.
  const thresholdPen = isDirectorIncome ? DIRECTOR_THRESHOLD_PEN : THRESHOLD_PEN;

  if (appGrossPen === null) {
    return { fourthBasePen: null, monthTotalPen: null, overThreshold: false, duePen: null, thresholdPen, provisional: false, reason: "missing-fx" };
  }

  const fourthBasePen = appGrossPen + otherFourthPen;
  const monthTotalPen = fourthBasePen + fifthPen;
  // La norma exonera cuando el total "no exceda" el umbral, asi que igualarlo no obliga.
  const overThreshold = monthTotalPen > thresholdPen;
  // A centimos, que es como se declara y como lo muestra la pantalla.
  const duePen = overThreshold ? Math.round(Math.max(fourthBasePen * PAYMENT_RATE - withheldPen, 0) * 100) / 100 : 0;

  return {
    fourthBasePen, monthTotalPen, overThreshold, duePen, thresholdPen,
    provisional: !overThreshold && input.confirmedComplete !== true,
    reason: null,
  };
}
