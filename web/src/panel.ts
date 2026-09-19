import "./styles.css";
import "./panel.css";
import { StrKey } from "@stellar/stellar-sdk";
import { connectPasskey, createPasskeyWallet, restorePasskey, withdrawWithPasskey } from "./passkey";
import {
  EXPLORER, type Paid, connectWallet, fromUnits, paidEvents, short, taxReserve, toUnits, withdrawWithWallet,
} from "./stellar";
import { openRheDraft } from "./rhe";
import { MARK, RECEIPT_ES, esc, receiptCard } from "./ui";

// Umbral 2026 bajo el cual no hay pago a cuenta de cuarta categoria (R.S. 000390-2025/SUNAT).
const THRESHOLD_PEN = 4010;
const FX_KEY = "honorarios.fx";

const app = document.getElementById("app")!;
document.getElementById("brand")!.insertAdjacentHTML("afterbegin", MARK);

type Mode = "passkey" | "freighter";
let me = "";
let mode: Mode = "passkey";
let events: Paid[] | null = null;
let reserve: bigint | null = null;

restorePasskey().then((id) => (id ? enter(id, "passkey") : renderIntro()));

function enter(address: string, how: Mode) {
  me = address;
  mode = how;
  document.getElementById("who")!.innerHTML =
    `${how === "passkey" ? `<i class="ph-light ph-fingerprint"></i> Passkey · ` : ""}${short(me)}`;
  renderPanel();
  load();
}

function renderIntro(error = "") {
  app.innerHTML = `
  <section class="intro rise">
    <p class="lbl">Para freelancers en Perú que cobran al exterior</p>
    <h1>Cobra en USDC y deja apartado tu pago a cuenta desde el primer dólar.</h1>
    <p>Cada cobro pasa por un contrato en Stellar: el 92% llega a tu wallet y el 8% queda reservado a tu nombre para SUNAT.</p>
    <label class="field name"><span class="lbl">Tu nombre</span><input id="name" maxlength="40" placeholder="Como quieres que aparezca en tu passkey"></label>
    <div class="actions">
      <button class="btn" id="create"><i class="ph-light ph-fingerprint"></i>Crear wallet con passkey</button>
      <button class="btn ghost" id="login"><i class="ph-light ph-key"></i>Ya tengo passkey</button>
    </div>
    <p class="alt">Sin frase semilla y sin pagar comisiones: tu huella o Face ID firma. <button class="linkbtn" id="freighter">Prefiero usar Freighter</button></p>
    ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ""}
  </section>`;

  const run = (id: string, busy: string, how: Mode, fn: () => Promise<string>) =>
    app.querySelector(`#${id}`)!.addEventListener("click", async (e) => {
      const b = e.currentTarget as HTMLButtonElement;
      app.querySelectorAll("button").forEach((x) => (x.disabled = true));
      b.innerHTML = `<span class="spin"></span>${busy}`;
      try {
        enter(await fn(), how);
      } catch (err) {
        renderIntro(err instanceof Error ? err.message : "No se pudo conectar.");
      }
    });

  run("create", "Creando tu wallet", "passkey", () =>
    createPasskeyWallet(app.querySelector<HTMLInputElement>("#name")!.value.trim()));
  run("login", "Esperando tu passkey", "passkey", connectPasskey);
  run("freighter", "Esperando a Freighter", "freighter", connectWallet);
}

async function load() {
  try {
    [reserve, events] = await Promise.all([taxReserve(me), paidEvents(me)]);
  } catch {
    reserve = null;
    events = [];
    app.querySelector("#load-error")?.classList.remove("hidden");
  }
  renderPanel();
}

function monthGross(list: Paid[]) {
  const now = new Date();
  return list
    .filter((p) => p.at.getMonth() === now.getMonth() && p.at.getFullYear() === now.getFullYear())
    .reduce((s, p) => s + p.gross, 0n);
}

function readFx(): number | null {
  try {
    const v = Number(localStorage.getItem(FX_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

function renderPanel() {
  const loading = events === null;
  const list = events ?? [];
  const net = list.reduce((s, p) => s + p.net, 0n);

  app.innerHTML = `
  <p id="load-error" class="error hidden" role="alert">No pudimos leer tus cobros de la red. Recarga la página en un momento.</p>
  <section class="hero rise" style="--i:0">
    <div>
      <p class="lbl"><i class="ph-light ph-vault"></i> Reserva para tu pago a cuenta</p>
      <p class="kpi num ${loading ? "sk" : ""}">${reserve === null ? "0.00" : fromUnits(reserve)}<small>USDC</small></p>
      <p class="kpi-note">Solo tú puedes mover este saldo. Vive en el contrato, separado de tu neto.</p>
      <form id="withdraw" class="withdraw">
        <label class="field"><span class="lbl">Enviar reserva a (cuenta G… o C…)</span><input class="num" name="to" required placeholder="Cuenta desde la que pagarás a SUNAT"></label>
        <label class="field amt"><span class="lbl">Monto (USDC)</span><input class="num" name="amount" required inputmode="decimal" pattern="\\d+(\\.\\d{1,7})?" value="${reserve ? fromUnits(reserve, 7).replace(/,/g, "").replace(/.?0+$/, "") : ""}"></label>
        <button class="btn ghost" type="submit" ${!reserve ? "disabled" : ""}><i class="ph-light ph-arrow-square-out"></i>Retirar reserva</button>
        <p class="wd-out" role="status"></p>
      </form>
    </div>
    <dl class="stats">
      <div><dt><i class="ph-light ph-wallet"></i> Neto recibido</dt><dd class="num ${loading ? "sk" : ""}">${fromUnits(net)} <small>USDC</small></dd></div>
      <div><dt><i class="ph-light ph-rows"></i> Cobros</dt><dd class="num ${loading ? "sk" : ""}">${list.length}</dd></div>
      <div><dt><i class="ph-light ph-percent"></i> Tasa de reserva</dt><dd class="num">8 <small>%</small></dd></div>
    </dl>
  </section>
  <section class="grid2">
    <div class="block rise" style="--i:1" id="threshold"></div>
    <form class="block rise" style="--i:2" id="newlink">
      <p class="lbl"><i class="ph-light ph-link-simple"></i> Nuevo link de cobro</p>
      <div class="row2">
        <label class="field"><span class="lbl">Monto (USDC)</span><input class="num" name="amount" inputmode="decimal" required pattern="\\d+(\\.\\d{1,7})?" placeholder="500.00"></label>
        <label class="field"><span class="lbl">N° de recibo</span><input class="num" name="ref" required maxlength="20" placeholder="E001-2"></label>
      </div>
      <label class="field"><span class="lbl">Concepto</span><input name="concept" required maxlength="80" placeholder="Diseño de identidad"></label>
      <label class="field"><span class="lbl">Tu nombre visible</span><input name="name" maxlength="60" placeholder="Opcional"></label>
      <button class="btn" type="submit"><i class="ph-light ph-plus"></i>Crear link</button>
      <div id="linkout" class="linkout hidden"></div>
    </form>
  </section>
  <section class="rise" style="--i:3">
    <div class="sec-h"><h2>Cobros</h2><span class="lbl">Leídos de la red Stellar</span></div>
    <div class="cards">${
      loading
        ? `<div class="receipt sk" style="height:260px"></div><div class="receipt sk" style="height:260px"></div>`
        : list.length
          ? list.map((p, i) => `<div class="rise" style="--i:${Math.min(i, 7)}">${receiptCard({
              gross: p.gross, title: `De ${short(p.payer)}`, ref: p.ref, text: RECEIPT_ES,
              badge: `<span class="badge ok"><i class="ph-light ph-check"></i>Cobrado</span>`,
              footLeft: p.at.toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
              txHash: p.txHash,
            })}<button class="btn ghost rhe-open" data-i="${i}"><i class="ph-light ph-file-text"></i>Borrador de recibo por honorarios</button></div>`).join("")
          : `<div class="emptybox"><i class="ph-light ph-receipt"></i><p>Todavía no tienes cobros. Crea un link y envíalo a tu cliente.</p></div>`
    }</div>
  </section>`;

  renderThreshold(loading ? null : monthGross(list));
  bindLinkForm();
  bindWithdraw();
  app.querySelectorAll<HTMLButtonElement>(".rhe-open").forEach((b) =>
    b.addEventListener("click", () => openRheDraft(list[Number(b.dataset.i)])));
}

function bindWithdraw() {
  const form = app.querySelector<HTMLFormElement>("#withdraw")!;
  const out = form.querySelector(".wd-out")!;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const to = String(d.get("to")).trim();
    const amount = toUnits(String(d.get("amount")));
    if (!StrKey.isValidEd25519PublicKey(to) && !StrKey.isValidContract(to)) {
      out.innerHTML = `<span class="error">Esa dirección no es válida en Stellar.</span>`;
      return;
    }
    if (amount <= 0n || (reserve !== null && amount > reserve)) {
      out.innerHTML = `<span class="error">El monto debe ser mayor a 0 y no pasar tu reserva.</span>`;
      return;
    }
    const btn = form.querySelector("button")!;
    btn.disabled = true;
    btn.innerHTML = `<span class="spin"></span>${mode === "passkey" ? "Confirma con tu passkey" : "Firma en Freighter"}`;
    try {
      const hash = mode === "passkey" ? await withdrawWithPasskey(me, to, amount) : await withdrawWithWallet(me, to, amount);
      reserve = await taxReserve(me);
      renderPanel();
      app.querySelector("#withdraw .wd-out")!.innerHTML =
        `Retiraste ${fromUnits(amount)} USDC. <a href="${EXPLORER}/tx/${hash}" target="_blank" rel="noopener">Ver transacción <i class="ph-light ph-arrow-up-right"></i></a>`;
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ph-light ph-arrow-square-out"></i>Retirar reserva`;
      out.innerHTML = `<span class="error">${esc(err instanceof Error ? err.message : "No se pudo retirar.")}</span>`;
    }
  });
}

function renderThreshold(gross: bigint | null) {
  const box = app.querySelector("#threshold")!;
  const fx = readFx();
  const usdc = gross === null ? null : Number(fromUnits(gross, 2).replace(/,/g, ""));
  const pen = usdc !== null && fx ? usdc * fx : null;
  const ratio = pen === null ? 0 : Math.min(pen / THRESHOLD_PEN, 1);
  const over = pen !== null && pen > THRESHOLD_PEN;
  const state =
    pen === null ? `<span class="badge"><i class="ph-light ph-question"></i>Falta tipo de cambio</span>`
    : over ? `<span class="badge warn"><i class="ph-light ph-warning"></i>Te toca pago a cuenta</span>`
    : `<span class="badge ok"><i class="ph-light ph-check"></i>Bajo el umbral</span>`;

  box.innerHTML = `
    <div class="rc-top"><p class="lbl"><i class="ph-light ph-gauge"></i> Umbral mensual SUNAT</p>${state}</div>
    <p class="th-num num">${pen === null ? "S/ —" : "S/ " + pen.toLocaleString("es-PE", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}<small>de S/ 4,010.00</small></p>
    <div class="meter"><i style="transform:scaleX(${ratio})" class="${over ? "over" : ""}"></i></div>
    <p class="th-help">${
      over
        ? "Este mes cobraste más de S/ 4,010. Te corresponde declarar y pagar el 8% como pago a cuenta. Tu reserva ya lo cubre."
        : "Si en el mes cobras hasta S/ 4,010 no haces pago a cuenta. La reserva igual se guarda para tu declaración anual."
    }</p>
    <label class="field fx"><span class="lbl">Tipo de cambio que usas (S/ por USDC)</span>
      <input class="num" id="fx" inputmode="decimal" placeholder="Ej. el del día de cobro" value="${fx ?? ""}">
      <small>Umbral 2026 según R.S. 000390-2025/SUNAT. La app no fija el tipo de cambio: usa el que aplicarás al declarar.</small>
    </label>`;

  box.querySelector<HTMLInputElement>("#fx")!.addEventListener("change", (e) => {
    const v = Number((e.target as HTMLInputElement).value.replace(",", "."));
    try { localStorage.setItem(FX_KEY, v > 0 ? String(v) : ""); } catch { /* sin storage */ }
    renderThreshold(gross);
  });
}

function bindLinkForm() {
  const form = app.querySelector<HTMLFormElement>("#newlink")!;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const amount = String(d.get("amount"));
    if (toUnits(amount) <= 0n) return;
    const params = new URLSearchParams({
      to: me, amount, ref: String(d.get("ref")), concept: String(d.get("concept")),
    });
    const name = String(d.get("name") ?? "").trim();
    if (name) params.set("name", name);
    const url = `${location.origin}/pay.html?${params}`;
    const out = form.querySelector("#linkout")!;
    out.classList.remove("hidden");
    out.innerHTML = `<code class="mono">${esc(url)}</code>
      <div class="row2"><button type="button" class="btn ghost" id="copy"><i class="ph-light ph-copy"></i>Copiar</button>
      <a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener"><i class="ph-light ph-arrow-up-right"></i>Abrir</a></div>`;
    out.querySelector("#copy")!.addEventListener("click", async (ev) => {
      const b = ev.currentTarget as HTMLButtonElement;
      try {
        await navigator.clipboard.writeText(url);
        b.innerHTML = `<i class="ph-light ph-check"></i>Copiado`;
      } catch {
        b.innerHTML = `Copia el texto de arriba`;
      }
    });
  });
}
