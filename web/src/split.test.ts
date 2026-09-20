import { describe, expect, test } from "vitest";
import { split, toUnits } from "./stellar";

/* Este es el calculo que ve el cliente en la pantalla donde firma. Tiene que dar
   exactamente lo mismo que `pay` en contracts/split/src/lib.rs. */
describe("reparto que se muestra antes de firmar", () => {
  const usdc = (n: string) => toUnits(n);

  test("sin comision, 500 se parte en 460 y 40", () => {
    const r = split(usdc("500"));
    expect(r.net).toBe(usdc("460"));
    expect(r.tax).toBe(usdc("40"));
    expect(r.fee).toBe(0n);
  });

  test("con 50 bps de comision, el neto baja y la reserva no se toca", () => {
    const r = split(usdc("500"), 50n);
    expect(r.tax).toBe(usdc("40"));
    expect(r.fee).toBe(usdc("2.5"));
    expect(r.net).toBe(usdc("457.5"));
  });

  test("las tres partes siempre suman el bruto", () => {
    for (const amount of ["0.0000001", "0.33", "1", "999999.9999999"]) {
      for (const bps of [0n, 1n, 50n, 100n]) {
        const g = usdc(amount);
        const r = split(g, bps);
        expect(r.net + r.tax + r.fee).toBe(g);
      }
    }
  });

  test("la reserva redondea hacia arriba, como el contrato", () => {
    // 0.0000001 USDC: el 8% es 0.000000008, que no existe en 7 decimales.
    const r = split(1n);
    expect(r.tax).toBe(1n);
    expect(r.net).toBe(0n);
  });

  test("la comision trunca hacia abajo, como el contrato", () => {
    const r = split(1n, 100n);
    expect(r.fee).toBe(0n);
  });
});

describe("conversion de montos", () => {
  test("respeta los siete decimales de Stellar", () => {
    expect(toUnits("1")).toBe(10_000_000n);
    expect(toUnits("0.0000001")).toBe(1n);
    expect(toUnits("500.50")).toBe(5_005_000_000n);
  });

  test("un monto negativo se rechaza en vez de leerse como positivo", () => {
    expect(() => toUnits("-0.5")).toThrow();
  });
});
