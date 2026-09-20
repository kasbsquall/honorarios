import { describe, expect, test } from "vitest";
import { PAYMENT_RATE, THRESHOLD_PEN, estimate } from "./tax";

const base = { appGrossPen: 0, otherFourthPen: 0, fifthPen: 0, withheldPen: 0, isDirectorIncome: false, confirmedComplete: true };

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

  test("rentas de director quedan fuera: la app no conoce su umbral y no inventa uno", () => {
    const r = estimate({ ...base, appGrossPen: 1875, isDirectorIncome: true });
    expect(r.supported).toBe(false);
    expect(r.duePen).toBeNull();
    expect(r.reason).toBe("unsupported-role");
    // Y nunca puede decir "bajo el umbral", que es la afirmacion peligrosa.
    expect(r.overThreshold).toBe(false);
  });

  test("el caso de director sigue mostrando lo acumulado del mes", () => {
    const r = estimate({ ...base, appGrossPen: 1875, otherFourthPen: 500, fifthPen: 1000, isDirectorIncome: true });
    expect(r.fourthBasePen).toBe(2375);
    expect(r.monthTotalPen).toBe(3375);
  });
});
