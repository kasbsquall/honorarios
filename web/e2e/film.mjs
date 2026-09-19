// Graba la demo para el video a 1920x1080 en testnet, con marcas de tiempo por tramo.
// crear wallet con passkey -> link -> cliente paga -> panel (pago a cuenta, recibo) -> retiro con passkey.
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Keypair } from "@stellar/stellar-sdk";

const BASE = process.env.BASE ?? "http://localhost:5196";
const OUT = new URL("../../video/rec_v2/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(readFileSync(".env.development.local", "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split("=")));
const CLIENT = Keypair.fromSecret(env.VITE_DEV_CLIENT_SECRET.trim()).publicKey();

const t0 = Date.now();
const marks = [];
const mark = (name, extra = {}) => { marks.push({ name, t: (Date.now() - t0) / 1000, ...extra }); console.log(name, ((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(extra)); };

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 }, colorScheme: "dark",
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
});
await context.addInitScript(() => localStorage.setItem("honorarios.fx", "3.75"));
const page = await context.newPage();
const pause = (ms) => page.waitForTimeout(ms);
page.on("pageerror", (e) => console.error("pageerror:", e.message));
const cdp = await context.newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });

await page.goto(BASE);
await page.getByRole("button", { name: "Crear wallet con passkey" }).waitFor();
mark("intro");
await pause(1200);
await page.locator("#name").pressSequentially("Kevin Soto", { delay: 70 });
await pause(400);
mark("create_click");
await page.getByRole("button", { name: "Crear wallet con passkey" }).click();
await page.locator(".kpi:not(.sk)").waitFor({ timeout: 180_000 });
mark("wallet_ready", { who: await page.locator("#who").innerText() });
await pause(2000);

await page.locator("#newlink").scrollIntoViewIfNeeded();
mark("link_form");
await page.locator('#newlink input[name="amount"]').pressSequentially("500", { delay: 90 });
await page.locator('#newlink input[name="ref"]').pressSequentially("E001-7", { delay: 60 });
await page.locator('#newlink input[name="concept"]').pressSequentially("Diseño de identidad visual", { delay: 35 });
await page.getByRole("button", { name: "Crear link" }).click();
const link = await page.locator("#linkout code").innerText();
mark("link_ready", { link });
await pause(1800);

await page.goto(`${link}&dev=client`);
mark("pay_page");
await pause(1800);
for (const label of ["Connect Freighter", "Prepare USDC", /^Pay /]) {
  mark("click", { label: String(label) });
  await page.getByRole("button", { name: label }).click();
  await page.locator("#go:not([disabled]), a.btn").first().waitFor({ timeout: 90_000 });
  if (await page.locator(".error").count()) throw new Error(await page.locator(".error").innerText());
  await pause(1200);
}
const tx = await page.getByRole("link", { name: "View on Stellar Expert" }).getAttribute("href");
mark("paid", { tx });
await pause(3500);

await page.goto(BASE);
await page.locator(".kpi:not(.sk)").waitFor({ timeout: 60_000 });
mark("panel", { reserve: (await page.locator(".kpi").innerText()).replace(/\s+/g, " ") });
await pause(3000);
await page.locator("#threshold").scrollIntoViewIfNeeded();
mark("threshold");
await pause(2500);
await page.locator(".howto summary").click();
mark("howto");
await pause(3500);
await page.locator(".rhe-open").first().scrollIntoViewIfNeeded();
await pause(800);
await page.locator(".rhe-open").first().click();
mark("rhe");
await page.locator('dialog.rhe input[name="client"]').pressSequentially("Studio Nord GmbH", { delay: 50 });
await page.locator('dialog.rhe input[name="desc"]').pressSequentially("Diseño de identidad visual", { delay: 35 });
await pause(2500);
await page.keyboard.press("Escape");
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await pause(1200);

mark("withdraw_start");
await page.locator('#withdraw input[name="to"]').pressSequentially(CLIENT, { delay: 12 });
await page.getByRole("button", { name: "Retirar reserva" }).click();
await page.locator(".wd-out a, .wd-out .error").first().waitFor({ timeout: 120_000 });
mark("withdrawn", { out: (await page.locator(".wd-out").innerText()).trim(), href: await page.locator(".wd-out a").getAttribute("href").catch(() => "") });
await pause(3500);

const video = page.video();
await context.close();
mark("end", { video: await video.path() });
writeFileSync(`${OUT}marks.json`, JSON.stringify(marks, null, 2));

// Captura de la transacción en Stellar Expert para la escena de prueba
const b2 = await browser.newPage({ viewport: { width: 1920, height: 1080 }, colorScheme: "dark", deviceScaleFactor: 1 });
await b2.goto(tx, { waitUntil: "networkidle" });
await b2.waitForTimeout(4000);
await b2.screenshot({ path: `${OUT}explorer-tx.png`, fullPage: true });
await browser.close();
