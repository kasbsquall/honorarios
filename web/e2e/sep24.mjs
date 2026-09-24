// Retiro de la reserva por SEP-24 contra el ancla de pruebas de SDF, en testnet.
// Panel con Freighter (firmante de desarrollo) -> SEP-10 -> formulario del ancla con datos
// ficticios -> retiro del contrato -> pago con memo al ancla -> estado final del ancla.
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:5196";
const AMOUNT = process.env.AMOUNT ?? "5";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message));

await page.goto(`${BASE}/?dev=freelancer`);
await page.getByRole("button", { name: "Prefiero usar Freighter" }).click();
await page.locator(".kpi:not(.sk)").waitFor({ timeout: 90_000 });
console.log("reserva antes:", (await page.locator(".kpi").innerText()).replace(/\s+/g, " "));
await page.locator(".howto summary").click();

const [popup] = await Promise.all([context.waitForEvent("page"), page.locator("#sep24-go").click()]);
await popup.waitForURL(/anchor-ref-ui/, { timeout: 90_000 });
await popup.locator("input").first().waitFor({ timeout: 60_000 });
const inputs = popup.locator("input");
console.log("campos del ancla:", await inputs.count());
// Datos ficticios: el ancla de pruebas no mueve dinero real ni valida identidad.
const values = [AMOUNT, "Prueba", "Honorarios", "prueba@example.com", "Banco de prueba", "000123"];
for (let i = 0; i < values.length; i++) await inputs.nth(i).fill(values[i]);
await popup.getByRole("button", { name: /submit/i }).click();

await page.locator("#sep24-send").waitFor({ timeout: 120_000 });
console.log("ancla:", await page.locator("#sep24 [role=status]").innerText());
await page.locator("#sep24-send").click();
await page.locator("#sep24 [role=status]").filter({ hasText: /completado|error|venció|devolvió/ }).waitFor({ timeout: 300_000 });
console.log("final:", await page.locator("#sep24 [role=status]").innerText());
console.log("txs:", await page.locator("#sep24 a[href*='/tx/']").evaluateAll((as) => as.map((a) => a.href)));
console.log("ancla url:", await page.locator("#sep24 a", { hasText: "Ver el retiro" }).getAttribute("href").catch(() => ""));
await page.locator("#sep24").screenshot({ path: new URL("../recordings/sep24.png", import.meta.url).pathname.replace(/^\/(\w:)/, "$1") });
await browser.close();
