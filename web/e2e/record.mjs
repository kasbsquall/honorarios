// Prueba E2E en testnet y graba el recorrido: panel -> link -> pago -> panel.
// Requiere `npm run dev` en BASE y .env.local con las llaves de prueba.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5180";
const OUT = new URL("../recordings/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const FX_TEST = "3.40"; // valor de prueba ingresado por el usuario del panel, no es un dato oficial
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
const pause = (ms) => page.waitForTimeout(ms);
page.on("pageerror", (e) => console.error("pageerror:", e.message));

// 1. Panel del freelancer
await page.goto(`${BASE}/?dev=freelancer`);
await pause(1200);
await page.getByRole("button", { name: "Prefiero usar Freighter" }).click();
await page.locator(".kpi:not(.sk)").waitFor({ timeout: 60_000 });
const reserveBefore = await page.locator(".kpi").innerText();
console.log("reserva antes:", reserveBefore.replace(/\s+/g, " "));
await pause(1500);

await page.locator("#fx").fill(FX_TEST);
await page.locator("#fx").press("Tab");
await pause(900);

const ref = `E001-${Date.now() % 1000}`;
await page.locator('#newlink input[name="amount"]').pressSequentially("500", { delay: 60 });
await page.locator('#newlink input[name="ref"]').pressSequentially(ref, { delay: 40 });
await page.locator('#newlink input[name="concept"]').pressSequentially("Diseño de identidad", { delay: 30 });
await page.locator('#newlink input[name="name"]').pressSequentially("Kevin Soto", { delay: 30 });
await page.getByRole("button", { name: "Crear link" }).click();
const link = await page.locator("#linkout code").innerText();
console.log("link:", link);
await pause(1500);

// 2. Cliente extranjero paga
await page.goto(`${link}&dev=client`);
await pause(1800);
for (const label of ["Connect Freighter", "Prepare USDC", /^Pay /]) {
  await page.getByRole("button", { name: label }).click();
  await page.locator("#go:not([disabled]), a.btn").first().waitFor({ timeout: 90_000 });
  const err = await page.locator(".error").count();
  if (err) throw new Error(await page.locator(".error").innerText());
  await pause(1300);
}
const txUrl = await page.getByRole("link", { name: "View on Stellar Expert" }).getAttribute("href");
console.log("tx:", txUrl);
await pause(3000);

// 3. De vuelta al panel: el cobro aparece leído de la red
await page.goto(`${BASE}/?dev=freelancer`);
await page.getByRole("button", { name: "Prefiero usar Freighter" }).click();
await page.locator(".kpi:not(.sk)").waitFor({ timeout: 60_000 });
console.log("reserva despues:", (await page.locator(".kpi").innerText()).replace(/\s+/g, " "));
await pause(1800);
await page.locator(".cards").scrollIntoViewIfNeeded();
await pause(2500);
await page.screenshot({ path: `${OUT}panel-final.png`, fullPage: true });

const video = page.video();
await context.close();
await browser.close();
console.log("video:", await video.path());
