import "./styles.css";
import "./panel.css";
import { StrKey } from "@stellar/stellar-sdk";
import { connectPasskey, createPasskeyWallet, restorePasskey, withdrawWithPasskey } from "./passkey";
import {
  CONTRACT_ID, EXPLORER, FREIGHTER_INSTALL, type Paid, connectWallet, fromUnits, monthGross as chainMonthGross, paidEvents, serviceFee, short, taxReserve, toUnits, withdrawWithWallet,
} from "./stellar";
import { openRheDraft } from "./rhe";
import { SUSPENSION_CAP_PEN, THRESHOLD_PEN, UIT_PEN, estimate } from "./tax";
import { MARK, RECEIPT_ES, esc, receiptCard } from "./ui";

const FX_KEY = "honorarios.fx";
// Las rentas que el usuario teclea son de un mes. Sin el periodo en la clave, lo escrito
// en setiembre seguiria ahi en octubre y nadie lo volveria a revisar.
const periodKey = (base: string) => {
  const l = new Date(Date.now() - 5 * 3_600_000);
  return `${base}.${l.getUTCFullYear()}-${String(l.getUTCMonth() + 1).padStart(2, "0")}`;
};
const OTHER_KEY = periodKey("honorarios.otras4");
const FIFTH_KEY = periodKey("honorarios.quinta");
const HELD_KEY = periodKey("honorarios.retenido");
const CONFIRM_KEY = periodKey("honorarios.confirm");
const ROLE_KEY = "honorarios.dir4";
const PUBLIC_BASE = (import.meta.env.VITE_PUBLIC_BASE as string | undefined)?.replace(/\/$/, "") || location.origin;

const app = document.getElementById("app")!;
document.getElementById("brand")!.insertAdjacentHTML("afterbegin", MARK);

type Mode = "passkey" | "freighter" | "demo";
// Wallet creada con passkey durante la demo grabada, contra el contrato vigente.
// Si se redespliega el contrato hay que traer aqui una wallet que haya cobrado en el nuevo:
// `npm run check:demo` avisa cuando esta constante apunta a un despliegue muerto.
const DEMO_ADDRESS = "CCOEUIDDOVYNHO4XMS2UOUVFD2S456DB3JTTY7YOJB2QVPV35FDXPB4S";
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
    `${how === "passkey" ? `<i class="ph-light ph-fingerprint" aria-hidden="true"></i> Passkey · ` : ""}${
      how === "demo" ? `<i class="ph-light ph-eye" aria-hidden="true"></i> Ejemplo · ` : ""}${short(me)}`;
  renderPanel();
  load();
}

function renderIntro(error = "") {
  app.innerHTML = `
  <section class="intro rise">
    <p class="lbl">Para freelancers en Perú que cobran al exterior</p>
    <h1>Cobra en USDC y deja apartado tu pago a cuenta desde el primer dólar.</h1>
    <p>Cada cobro pasa por un contrato en Stellar: el 8% queda reservado a tu nombre y el resto llega a tu wallet. Si el mes supera S/ 4,010, esa reserva cubre tu pago a cuenta; si no, sigue siendo tuya.</p>
    <label class="field name"><span class="lbl">Tu nombre</span><input id="name" maxlength="40" placeholder="Como quieres que aparezca en tu passkey"></label>
    <div class="actions">
      <button class="btn" id="create"><i class="ph-light ph-fingerprint" aria-hidden="true"></i>Crear wallet con passkey</button>
      <button class="btn ghost" id="login"><i class="ph-light ph-key" aria-hidden="true"></i>Ya tengo passkey</button>
    </div>
    <p class="alt">Sin frase semilla: tu huella o Face ID firma. Las comisiones las cubre el relayer de SDF en testnet. <button class="linkbtn" id="freighter">Prefiero usar Freighter</button></p>
    <p class="alt"><button class="linkbtn" id="demo"><i class="ph-light ph-eye" aria-hidden="true"></i> Ver un panel de ejemplo</button> con la cuenta de la demo, sin instalar nada.</p>
    ${error ? `<p class="error" role="alert">${esc(error)}${
      error.includes("extensión Freighter")
        ? ` <a href="${FREIGHTER_INSTALL}" target="_blank" rel="noopener">Instalar Freighter <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></a>`
        : ""}</p>` : ""}
  </section>
  <section class="how rise" style="--i:1">
    <ol>
      <li><span class="lbl">01</span><div><b>Mandas un link de cobro</b><small>Monto, N° de recibo y concepto. Tu cliente paga con Freighter; si solo tiene XLM, Stellar los cambia en el camino.</small></div></li>
      <li><span class="lbl">02</span><div><b>El contrato reparte en el acto</b><small>El 8% queda reservado a tu nombre dentro del contrato y el resto llega a tu wallet. Una sola transacción, y cualquiera puede verificarla.</small></div></li>
      <li><span class="lbl">03</span><div><b>Retiras cuando toca declarar</b><small>El panel estima tu pago a cuenta del mes, explica cómo pagarlo en soles y te arma el borrador del recibo por honorarios.</small></div></li>
    </ol>
    <p class="alt"><a href="${EXPLORER}/contract/${CONTRACT_ID}" target="_blank" rel="noopener"><i class="ph-light ph-file-code" aria-hidden="true"></i> El contrato en Stellar Expert</a> · código abierto, 23 pruebas · Stellar testnet</p>
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
  // Tres llamadas independientes. El escaneo de eventos es el fragil (muchas ventanas
  // contra el RPC publico); que falle no puede borrar la reserva, que ya respondio.
  const [r, e, m] = await Promise.allSettled([taxReserve(me), paidEvents(me), chainMonthGross(me)]);
  reserve = r.status === "fulfilled" ? r.value : null;
  events = e.status === "fulfilled" ? e.value : null;
  monthly = m.status === "fulfilled" ? m.value.gross : null;
  // Solo es un error de verdad cuando no se pudo leer nada del contrato.
  loadError = r.status === "rejected" && m.status === "rejected";
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

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
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

  // Misma cuenta que hace el bloque de abajo, para que las dos partes no se contradigan.
  const fxNow = readFx();
  const reservePen = reserve === null || !fxNow ? null : Number(fromUnits(reserve, 2).replace(/,/g, "")) * fxNow;
  const est = estimate({
    appGrossPen: monthly !== null && fxNow ? Number(fromUnits(monthly, 2).replace(/,/g, "")) * fxNow : null,
    otherFourthPen: readNum(OTHER_KEY), fifthPen: readNum(FIFTH_KEY), withheldPen: readNum(HELD_KEY),
    isDirectorIncome: readFlag(ROLE_KEY), confirmedComplete: readFlag(CONFIRM_KEY),
  });
  const pen2 = (n: number) => "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const gap = est.duePen !== null && reservePen !== null ? est.duePen - reservePen : null;
  const reserveState =
    loading || loadError || gap === null ? ""
    : est.duePen === 0 ? `<span class="tag ok"><i class="ph-light ph-check" aria-hidden="true"></i>Este mes no hay pago a cuenta que cubrir</span>`
    : gap > 0.5 ? `<span class="tag warn"><i class="ph-light ph-warning" aria-hidden="true"></i>Faltan ${pen2(gap)} para cubrir el pago de ${pen2(est.duePen!)}</span>`
    : `<span class="tag ok"><i class="ph-light ph-check" aria-hidden="true"></i>Alcanza para el pago de ${pen2(est.duePen!)}</span>`;

  app.innerHTML = `
  ${loadError ? `<p class="error" role="alert"><i class="ph-light ph-warning" aria-hidden="true"></i> No pudimos leer tus cobros de la red. Lo que ves no es tu saldo: recarga en un momento. <button class="linkbtn" id="retry">Reintentar</button></p>` : ""}
  ${mode === "demo" ? `<p class="note" role="status"><i class="ph-light ph-eye" aria-hidden="true"></i> Panel de ejemplo con la cuenta de la demo, en testnet: los cobros, la reserva y el acumulado del mes se leen de la cadena en vivo. Este mes cruza el umbral, así que el bloque de abajo muestra un pago a cuenta real. La reserva se queda corta frente a él a propósito: en esta cuenta se retiraron 40 USDC antes del cierre del mes, que es justo lo que la app advierte que no conviene hacer. Puedes crear un link de prueba; retirar necesita la passkey de esa cuenta. <a href="${EXPLORER}/contract/${DEMO_ADDRESS}" target="_blank" rel="noopener">Ver la cuenta <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></a></p>` : ""}
  <section class="hero rise" style="--i:0">
    <div>
      <p class="lbl"><i class="ph-light ph-vault" aria-hidden="true"></i> Reserva preventiva · 8% de cada cobro</p>
      <p class="kpi num ${loading ? "sk" : ""}">${val(() => fromUnits(reserve!))}<small>USDC</small></p>
      ${reserveState}
      <p class="kpi-note">${mode === "demo" && reserve === 0n ? "Esta cuenta ya retiró su reserva durante la demo, por eso está en cero. " : ""}Solo tú puedes moverla. Cubre tu pago a cuenta si el mes supera S/ 4,010; si no, sigue siendo tuya.</p>
      <form id="withdraw" class="withdraw">
        <label class="field"><span class="lbl">Enviar reserva a</span><input class="num" name="to" required placeholder="Cuenta Stellar (G… o C…)"></label>
        <label class="field amt"><span class="lbl">Monto (USDC)</span><input class="num" name="amount" required inputmode="decimal" pattern="\\d+(\\.\\d{1,7})?" value="${reserve ? fromUnits(reserve, 7).replace(/,/g, "").replace(/\.?0+$/, "") : ""}"></label>
        <button class="btn ghost" type="submit" ${!reserve ? "disabled" : ""}><i class="ph-light ph-arrow-square-out" aria-hidden="true"></i>Retirar reserva</button>
        ${gap !== null && est.duePen === 0 && !est.provisional ? `<p class="u wd-hint">Este mes no supera el umbral, así que esta reserva es tuya. Aun así conviene esperar al cierre: un cobro más puede cruzarlo.</p>` : ""}
        <p class="wd-out" role="status">${!reserve && !loading ? `<span class="u">${loadError ? "No pudimos leer tu reserva, así que no se puede retirar todavía." : "No hay reserva que retirar: aparece aquí en cuanto recibas un cobro."}</span>` : ""}</p>
      </form>
    </div>
    <dl class="stats">
      <div><dt><i class="ph-light ph-wallet" aria-hidden="true"></i> Neto recibido</dt><dd class="num ${loading ? "sk" : ""}">${val(() => fromUnits(net))} <small>USDC</small></dd></div>
      <div><dt><i class="ph-light ph-rows" aria-hidden="true"></i> Cobros</dt><dd class="num ${loading ? "sk" : ""}">${val(() => String(list.length))}</dd></div>
      <div><dt><i class="ph-light ph-percent" aria-hidden="true"></i> Tasa de reserva</dt><dd class="num">8<small>%</small></dd></div>
    </dl>
  </section>
  <section class="grid2">
    <div class="block rise" style="--i:1" id="threshold"></div>
    <form class="block rise" style="--i:2" id="newlink">
      <p class="lbl"><i class="ph-light ph-link-simple" aria-hidden="true"></i> Nuevo link de cobro</p>
      <div class="row2">
        <label class="field"><span class="lbl">Monto (USDC)</span><input class="num" name="amount" inputmode="decimal" required pattern="\\d+(\\.\\d{1,7})?" placeholder="500.00"></label>
        <label class="field"><span class="lbl">N° de recibo</span><input class="num" name="ref" required maxlength="20" placeholder="E001-2"></label>
      </div>
      <label class="field"><span class="lbl">Concepto</span><input name="concept" required maxlength="80" placeholder="Diseño de identidad"></label>
      <label class="field"><span class="lbl">Tu nombre visible</span><input name="name" maxlength="60" placeholder="Opcional"></label>
      <button class="btn" type="submit"><i class="ph-light ph-plus" aria-hidden="true"></i>Crear link</button>
      <div id="linkout" class="linkout hidden"></div>
    </form>
  </section>
  <section class="rise" style="--i:3">
    <div class="sec-h"><h2>Cobros</h2><span class="lbl">Leídos de la red Stellar</span></div>
    <div class="cards">${
      loading
        ? `<div class="receipt sk" style="height:260px"></div><div class="receipt sk" style="height:260px"></div>`
        : loadError
          ? `<div class="emptybox"><i class="ph-light ph-cloud-slash" aria-hidden="true"></i><p>No pudimos leer la red. No sabemos si tienes cobros este mes.</p></div>`
          : list.length
          ? list.map((p, i) => `<div class="rise" style="--i:${Math.min(i, 7)}">${receiptCard({
              gross: p.gross, title: `De ${short(p.payer)}`, ref: p.ref, text: RECEIPT_ES,
              actual: { net: p.net, tax: p.tax, fee: p.fee },
              badge: `<span class="badge ok"><i class="ph-light ph-check" aria-hidden="true"></i>Cobrado</span>`,
              footLeft: p.at.toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
              txHash: p.txHash,
            })}<button class="btn ghost rhe-open" data-i="${i}"><i class="ph-light ph-file-text" aria-hidden="true"></i>Borrador de recibo por honorarios</button></div>`).join("")
          : (monthly !== null && monthly > 0n) || (reserve !== null && reserve > 0n)
          ? `<div class="emptybox"><i class="ph-light ph-clock-counter-clockwise" aria-hidden="true"></i><p>El contrato tiene cobros tuyos este mes, pero el nodo ya no guarda sus eventos: testnet conserva alrededor de una semana. Las cifras de arriba vienen del contrato y son exactas; lo que falta aquí es el detalle de cada cobro.</p></div>`
          : `<div class="emptybox"><i class="ph-light ph-receipt" aria-hidden="true"></i><p>Todavía no tienes cobros. Crea un link y envíalo a tu cliente.</p></div>`
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
    b.addEventListener("click", () => openRheDraft(list[Number(b.dataset.i)], readFx())));
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
        `Retiraste ${fromUnits(amount)} USDC. <a href="${EXPLORER}/tx/${hash}" target="_blank" rel="noopener">Ver transacción <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></a>`;
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ph-light ph-arrow-square-out" aria-hidden="true"></i>Retirar reserva`;
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
  const director = readFlag(ROLE_KEY);
  const confirmado = readFlag(CONFIRM_KEY);
  const est = estimate({
    appGrossPen: aqui, otherFourthPen: otras, fifthPen: quinta, withheldPen: retenido,
    isDirectorIncome: director, confirmedComplete: confirmado,
  });
  const cuarta = est.fourthBasePen;
  const pen = est.monthTotalPen;
  const over = est.overThreshold;
  const due = est.duePen;
  // La barra llega al 100% justo en el umbral, y la marca deja ver donde esta ese corte.
  const ratio = pen === null ? 0 : Math.min(pen / THRESHOLD_PEN, 1);
  const soles = (n: number) => "S/ " + n.toLocaleString("es-PE", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const month = new Date(Date.now() - PERU_OFFSET_MS).toLocaleDateString("es-PE", { month: "long", year: "numeric", timeZone: "UTC" });
  const state =
    !est.supported ? `<span class="badge warn"><i class="ph-light ph-warning" aria-hidden="true"></i>Fuera de lo que calcula esta app</span>`
    : pen === null ? `<span class="badge"><i class="ph-light ph-question" aria-hidden="true"></i>Falta tipo de cambio</span>`
    : over ? `<span class="badge warn"><i class="ph-light ph-warning" aria-hidden="true"></i>Supera el umbral</span>`
    : est.provisional ? `<span class="badge"><i class="ph-light ph-dots-three-circle" aria-hidden="true"></i>Falta confirmar tus otras rentas</span>`
    : `<span class="badge ok"><i class="ph-light ph-check" aria-hidden="true"></i>Bajo el umbral</span>`;

  box.innerHTML = `
    <div class="rc-top"><p class="lbl"><i class="ph-light ph-calendar-blank" aria-hidden="true"></i> Pago a cuenta · ${month}</p>${state}</div>
    <p class="th-num num">${due === null ? "S/ —" : soles(due)}</p>
    <p class="th-cap">${due === null ? "esta app no puede estimarlo" : "estimado, no es tu declaración"}</p>
    <div class="meter" title="${soles(THRESHOLD_PEN)} es el umbral"><i style="transform:scaleX(${ratio})" class="${over ? "over" : ""}"></i></div>
    <p class="th-scale"><span>${pen === null ? "acumulado del mes" : `acumulado ${soles(pen)}`}</span><span>umbral ${soles(THRESHOLD_PEN)}${
      over && pen ? ` · lo superas ${(pen / THRESHOLD_PEN).toFixed(1).replace(".0", "")} veces` : ""}</span></p>
    <div class="th-body"><div>
    <dl class="th-rows">
      <div><dt>Cobrado por esta app</dt><dd class="num">${aqui === null ? "—" : soles(aqui)}</dd></div>
      <div><dt>Otras rentas de cuarta del mes</dt><dd class="num">${soles(otras)}</dd></div>
      <div><dt><b>Base del pago a cuenta</b> (cuarta)</dt><dd class="num">${cuarta === null ? "—" : soles(cuarta)}</dd></div>
      <div><dt>Rentas de quinta, solo para el umbral</dt><dd class="num">${soles(quinta)}</dd></div>
      <div><dt>Total del mes frente al umbral</dt><dd class="num">${pen === null ? "—" : soles(pen)} <span class="u">de ${soles(THRESHOLD_PEN)}</span></dd></div>
      <div class="wide"><dt>Regla</dt><dd>si el total del mes supera el umbral, se paga 8% de la base de cuarta. Si no lo supera, no hay pago a cuenta este mes.</dd></div>
      <div><dt>Retenciones de cuarta ya practicadas</dt><dd class="num">− ${soles(retenido)}</dd></div>
    </dl>
    <p class="th-help">${
      !est.supported
        ? "Marcaste que tus rentas de cuarta son por función de director, mandatario, regidor, síndico o albacea. Ese grupo tiene un umbral mensual propio, más bajo que el general, y esta app no lo tiene verificado, así que no te muestra una cifra en vez de darte una tranquilidad que no puede sostener. Tu reserva sigue intacta y puedes retirarla. Confirma tu umbral con tu contador o en la resolución anual de SUNAT."
      : pen === null
        ? "Ingresa el tipo de cambio para estimar tu pago a cuenta de este mes."
        : over
          ? (() => {
              // Comparar de verdad la reserva con la deuda, en vez de afirmar que la cubre.
              const enReserva = reserve === null || !fx ? null : Number(fromUnits(reserve, 2).replace(/,/g, "")) * fx;
              if (enReserva === null) return "La reserva está en USDC y la deuda en soles, así que el tipo de cambio del día en que pagues mueve el resultado.";
              const falta = (due ?? 0) - enReserva;
              return falta > 0.5
                ? `Tu reserva equivale a ${soles(enReserva)} con este tipo de cambio: faltan ${soles(falta)} para cubrir el pago. La reserva está en USDC y la deuda en soles, así que el tipo de cambio del día en que pagues mueve el resultado.`
                : `Tu reserva equivale a ${soles(enReserva)} con este tipo de cambio y alcanza para el pago. Como está en USDC y la deuda es en soles, el tipo de cambio del día en que pagues mueve el resultado.`;
            })()
          : est.provisional
            ? "Con lo cobrado por esta app no se cruza el umbral, pero el umbral se mide sobre todo lo que ganaste este mes. Completa arriba tus otras rentas y confírmalo: hasta entonces esto no es un “no debes nada”."
            : "Con lo declarado aquí no habría pago a cuenta. Espera al cierre del mes antes de retirar la reserva: un cobro más puede cruzar el umbral y el 8% se aplica al total del mes."
    }</p>
    <p class="th-help"><i class="ph-light ph-warning-circle" aria-hidden="true"></i> Esto es un estimado con lo que esta app puede saber. El umbral se mide sobre todos tus ingresos del mes, incluidas las rentas de cuarta cobradas fuera de aquí y las de quinta si estás en planilla. Y el 8% es pago a cuenta: en la declaración anual el impuesto se recalcula sobre la renta neta, así que puede quedar saldo por pagar o a favor.</p>
    </div><div>
    <div class="row2">
      <label class="field"><span class="lbl">Otras rentas de cuarta del mes (S/)</span><input class="num other-in" data-k="${OTHER_KEY}" inputmode="decimal" placeholder="0.00" value="${otras || ""}"></label>
      <label class="field"><span class="lbl">Rentas de quinta del mes (S/)</span><input class="num other-in" data-k="${FIFTH_KEY}" inputmode="decimal" placeholder="0.00" value="${quinta || ""}"></label>
    </div>
    <label class="field"><span class="lbl">Retenciones que ya te hicieron este mes (S/)</span><input class="num other-in" data-k="${HELD_KEY}" inputmode="decimal" placeholder="0.00" value="${retenido || ""}"></label>
    <label class="check"><input type="checkbox" id="done4" ${confirmado ? "checked" : ""}><span>Ya revisé: esto es todo lo que gané este mes<small>Los importes de arriba son de ${month}. Mientras no lo confirmes, la app no afirma que no tienes pago a cuenta.</small></span></label>
    <label class="check"><input type="checkbox" id="dir4" ${director ? "checked" : ""}><span>Mis rentas de cuarta son por función de director, mandatario, regidor, síndico o albacea<small>Ese grupo tiene un umbral mensual distinto. Márcalo y la app deja de estimar en vez de darte un número que no le corresponde.</small></span></label>
    <details class="howto">
      <summary><i class="ph-light ph-list-numbers" aria-hidden="true"></i> Cómo se paga a SUNAT</summary>
      <ol>
        <li>Retira la reserva a tu wallet y conviértela a soles. SUNAT solo recibe soles.
          <div id="offramp" class="offramp"><span class="spin"></span> Consultando anclas de soles en Stellar…</div>
        </li>
        <li>Entra a SUNAT Operaciones en Línea con tu Clave SOL: Mis declaraciones y pagos, Trabajadores independientes (Formulario Virtual 616).</li>
        <li>Declara lo cobrado en el mes y paga con el NPS o en línea. El vencimiento depende del último dígito de tu RUC: <a href="https://www.sunat.gob.pe" target="_blank" rel="noopener">revisa el cronograma de obligaciones mensuales en sunat.gob.pe <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></a></li>
      </ol>
      <p>Si proyectas cobrar hasta S/ ${SUSPENSION_CAP_PEN.toLocaleString("es-PE")} en el año puedes pedir la suspensión de pagos a cuenta (Formulario 1609). La suspensión no es automática: rige desde que SUNAT la aprueba, no hacia atrás, y caduca el 31 de diciembre, así que hay que volver a pedirla cada año. Si un cliente peruano ya te retuvo el 8%, ese monto se descuenta del pago del mes.</p>
      <p class="src"><i class="ph-light ph-seal-question" aria-hidden="true"></i> De dónde salen las cifras: la tasa del 8% es el artículo 86 del TUO de la Ley del Impuesto a la Renta (D.S. 179-2004-EF). El tope anual de S/ ${SUSPENSION_CAP_PEN.toLocaleString("es-PE")} es 8.75 UIT, y el umbral mensual de S/ ${THRESHOLD_PEN.toLocaleString("es-PE")} es su doceava parte truncada a soles: por eso doce veces el mensual no da el anual. La UIT de 2026 son S/ ${UIT_PEN.toLocaleString("es-PE")}, fijada por el <a href="https://busquedas.elperuano.pe/dispositivo/NL/2469116-1" target="_blank" rel="noopener">D.S. 301-2025-EF publicado en El Peruano <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></a>. La misma regla reproduce los montos de 2025 con la UIT de ese año. <b>Aun así no hemos leído el texto de la resolución anual de SUNAT que los fija</b>: verifícalo antes de declarar. <a href="https://www.sunat.gob.pe" target="_blank" rel="noopener">sunat.gob.pe <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></a></p>
    </details>
    <label class="field fx"><span class="lbl">Tipo de cambio (S/ por USDC)</span>
      <input class="num" id="fx" inputmode="decimal" placeholder="TC compra SBS del día de cobro" value="${fx ?? ""}">
      <small>${mode === "demo" ? `Aquí va ${DEMO_FX} como ejemplo, para que el panel de muestra calcule algo. ` : ""}La norma usa el tipo de cambio compra SBS del día en que cobras; aquí se aplica uno solo a todo el mes como aproximación, así que el total en soles es cercano y no exacto. No hay criterio SUNAT publicado para cobros en cripto: confírmalo con tu contador.</small>
    </label>
    </div></div>`;

  renderOfframp();

  const save = (key: string, raw: string) => {
    const v = Number(raw.replace(",", "."));
    try { localStorage.setItem(key, v > 0 ? String(v) : ""); } catch { /* sin storage */ }
    renderThreshold(gross);
  };
  box.querySelector<HTMLInputElement>("#fx")!.addEventListener("change", (e) => save(FX_KEY, (e.target as HTMLInputElement).value));
  box.querySelectorAll<HTMLInputElement>(".other-in").forEach((i) =>
    i.addEventListener("change", () => save(i.dataset.k!, i.value)));
  const flag = (id: string, key: string) =>
    box.querySelector<HTMLInputElement>(id)!.addEventListener("change", (e) => {
      try { localStorage.setItem(key, (e.target as HTMLInputElement).checked ? "1" : ""); } catch { /* sin storage */ }
      renderThreshold(gross);
    });
  flag("#dir4", ROLE_KEY);
  flag("#done4", CONFIRM_KEY);
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
    box.innerHTML = `<i class="ph-light ph-bank" aria-hidden="true"></i> <b>${ANCHOR.name}</b> retira soles por SEP-24 en la red principal${esc(fee)}.
      <a href="${ANCHOR.toml}" target="_blank" rel="noopener">Ver su stellar.toml <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></a>
      <small>Consultado en vivo. Esta app corre en testnet, así que el retiro a un banco peruano no se ejecuta desde aquí.</small>`;
  } catch {
    box.innerHTML = `<i class="ph-light ph-bank" aria-hidden="true"></i> No pudimos consultar el ancla ahora. En la red principal hay anclas que liquidan soles por SEP-24; revisa <a href="${ANCHOR.home}" target="_blank" rel="noopener">${ANCHOR.name}</a>.`;
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
    // El link se lo mandas a un cliente en el extranjero: tiene que apuntar al dominio
    // publico, no a la maquina desde la que lo generaste.
    const url = `${PUBLIC_BASE}/pay.html?${params}`;
    const out = form.querySelector("#linkout")!;
    out.classList.remove("hidden");
    out.innerHTML = `<code class="mono">${esc(url)}</code>
      <div class="row2"><button type="button" class="btn ghost" id="copy"><i class="ph-light ph-copy" aria-hidden="true"></i>Copiar</button>
      <a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener"><i class="ph-light ph-arrow-up-right" aria-hidden="true"></i>Abrir</a></div>`;
    out.querySelector("#copy")!.addEventListener("click", async (ev) => {
      const b = ev.currentTarget as HTMLButtonElement;
      try {
        await navigator.clipboard.writeText(url);
        b.innerHTML = `<i class="ph-light ph-check" aria-hidden="true"></i>Copiado`;
      } catch {
        b.innerHTML = `Copia el texto de arriba`;
      }
    });
  });
}
