/** Estimacion del pago a cuenta de cuarta categoria, separada de la interfaz para poder probarla.
 *
 * Toda la responsabilidad tributaria del producto vive aqui. Es el unico sitio donde una
 * equivocacion se traduce en que alguien declare de menos, asi que no tiene DOM ni red.
 */

/** Umbral mensual 2026 de rentas de cuarta por debajo del cual no hay pago a cuenta.
 *  Citado como R.S. 000390-2025/SUNAT, leido de fuente secundaria y sin contrastar
 *  contra el texto publicado en El Peruano. La interfaz lo dice donde aparece. */
export const THRESHOLD_PEN = 4010;

/** Tope anual proyectado para pedir la suspension de pagos a cuenta (Formulario 1609).
 *  Misma resolucion y misma advertencia. No es 12 veces el umbral mensual: los dos montos
 *  salen de porcentajes distintos de la UIT, asi que no se pueden derivar uno del otro. */
export const SUSPENSION_CAP_PEN = 48125;

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
