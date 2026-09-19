// Verifica en produccion que crear la wallet con passkey funcione en el dominio publico.
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "https://honorarios-pe.vercel.app";
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message));
const cdp = await context.newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", { options: {
  protocol: "ctap2", transport: "internal", hasResidentKey: true,
  hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
await page.goto(BASE);
await page.locator("#name").fill("Prueba produccion");
await page.getByRole("button", { name: "Crear wallet con passkey" }).click();
await page.locator(".kpi:not(.sk), .intro .error").first().waitFor({ timeout: 180_000 });
console.log("resultado:", (await page.locator("#who").innerText()).trim(), (await page.locator(".intro .error").count()) ? await page.locator(".intro .error").innerText() : "sin error");
await page.reload();
await page.locator(".kpi:not(.sk)").waitFor({ timeout: 60_000 });
console.log("sesion restaurada:", (await page.locator("#who").innerText()).trim());
await browser.close();
