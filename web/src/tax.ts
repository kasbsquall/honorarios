/** Estimacion del pago a cuenta de cuarta categoria, separada de la interfaz para poder probarla.
 *
 * Toda la responsabilidad tributaria del producto vive aqui. Es el unico sitio donde una
 * equivocacion se traduce en que alguien declare de menos, asi que no tiene DOM ni red.
 */

/** UIT 2026: S/ 5,500, fijada por el D.S. 301-2025-EF y publicada en El Peruano.
 *  Es el unico dato de esta lista que viene de fuente primaria. */
export const UIT_PEN = 5500;

/** Tope anual proyectado para pedir la suspension de pagos a cuenta (Formulario 1609).
 *  8.75 UIT. La regla se verifica contra 2025: con la UIT en S/ 5,350 da S/ 46,812.50,
 *  que es el tope que SUNAT publico ese ano. */
export const SUSPENSION_CAP_PEN = 8.75 * UIT_PEN; // 48 125

/** Umbral mensual por debajo del cual no hay pago a cuenta de cuarta: la doceava parte
 *  del tope anual, truncada a soles. Con la UIT de 2025 da 3,901, que tambien coincide con
 *  el monto publicado ese ano. Por eso el tope anual no es doce veces el umbral mensual:
 *  el mensual pierde los centimos al truncarse.
 *
 *  La derivacion cuadra dos anos seguidos, pero no hemos leido el texto de la resolucion
 *  anual de SUNAT que la fija. La interfaz lo dice donde aparecen las cifras. */
export const THRESHOLD_PEN = Math.floor(SUSPENSION_CAP_PEN / 12); // 4 010

/** Pago a cuenta de cuarta categoria: 8% de la renta bruta percibida en el mes.
 *  Articulo 86 del TUO de la Ley del Impuesto a la Renta (D.S. 179-2004-EF). */
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
   *  Ese grupo tiene un umbral mensual propio, menor, que esta app no conoce. */
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
  /** false cuando el caso del usuario queda fuera de lo que esta app sabe calcular. */
  supported: boolean;
  /** true cuando el resultado es "no hay pago a cuenta" pero el usuario no ha confirmado
   *  que declaro todas sus rentas del mes. La interfaz no debe dar por buena esa calma. */
  provisional: boolean;
  /** Por que no hay cifra, cuando duePen es null. */
  reason: "missing-fx" | "unsupported-role" | null;
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

  // Las rentas del inciso b) tienen su propio umbral, menor que el general. No lo tenemos
  // verificado, y aplicar el general daria un "bajo el umbral" tranquilizador y falso.
  if (isDirectorIncome) {
    const base = appGrossPen === null ? null : appGrossPen + otherFourthPen;
    return {
      fourthBasePen: base,
      monthTotalPen: base === null ? null : base + fifthPen,
      overThreshold: false,
      duePen: null,
      supported: false,
      provisional: false,
      reason: "unsupported-role",
    };
  }

  if (appGrossPen === null) {
    return { fourthBasePen: null, monthTotalPen: null, overThreshold: false, duePen: null, supported: true, provisional: false, reason: "missing-fx" };
  }

  const fourthBasePen = appGrossPen + otherFourthPen;
  const monthTotalPen = fourthBasePen + fifthPen;
  // La norma exonera cuando el total "no exceda" el umbral, asi que igualarlo no obliga.
  const overThreshold = monthTotalPen > THRESHOLD_PEN;
  // A centimos, que es como se declara y como lo muestra la pantalla.
  const duePen = overThreshold ? Math.round(Math.max(fourthBasePen * PAYMENT_RATE - withheldPen, 0) * 100) / 100 : 0;

  return {
    fourthBasePen, monthTotalPen, overThreshold, duePen, supported: true,
    provisional: !overThreshold && input.confirmedComplete !== true,
    reason: null,
  };
}
