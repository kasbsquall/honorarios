import "./styles.css";
import "./panel.css";
import { StrKey } from "@stellar/stellar-sdk";
import { connectPasskey, createPasskeyWallet, restorePasskey, withdrawWithPasskey } from "./passkey";
import {
  EXPLORER, FREIGHTER_INSTALL, type Paid, connectWallet, fromUnits, monthGross as chainMonthGross, paidEvents, short, taxReserve, toUnits, withdrawWithWallet,
} from "./stellar";
import { openRheDraft } from "./rhe";
import { MARK, RECEIPT_ES, esc, receiptCard } from "./ui";

// Umbral 2026 bajo el cual no hay pago a cuenta de cuarta categoria (R.S. 000390-2025/SUNAT).
const THRESHOLD_PEN = 4010;
// Pago a cuenta de cuarta categoria: 8% de la renta bruta percibida en el mes.
const PAYMENT_RATE = 0.08;
const FX_KEY = "honorarios.fx";
const OTHER_KEY = "honorarios.otras4";
const FIFTH_KEY = "honorarios.quinta";
const HELD_KEY = "honorarios.retenido";

const app = document.getElementById("app")!;
document.getElementById("brand")!.insertAdjacentHTML("afterbegin", MARK);

type Mode = "passkey" | "freighter" | "demo";
// Wallet creada con passkey durante la demo grabada: sus cobros y su retiro estan en testnet.
const DEMO_ADDRESS = "CD6EERWSWJMP4AIKW2E6ZIGO7FWLMX45IWZFJKGBZ4X6VOCYGV5K7GXD";
let me = "";
let mode: Mode = "passkey";
let events: Paid[] | null = null;
let reserve: bigint | null = null;
// Ultima lectura de la cadena fallida: nunca pintar ceros como si fueran el dato.
let loadError = false;
// Acumulado del mes leido del contrato: sobrevive a la ventana de eventos del RPC.
let monthly: bigint | null = null;

restorePasskey().then((id) => (id ? enter(id, "passkey") : renderIntro()));

function enter(address: string, how: Mode) {
  me = address;
  mode = how;
  document.getElementById("who")!.innerHTML =
    `${how === "passkey" ? `<i class="ph-light ph-fingerprint"></i> Passkey · ` : ""}${
      how === "demo" ? `<i class="ph-light ph-eye"></i> Ejemplo · ` : ""}${short(me)}`;
  renderPanel();
  load();
}

function renderIntro(error = "") {
  app.innerHTML = `
  <section class="intro rise">
    <p class="lbl">Para freelancers en Perú que cobran al exterior</p>
    <h1>Cobra en USDC y deja apartado tu pago a cuenta desde el primer dólar.</h1>
    <p>Cada cobro pasa por un contrato en Stellar: el 92% llega a tu wallet y el 8% queda reservado a tu nombre. Si el mes supera S/ 4,010, esa reserva cubre tu pago a cuenta; si no, sigue siendo tuya.</p>
    <label class="field name"><span class="lbl">Tu nombre</span><input id="name" maxlength="40" placeholder="Como quieres que aparezca en tu passkey"></label>
    <div class="actions">
      <button class="btn" id="create"><i class="ph-light ph-fingerprint"></i>Crear wallet con passkey</button>
      <button class="btn ghost" id="login"><i class="ph-light ph-key"></i>Ya tengo passkey</button>
    </div>
    <p class="alt">Sin frase semilla y sin pagar comisiones: tu huella o Face ID firma. <button class="linkbtn" id="freighter">Prefiero usar Freighter</button></p>
    <p class="alt"><button class="linkbtn" id="demo"><i class="ph-light ph-eye"></i> Ver un panel de ejemplo</button> con la cuenta de la demo, sin instalar nada.</p>
    ${error ? `<p class="error" role="alert">${esc(error)}${
      error.includes("extensión Freighter")
        ? ` <a href="${FREIGHTER_INSTALL}" target="_blank" rel="noopener">Instalar Freighter <i class="ph-light ph-arrow-up-right"></i></a>`
        : ""}</p>` : ""}
  </section>`;

  app.querySelector("#demo")!.addEventListener("click", () => enter(DEMO_ADDRESS, "demo"));

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
    const [r, e, m] = await Promise.all([taxReserve(me), paidEvents(me), chainMonthGross(me)]);
    reserve = r;
    events = e;
    monthly = m.gross;
    loadError = false;
  } catch {
    reserve = null;
    events = null;
    monthly = null;
    loadError = true;
  }
  renderPanel();
}

// El contrato cierra el mes a medianoche de Lima: el fallback mide igual, sin
// depender del huso del navegador.
const PERU_OFFSET_MS = 5 * 3_600_000;
const limaMonth = (d: Date) => {
  const l = new Date(d.getTime() - PERU_OFFSET_MS);
  return l.getUTCFullYear() * 12 + l.getUTCMonth();
};

function monthGross(list: Paid[]) {
  const now = limaMonth(new Date());
  return list.filter((p) => limaMonth(p.at) === now).reduce((s, p) => s + p.gross, 0n);
}

function readNum(key: string): number {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

// Tipo de cambio de ejemplo, solo para que el panel de muestra tenga algo que calcular.
const DEMO_FX = 3.75;

function readFx(): number | null {
  try {
    const v = Number(localStorage.getItem(FX_KEY));
    if (v > 0) return v;
  } catch { /* sin storage */ }
  return mode === "demo" ? DEMO_FX : null;
}

function renderPanel() {
  const loading = events === null && !loadError;
  const list = events ?? [];
  const net = list.reduce((s, p) => s + p.net, 0n);
  // Sin dato no se pinta un numero: un 0 afirma algo que no sabemos.
  const val = (fn: () => string) => (loading ? "" : loadError ? "—" : fn());

  app.innerHTML = `
  ${loadError ? `<p class="error" role="alert"><i class="ph-light ph-warning"></i> No pudimos leer tus cobros de la red. Lo que ves no es tu saldo: recarga en un momento. <button class="linkbtn" id="retry">Reintentar</button></p>` : ""}
  ${mode === "demo" ? `<p class="note" role="status"><i class="ph-light ph-eye"></i> Panel de ejemplo en solo lectura, con la cuenta de la demo grabada en testnet. Los cobros y la reserva se leen de la cadena. <a href="${EXPLORER}/contract/${DEMO_ADDRESS}" target="_blank" rel="noopener">Ver la cuenta <i class="ph-light ph-arrow-up-right"></i></a></p>` : ""}
  <section class="hero rise" style="--i:0">
    <div>
      <p class="lbl"><i class="ph-light ph-vault"></i> Reserva preventiva · 8% de cada cobro</p>
      <p class="kpi num ${loading ? "sk" : ""}">${val(() => fromUnits(reserve!))}<small>USDC</small></p>
      <p class="kpi-note">Solo tú puedes moverla. Cubre tu pago a cuenta si el mes supera S/ 4,010; si no, sigue siendo tuya.</p>
      <form id="withdraw" class="withdraw">
        <label class="field"><span class="lbl">Enviar reserva a (cuenta G… o C…)</span><input class="num" name="to" required placeholder="Cuenta desde la que pagarás a SUNAT"></label>
        <label class="field amt"><span class="lbl">Monto (USDC)</span><input class="num" name="amount" required inputmode="decimal" pattern="\\d+(\\.\\d{1,7})?" value="${reserve ? fromUnits(reserve, 7).replace(/,/g, "").replace(/\.?0+$/, "") : ""}"></label>
        <button class="btn ghost" type="submit" ${!reserve ? "disabled" : ""}><i class="ph-light ph-arrow-square-out"></i>Retirar reserva</button>
        <p class="wd-out" role="status"></p>
      </form>
    </div>
    <dl class="stats">
      <div><dt><i class="ph-light ph-wallet"></i> Neto recibido</dt><dd class="num ${loading ? "sk" : ""}">${val(() => fromUnits(net))} <small>USDC</small></dd></div>
      <div><dt><i class="ph-light ph-rows"></i> Cobros</dt><dd class="num ${loading ? "sk" : ""}">${val(() => String(list.length))}</dd></div>
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
        : loadError
          ? `<div class="emptybox"><i class="ph-light ph-cloud-slash"></i><p>No pudimos leer la red. No sabemos si tienes cobros este mes.</p></div>`
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

  renderThreshold(loading || loadError ? null : (monthly ?? monthGross(list)));
  bindLinkForm();
  bindWithdraw();
  app.querySelector("#retry")?.addEventListener("click", () => {
    loadError = false;
    events = null;
    renderPanel();
    load();
  });
  app.querySelectorAll<HTMLButtonElement>(".rhe-open").forEach((b) =>
    b.addEventListener("click", () => openRheDraft(list[Number(b.dataset.i)])));
}

function bindWithdraw() {
  const form = app.querySelector<HTMLFormElement>("#withdraw")!;
  const out = form.querySelector(".wd-out")!;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (mode === "demo") {
      out.innerHTML = `<span class="error">El panel de ejemplo es solo lectura. Crea tu wallet con passkey para retirar.</span>`;
      return;
    }
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
  const otras = readNum(OTHER_KEY);
  const quinta = readNum(FIFTH_KEY);
  const retenido = readNum(HELD_KEY);
  const usdc = gross === null ? null : Number(fromUnits(gross, 2).replace(/,/g, ""));
  const aqui = usdc !== null && fx ? usdc * fx : null;
  // El umbral se mide sobre el total de ingresos del mes, no solo sobre lo que pasa por esta app.
  const pen = aqui === null ? null : aqui + otras + quinta;
  const ratio = pen === null ? 0 : Math.min(pen / THRESHOLD_PEN, 1);
  const over = pen !== null && pen > THRESHOLD_PEN;
  const soles = (n: number) => "S/ " + n.toLocaleString("es-PE", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const month = new Date().toLocaleDateString("es-PE", { month: "long", year: "numeric" });
  // Lo ya retenido por un cliente peruano se descuenta del pago del mes.
  const due = pen === null ? null : over ? Math.max(pen * PAYMENT_RATE - retenido, 0) : 0;
  const state =
    pen === null ? `<span class="badge"><i class="ph-light ph-question"></i>Falta tipo de cambio</span>`
    : over ? `<span class="badge warn"><i class="ph-light ph-warning"></i>Supera el umbral</span>`
    : `<span class="badge ok"><i class="ph-light ph-check"></i>Bajo el umbral</span>`;

  box.innerHTML = `
    <div class="rc-top"><p class="lbl"><i class="ph-light ph-calendar-blank"></i> Pago a cuenta · ${month}</p>${state}</div>
    <p class="th-num num">${due === null ? "S/ —" : soles(due)}<small>estimado, no es tu declaración</small></p>
    <div class="meter"><i style="transform:scaleX(${ratio})" class="${over ? "over" : ""}"></i></div>
    <dl class="th-rows">
      <div><dt>Cobrado por esta app</dt><dd class="num">${aqui === null ? "—" : soles(aqui)}</dd></div>
      <div><dt>Otras rentas del mes que declaraste aquí</dt><dd class="num">${soles(otras + quinta)}</dd></div>
      <div><dt>Total del mes</dt><dd class="num">${pen === null ? "—" : soles(pen)}</dd></div>
      <div><dt>Umbral del mes</dt><dd class="num">${soles(THRESHOLD_PEN)}</dd></div>
      <div><dt>Regla</dt><dd>8% del total del mes si lo supera, S/ 0 si no</dd></div>
      <div><dt>Ya te retuvieron</dt><dd class="num">${soles(retenido)}</dd></div>
    </dl>
    <p class="th-help">${
      pen === null
        ? "Ingresa el tipo de cambio para estimar tu pago a cuenta de este mes."
        : over
          ? "Tu reserva se acerca a este pago, no lo calza exacto: la reserva está en USDC y la deuda en soles, así que el tipo de cambio del día en que pagues mueve el resultado."
          : "Con lo declarado aquí no habría pago a cuenta. Espera al cierre del mes antes de retirar la reserva: un cobro más puede cruzar el umbral y el 8% se aplica al total del mes."
    }</p>
    <p class="th-help"><i class="ph-light ph-warning-circle"></i> Esto es un estimado con lo que esta app puede saber. El umbral se mide sobre todos tus ingresos del mes, incluidas las rentas de cuarta cobradas fuera de aquí y las de quinta si estás en planilla. Y el 8% es pago a cuenta: en la declaración anual el impuesto se recalcula sobre la renta neta, así que puede quedar saldo por pagar o a favor.</p>
    <div class="row2">
      <label class="field"><span class="lbl">Otras rentas de cuarta del mes (S/)</span><input class="num other-in" data-k="${OTHER_KEY}" inputmode="decimal" placeholder="0.00" value="${otras || ""}"></label>
      <label class="field"><span class="lbl">Rentas de quinta del mes (S/)</span><input class="num other-in" data-k="${FIFTH_KEY}" inputmode="decimal" placeholder="0.00" value="${quinta || ""}"></label>
    </div>
    <label class="field"><span class="lbl">Retenciones que ya te hicieron este mes (S/)</span><input class="num other-in" data-k="${HELD_KEY}" inputmode="decimal" placeholder="0.00" value="${retenido || ""}"></label>
    <details class="howto">
      <summary><i class="ph-light ph-list-numbers"></i> Cómo se paga a SUNAT</summary>
      <ol>
        <li>Retira la reserva a tu wallet y conviértela a soles. SUNAT solo recibe soles.
          <div id="offramp" class="offramp"><span class="spin"></span> Consultando anclas de soles en Stellar…</div>
        </li>
        <li>Entra a SUNAT Operaciones en Línea con tu Clave SOL: Mis declaraciones y pagos, Trabajadores independientes (Formulario Virtual 616).</li>
        <li>Declara lo cobrado en el mes y paga con el NPS o en línea. El vencimiento depende del último dígito de tu RUC: <a href="https://www.sunat.gob.pe" target="_blank" rel="noopener">revisa el cronograma de obligaciones mensuales en sunat.gob.pe <i class="ph-light ph-arrow-up-right"></i></a></li>
      </ol>
      <p>Si proyectas cobrar hasta S/ 48,125 en el año puedes pedir la suspensión de pagos a cuenta (Formulario 1609). Si un cliente peruano ya te retuvo el 8%, ese monto se descuenta del pago del mes.</p>
      <p class="src"><i class="ph-light ph-seal-question"></i> De dónde salen las cifras: la tasa del 8% es el artículo 86 del TUO de la Ley del Impuesto a la Renta (D.S. 179-2004-EF). El umbral de S/ ${THRESHOLD_PEN.toLocaleString("es-PE")} y el tope de S/ 48,125 los tomamos de la resolución anual de SUNAT citada como R.S. 000390-2025/SUNAT, <b>leída de una fuente secundaria y todavía sin contrastar contra el texto publicado en El Peruano</b>. Verifícalas antes de declarar. <a href="https://www.sunat.gob.pe" target="_blank" rel="noopener">sunat.gob.pe <i class="ph-light ph-arrow-up-right"></i></a></p>
    </details>
    <label class="field fx"><span class="lbl">Tipo de cambio (S/ por USDC)</span>
      <input class="num" id="fx" inputmode="decimal" placeholder="TC compra SBS del día de cobro" value="${fx ?? ""}">
      <small>${mode === "demo" ? `Aquí va ${DEMO_FX} como ejemplo, para que el panel de muestra calcule algo. ` : ""}La norma usa el tipo de cambio compra SBS del día en que cobras; aquí se aplica uno solo a todo el mes como aproximación, así que el total en soles es cercano y no exacto. No hay criterio SUNAT publicado para cobros en cripto: confírmalo con tu contador.</small>
    </label>`;

  renderOfframp();

  const save = (key: string, raw: string) => {
    const v = Number(raw.replace(",", "."));
    try { localStorage.setItem(key, v > 0 ? String(v) : ""); } catch { /* sin storage */ }
    renderThreshold(gross);
  };
  box.querySelector<HTMLInputElement>("#fx")!.addEventListener("change", (e) => save(FX_KEY, (e.target as HTMLInputElement).value));
  box.querySelectorAll<HTMLInputElement>(".other-in").forEach((i) =>
    i.addEventListener("change", () => save(i.dataset.k!, i.value)));
}

// Ancla SEP-24 que liquida en soles. Se consulta en vivo: si deja de ofrecer PEN, se nota.
const ANCHOR = { home: "https://www.anclap.com", toml: "https://api.anclap.com/.well-known/stellar.toml", info: "https://api.anclap.com/transfer24/info", name: "Anclap" };

async function renderOfframp() {
  const box = app.querySelector("#offramp");
  if (!box) return;
  try {
    const info = await fetch(ANCHOR.info).then((r) => r.json());
    const pen = info?.withdraw?.PEN;
    if (!pen?.enabled) throw new Error("sin PEN");
    const fee = typeof pen.fee_percent === "number" ? ` · comisión ${pen.fee_percent}%` : "";
    box.innerHTML = `<i class="ph-light ph-bank"></i> <b>${ANCHOR.name}</b> retira soles por SEP-24 en la red principal${esc(fee)}.
      <a href="${ANCHOR.toml}" target="_blank" rel="noopener">Ver su stellar.toml <i class="ph-light ph-arrow-up-right"></i></a>
      <small>Consultado en vivo. Esta app corre en testnet, así que el retiro a un banco peruano no se ejecuta desde aquí.</small>`;
  } catch {
    box.innerHTML = `<i class="ph-light ph-bank"></i> No pudimos consultar el ancla ahora. En la red principal hay anclas que liquidan soles por SEP-24; revisa <a href="${ANCHOR.home}" target="_blank" rel="noopener">${ANCHOR.name}</a>.`;
  }
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
