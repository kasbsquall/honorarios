// Deja en la cuenta del panel de ejemplo un mes que cruza el umbral de S/ 4,010, y un recibo
// emitido sin pagar para que cualquiera pueda probar la pagina de pago. Sin esto el escaparate
// ensena el caso aburrido ("no debes nada"), que es justo el mes en que el producto no hace
// falta. Todo es real y queda en la cadena. Se puede repetir: salta lo que ya esta hecho.
import { CONTRACT, DEMO, addr, client, ensureClientUsdc, freelancer, i128, invoke, read, str, usdc } from "./chain.mjs";

if (freelancer.publicKey() !== DEMO) throw new Error("La cuenta del panel de ejemplo no es la del freelancer de pruebas.");

const RECIBOS = [
  { ref: "E001-1", amount: "500.00", concept: "Diseño de identidad", pay: true },
  { ref: "E001-2", amount: "620.00", concept: "Rediseño de sitio web", pay: true },
  { ref: "E001-3", amount: "300.00", concept: "Ilustración editorial", pay: true },
  { ref: "E001-4", amount: "180.00", concept: "Mantenimiento web de octubre", pay: false },
];
// Retiro antes del cierre del mes: el panel lo usa para ensenar el aviso de reserva corta.
const RETIRO = "40.00";

console.log(`contrato ${CONTRACT}\nfreelancer ${DEMO}\ncliente ${client.publicKey()}`);
const toPay = RECIBOS.filter((r) => r.pay).reduce((a, r) => a + Number(r.amount), 0);
const bought = await ensureClientUsdc(toPay + 200);
if (bought) console.log(`compra de USDC del cliente: ${bought}`);

for (const r of RECIBOS) {
  let rec = await read("receipt", addr(DEMO), str(r.ref));
  if (!rec) {
    const h = await invoke(freelancer, "issue", addr(DEMO), str(r.ref), i128(usdc(r.amount)), str(r.concept));
    console.log(`emitido ${r.ref} por ${r.amount} USDC: ${h}`);
    rec = { paid: false };
  }
  if (r.pay && !rec.paid) {
    const h = await invoke(client, "pay", addr(client.publicKey()), addr(DEMO), str(r.ref));
    console.log(`pagado ${r.ref}: ${h}`);
  }
}

const reserva = await read("tax_reserve", addr(DEMO));
// 8% de 1,420 USDC son 113.6: si la reserva sigue entera, todavia no se hizo el retiro.
if (reserva === usdc("113.6")) {
  const h = await invoke(freelancer, "withdraw_tax", addr(DEMO), addr(DEMO), i128(usdc(RETIRO)));
  console.log(`retiro de ${RETIRO} USDC de la reserva: ${h}`);
}
console.log(`reserva final ${(Number(await read("tax_reserve", addr(DEMO))) / 1e7).toFixed(2)} USDC`);
