// Deja en la cuenta del panel de ejemplo un mes que cruza el umbral de S/ 4,010.
// Sin esto el escaparate ensena el caso aburrido ("no debes nada"), que es justo el mes
// en que el producto no hace falta. Los cobros son reales y quedan en la cadena.
import { readFileSync } from "node:fs";
import {
  Asset, BASE_FEE, Contract, Horizon, Keypair, Networks, Operation,
  TransactionBuilder, Address, nativeToScVal, rpc,
} from "@stellar/stellar-sdk";

const CONTRACT = readFileSync("src/stellar.ts", "utf8").match(/CONTRACT_ID = "(C[A-Z0-9]+)"/)[1];
const FREELANCER = readFileSync("src/panel.ts", "utf8").match(/DEMO_ADDRESS = "(C[A-Z0-9]+)"/)[1];
const USDC = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
const COBROS = [
  { amount: "620.00", ref: "E001-8" },
  { amount: "300.00", ref: "E001-9" },
];

const env = Object.fromEntries(readFileSync(".env.development.local", "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split("=")));
const payer = Keypair.fromSecret(env.VITE_DEV_CLIENT_SECRET.trim());
const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
const soroban = new rpc.Server("https://soroban-testnet.stellar.org");

async function usdcBalance() {
  const acc = await horizon.loadAccount(payer.publicKey());
  const b = acc.balances.find((x) => x.asset_code === "USDC" && x.asset_issuer === USDC.issuer);
  return Number(b?.balance ?? 0);
}

async function buyUsdc(need) {
  const acc = await horizon.loadAccount(payer.publicKey());
  const paths = await horizon.strictReceivePaths([Asset.native()], USDC, need.toFixed(7)).call();
  if (!paths.records.length) throw new Error("no hay ruta XLM -> USDC");
  const best = paths.records[0];
  const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.pathPaymentStrictReceive({
      sendAsset: Asset.native(),
      sendMax: (Number(best.source_amount) * 1.15).toFixed(7),
      destination: payer.publicKey(),
      destAsset: USDC,
      destAmount: need.toFixed(7),
      path: best.path.map((p) => (p.asset_type === "native" ? Asset.native() : new Asset(p.asset_code, p.asset_issuer))),
    }))
    .setTimeout(120).build();
  tx.sign(payer);
  const res = await horizon.submitTransaction(tx);
  console.log(`  compra de ${need.toFixed(2)} USDC: ${res.hash}`);
}

async function pay({ amount, ref }) {
  const units = BigInt(Math.round(Number(amount) * 1e7));
  const acc = await soroban.getAccount(payer.publicKey());
  let tx = new TransactionBuilder(acc, { fee: "2000000", networkPassphrase: Networks.TESTNET })
    .addOperation(new Contract(CONTRACT).call(
      "pay",
      nativeToScVal(new Address(payer.publicKey())),
      nativeToScVal(new Address(FREELANCER)),
      nativeToScVal(units, { type: "i128" }),
      nativeToScVal(ref, { type: "string" }),
    )).setTimeout(120).build();
  tx = await soroban.prepareTransaction(tx);
  tx.sign(payer);
  const sent = await soroban.sendTransaction(tx);
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const g = await soroban.getTransaction(sent.hash);
    if (g.status === "SUCCESS") return sent.hash;
    if (g.status === "FAILED") throw new Error(JSON.stringify(g.resultXdr));
  }
  throw new Error("timeout");
}

const total = COBROS.reduce((a, c) => a + Number(c.amount), 0);
const have = await usdcBalance();
console.log(`pagador ${payer.publicKey()} · USDC ${have.toFixed(2)} · necesita ${total.toFixed(2)}`);
if (have < total) await buyUsdc(total - have + 1);

for (const c of COBROS) {
  const hash = await pay(c);
  console.log(`cobro ${c.ref} de ${c.amount} USDC -> ${hash}`);
}
