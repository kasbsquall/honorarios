// Comprueba que la wallet del panel de ejemplo cobro de verdad contra el contrato vigente.
// El redespliegue del contrato dejo esta constante apuntando a un despliegue muerto y el
// panel de ejemplo, que es lo primero que abre cualquiera, mostro ceros durante un dia.
import { readFileSync } from "node:fs";
import { Address, Contract, Keypair, Networks, TransactionBuilder, nativeToScVal, rpc, scValToNative } from "@stellar/stellar-sdk";

const src = readFileSync("src/panel.ts", "utf8");
const wallet = src.match(/DEMO_ADDRESS = "(C[A-Z0-9]+)"/)[1];
const contract = readFileSync("src/stellar.ts", "utf8").match(/CONTRACT_ID = "(C[A-Z0-9]+)"/)[1];
const server = new rpc.Server("https://soroban-testnet.stellar.org");
// Cualquier cuenta existente sirve como remitente de una simulacion: no se firma ni se envia.
// Se crea y se fondea una al vuelo con friendbot para no depender de llaves locales.
const probeKp = Keypair.random();
await fetch(`https://friendbot.stellar.org/?addr=${probeKp.publicKey()}`);
const probe = probeKp.publicKey();

const call = async (fn, ...args) => {
  const acc = await server.getAccount(probe);
  const tx = new TransactionBuilder(acc, { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(new Contract(contract).call(fn, ...args)).setTimeout(30).build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return scValToNative(sim.result.retval);
};

const period = await call("current_period");
const gross = await call("month_gross", nativeToScVal(new Address(wallet)), nativeToScVal(period, { type: "u32" }));
const reserve = await call("tax_reserve", nativeToScVal(new Address(wallet)));
const fmt = (v) => (Number(v) / 1e7).toFixed(2);

console.log(`contrato ${contract}`);
console.log(`wallet   ${wallet}`);
console.log(`periodo ${period}: bruto ${fmt(gross)} USDC · reserva ${fmt(reserve)} USDC`);

if (gross === 0n && reserve === 0n) {
  console.error("\nFALLA: esa wallet no tiene nada en este contrato. El panel de ejemplo va a mostrar ceros.");
  process.exit(1);
}
console.log("\nOK: el panel de ejemplo tiene algo que mostrar.");
