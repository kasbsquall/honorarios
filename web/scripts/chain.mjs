// Utilidades compartidas por los scripts que escriben en testnet con las llaves de prueba.
// Las llaves viven en web/.env.development.local, fuera del repo.
import { readFileSync } from "node:fs";
import {
  Address, Asset, BASE_FEE, Contract, Horizon, Keypair, Networks, Operation, TransactionBuilder,
  nativeToScVal, rpc, scValToNative, xdr,
} from "@stellar/stellar-sdk";

export const NETWORK = Networks.TESTNET;
export const CONTRACT = readFileSync("src/stellar.ts", "utf8").match(/CONTRACT_ID = "(C[A-Z0-9]+)"/)[1];
export const DEMO = readFileSync("src/panel.ts", "utf8").match(/DEMO_ADDRESS = "([GC][A-Z0-9]+)"/)[1];
export const USDC = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
export const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
export const soroban = new rpc.Server("https://soroban-testnet.stellar.org");

const env = Object.fromEntries(
  readFileSync(".env.development.local", "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split("=").map((x) => x.trim())),
);
export const client = Keypair.fromSecret(env.VITE_DEV_CLIENT_SECRET);
export const freelancer = Keypair.fromSecret(env.VITE_DEV_FREELANCER_SECRET);

export const usdc = (n) => BigInt(Math.round(Number(n) * 1e7));
export const addr = (a) => nativeToScVal(new Address(a));
export const str = (s) => nativeToScVal(s, { type: "string" });
export const i128 = (n) => nativeToScVal(n, { type: "i128" });

/** Clave de almacenamiento de un recibo, DataKey::Receipt(freelancer, n°) en el contrato. */
export function receiptKey(owner, ref) {
  return xdr.LedgerKey.contractData(new xdr.LedgerKeyContractData({
    contract: new Address(CONTRACT).toScAddress(),
    key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Receipt"), addr(owner), str(ref)]),
    durability: xdr.ContractDataDurability.persistent(),
  }));
}

/** Lectura sin firma: simula la llamada y devuelve el valor. */
export async function read(fn, ...args) {
  const acc = await soroban.getAccount(client.publicKey());
  const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(new Contract(CONTRACT).call(fn, ...args)).setTimeout(30).build();
  const sim = await soroban.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return scValToNative(sim.result.retval);
}

async function waitFor(hash) {
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const g = await soroban.getTransaction(hash);
    if (g.status !== "NOT_FOUND") return g;
  }
  throw new Error(`sin respuesta de ${hash}`);
}

/** Llamada normal: simula, firma con `signer` como cuenta origen y envia. */
export async function invoke(signer, fn, ...args) {
  const acc = await soroban.getAccount(signer.publicKey());
  let tx = new TransactionBuilder(acc, { fee: "1000000", networkPassphrase: NETWORK })
    .addOperation(new Contract(CONTRACT).call(fn, ...args)).setTimeout(120).build();
  tx = await soroban.prepareTransaction(tx);
  tx.sign(signer);
  const sent = await soroban.sendTransaction(tx);
  const res = await waitFor(sent.hash);
  if (res.status !== "SUCCESS") throw new Error(`${fn} fallo: ${sent.hash}`);
  return sent.hash;
}

/**
 * Envia una llamada que el contrato va a rechazar. La simulacion se niega a preparar una
 * transaccion que falla, asi que el footprint y los recursos se toman de una llamada valida
 * parecida (`template`) y se envia la mala tal cual, con la firma que tendria el atacante.
 * La red la incluye en un ledger y la marca como fallida: queda como prueba publica.
 */
export async function forceFailing(signer, { fn, args, auth = [], template, extraReadOnly = [] }) {
  const acc = await soroban.getAccount(signer.publicKey());
  const probe = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(new Contract(CONTRACT).call(template.fn, ...template.args)).setTimeout(30).build();
  const sim = await soroban.simulateTransaction(probe);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`la plantilla no simula: ${sim.error}`);

  const data = sim.transactionData.build();
  const fp = data.resources().footprint();
  fp.readOnly([...fp.readOnly(), ...extraReadOnly]);
  const res = data.resources();
  res.instructions(res.instructions() * 2);
  data.resourceFee(xdr.Int64.fromString(String(Number(data.resourceFee().toString()) * 2)));

  // El builder de la plantilla ya consumio un numero de secuencia: se recarga la cuenta.
  const tx = new TransactionBuilder(await soroban.getAccount(signer.publicKey()), {
    fee: String(Number(BASE_FEE) + Number(data.resourceFee().toString())),
    networkPassphrase: NETWORK,
  })
    .addOperation(Operation.invokeContractFunction({ contract: CONTRACT, function: fn, args, auth }))
    .setSorobanData(data)
    .setTimeout(120)
    .build();
  tx.sign(signer);
  const sent = await soroban.sendTransaction(tx);
  if (sent.status === "ERROR") throw new Error(`la red no la acepto en cola: ${JSON.stringify(sent.errorResult)}`);
  const out = await waitFor(sent.hash);
  return { hash: sent.hash, status: out.status, reason: errorsOf(out) };
}

/** El error con el que la red rechazo la transaccion, leido de sus eventos de diagnostico. */
function errorsOf(tx) {
  const errs = new Set();
  for (const d of tx.diagnosticEventsXdr ?? []) {
    for (const t of d.event().body().v0().topics()) {
      if (t.switch().name !== "scvError") continue;
      const e = t.error();
      errs.add(e.switch().name === "sceContract" ? `Error(Contract, #${e.contractCode()})` : `Error(${e.switch().name}, ${e.code().name})`);
    }
  }
  return [...errs].join(" | ");
}

/** Autorizacion de cuenta origen para una llamada: la que firmaria quien envia la transaccion. */
export function sourceAuth(fn, args) {
  return new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new xdr.InvokeContractArgs({ contractAddress: new Address(CONTRACT).toScAddress(), functionName: fn, args }),
      ),
      subInvocations: [],
    }),
  });
}

/** Deja al menos `need` USDC en la cuenta del cliente, comprando con XLM por path payment. */
export async function ensureClientUsdc(need) {
  const acc = await horizon.loadAccount(client.publicKey());
  const have = Number(acc.balances.find((b) => b.asset_code === "USDC" && b.asset_issuer === USDC.issuer)?.balance ?? 0);
  if (have >= need) return null;
  const missing = (need - have + 1).toFixed(7);
  const paths = await horizon.strictReceivePaths([Asset.native()], USDC, missing).call();
  if (!paths.records.length) throw new Error("no hay ruta XLM -> USDC");
  const best = paths.records[0];
  const tx = new TransactionBuilder(acc, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(Operation.pathPaymentStrictReceive({
      sendAsset: Asset.native(),
      sendMax: (Number(best.source_amount) * 1.15).toFixed(7),
      destination: client.publicKey(),
      destAsset: USDC,
      destAmount: missing,
      path: best.path.map((p) => (p.asset_type === "native" ? Asset.native() : new Asset(p.asset_code, p.asset_issuer))),
    }))
    .setTimeout(120).build();
  tx.sign(client);
  return (await horizon.submitTransaction(tx)).hash;
}
