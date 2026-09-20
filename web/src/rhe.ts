import { EXPLORER, type Paid, fromUnits } from "./stellar";
import { esc } from "./ui";

// Borrador para copiar al emitir el recibo por honorarios electronico en SUNAT.
// La app no emite ni envia nada a SUNAT.
const PROFILE_KEY = "honorarios.rhe.profile";

type Profile = { name: string; ruc: string };


/** El panel es quien decide el tipo de cambio efectivo: en el modo de ejemplo usa uno de
 *  muestra que no esta en localStorage. Si el borrador lo leyera por su cuenta, diria
 *  "falta tipo de cambio" junto a un panel que si lo tiene. */

const usd = (p: Paid) => fromUnits(p.gross, 2);
const pen = (p: Paid, fx: number | null) =>
  fx ? (Number(usd(p).replace(/,/g, "")) * fx).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;

const fmtDate = (d: Date) => d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });

function readProfile(): Profile {
  try {
    return { name: "", ruc: "", ...JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") };
  } catch {
    return { name: "", ruc: "" };
  }
}

function saveProfile(p: Profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* sin storage */ }
}

/** Un cliente no domiciliado no es agente de retencion. Uno domiciliado si puede serlo,
 *  y entonces retiene sobre los recibos que pasan el minimo que fija SUNAT. No ponemos ese
 *  minimo porque no lo tenemos contrastado: el usuario tiene que verificarlo. */
function retencionLinea(abroad: boolean) {
  return abroad
    ? "No aplica. Un cliente no domiciliado en Perú no es agente de retención."
    : "Puede aplicar. Si tu cliente es domiciliado y agente de retención, debe retenerte el 8% cuando el recibo pasa el monto mínimo que fija SUNAT; verifica ese mínimo y descuenta lo retenido en el panel.";
}

function draftText(p: Paid, f: Record<string, string>) {
  return [
    "BORRADOR · Recibo por honorarios electrónico",
    `Emisor: ${f.name || "(tu nombre)"} · RUC ${f.ruc || "(tu RUC)"}`,
    `Cliente: ${f.client || "(nombre del cliente)"} · ${f.docType} ${f.docNum || "(número)"}`,
    `Descripción del servicio: ${f.desc || "(descripción)"}`,
    `Fecha del cobro: ${fmtDate(p.at)}`,
    `Moneda: Dólares americanos (US$)`,
    `Monto total de honorarios: US$ ${usd(p)} (cobrado como ${fromUnits(p.gross)} USDC, 1 USDC = 1 US$)`,
    `Equivalente para tu pago a cuenta: ${f.pen ? `S/ ${f.pen} (TC ${f.fx})` : "(ingresa el tipo de cambio en el panel)"}`,
    `Retención de cuarta categoría: ${retencionLinea(f.abroad !== "no")}`,
    `Referencia interna: ${p.ref} · tx ${p.txHash}`,
  ].join("\n");
}

export function openRheDraft(p: Paid, fx: number | null) {
  const prof = readProfile();
  const dlg = document.createElement("dialog");
  dlg.className = "rhe";
  dlg.innerHTML = `
  <form method="dialog" class="rhe-body">
    <div class="rc-top">
      <div><p class="lbl"><i class="ph-light ph-file-text" aria-hidden="true"></i> Borrador · recibo por honorarios</p><h3>Cobro ${esc(p.ref)}</h3></div>
      <button class="btn ghost icon" value="close" aria-label="Cerrar"><i class="ph-light ph-x" aria-hidden="true"></i></button>
    </div>
    <dl class="rhe-fixed">
      <div><dt>Fecha del cobro</dt><dd class="num">${fmtDate(p.at)}</dd></div>
      <div><dt>Monto del recibo</dt><dd class="num">US$ ${usd(p)}</dd></div>
      <div><dt>En soles</dt><dd class="num">${pen(p, fx) ? `S/ ${pen(p, fx)}` : "Falta tipo de cambio"}</dd></div>
      <div><dt>Retención 4ta</dt><dd id="rhe-ret">No aplica · cliente del exterior</dd></div>
      <div><dt>Cliente</dt><dd><select name="abroad" class="inline"><option value="si">Fuera de Perú</option><option value="no">Domiciliado en Perú</option></select></dd></div>
      <div><dt>Evidencia</dt><dd><a class="num" href="${EXPLORER}/tx/${p.txHash}" target="_blank" rel="noopener">${p.txHash.slice(0, 10)}… <i class="ph-light ph-arrow-up-right" aria-hidden="true"></i></a></dd></div>
    </dl>
    <div class="row2">
      <label class="field"><span class="lbl">Tu nombre</span><input name="name" value="${esc(prof.name)}" maxlength="80"></label>
      <label class="field"><span class="lbl">Tu RUC</span><input class="num" name="ruc" value="${esc(prof.ruc)}" inputmode="numeric" pattern="\\d{11}" maxlength="11" placeholder="10XXXXXXXXX"></label>
    </div>
    <label class="field"><span class="lbl">Cliente</span><input name="client" maxlength="80" placeholder="Nombre o razón social"></label>
    <div class="row2">
      <label class="field"><span class="lbl">Documento del cliente</span>
        <select name="docType"><option>Pasaporte</option><option>Doc. tributario del país del cliente</option><option>Otro documento</option></select></label>
      <label class="field"><span class="lbl">Número</span><input class="num" name="docNum" maxlength="20"></label>
    </div>
    <label class="field"><span class="lbl">Descripción del servicio</span><input name="desc" maxlength="120" placeholder="Diseño de identidad visual"></label>
    <pre class="rhe-preview num" aria-live="polite"></pre>
    <p class="rhe-note"><i class="ph-light ph-info" aria-hidden="true"></i> Borrador para copiar al emitir tu recibo en SUNAT Operaciones en Línea. El recibo se puede emitir en dólares; el equivalente en soles es el que sumas para el umbral y el pago a cuenta del mes. Tomamos 1 USDC como 1 US$: no hay una regla de SUNAT para cobros en cripto, confírmalo con tu contador.</p>
    <div class="actions">
      <button type="button" class="btn" id="rhe-copy"><i class="ph-light ph-copy" aria-hidden="true"></i>Copiar borrador</button>
      <a class="btn ghost" href="https://www.sunat.gob.pe/sol.html" target="_blank" rel="noopener"><i class="ph-light ph-arrow-up-right" aria-hidden="true"></i>Ir a SUNAT en línea</a>
    </div>
  </form>`;
  document.body.appendChild(dlg);

  const form = dlg.querySelector("form")!;
  const pre = dlg.querySelector(".rhe-preview")!;
  const fields = () => Object.fromEntries(new FormData(form)) as Record<string, string>;
  const refresh = () => {
    const f = fields();
    const extra = { pen: pen(p, fx) ?? "", fx: fx ? String(fx) : "" };
    const abroad = f.abroad !== "no";
    dlg.querySelector("#rhe-ret")!.textContent = abroad
      ? "No aplica · cliente del exterior"
      : "Puede aplicar · cliente domiciliado";
    dlg.querySelector("#rhe-ret")!.className = abroad ? "" : "warn-text";
    pre.textContent = draftText(p, { ...f, ...extra });
    saveProfile({ name: f.name, ruc: f.ruc });
  };
  form.addEventListener("input", refresh);
  refresh();

  dlg.querySelector("#rhe-copy")!.addEventListener("click", async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(pre.textContent ?? "");
      b.innerHTML = `<i class="ph-light ph-check" aria-hidden="true"></i>Copiado`;
    } catch {
      b.textContent = "Selecciona el texto y cópialo";
    }
  });
  dlg.addEventListener("close", () => dlg.remove());
  dlg.showModal();
}
