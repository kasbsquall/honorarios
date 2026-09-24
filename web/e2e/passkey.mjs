// E2E en testnet con passkey real (autenticador WebAuthn virtual de Chromium):
// crear wallet -> link de cobro -> cliente paga -> panel -> retirar reserva con passkey.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5180";
const CLIENT = process.env.CLIENT_ADDR; // destino del retiro de prueba
const OUT = new URL("../recordings/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
const pause = (ms) => page.waitForTimeout(ms);
page.on("pageerror", (e) => console.error("pageerror:", e.message));

const cdp = await context.newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", {
  options: {
    protocol: "ctap2", transport: "internal", hasResidentKey: true,
    hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
  },
});

// 1. Crear wallet con passkey
await page.goto(BASE);
await page.getByRole("button", { name: "Crear wallet con passkey" }).waitFor();
await pause(1000);
await page.locator("#name").pressSequentially("Kevin Soto", { delay: 50 });
await page.getByRole("button", { name: "Crear wallet con passkey" }).click();
await page.locator(".kpi:not(.sk)").waitFor({ timeout: 180_000 });
console.log("wallet:", await page.locator("#who").innerText());
await pause(1500);

// 2. Recibo emitido en la cadena con la passkey, y su link de cobro
await page.locator('#newlink input[name="amount"]').pressSequentially("200", { delay: 60 });
await page.locator('#newlink input[name="ref"]').pressSequentially("E001-3", { delay: 40 });
await page.locator('#newlink input[name="concept"]').pressSequentially("Ilustración editorial", { delay: 30 });
await page.getByRole("button", { name: "Emitir recibo y crear link" }).click();
await page.locator("#linkout code, #linkout .error").first().waitFor({ timeout: 120_000 });
if (await page.locator("#linkout .error").count()) throw new Error(await page.locator("#linkout .error").innerText());
console.log("emision:", await page.locator("#linkout a").first().getAttribute("href"));
const link = await page.locator("#linkout code").innerText();
const walletId = new URL(link).searchParams.get("to");
console.log("smart wallet:", walletId);
await pause(1200);

// 3. Cliente paga
// El link apunta al dominio publico; el recorrido prueba el codigo local.
const local = new URL(link);
await page.goto(`${BASE}${local.pathname}${local.search}&dev=client`);
await page.screenshot({ path: `${OUT}pay-before.png` });
await pause(1200);
for (const label of ["Connect Freighter", "Prepare USDC", /^Pay /]) {
  await page.getByRole("button", { name: label }).click();
  await page.locator("#go:not([disabled]), a.btn").first().waitFor({ timeout: 90_000 });
  if (await page.locator(".error").count()) throw new Error(await page.locator(".error").innerText());
  await pause(1000);
}
console.log("pago:", await page.getByRole("link", { name: "View on Stellar Expert" }).getAttribute("href"));
await pause(2000);

// 4. Panel: la sesion de passkey se restaura sola
await page.goto(BASE);
await page.locator(".kpi:not(.sk)").waitFor({ timeout: 60_000 });
console.log("reserva:", (await page.locator(".kpi").innerText()).replace(/\s+/g, " "));
await pause(1500);

// 5. Retirar la reserva firmando con la passkey (comision pagada por el relayer)
await page.locator('#withdraw input[name="to"]').pressSequentially(CLIENT, { delay: 8 });
await page.getByRole("button", { name: "Retirar reserva" }).click();
await page.locator(".wd-out a, .wd-out .error").first().waitFor({ timeout: 120_000 });
console.log("retiro:", (await page.locator(".wd-out").innerText()).trim(), await page.locator(".wd-out a").getAttribute("href").catch(() => ""));
console.log("reserva final:", (await page.locator(".kpi").innerText()).replace(/\s+/g, " "));
await pause(2500);
await page.screenshot({ path: `${OUT}passkey-panel.png`, fullPage: true });

const video = page.video();
await context.close();
await browser.close();
console.log("video:", await video.path());
