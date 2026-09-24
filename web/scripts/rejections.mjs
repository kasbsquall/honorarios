// Cinco ataques contra el contrato vigente, enviados de verdad a testnet. Cada uno queda en
// la cadena como transaccion FALLIDA: cualquiera puede abrirla en Stellar Expert y ver que la
// red la rechazo. Necesita que seed-demo.mjs haya corrido antes (usa E001-1 pagado y E001-4
// pendiente). Cada corrida genera transacciones nuevas.
import {
  DEMO, addr, client, forceFailing, freelancer, i128, read, receiptKey, sourceAuth, str, usdc,
} from "./chain.mjs";

const C = client.publicKey();
const F = freelancer.publicKey();
const reserva = await read("tax_reserve", addr(F));
if (DEMO !== F || reserva <= 0n) throw new Error("Corre antes scripts/seed-demo.mjs");
// Plantilla valida del cliente: pagar el recibo pendiente. Da el footprint de un pago.
const payTemplate = { fn: "pay", args: [addr(C), addr(F), str("E001-4")] };

const casos = [
  {
    que: "Un tercero intenta retirar la reserva del freelancer firmando por si mismo",
    signer: client,
    fn: "withdraw_tax",
    args: [addr(F), addr(C), i128(usdc("10"))],
    template: { fn: "withdraw_tax", args: [addr(F), addr(C), i128(usdc("10"))] },
  },
  {
    que: "El freelancer intenta retirar 1 unidad mas de lo que tiene reservado",
    signer: freelancer,
    fn: "withdraw_tax",
    args: [addr(F), addr(F), i128(reserva + 1n)],
    auth: [sourceAuth("withdraw_tax", [addr(F), addr(F), i128(reserva + 1n)])],
    template: { fn: "withdraw_tax", args: [addr(F), addr(F), i128(1n)] },
  },
  {
    que: "Un extrano emite un recibo a nombre del freelancer para inflar su acumulado del mes",
    signer: client,
    fn: "issue",
    args: [addr(F), str("E001-666"), i128(usdc("5000")), str("Cobro inventado")],
    template: { fn: "issue", args: [addr(F), str("E001-666"), i128(usdc("5000")), str("Cobro inventado")] },
  },
  {
    que: "El cliente intenta pagar un recibo que nadie emitio",
    signer: client,
    fn: "pay",
    args: [addr(C), addr(F), str("E001-99")],
    auth: [sourceAuth("pay", [addr(C), addr(F), str("E001-99")])],
    template: payTemplate,
    extraReadOnly: [receiptKey(F, "E001-99")],
  },
  {
    que: "El cliente intenta pagar dos veces el recibo E001-1, que ya esta pagado",
    signer: client,
    fn: "pay",
    args: [addr(C), addr(F), str("E001-1")],
    auth: [sourceAuth("pay", [addr(C), addr(F), str("E001-1")])],
    template: payTemplate,
    extraReadOnly: [receiptKey(F, "E001-1")],
  },
];

for (const c of casos) {
  const r = await forceFailing(c.signer, c);
  console.log(`${r.status.padEnd(7)} ${r.hash}  ${c.que}${r.reason ? `  [${r.reason}]` : ""}`);
}
