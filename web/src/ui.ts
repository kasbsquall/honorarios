import { EXPLORER, fromUnits, split } from "./stellar";

export const MARK = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><g transform="rotate(-90 12 12)" fill="none" stroke-width="4"><circle cx="12" cy="12" r="8.5" pathLength="100" stroke="currentColor" stroke-dasharray="90 10" stroke-dashoffset="-9"/><circle cx="12" cy="12" r="8.5" pathLength="100" stroke="var(--accent)" stroke-dasharray="6 94" stroke-dashoffset="-1"/></g></svg>`;

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

type ReceiptText = { kicker: string; net: string; tax: string; stub: string };

export const RECEIPT_ES: ReceiptText = {
  kicker: "Cobro",
  net: "Neto para ti · 92%",
  tax: "Reserva preventiva · 8%",
  stub: "Reserva 8%",
};

export const RECEIPT_EN: ReceiptText = {
  kicker: "Invoice",
  net: "To the freelancer · 92%",
  tax: "Peru tax reserve · 8%",
  stub: "Tax reserve",
};

export function receiptCard(opts: {
  gross: bigint;
  title: string;
  ref: string;
  badge: string;
  text: ReceiptText;
  footLeft?: string;
  txHash?: string;
}) {
  const { net, tax } = split(opts.gross);
  const t = opts.text;
  return `
  <article class="receipt">
    <div class="body">
      <div class="rc-top">
        <div><p class="lbl">${t.kicker} · ${esc(opts.ref)}</p><p>${esc(opts.title)}</p></div>
        ${opts.badge}
      </div>
      <p class="rc-amt">${fromUnits(opts.gross)}<small>USDC</small></p>
      <div class="bar" role="img" aria-label="92% / 8%"><i class="n"></i><i class="s"></i></div>
      <dl class="legend">
        <dt><span class="sq" style="background:var(--ink)"></span><i class="ph-light ph-wallet"></i>${t.net}</dt><dd>${fromUnits(net)}</dd>
        <dt><span class="sq" style="background:var(--accent)"></span><i class="ph-light ph-vault"></i>${t.tax}</dt><dd>${fromUnits(tax)}</dd>
      </dl>
      ${
        opts.footLeft || opts.txHash
          ? `<div class="rc-foot"><span>${opts.footLeft ?? ""}</span>${
              opts.txHash
                ? `<a href="${EXPLORER}/tx/${opts.txHash}" target="_blank" rel="noopener">tx ${opts.txHash.slice(0, 8)}… <i class="ph-light ph-arrow-up-right"></i></a>`
                : ""
            }</div>`
          : ""
      }
    </div>
    <div class="stub"><span>${t.stub}</span></div>
  </article>`;
}
