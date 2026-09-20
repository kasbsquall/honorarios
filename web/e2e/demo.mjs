// Graba el recorrido completo en testnet para el video demo del jurado.
// A diferencia de film.mjs, esta grabacion va a velocidad de lectura: pausas largas,
// scroll suave y todos los bloques del panel abiertos, porque se publica sin acelerar.
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Keypair } from "@stellar/stellar-sdk";

const BASE = process.env.BASE ?? "http://localhost:5196";
const OUT = new URL("../../video/rec_demo/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(readFileSync(".env.development.local", "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split("=")));
const CLIENT = Keypair.fromSecret(env.VITE_DEV_CLIENT_SECRET.trim()).publicKey();

const t0 = Date.now();
const marks = [];
const box = async (sel) => {
  try {
    const b = await page.locator(sel).first().boundingBox({ timeout: 2000 });
    return b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null;
  } catch { return null; }
};
const markBox = async (name, sel, extra = {}) => mark(name, { ...extra, box: await box(sel) });
const mark = (name, extra = {}) => {
  marks.push({ name, t: (Date.now() - t0) / 1000, ...extra });
  console.log(name, ((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(extra));
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 }, colorScheme: "dark",
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
});
// El tipo de cambio lo pone el freelancer y gobierna todo el bloque tributario:
// sin el, el panel muestra guiones y la narracion hablaria de numeros que no estan.
// Solo para grabar: el bloque de crear link es sticky y, al recorrer el panel, viaja
// pegado sobre un hueco vacio de su columna. En uso normal esta bien; en video se lee
// como un fallo de composicion.
await context.addInitScript(() => {
  // .grid2 pinta sus lineas divisorias con su propio fondo y un gap de 1px. Sin el
  // sticky, la columna del formulario termina pronto y ese fondo queda a la vista como
  // una franja gris hasta el borde inferior, asi que durante la grabacion el contenedor
  // toma el color del papel. Se pierden las lineas de 1px entre bloques; el borde queda.
  const css = "#newlink{position:static !important;align-self:start !important}"
    + ".grid2{background:var(--paper) !important}";
  document.addEventListener("DOMContentLoaded", () => {
    const st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
  });
  try {
    localStorage.setItem("honorarios.fx", "3.75");
    ["honorarios.otras4", "honorarios.quinta", "honorarios.retenido"].forEach((k) => localStorage.removeItem(k));
  } catch { /* sin storage */ }
});
const page = await context.newPage();
const pause = (ms) => page.waitForTimeout(ms);
// Scroll suave: el salto seco de scrollIntoView se lee mal a velocidad real.
const glide = async (sel) => {
  await page.locator(sel).evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await pause(1400);
};
page.on("pageerror", (e) => console.error("pageerror:", e.message));
const cdp = await context.newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", {
  options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
});

// --- 1. Portada
await page.goto(BASE);
await page.getByRole("button", { name: "Crear wallet con passkey" }).waitFor();
mark("intro");
await pause(7500);

// --- 2. Panel de ejemplo: se puede mirar el producto sin instalar nada
await page.getByRole("button", { name: "Ver un panel de ejemplo" }).click();
await page.locator(".kpi:not(.sk)").waitFor({ timeout: 120_000 });
await markBox("ejemplo", ".hero");
await pause(4500);
await glide("#threshold");
await markBox("ejemplo_umbral", "#threshold");
await pause(5000);
await page.goto(BASE);
await page.getByRole("button", { name: "Crear wallet con passkey" }).waitFor();
await pause(1500);

// --- 3. Wallet con passkey
await page.locator("#name").pressSequentially("Kevin Soto", { delay: 90 });
await pause(1200);
mark("create_click");
await page.getByRole("button", { name: "Crear wallet con passkey" }).click();
await page.locator(".kpi:not(.sk)").waitFor({ timeout: 180_000 });
mark("wallet_ready", { who: await page.locator("#who").innerText() });
await pause(5000);

// --- 4. Link de cobro
await glide("#newlink");
await markBox("link_form", "#newlink");
await page.locator('#newlink input[name="amount"]').pressSequentially("500", { delay: 110 });
await pause(600);
await page.locator('#newlink input[name="ref"]').pressSequentially("E001-7", { delay: 90 });
await pause(600);
await page.locator('#newlink input[name="concept"]').pressSequentially("Diseño de identidad visual", { delay: 45 });
await pause(1200);
await page.getByRole("button", { name: "Crear link" }).click();
const link = await page.locator("#linkout code").innerText();
mark("link_ready", { link });
await pause(4500);

// --- 5. El cliente paga
await page.goto(`${link.replace(/^https?:\/\/[^/]+/, BASE)}&dev=client`);
mark("pay_page");
await pause(5500);
for (const [label, name] of [["Connect Freighter", "connect"], ["Prepare USDC", "prepare"], [/^Pay /, "sign"]]) {
  mark(name);
  await page.getByRole("button", { name: label }).click();
  await page.locator("#go:not([disabled]), a.btn").first().waitFor({ timeout: 120_000 });
  if (await page.locator(".error").count()) throw new Error(await page.locator(".error").innerText());
  await pause(2600);
}
const tx = await page.getByRole("link", { name: "View on Stellar Expert" }).getAttribute("href");
mark("paid", { tx });
await pause(5500);

// --- 6. El panel del freelancer
await page.goto(BASE);
await page.locator(".kpi:not(.sk)").waitFor({ timeout: 90_000 });
await markBox("panel", ".hero", { reserve: (await page.locator(".kpi").innerText()).replace(/\s+/g, " ") });
await pause(5500);
await glide("#threshold");
await markBox("umbral", "#threshold");
await pause(6000);

// Otras rentas del mes: el umbral no se mide solo con lo que pasa por la app.
await page.locator('.other-in[data-k^="honorarios.quinta"]').fill("3000");
await page.locator('.other-in[data-k^="honorarios.quinta"]').dispatchEvent("change");
await pause(1200);
await markBox("quinta", "#threshold");
await pause(6500);
await page.locator('.other-in[data-k^="honorarios.quinta"]').fill("");
await page.locator('.other-in[data-k^="honorarios.quinta"]').dispatchEvent("change");
await pause(2500);

// Rentas del inciso b): el umbral baja a 3 208 y la app lo aplica, con su cita.
await page.locator("#dir4").click();
await pause(1500);
await markBox("director", "#threshold");
await pause(6000);
await page.locator("#dir4").click();
await pause(2000);

// --- 7. Como se paga a SUNAT
await page.locator(".howto summary").click();
await markBox("howto", ".howto");
await pause(2000);
await glide(".howto ol");
await pause(6500);
await page.locator(".howto summary").click();
await pause(1200);

// --- 8. Borrador del recibo por honorarios
await glide(".rhe-open");
await page.locator(".rhe-open").first().click();
await markBox("rhe", "dialog.rhe");
await pause(2500);
await page.locator('dialog.rhe input[name="client"]').pressSequentially("Studio Nord GmbH", { delay: 70 });
await pause(700);
await page.locator('dialog.rhe input[name="desc"]').pressSequentially("Diseño de identidad visual", { delay: 45 });
await pause(6000);
await page.keyboard.press("Escape");
await pause(1500);

// --- 9. Retiro de la reserva con passkey
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await pause(2000);
await markBox("withdraw_start", ".hero");
await page.locator('#withdraw input[name="to"]').pressSequentially(CLIENT, { delay: 14 });
await pause(1200);
await page.getByRole("button", { name: "Retirar reserva" }).click();
await page.locator(".wd-out a, .wd-out .error").first().waitFor({ timeout: 150_000 });
await markBox("withdrawn", ".hero", {
  out: (await page.locator(".wd-out").innerText()).trim(),
  href: await page.locator(".wd-out a").getAttribute("href").catch(() => ""),
});
await pause(6000);

const video = page.video();
await context.close();
mark("end", { video: await video.path() });
writeFileSync(`${OUT}marks.json`, JSON.stringify(marks, null, 2));

// --- 10. La transaccion en el explorador, para cerrar con la prueba
const b2 = await browser.newPage({ viewport: { width: 1920, height: 1080 }, colorScheme: "dark", deviceScaleFactor: 1 });
await b2.goto(tx, { waitUntil: "networkidle" });
await b2.waitForTimeout(4000);
await b2.screenshot({ path: `${OUT}explorer-tx.png`, fullPage: true });
await browser.close();
