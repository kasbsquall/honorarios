import { EXPLORER, type Paid, fromUnits } from "./stellar";
import { esc } from "./ui";

// Borrador para copiar al emitir el recibo por honorarios electronico en SUNAT.
// La app no emite ni envia nada a SUNAT.
const PROFILE_KEY = "honorarios.rhe.profile";

type Profile = { name: string; ruc: string };

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

function draftText(p: Paid, f: Record<string, string>) {
  return [
    "BORRADOR · Recibo por honorarios electrónico",
    `Emisor: ${f.name || "(tu nombre)"} · RUC ${f.ruc || "(tu RUC)"}`,
    `Cliente: ${f.client || "(nombre del cliente)"} · ${f.docType} ${f.docNum || "(número)"}`,
    `Descripción del servicio: ${f.desc || "(descripción)"}`,
    `Fecha del cobro: ${fmtDate(p.at)}`,
    `Monto: ${fromUnits(p.gross)} (cobrado en USDC; indica la moneda y el tipo de cambio que corresponda)`,
    "Retención de cuarta categoría: No (el cliente es del exterior y no es agente de retención)",
    `Referencia interna: ${p.ref} · tx ${p.txHash}`,
  ].join("\n");
}

export function openRheDraft(p: Paid) {
  const prof = readProfile();
  const dlg = document.createElement("dialog");
  dlg.className = "rhe";
  dlg.innerHTML = `
  <form method="dialog" class="rhe-body">
    <div class="rc-top">
      <div><p class="lbl"><i class="ph-light ph-file-text"></i> Borrador · recibo por honorarios</p><h3>Cobro ${esc(p.ref)}</h3></div>
      <button class="btn ghost icon" value="close" aria-label="Cerrar"><i class="ph-light ph-x"></i></button>
    </div>
    <dl class="rhe-fixed">
      <div><dt>Fecha del cobro</dt><dd class="num">${fmtDate(p.at)}</dd></div>
      <div><dt>Monto cobrado</dt><dd class="num">${fromUnits(p.gross)} USDC</dd></div>
      <div><dt>Retención 4ta</dt><dd>No aplica · cliente del exterior</dd></div>
      <div><dt>Evidencia</dt><dd><a class="num" href="${EXPLORER}/tx/${p.txHash}" target="_blank" rel="noopener">${p.txHash.slice(0, 10)}… <i class="ph-light ph-arrow-up-right"></i></a></dd></div>
    </dl>
    <div class="row2">
      <label class="field"><span class="lbl">Tu nombre</span><input name="name" value="${esc(prof.name)}" maxlength="80"></label>
      <label class="field"><span class="lbl">Tu RUC</span><input class="num" name="ruc" value="${esc(prof.ruc)}" inputmode="numeric" pattern="\\d{11}" maxlength="11" placeholder="10XXXXXXXXX"></label>
    </div>
    <label class="field"><span class="lbl">Cliente</span><input name="client" maxlength="80" placeholder="Nombre o razón social"></label>
    <div class="row2">
      <label class="field"><span class="lbl">Documento del cliente</span>
        <select name="docType"><option>Pasaporte</option><option>Otro documento</option></select></label>
      <label class="field"><span class="lbl">Número</span><input class="num" name="docNum" maxlength="20"></label>
    </div>
    <label class="field"><span class="lbl">Descripción del servicio</span><input name="desc" maxlength="120" placeholder="Diseño de identidad visual"></label>
    <pre class="rhe-preview num" aria-live="polite"></pre>
    <p class="rhe-note"><i class="ph-light ph-info"></i> Borrador para copiar al emitir tu recibo en SUNAT Operaciones en Línea. Confirma con SUNAT o tu contador qué tipo de documento y moneda corresponden a un cliente del exterior: no encontramos una regla específica para cobros en cripto.</p>
    <div class="actions">
      <button type="button" class="btn" id="rhe-copy"><i class="ph-light ph-copy"></i>Copiar borrador</button>
      <a class="btn ghost" href="https://www.sunat.gob.pe/sol.html" target="_blank" rel="noopener"><i class="ph-light ph-arrow-up-right"></i>Ir a SUNAT en línea</a>
    </div>
  </form>`;
  document.body.appendChild(dlg);

  const form = dlg.querySelector("form")!;
  const pre = dlg.querySelector(".rhe-preview")!;
  const fields = () => Object.fromEntries(new FormData(form)) as Record<string, string>;
  const refresh = () => {
    const f = fields();
    pre.textContent = draftText(p, f);
    saveProfile({ name: f.name, ruc: f.ruc });
  };
  form.addEventListener("input", refresh);
  refresh();

  dlg.querySelector("#rhe-copy")!.addEventListener("click", async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(draftText(p, fields()));
      b.innerHTML = `<i class="ph-light ph-check"></i>Copiado`;
    } catch {
      b.textContent = "Selecciona el texto y cópialo";
    }
  });
  dlg.addEventListener("close", () => dlg.remove());
  dlg.showModal();
}
