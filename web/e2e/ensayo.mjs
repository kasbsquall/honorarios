// Ensayo de la demo en vivo contra el dominio publico, con passkey (autenticador WebAuthn
// virtual) y midiendo cada paso. El pago del cliente necesita Freighter, que no existe en un
// navegador sin interfaz: ese paso se firma con la cuenta de prueba desde `npm run dev`
// (LOCAL), contra el mismo contrato. Deja capturas en docs/capturas/.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const PROD = process.env.PROD ?? "https://honorarios-pe.vercel.app";
const LOCAL = process.env.LOCAL ?? "http://localhost:5196";
const WITHDRAW_TO = process.env.WITHDRAW_TO ?? "GAHH46EELOC673LW6UHWBQH3ZODMD3KZUZAAICJ7IK56MILIGUCDE5U2";
const OUT = new URL("../../docs/capturas/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message));
const cdp = await context.newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", { options: {
  protocol: "ctap2", transport: "internal", hasResidentKey: true,
  hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });

const times = [];
const step = async (name, fn) => {
  const t = Date.now();
  const out = await fn();
  times.push([name, ((Date.now() - t) / 1000).toFixed(1)]);
  console.log(`${name}: ${times.at(-1)[1]} s`);
  return out;
};
const shot = (name, opts = {}) => page.screenshot({ path: `${OUT}${name}.png`, ...opts });

await step("portada", async () => {
  await page.goto(PROD);
  await page.locator(".intro h1").waitFor();
});
await page.waitForTimeout(600);
await shot("01-portada");

await step("crear wallet con passkey", async () => {
  await page.locator("#name").fill("Ensayo Demo Day");
  await page.getByRole("button", { name: "Crear wallet con passkey" }).click();
  await page.locator(".kpi:not(.sk)").waitFor({ timeout: 180_000 });
});
const wallet = (await page.locator("#who").innerText()).trim();
console.log("wallet:", wallet);

const ref = `E001-${Date.now() % 1000}`;
const link = await step("emitir recibo con passkey", async () => {
  await page.locator('#newlink input[name="amount"]').fill("250");
  await page.locator('#newlink input[name="ref"]').fill(ref);
  await page.locator('#newlink input[name="concept"]').fill("Diseño de logotipo");
  await page.locator('#newlink input[name="name"]').fill("Estudio Arequipa");
  await page.getByRole("button", { name: "Emitir recibo y crear link" }).click();
  await page.locator("#linkout code, #linkout .error").first().waitFor({ timeout: 120_000 });
  if (await page.locator("#linkout .error").count()) throw new Error(await page.locator("#linkout .error").innerText());
  return page.locator("#linkout code").innerText();
});
console.log("emision:", await page.locator("#linkout a").first().getAttribute("href"));
await page.locator("#newlink").scrollIntoViewIfNeeded();
await page.locator("#newlink").screenshot({ path: `${OUT}02-recibo-emitido.png` });

await step("abrir el link del cliente", async () => {
  await page.goto(link);
  await page.locator(".summary h1").waitFor({ timeout: 60_000 });
});
await page.waitForTimeout(800);
await shot("03-pago-pendiente");

// El cliente paga. Mismo contrato y mismo recibo; la firma la pone la cuenta de prueba.
await step("pago del cliente (firma de prueba, local)", async () => {
  const u = new URL(link);
  await page.goto(`${LOCAL}${u.pathname}${u.search}&dev=client`);
  for (const label of ["Connect Freighter", "Prepare USDC", /^Pay /]) {
    await page.getByRole("button", { name: label }).click();
    await page.locator("#go:not([disabled]), a.btn").first().waitFor({ timeout: 120_000 });
    if (await page.locator(".error").count()) throw new Error(await page.locator(".error").innerText());
  }
});
console.log("pago:", await page.getByRole("link", { name: "View on Stellar Expert" }).getAttribute("href"));

await step("el cliente ve el recibo pagado en produccion", async () => {
  await page.goto(link);
  await page.locator(".badge.ok").waitFor({ timeout: 60_000 });
});
await page.waitForTimeout(1200);
await shot("04-pago-hecho");

await step("panel con el cobro", async () => {
  await page.goto(PROD);
  await page.locator(".kpi:not(.sk)").waitFor({ timeout: 60_000 });
  await page.locator(".cards .receipt").first().waitFor({ timeout: 60_000 });
});
await page.waitForTimeout(1200);
await shot("05-panel-con-cobro", { fullPage: true });
console.log("reserva:", (await page.locator(".kpi").innerText()).replace(/\s+/g, " "));

await step("retirar la reserva con passkey", async () => {
  await page.locator('#withdraw input[name="to"]').fill(WITHDRAW_TO);
  await page.getByRole("button", { name: "Retirar reserva" }).click();
  await page.locator(".wd-out a, .wd-out .error").first().waitFor({ timeout: 120_000 });
});
console.log("retiro:", (await page.locator(".wd-out").innerText()).trim(), await page.locator(".wd-out a").getAttribute("href").catch(() => ""));

await step("panel de ejemplo", async () => {
  await page.goto(`${PROD}/?demo`);
  await page.locator(".kpi:not(.sk)").waitFor({ timeout: 60_000 });
  await page.locator(".pending li").first().waitFor({ timeout: 60_000 });
});
await page.waitForTimeout(1500);
await shot("06-panel-de-ejemplo");
await page.locator("#threshold").screenshot({ path: `${OUT}07-pago-a-cuenta.png` });
await page.locator(".pending").screenshot({ path: `${OUT}08-por-cobrar.png` });

console.log("\nTIEMPOS");
for (const [n, s] of times) console.log(`${s.padStart(6)} s  ${n}`);
await browser.close();
