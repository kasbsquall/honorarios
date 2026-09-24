import "./styles.css";
import "./panel.css";
import { StrKey } from "@stellar/stellar-sdk";
import { connectPasskey, createPasskeyWallet, extendWithPasskey, issueWithPasskey, restorePasskey, withdrawWithPasskey } from "./passkey";
import {
  CONTRACT_ID, EXPLORER, FREIGHTER_INSTALL, type Issued, type Paid, addUsdcTrustline, connectWallet, extendWithWallet, fromUnits, issueWithWallet, issuedEvents, readReceipt,
  monthGross as chainMonthGross, paidEvents, reserveLiveUntil, short, taxReserve, toUnits, usdcBalance, withdrawWithWallet,
} from "./stellar";
import { openRheDraft } from "./rhe";
import { DIRECTOR_CAP_PEN, DIRECTOR_THRESHOLD_PEN, SUSPENSION_CAP_PEN, THRESHOLD_PEN, UIT_PEN, estimate } from "./tax";
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
// Cuenta de pruebas que cobra contra el contrato vigente (web/scripts/seed-demo.mjs).
// Si se redespliega el contrato hay que traer aqui una cuenta que haya cobrado en el nuevo:
// `npm run check:demo` avisa cuando esta constante apunta a un despliegue muerto.
const DEMO_ADDRESS = "GCY5LQWZD36VIBSH6PSJOHJK4F3LSNFPTMJMRH7UWKI5L4PPKCXZHSSA";
// Link de pago de un recibo emitido: solo dice a quien y que N°, el monto lo pone el contrato.
const payLink = (ref: string) => `${PUBLIC_BASE}/pay.html?${new URLSearchParams({ to: me, ref })}`;
// Dias de vida que le quedan a la reserva por debajo de los cuales se ofrece renovarla.
// El contrato solo alarga el TTL cuando queda menos de 7 dias; 10 da margen para hacerlo a tiempo.
const RENEW_DAYS = 10;
let me = "";
let mode: Mode = "passkey";
let events: Paid[] | null = null;
let reserve: bigint | null = null;
// Ultima lectura de la cadena fallida: nunca pintar ceros como si fueran el dato.
let loadError = false;
// Acumulado del mes leido del contrato: sobrevive a la ventana de eventos del RPC.
let monthly: bigint | null = null;
// Recibos emitidos que nadie ha pagado todavia.
let pending: Issued[] = [];
let liveUntil: Date | null = null;
// Solo una cuenta G necesita trustline de USDC; una smart wallet recibe por el SAC sin ella.
let hasTrustline: boolean | null = null;

// `?demo` abre el panel de ejemplo sin pasar por la portada: es el enlace que va en el README.
// Diferido como la rama de passkey: el panel usa constantes que se declaran mas abajo.
if (new URLSearchParams(location.search).has("demo")) queueMicrotask(() => enter(DEMO_ADDRESS, "demo"));
else restorePasskey().then((id) => (id ? enter(id, "passkey") : renderIntro()));

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
    <h1>Tu pago a cuenta de SUNAT, apartado desde el primer dólar que cobras afuera.</h1>
    <p>Cada cobro del exterior pasa por un contrato en Stellar: el 8% queda reservado a tu nombre, solo tú puedes moverlo, y el resto llega a tu wallet. Si el mes supera tu umbral de SUNAT, S/ 4,010 en el caso general, esa reserva cubre tu pago a cuenta; si no, sigue siendo tuya.</p>
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
      <li><span class="lbl">01</span><div><b>Emites tu recibo y mandas el link</b><small>Monto, N° de recibo y concepto. El recibo queda registrado en el contrato y tu cliente solo puede pagar ese monto, una vez. Paga con Freighter; si solo tiene XLM, Stellar los cambia en el camino.</small></div></li>
      <li><span class="lbl">02</span><div><b>El contrato reparte en el acto</b><small>El 8% queda reservado a tu nombre dentro del contrato y el resto llega a tu wallet. Una sola transacción, y cualquiera puede verificarla.</small></div></li>
      <li><span class="lbl">03</span><div><b>Retiras cuando toca declarar</b><small>El panel estima tu pago a cuenta del mes, explica cómo pagarlo en soles y te arma el borrador del recibo por honorarios.</small></div></li>
    </ol>
    <p class="alt"><a href="${EXPLORER}/contract/${CONTRACT_ID}" target="_blank" rel="noopener"><i class="ph-light ph-file-code" aria-hidden="true"></i> El contrato en Stellar Expert</a> · código abierto · Stellar testnet</p>
    <p class="alt price"><i class="ph-light ph-receipt" aria-hidden="true"></i> <b>Qué costaría usarlo:</b> el plan es cobrar 0.5% por cobro liquidado, sin cuota mensual. El contrato tiene un tope duro de 1% que su constructor rechaza superar, y <b>hoy está desplegado en cero</b>. No tienes que creerlo: la comisión es pública en la cadena y la pantalla de pago la lee de ahí antes de que tu cliente firme.</p>
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
  const isG = me.startsWith("G");
  const [r, e, m, iss, ttl, tl] = await Promise.allSettled([
    taxReserve(me), paidEvents(me), chainMonthGross(me), issuedEvents(me), reserveLiveUntil(me),
    isG ? usdcBalance(me) : Promise.resolve(0n),
  ]);
  reserve = r.status === "fulfilled" ? r.value : null;
  events = e.status === "fulfilled" ? e.value : null;
  monthly = m.status === "fulfilled" ? m.value.gross : null;
  // Si un recibo esta pagado lo dice el contrato, no los eventos: la lista de pagos puede
  // fallar o quedarse corta y no por eso un recibo pagado vuelve a estar pendiente.
  const issued = iss.status === "fulfilled" ? iss.value : [];
  const states = await Promise.all(issued.map((i) => readReceipt(me, i.ref).catch(() => undefined)));
  pending = issued.filter((_, k) => states[k] === undefined || states[k]?.paid === false);
  liveUntil = ttl.status === "fulfilled" ? ttl.value : null;
  hasTrustline = tl.status === "fulfilled" ? tl.value !== null : null;
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

/* Rango de cordura del tipo de cambio. No bloquea, avisa: toda la conversion a soles cuelga
 * de este numero, y un punto decimal de mas convierte un mes obligado en uno tranquilo. */
const FX_MIN = 2;
const FX_MAX = 6;

/** El tipo de cambio que el usuario escribio, sin el de ejemplo. */
function readStoredFx(): number | null {
  try {
    const v = Number(localStorage.getItem(FX_KEY));
    if (v > 0) return v;
  } catch { /* sin storage */ }
  return null;
}

function readFx(): number | null {
  return readStoredFx() ?? (mode === "demo" ? DEMO_FX : null);
}

function renderPanel() {
  const loading = events === null && !loadError;
  const list = events ?? [];
  // El marco del panel es el mes: sumar cobros de meses anteriores mezclaria periodos.
  const thisMonth = list.filter((p) => limaMonth(p.at) === limaMonth(new Date()));
  const net = thisMonth.reduce((s, p) => s + p.net, 0n);
  // Sin dato no se pinta un numero: un 0 afirma algo que no sabemos.
  const val = (fn: () => string) => (loading ? "" : loadError ? "—" : fn());

  // Misma cuenta que hace el bloque de abajo, para que las dos partes no se contradigan.
  const fxNow = readFx();
  // Un TC fuera de rango hunde el total en soles: los avisos verdes no pueden ignorarlo.
  const fxRaro = fxNow !== null && (fxNow < FX_MIN || fxNow > FX_MAX);
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
    : est.duePen === 0 && fxRaro ? `<span class="tag warn"><i class="ph-light ph-warning" aria-hidden="true"></i>Revisa el tipo de cambio antes de fiarte de esto</span>`
    : est.duePen === 0 && est.provisional ? `<span class="tag"><i class="ph-light ph-dots-three-circle" aria-hidden="true"></i>Falta confirmar tus otras rentas del mes para saber si hay algo que cubrir</span>`
    : est.duePen === 0 ? `<span class="tag ok"><i class="ph-light ph-check" aria-hidden="true"></i>Este mes no hay pago a cuenta que cubrir</span>`
    : gap > 0.5 ? `<span class="tag warn"><i class="ph-light ph-warning" aria-hidden="true"></i>Faltan ${pen2(gap)} para cubrir el pago de ${pen2(est.duePen!)}${
        mode === "demo" ? ", porque en esta cuenta se retiró la reserva antes de cerrar el mes" : ""}</span>`
    : `<span class="tag ok"><i class="ph-light ph-check" aria-hidden="true"></i>Alcanza para el pago de ${pen2(est.duePen!)}</span>`;

  app.innerHTML = `
  ${loadError ? `<p class="error" role="alert"><i class="ph-light ph-warning" aria-hidden="true"></i> No pudimos leer tus cobros de la red. Lo que ves no es tu saldo: recarga en un momento. <button class="linkbtn" id="retry">Reintentar</button>${
    mode !== "demo" ? ` Si tu reserva lleva más de un mes sin movimiento, la red pudo archivarla: <button class="linkbtn renew">restáurala</button>, sin mover fondos.` : ""}</p>` : ""}
  ${mode === "demo" ? `<p class="note" role="status"><i class="ph-light ph-eye" aria-hidden="true"></i> Panel de ejemplo con una cuenta de pruebas, en testnet: los recibos, los cobros, la reserva y el acumulado del mes se leen de la cadena en vivo. Este mes cruza el umbral, así que el bloque de abajo muestra un pago a cuenta real. La reserva se queda corta frente a él a propósito: en esta cuenta se retiraron 40 USDC antes del cierre del mes, que es justo lo que la app advierte que no conviene hacer. Emitir recibos y retirar necesitan la firma de esa cuenta; lo que sí puedes hacer es abrir un recibo de "Por cobrar" y pagarlo con Freighter en testnet. <a href="${EXPLORER}/${DEMO_ADDRESS.startsWith("G") ? "account" : "contract"}/${DEMO_ADDRESS}" target="_blank" rel="noopener">Ver la cuenta <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></a></p>` : ""}
  <section class="hero rise" style="--i:0">
    <div>
      <p class="lbl"><i class="ph-light ph-vault" aria-hidden="true"></i> Reserva preventiva · 8% de cada cobro</p>
      <p class="kpi num ${loading ? "sk" : ""}">${val(() => fromUnits(reserve!))}<small>USDC</small></p>
      ${reserveState}
      <p class="kpi-note">${mode === "demo" && reserve === 0n ? "Esta cuenta ya retiró su reserva durante la demo, por eso está en cero. " : ""}Solo tú puedes moverla. Cubre tu pago a cuenta si el mes supera tu umbral, S/ ${est.thresholdPen.toLocaleString("es-PE")}; si no, sigue siendo tuya.</p>
      ${ttlLine()}
      <form id="withdraw" class="withdraw">
        <label class="field"><span class="lbl">Enviar reserva a</span><input class="num" name="to" required placeholder="Cuenta Stellar (G… o C…)"></label>
        <label class="field amt"><span class="lbl">Monto (USDC)</span><input class="num" name="amount" required inputmode="decimal" pattern="\\d+(\\.\\d{1,7})?" value="${reserve ? fromUnits(reserve, 7).replace(/,/g, "").replace(/\.?0+$/, "") : ""}"></label>
        <button class="btn ghost" type="submit" ${!reserve ? "disabled" : ""}><i class="ph-light ph-arrow-square-out" aria-hidden="true"></i>Retirar reserva</button>
        ${gap !== null && est.duePen === 0 && !est.provisional ? `<p class="u wd-hint">Este mes no supera el umbral, así que esta reserva es tuya. Aun así conviene esperar al cierre: un cobro más puede cruzarlo.</p>` : ""}
        <p class="wd-out" role="status">${!reserve && !loading ? `<span class="u">${loadError ? "No pudimos leer tu reserva, así que no se puede retirar todavía." : "No hay reserva que retirar: aparece aquí en cuanto recibas un cobro."}</span>` : ""}</p>
      </form>
    </div>
    <dl class="stats">
      <div><dt><i class="ph-light ph-wallet" aria-hidden="true"></i> Neto recibido este mes</dt><dd class="num ${loading ? "sk" : ""}">${val(() => fromUnits(net))} <small>USDC</small></dd></div>
      <div><dt><i class="ph-light ph-rows" aria-hidden="true"></i> Cobros del mes</dt><dd class="num ${loading ? "sk" : ""}">${val(() => String(thisMonth.length))}</dd></div>
      <div><dt><i class="ph-light ph-percent" aria-hidden="true"></i> Tasa de reserva</dt><dd class="num">8<small>%</small></dd></div>
    </dl>
  </section>
  <section class="grid2">
    <div class="block rise" style="--i:1" id="threshold"></div>
    <form class="block rise" style="--i:2" id="newlink">
      <p class="lbl"><i class="ph-light ph-link-simple" aria-hidden="true"></i> Nuevo recibo y link de cobro</p>
      <p class="u">Firmas el recibo y queda registrado en el contrato. Tu cliente solo puede pagar ese monto, una vez.</p>
      <div class="row2">
        <label class="field"><span class="lbl">Monto (USDC)</span><input class="num" name="amount" inputmode="decimal" required pattern="\\d+(\\.\\d{1,7})?" placeholder="500.00"></label>
        <label class="field"><span class="lbl">N° de recibo</span><input class="num" name="ref" required maxlength="20" placeholder="E001-2"></label>
      </div>
      <label class="field"><span class="lbl">Concepto</span><input name="concept" required maxlength="80" placeholder="Diseño de identidad"></label>
      <label class="field"><span class="lbl">Tu nombre visible</span><input name="name" maxlength="60" placeholder="Opcional"></label>
      <button class="btn" type="submit"><i class="ph-light ph-plus" aria-hidden="true"></i>Emitir recibo y crear link</button>
      <div id="linkout" class="linkout hidden"></div>
    </form>
  </section>
  ${pending.length ? `<section class="rise" style="--i:3">
    <div class="sec-h"><h2>Por cobrar</h2><span class="lbl">Recibos emitidos en la cadena y sin pagar</span></div>
    <ul class="pending">${pending.map((p, i) => `
      <li class="rise" style="--i:${Math.min(i, 7)}">
        <span class="num">${esc(p.ref)}</span><span>${esc(p.concept)}</span><span class="num">${fromUnits(p.gross)} <small>USDC</small></span>
        <span class="acts"><button type="button" class="btn ghost copy-link" data-ref="${esc(p.ref)}"><i class="ph-light ph-copy" aria-hidden="true"></i>Copiar link</button>
        <a class="btn ghost" href="${esc(payLink(p.ref))}" target="_blank" rel="noopener"><i class="ph-light ph-arrow-up-right" aria-hidden="true"></i>Abrir</a></span>
      </li>`).join("")}</ul>
  </section>` : ""}
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

  // Sin el acumulado del contrato no hay base fiable: los eventos solo cubren la ventana
  // del RPC, y una base corta produce el unico error que este producto no puede cometer.
  renderThreshold();
  bindLinkForm();
  bindWithdraw();
  app.querySelector("#retry")?.addEventListener("click", () => {
    loadError = false;
    events = null;
    renderPanel();
    load();
  });
  app.querySelectorAll<HTMLButtonElement>(".copy-link").forEach((b) =>
    b.addEventListener("click", () => copy(b, payLink(b.dataset.ref!))));
  app.querySelectorAll<HTMLButtonElement>(".renew").forEach((b) => b.addEventListener("click", () => renew(b)));
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

function renderThreshold() {
  const box = app.querySelector("#threshold")!;
  // Mientras la cadena no responde, el estimado no es "imposible de calcular": todavia no
  // se sabe. Sin distinguir los dos casos, el panel acusaba de faltar el tipo de cambio
  // uno que estaba puesto. Se deriva del estado del modulo para que las relecturas que
  // disparan los campos de abajo no lo pierdan.
  const loading = events === null && !loadError;
  // Si la lectura fallo, el acumulado del mes no se conoce: es el mismo caso que si el
  // contrato no respondio, y nunca el caso de que falte el tipo de cambio.
  const grossUnavailable = !loading && (loadError || monthly === null);
  const gross = loading || loadError ? null : monthly;
  const fx = readFx();
  // De donde sale el TC importa tanto como el numero: toda la cifra en soles cuelga de el.
  const fxIsSample = fx !== null && readStoredFx() === null;
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
  const umbral = est.thresholdPen;
  const fxRaroT = fx !== null && (fx < FX_MIN || fx > FX_MAX);
  const ratio = pen === null ? 0 : Math.min(pen / umbral, 1);
  const soles = (n: number) => "S/ " + n.toLocaleString("es-PE", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const month = new Date(Date.now() - PERU_OFFSET_MS).toLocaleDateString("es-PE", { month: "long", year: "numeric", timeZone: "UTC" });
  const state =
    loading ? `<span class="badge"><i class="ph-light ph-circle-dashed" aria-hidden="true"></i>Leyendo la cadena</span>`
    : grossUnavailable ? `<span class="badge warn"><i class="ph-light ph-cloud-slash" aria-hidden="true"></i>No pudimos leer lo cobrado este mes</span>`
    : pen === null ? `<span class="badge"><i class="ph-light ph-question" aria-hidden="true"></i>Falta tipo de cambio</span>`
    : !over && fxRaroT ? `<span class="badge warn"><i class="ph-light ph-warning" aria-hidden="true"></i>Revisa el tipo de cambio</span>`
    : over ? `<span class="badge warn"><i class="ph-light ph-warning" aria-hidden="true"></i>Supera el umbral</span>`
    : est.provisional ? `<span class="badge"><i class="ph-light ph-dots-three-circle" aria-hidden="true"></i>Falta confirmar tus otras rentas</span>`
    : `<span class="badge ok"><i class="ph-light ph-check" aria-hidden="true"></i>Bajo el umbral</span>`;

  box.innerHTML = `
    <div class="rc-top"><p class="lbl"><i class="ph-light ph-calendar-blank" aria-hidden="true"></i> Pago a cuenta · ${month}</p>${state}</div>
    <p class="th-num num ${loading ? "sk" : ""}">${loading ? "Leyendo…" : due === null ? "S/ —" : soles(due)}</p>
    <p class="th-cap">${
      loading ? "leyendo tus cobros del mes en la cadena"
      : due === null ? "esta app no puede estimarlo"
      : `estimado, no es tu declaración · en soles al TC ${fx}${fxIsSample ? " de ejemplo" : " que ingresaste"}`}</p>
    <div class="meter" title="${soles(umbral)} es el umbral"><i style="transform:scaleX(${ratio})" class="${over ? "over" : ""}"></i></div>
    <p class="th-scale"><span>${pen === null ? "acumulado del mes" : `acumulado ${soles(pen)}`}</span><span>umbral ${soles(umbral)}${
      over && pen ? ` · lo superas ${(pen / umbral).toFixed(1).replace(".0", "")} veces` : ""}</span></p>
    <div class="th-body"><div>
    <dl class="th-rows">
      <div><dt>Cobrado por esta app</dt><dd class="num">${aqui === null ? "—" : soles(aqui)}</dd></div>
      <div><dt>Otras rentas de cuarta del mes</dt><dd class="num">${soles(otras)}</dd></div>
      <div><dt><b>Base del pago a cuenta</b> (cuarta)</dt><dd class="num">${cuarta === null ? "—" : soles(cuarta)}</dd></div>
      <div><dt>Rentas de quinta, solo para el umbral</dt><dd class="num">${soles(quinta)}</dd></div>
      <div><dt>Total del mes frente al umbral</dt><dd class="num">${pen === null ? "—" : soles(pen)} <span class="u">de ${soles(umbral)}</span></dd></div>
      <div class="wide"><dt>Regla</dt><dd>si el total del mes supera el umbral, se paga 8% de la base de cuarta. Si no lo supera, no hay pago a cuenta este mes. Tu umbral es ${soles(umbral)}, el del ${director ? "literal b)" : "literal a)"} del artículo 3 de la R.S. 000390-2025/SUNAT${director ? ", que es el de director, síndico, mandatario, gestor de negocios, albacea y regidor" : ""}.</dd></div>
      <div><dt>Retenciones de cuarta ya practicadas</dt><dd class="num">− ${soles(retenido)}</dd></div>
    </dl>
    <p class="th-help">${
      loading
        ? "Estamos leyendo de la cadena lo que llevas cobrado este mes. En cuanto responda aparece aquí el estimado."
      : grossUnavailable
        ? "El contrato no respondió cuánto llevas cobrado este mes, así que no estimamos nada. No usamos la lista de cobros de abajo para reemplazarlo: el nodo solo guarda los últimos días y la suma saldría corta, que en un cálculo de impuestos es el peor error posible. Recarga en un momento."
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
            : "Con lo declarado aquí no habría pago a cuenta, y aun así el contrato apartó el 8% de cada cobro: la reserva es una regla fija y no consulta el umbral. Ese dinero es tuyo y puedes retirarlo. Espera al cierre del mes para hacerlo: un cobro más puede cruzar el umbral y el 8% se aplica al total del mes."
    }</p>
    <p class="th-help"><i class="ph-light ph-warning-circle" aria-hidden="true"></i> Esto es un estimado con lo que esta app puede saber. El umbral se mide sobre todos tus ingresos del mes, incluidas las rentas de cuarta cobradas fuera de aquí y las de quinta si estás en planilla. Y el 8% es pago a cuenta: en la declaración anual el impuesto se recalcula sobre la renta neta, así que puede quedar saldo por pagar o a favor.</p>
    </div><div>
    <div class="row2">
      <label class="field"><span class="lbl">Otras rentas de cuarta del mes (S/)</span><input class="num other-in" data-k="${OTHER_KEY}" inputmode="decimal" placeholder="0.00" value="${otras || ""}"></label>
      <label class="field"><span class="lbl">Rentas de quinta del mes (S/)</span><input class="num other-in" data-k="${FIFTH_KEY}" inputmode="decimal" placeholder="0.00" value="${quinta || ""}"></label>
    </div>
    <label class="field"><span class="lbl">Retenciones que ya te hicieron este mes (S/)</span><input class="num other-in" data-k="${HELD_KEY}" inputmode="decimal" placeholder="0.00" value="${retenido || ""}"></label>
    <label class="check"><input type="checkbox" id="done4" ${confirmado ? "checked" : ""}><span>Ya revisé: esto es todo lo que gané este mes<small>Los importes de arriba son de ${month}. Mientras no lo confirmes, la app no afirma que no tienes pago a cuenta.</small></span></label>
    <label class="check"><input type="checkbox" id="dir4" ${director ? "checked" : ""}><span>Mis rentas de cuarta son por función de director, mandatario, regidor, síndico o albacea<small>Ese grupo tiene su propio umbral, S/ ${DIRECTOR_THRESHOLD_PEN.toLocaleString("es-PE")} al mes en vez de S/ ${THRESHOLD_PEN.toLocaleString("es-PE")}, por el literal b) del artículo 3 de la resolución. Márcalo y la app te compara contra ese.</small></span></label>
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
      <p class="src"><i class="ph-light ph-seal-check" aria-hidden="true"></i> De dónde salen las cifras: la tasa del 8% es el artículo 86 del TUO de la Ley del Impuesto a la Renta (D.S. 179-2004-EF). Los umbrales son los del artículo 3 de la <a href="https://www.sunat.gob.pe/legislacion/superin/2025/000390-2025.pdf" target="_blank" rel="noopener">Resolución de Superintendencia N.° 000390-2025/SUNAT <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></a>, del 30 de diciembre de 2025: S/ ${THRESHOLD_PEN.toLocaleString("es-PE")} mensuales y S/ ${SUSPENSION_CAP_PEN.toLocaleString("es-PE")} anuales en el régimen general, y S/ ${DIRECTOR_THRESHOLD_PEN.toLocaleString("es-PE")} mensuales y S/ ${DIRECTOR_CAP_PEN.toLocaleString("es-PE")} anuales para director, síndico, mandatario, gestor de negocios, albacea y regidor. SUNAT los ajustó a la UIT de 2026, S/ ${UIT_PEN.toLocaleString("es-PE")} según el D.S. 301-2025-EF. Copiamos los importes de la resolución, no los derivamos.</p>
    </details>
    <label class="field fx"><span class="lbl">Tipo de cambio (S/ por USDC)</span>
      <input class="num" id="fx" inputmode="decimal" placeholder="TC compra SBS del día de cobro" value="${fx ?? ""}">
      ${fx !== null && (fx < FX_MIN || fx > FX_MAX) ? `<small class="warn-text"><i class="ph-light ph-warning" aria-hidden="true"></i> S/ ${fx} por dólar está fuera de lo que se ha visto en el mercado (entre ${FX_MIN} y ${FX_MAX}). Un tipo de cambio muy bajo hunde tu total en soles y puede hacer que la app te diga que no llegas al umbral cuando sí llegas. Revísalo.</small>` : ""}
      <small>${mode === "demo" ? `Aquí va ${DEMO_FX} como ejemplo, para que el panel de muestra calcule algo. ` : ""}La norma usa el tipo de cambio compra SBS del día en que cobras; aquí se aplica uno solo a todo el mes como aproximación, así que el total en soles es cercano y no exacto. No hay criterio SUNAT publicado para cobros en cripto: confírmalo con tu contador.</small>
    </label>
    </div></div>`;

  renderOfframp();

  const save = (key: string, raw: string) => {
    const v = Number(raw.replace(",", "."));
    try { localStorage.setItem(key, v > 0 ? String(v) : ""); } catch { /* sin storage */ }
    renderThreshold();
  };
  box.querySelector<HTMLInputElement>("#fx")!.addEventListener("change", (e) => save(FX_KEY, (e.target as HTMLInputElement).value));
  box.querySelectorAll<HTMLInputElement>(".other-in").forEach((i) =>
    i.addEventListener("change", () => save(i.dataset.k!, i.value)));
  const flag = (id: string, key: string) =>
    box.querySelector<HTMLInputElement>(id)!.addEventListener("change", (e) => {
      try { localStorage.setItem(key, (e.target as HTMLInputElement).checked ? "1" : ""); } catch { /* sin storage */ }
      renderThreshold();
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

/** Hasta cuando vive la reserva en la red. Pasado ese plazo se archiva y hay que restaurarla. */
function ttlLine(): string {
  if (!liveUntil || !reserve) return "";
  const days = Math.floor((liveUntil.getTime() - Date.now()) / 86_400_000);
  const date = liveUntil.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
  const canRenew = mode !== "demo" && days <= RENEW_DAYS;
  return `<p class="kpi-note ttl"><i class="ph-light ph-hourglass-medium" aria-hidden="true"></i> La red guarda esta reserva hasta el ${date} (${Math.max(days, 0)} días) y cada cobro o retiro alarga el plazo. ${
    canRenew
      ? `Queda poco: <button class="linkbtn renew">renuévala ahora</button>, sin mover fondos.`
      : `Si nadie la toca en ese plazo, se archiva y hay que restaurarla antes de retirar.`}</p>`;
}

async function renew(b: HTMLButtonElement) {
  b.disabled = true;
  b.textContent = mode === "passkey" ? "confirma con tu passkey…" : "firma en Freighter…";
  try {
    await (mode === "passkey" ? extendWithPasskey(me) : extendWithWallet(me));
    loadError = false;
    await load();
  } catch (err) {
    b.disabled = false;
    b.textContent = err instanceof Error ? err.message : "No se pudo renovar.";
  }
}

async function copy(b: HTMLButtonElement, url: string) {
  try {
    await navigator.clipboard.writeText(url);
    b.innerHTML = `<i class="ph-light ph-check" aria-hidden="true"></i>Copiado`;
  } catch {
    b.innerHTML = `Copia el link desde Abrir`;
  }
}

// El contrato mide el concepto en bytes, y una tilde ocupa dos.
const MAX_CONCEPT_BYTES = 80;

function bindLinkForm() {
  const form = app.querySelector<HTMLFormElement>("#newlink")!;
  const out = form.querySelector("#linkout")!;
  const show = (html: string) => {
    out.classList.remove("hidden");
    out.innerHTML = html;
  };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (mode === "demo") {
      show(`<p class="error">Emitir un recibo exige la firma de la cuenta, y el panel de ejemplo es solo lectura. Abajo, en "Por cobrar", hay un recibo emitido que sí puedes abrir y pagar.</p>`);
      return;
    }
    const d = new FormData(form);
    const gross = toUnits(String(d.get("amount")));
    const ref = String(d.get("ref")).trim();
    const concept = String(d.get("concept")).trim();
    if (gross <= 0n || !ref) return;
    if (new TextEncoder().encode(concept).length > MAX_CONCEPT_BYTES) {
      show(`<p class="error">El concepto es demasiado largo para el recibo. Acórtalo un poco.</p>`);
      return;
    }
    // Sin trustline, la cuenta no puede recibir el neto y el pago fallaria del lado del cliente.
    // Se comprueba aqui mismo: el dato de la carga puede no haber llegado todavia.
    if (me.startsWith("G")) {
      try {
        hasTrustline = (await usdcBalance(me)) !== null;
      } catch {
        show(`<p class="error">No pudimos comprobar si tu cuenta acepta USDC. Intenta de nuevo en un momento.</p>`);
        return;
      }
    }
    if (me.startsWith("G") && !hasTrustline) {
      offerTrustline(show, out);
      return;
    }
    const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    btn.disabled = true;
    btn.innerHTML = `<span class="spin"></span>${mode === "passkey" ? "Firma el recibo con tu passkey" : "Firma el recibo en Freighter"}`;
    try {
      const hash = await (mode === "passkey" ? issueWithPasskey(me, ref, gross, concept) : issueWithWallet(me, ref, gross, concept));
      const params = new URLSearchParams({ to: me, ref });
      const name = String(d.get("name") ?? "").trim();
      if (name) params.set("name", name);
      // El link se lo mandas a un cliente en el extranjero: tiene que apuntar al dominio
      // publico, no a la maquina desde la que lo generaste.
      const url = `${PUBLIC_BASE}/pay.html?${params}`;
      show(`<p class="u"><i class="ph-light ph-seal-check" aria-hidden="true"></i> Recibo ${esc(ref)} emitido en la cadena por ${fromUnits(gross)} USDC. <a href="${EXPLORER}/tx/${hash}" target="_blank" rel="noopener">Ver transacción <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></a></p>
        <code class="mono">${esc(url)}</code>
        <div class="row2"><button type="button" class="btn ghost" id="copy"><i class="ph-light ph-copy" aria-hidden="true"></i>Copiar</button>
        <a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener"><i class="ph-light ph-arrow-up-right" aria-hidden="true"></i>Abrir</a></div>`);
      out.querySelector<HTMLButtonElement>("#copy")!.addEventListener("click", (ev) => copy(ev.currentTarget as HTMLButtonElement, url));
      form.reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      show(`<p class="error">${/#6\b|ReceiptExists|ya usaste/.test(msg)
        ? `Ya emitiste un recibo con el N° ${esc(ref)}. Cada recibo se emite una sola vez: usa el siguiente número.`
        : esc(msg || "No se pudo emitir el recibo.")}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="ph-light ph-plus" aria-hidden="true"></i>Emitir recibo y crear link`;
    }
  });
}

function offerTrustline(show: (html: string) => void, out: Element) {
  show(`<p class="error">Tu cuenta todavía no acepta USDC, así que el pago de tu cliente fallaría al firmar. Actívalo una vez y vuelve a emitir el recibo.</p>
    <button type="button" class="btn ghost" id="trust"><i class="ph-light ph-plus-circle" aria-hidden="true"></i>Aceptar USDC en mi cuenta</button>`);
  out.querySelector<HTMLButtonElement>("#trust")!.addEventListener("click", async (ev) => {
    const b = ev.currentTarget as HTMLButtonElement;
    b.disabled = true;
    b.innerHTML = `<span class="spin"></span>Firma en Freighter`;
    try {
      await addUsdcTrustline(me);
      hasTrustline = true;
      show(`<p class="u">Listo: tu cuenta ya acepta USDC. Emite el recibo otra vez.</p>`);
    } catch (err) {
      b.disabled = false;
      b.innerHTML = `Reintentar`;
      out.insertAdjacentHTML("beforeend", `<p class="error">${esc(err instanceof Error ? err.message : "No se pudo activar.")}</p>`);
    }
  });
}
