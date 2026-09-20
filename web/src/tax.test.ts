import { describe, expect, test } from "vitest";
import { DIRECTOR_CAP_PEN, DIRECTOR_THRESHOLD_PEN, PAYMENT_RATE, SUSPENSION_CAP_PEN, THRESHOLD_PEN, UIT_PEN, estimate } from "./tax";

const base = { appGrossPen: 0, otherFourthPen: 0, fifthPen: 0, withheldPen: 0, isDirectorIncome: false, confirmedComplete: true };

describe("los importes son los que cita la resolucion, no una derivacion", () => {
  // Articulo 3 de la R.S. 000390-2025/SUNAT, copia en evidencias/2026-09-20-resolucion-umbral.
  test("regimen general: literales a) y c)", () => {
    expect(THRESHOLD_PEN).toBe(4010);
    expect(SUSPENSION_CAP_PEN).toBe(48_125);
  });

  test("rentas del inciso b) del articulo 33: literales b) y d)", () => {
    expect(DIRECTOR_THRESHOLD_PEN).toBe(3208);
    expect(DIRECTOR_CAP_PEN).toBe(38_500);
  });

  test("el umbral del inciso b) es mas bajo que el general, que es la razon de distinguirlos", () => {
    expect(DIRECTOR_THRESHOLD_PEN).toBeLessThan(THRESHOLD_PEN);
  });

  test("la UIT de 2026 queda como referencia del ajuste", () => {
    expect(UIT_PEN).toBe(5500);
  });
});

describe("pago a cuenta de cuarta categoria", () => {
  test("bajo el umbral no hay pago a cuenta", () => {
    const r = estimate({ ...base, appGrossPen: 1875 });
    expect(r.overThreshold).toBe(false);
    expect(r.duePen).toBe(0);
  });

  test("igualar el umbral no obliga: la norma exonera cuando no se excede", () => {
    const r = estimate({ ...base, appGrossPen: THRESHOLD_PEN });
    expect(r.overThreshold).toBe(false);
    expect(r.duePen).toBe(0);
  });

  test("un centimo por encima del umbral ya obliga", () => {
    const r = estimate({ ...base, appGrossPen: THRESHOLD_PEN + 0.01 });
    expect(r.overThreshold).toBe(true);
    expect(r.duePen).toBe(Math.round((THRESHOLD_PEN + 0.01) * PAYMENT_RATE * 100) / 100);
  });

  test("las rentas de quinta cuentan para el umbral pero no para la base del 8%", () => {
    const r = estimate({ ...base, appGrossPen: 1875, fifthPen: 3000 });
    expect(r.monthTotalPen).toBe(4875);
    expect(r.overThreshold).toBe(true);
    expect(r.fourthBasePen).toBe(1875);
    expect(r.duePen).toBeCloseTo(150, 6); // 8% de 1875, no de 4875
  });

  test("las otras rentas de cuarta si entran en la base", () => {
    const r = estimate({ ...base, appGrossPen: 1875, otherFourthPen: 2500 });
    expect(r.fourthBasePen).toBe(4375);
    expect(r.duePen).toBeCloseTo(350, 6);
  });

  test("las retenciones ya practicadas se descuentan del pago del mes", () => {
    const r = estimate({ ...base, appGrossPen: 5000, withheldPen: 100 });
    expect(r.duePen).toBeCloseTo(300, 6); // 400 - 100
  });

  test("una retencion mayor al pago no genera un numero negativo", () => {
    const r = estimate({ ...base, appGrossPen: 5000, withheldPen: 900 });
    expect(r.duePen).toBe(0);
  });

  test("sin tipo de cambio no se afirma ninguna cifra", () => {
    const r = estimate({ ...base, appGrossPen: null, fifthPen: 9999 });
    expect(r.duePen).toBeNull();
    expect(r.reason).toBe("missing-fx");
    expect(r.overThreshold).toBe(false);
  });

  test("solo rentas de quinta: no hay renta de cuarta que pagar aunque se cruce el umbral", () => {
    const r = estimate({ ...base, appGrossPen: 0, fifthPen: 8000 });
    expect(r.overThreshold).toBe(true);
    expect(r.fourthBasePen).toBe(0);
    expect(r.duePen).toBe(0);
  });

  test("un importe negativo no puede reducir la base y producir una declaracion corta", () => {
    const r = estimate({ ...base, appGrossPen: 5000, otherFourthPen: -3000 });
    expect(r.fourthBasePen).toBe(5000);
    expect(r.duePen).toBe(400);
  });

  test("un campo mal escrito llega como NaN y vale cero, no rompe el calculo", () => {
    const r = estimate({ ...base, appGrossPen: 5000, fifthPen: Number.NaN, withheldPen: Number.NaN });
    expect(r.duePen).toBe(400);
  });

  test("el monto a declarar se redondea a centimos", () => {
    const r = estimate({ ...base, appGrossPen: 4444.44 });
    expect(r.duePen).toBe(355.56); // 355.5552 redondeado
  });

  test("sin confirmar que no hay otras rentas, el resultado bajo el umbral es provisional", () => {
    const r = estimate({ ...base, appGrossPen: 1875, confirmedComplete: false });
    expect(r.overThreshold).toBe(false);
    expect(r.provisional).toBe(true);
  });

  test("superar el umbral no es provisional: ahi ya hay obligacion", () => {
    const r = estimate({ ...base, appGrossPen: 9000, confirmedComplete: false });
    expect(r.provisional).toBe(false);
  });

  test("un director se compara contra su propio umbral, no contra el general", () => {
    const r = estimate({ ...base, appGrossPen: 3500, isDirectorIncome: true });
    expect(r.thresholdPen).toBe(DIRECTOR_THRESHOLD_PEN);
    // Con el umbral general (4 010) este mes habria salido "no debes nada".
    expect(r.overThreshold).toBe(true);
    expect(r.duePen).toBe(280); // 8% de 3 500
  });

  test("un director por debajo de su umbral tampoco paga", () => {
    const r = estimate({ ...base, appGrossPen: 3000, isDirectorIncome: true });
    expect(r.overThreshold).toBe(false);
    expect(r.duePen).toBe(0);
  });

  test("igualar el umbral del inciso b) no obliga", () => {
    const r = estimate({ ...base, appGrossPen: DIRECTOR_THRESHOLD_PEN, isDirectorIncome: true });
    expect(r.overThreshold).toBe(false);
  });

  test("la quinta tambien suma al umbral del inciso b), sin entrar en la base", () => {
    const r = estimate({ ...base, appGrossPen: 1000, fifthPen: 2500, isDirectorIncome: true });
    expect(r.monthTotalPen).toBe(3500);
    expect(r.overThreshold).toBe(true);
    expect(r.duePen).toBe(80); // 8% de 1 000
  });

  test("sin tipo de cambio, el umbral aplicable ya se conoce y se puede mostrar", () => {
    const r = estimate({ ...base, appGrossPen: null, isDirectorIncome: true });
    expect(r.thresholdPen).toBe(DIRECTOR_THRESHOLD_PEN);
    expect(r.duePen).toBeNull();
  });

  test("el caso de director sigue mostrando lo acumulado del mes", () => {
    const r = estimate({ ...base, appGrossPen: 1875, otherFourthPen: 500, fifthPen: 1000, isDirectorIncome: true });
    expect(r.fourthBasePen).toBe(2375);
    expect(r.monthTotalPen).toBe(3375);
    expect(r.thresholdPen).toBe(DIRECTOR_THRESHOLD_PEN);
  });
});
