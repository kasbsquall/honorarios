import "./styles.css";
import "./pay.css";
import { StrKey } from "@stellar/stellar-sdk";
import { EXPLORER, connectWallet, ensureUsdc, fromUnits, payInvoice, serviceFee, short, toUnits } from "./stellar";
import { MARK, RECEIPT_EN, esc, receiptCard } from "./ui";

type Step = "connect" | "fund" | "sign" | "done";
const STEPS: { id: Step; icon: string; title: string; hint: string }[] = [
  { id: "connect", icon: "ph-plugs-connected", title: "Connect wallet", hint: "Freighter on testnet" },
  { id: "fund", icon: "ph-arrows-left-right", title: "Get USDC", hint: "Swaps XLM through a Stellar path payment if needed" },
  { id: "sign", icon: "ph-signature", title: "Sign payment", hint: "One contract call splits it on-chain" },
];

const app = document.getElementById("app")!;
document.getElementById("brand")!.insertAdjacentHTML("afterbegin", MARK);

const q = new URLSearchParams(location.search);
const to = q.get("to") ?? "";
const amountRaw = q.get("amount") ?? "";
const concept = (q.get("concept") ?? "Professional services").slice(0, 80);
const ref = (q.get("ref") ?? "E001-1").slice(0, 20);
const name = (q.get("name") ?? "").slice(0, 60);

let gross = 0n;
try { gross = toUnits(amountRaw); } catch { gross = 0n; }
const validTo = StrKey.isValidEd25519PublicKey(to) || StrKey.isValidContract(to);
let payer = "";
// Lo que el contrato va a cobrar de verdad, leido de la cadena. Si la pantalla lo calculara
// por su cuenta, el cliente firmaria un desglose que el contrato no tiene por que respetar.
let feeBps: bigint | null = null;
let feeState: "loading" | "ready" | "failed" = "loading";

if (!validTo || gross <= 0n) {
  app.innerHTML = `<section class="empty rise"><p class="lbl">Invalid link</p><h1>This payment link is incomplete.</h1>
  <p>Ask the freelancer to send you a new link from their Honorarios panel.</p></section>`;
} else {
  render("connect");
  serviceFee()
    .then((f) => { feeBps = f.bps; feeState = "ready"; render("connect"); })
    .catch(() => { feeState = "failed"; render("connect"); });
}

function stepState(step: Step, current: Step) {
  const order: Step[] = ["connect", "fund", "sign", "done"];
  const a = order.indexOf(step), b = order.indexOf(current);
  return a < b ? "done" : a === b ? "now" : "next";
}

function render(current: Step, opts: { error?: string; busy?: boolean; txHash?: string } = {}) {
  const done = current === "done";
  const badge = done
    ? `<span class="badge ok"><i class="ph-light ph-check" aria-hidden="true"></i>Paid</span>`
    : `<span class="badge"><i class="ph-light ph-hourglass-simple" aria-hidden="true"></i>Due</span>`;
  const action =
    current === "connect" ? "Connect Freighter"
    : current === "fund" ? "Prepare USDC"
    : current === "sign" ? `Pay ${fromUnits(gross)} USDC`
    : "";

  app.innerHTML = `
  <section class="summary rise" style="--i:0">
    <p class="lbl">Invoice from a freelancer in Peru</p>
    <h1>${esc(name || "A freelancer in Peru")}</h1>
    <p class="to-addr num">${short(to)}</p>
    <p class="due num">${fromUnits(gross)}<small>USDC</small></p>
    <dl class="lines">
      <div><dt>Service</dt><dd>${esc(concept)}</dd></div>
      <div><dt>Receipt</dt><dd class="num">${esc(ref)}</dd></div>
      <div><dt>Pay to</dt><dd class="num">${short(to)}</dd></div>
      <div><dt>Network</dt><dd>Stellar testnet</dd></div>
    </dl>
    <ol class="steps">
      ${STEPS.map((s, i) => `
        <li class="step ${stepState(s.id, current)}">
          <span class="dot num">${stepState(s.id, current) === "done" ? `<i class="ph-light ph-check" aria-hidden="true"></i>` : String(i + 1).padStart(2, "0")}</span>
          <div><p><i class="ph-light ${s.icon}"></i> ${s.title}</p><small>${s.hint}</small></div>
        </li>`).join("")}
    </ol>
  </section>
  <section class="side rise" style="--i:1">
    <div class="${done ? "torn-wrap" : ""}">${
      // Mientras no sepamos lo que cobra el contrato, no se pinta ningun reparto:
      // un desglose por defecto seria una afirmacion que la cadena no ha hecho.
      feeState === "loading"
        ? `<article class="receipt sk" style="height:300px"></article>`
        : receiptCard({
            gross, title: concept, ref, badge, text: RECEIPT_EN, feeBps: feeBps ?? 0n,
            footLeft: payer ? `from ${short(payer)}` : "",
            txHash: opts.txHash,
          })}</div>
    <p class="note">You pay the full amount. The contract keeps 8% in a reserve that only the freelancer can withdraw for their Peruvian tax prepayment.${
      feeState === "loading" ? " Reading the split from the contract…"
      : feeState === "failed" ? " We could not read the service fee from the contract, so the split above is the default one. Check the contract before you sign."
      : feeBps === 0n ? " This contract charges no service fee: the split above is read from the contract itself."
      : ` This contract charges a ${(Number(feeBps) / 100).toString()}% service fee, read from the contract itself.`}</p>
    ${done
      ? `<a class="btn wide" href="${EXPLORER}/tx/${opts.txHash}" target="_blank" rel="noopener"><i class="ph-light ph-arrow-up-right" aria-hidden="true"></i>View on Stellar Expert</a>`
      : `<p class="note desktop-only-note"><i class="ph-light ph-desktop" aria-hidden="true"></i> Freighter is a desktop browser extension. Open this link on your computer to pay.</p>
         <button class="btn wide" id="go" ${opts.busy ? "disabled" : ""}>${opts.busy ? `<span class="spin"></span>Waiting for wallet` : action}</button>`}
    ${opts.error ? `<p class="error" role="alert">${esc(opts.error)}</p>` : ""}
  </section>`;

  if (done) requestAnimationFrame(() => app.querySelector(".receipt")?.classList.add("torn"));
  app.querySelector("#go")?.addEventListener("click", () => advance(current));
}

async function advance(current: Step) {
  render(current, { busy: true });
  try {
    if (current === "connect") {
      payer = await connectWallet();
      render("fund");
    } else if (current === "fund") {
      await ensureUsdc(payer, gross);
      render("sign");
    } else if (current === "sign") {
      const hash = await payInvoice(payer, to, gross, ref);
      render("done", { txHash: hash });
    }
  } catch (e) {
    render(current, { error: friendly(e) });
  }
}

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/Freighter|Testnet|firma|conexión/.test(msg)) return translate(msg);
  if (/rechazó la transacción/.test(msg)) return "The network rejected the transaction. No funds were moved. You can try again.";
  if (/no devolvió el hash|negativo/.test(msg)) return "The network did not confirm the transaction. Check your wallet before paying again.";
  if (/op_underfunded|insufficient|balance/i.test(msg)) return "Not enough XLM to cover this payment.";
  if (/No hay ruta/.test(msg)) return "No XLM to USDC route is available right now. Try again in a minute.";
  return "Something went wrong sending the payment. Try again.";
}

function translate(msg: string) {
  if (msg.includes("Testnet")) return "Switch Freighter to Testnet to continue.";
  if (msg.includes("firma")) return "You cancelled the signature in Freighter.";
  return "Freighter did not connect. Make sure the extension is installed and unlocked.";
}
