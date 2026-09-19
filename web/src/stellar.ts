import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  contract,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { getNetworkDetails, requestAccess, signTransaction } from "@stellar/freighter-api";

export const NETWORK = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const CONTRACT_ID = "CCYLKLKCXUOO2XSVC7O7HAIOT4CRYBZIS4NBOJATMGL4JOV3DRYUDLD5";
export const USDC = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
export const TAX_BPS = 800n;
export const EXPLORER = "https://stellar.expert/explorer/testnet";
const DECIMALS = 7;
const PATH_SLIPPAGE = 1.05;
// Ledger del despliegue del contrato: no hay eventos antes de esto.
const DEPLOY_LEDGER = 4_762_900;
// El RPC de testnet recorre como maximo ~10k ledgers por consulta.
const EVENT_SCAN_STEP = 9_000;

const horizon = new Horizon.Server(HORIZON_URL);
const server = new rpc.Server(RPC_URL);

export function toUnits(amount: string): bigint {
  const [whole, frac = ""] = amount.trim().split(".");
  return BigInt(whole || "0") * 10n ** BigInt(DECIMALS) + BigInt(frac.padEnd(DECIMALS, "0").slice(0, DECIMALS));
}

export function fromUnits(units: bigint, digits = 2): string {
  const sign = units < 0n ? "-" : "";
  const abs = units < 0n ? -units : units;
  const whole = abs / 10n ** BigInt(DECIMALS);
  const frac = (abs % 10n ** BigInt(DECIMALS)).toString().padStart(DECIMALS, "0").slice(0, digits);
  return `${sign}${whole.toLocaleString("en-US")}${digits ? "." + frac : ""}`;
}

export function split(gross: bigint) {
  const tax = (gross * TAX_BPS) / 10_000n;
  return { gross, tax, net: gross - tax };
}

export function short(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

// Firmante solo para pruebas locales en testnet (npm run dev + ?dev=client|freelancer).
// Las llaves viven en .env.local, que no se sube al repo. En build de produccion no existe.
function devKeypair(): Keypair | null {
  if (!import.meta.env.DEV) return null;
  const role = new URLSearchParams(location.search).get("dev");
  const secret =
    role === "client" ? import.meta.env.VITE_DEV_CLIENT_SECRET
    : role === "freelancer" ? import.meta.env.VITE_DEV_FREELANCER_SECRET
    : undefined;
  return secret ? Keypair.fromSecret(secret) : null;
}

export async function connectWallet(): Promise<string> {
  const dev = devKeypair();
  if (dev) return dev.publicKey();
  const access = await requestAccess();
  if (access.error) throw new Error("Freighter rechazó la conexión.");
  const net = await getNetworkDetails();
  if (net.networkPassphrase !== NETWORK) throw new Error("Cambia Freighter a Testnet para continuar.");
  return access.address;
}

async function sign(xdrTx: string, address: string): Promise<string> {
  const dev = devKeypair();
  if (dev && dev.publicKey() === address) {
    const tx = TransactionBuilder.fromXDR(xdrTx, NETWORK);
    tx.sign(dev);
    return tx.toXDR();
  }
  const res = await signTransaction(xdrTx, { networkPassphrase: NETWORK, address });
  if (res.error) throw new Error("La firma fue cancelada en Freighter.");
  return res.signedTxXdr;
}

export async function usdcBalance(address: string): Promise<bigint | null> {
  const acc = await horizon.loadAccount(address);
  const line = acc.balances.find(
    (b) => "asset_code" in b && b.asset_code === USDC.code && b.asset_issuer === USDC.issuer,
  );
  return line ? toUnits(line.balance) : null;
}

/** Deja en la cuenta del pagador al menos `amount` USDC, comprando con XLM si hace falta. */
export async function ensureUsdc(payer: string, amount: bigint): Promise<string | null> {
  const balance = await usdcBalance(payer);
  if (balance !== null && balance >= amount) return null;

  const missing = amount - (balance ?? 0n);
  const paths = await horizon.strictReceivePaths([Asset.native()], USDC, fromUnits(missing, 7)).call();
  if (!paths.records.length) throw new Error("No hay ruta XLM a USDC disponible en testnet.");
  const sendMax = (Number(paths.records[0].source_amount) * PATH_SLIPPAGE).toFixed(7);

  const account = await horizon.loadAccount(payer);
  const builder = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK });
  if (balance === null) builder.addOperation(Operation.changeTrust({ asset: USDC }));
  builder.addOperation(
    Operation.pathPaymentStrictReceive({
      sendAsset: Asset.native(),
      sendMax,
      destination: payer,
      destAsset: USDC,
      destAmount: fromUnits(missing, 7),
      path: [],
    }),
  );
  const tx = builder.setTimeout(120).build();
  const signed = TransactionBuilder.fromXDR(await sign(tx.toXDR(), payer), NETWORK);
  const res = await horizon.submitTransaction(signed);
  return res.hash;
}

function honorarios(publicKey?: string) {
  return contract.Client.from({
    contractId: CONTRACT_ID,
    networkPassphrase: NETWORK,
    rpcUrl: RPC_URL,
    publicKey,
    signTransaction: async (x: string) => ({ signedTxXdr: await sign(x, publicKey!) }),
  });
}

export async function payInvoice(payer: string, freelancer: string, gross: bigint, ref: string): Promise<string> {
  const client = (await honorarios(payer)) as any;
  const tx = await client.pay({ payer, freelancer, gross, receipt_ref: ref });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash ?? "";
}

export async function withdrawWithWallet(freelancer: string, to: string, amount: bigint): Promise<string> {
  const client = (await honorarios(freelancer)) as any;
  const tx = await client.withdraw_tax({ freelancer, to, amount });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash ?? "";
}

export async function taxReserve(freelancer: string): Promise<bigint> {
  const client = (await honorarios()) as any;
  const tx = await client.tax_reserve({ freelancer });
  return BigInt(tx.result);
}

export type Paid = {
  gross: bigint;
  net: bigint;
  tax: bigint;
  ref: string;
  payer: string;
  txHash: string;
  at: Date;
};

export async function paidEvents(freelancer: string): Promise<Paid[]> {
  const { sequence } = await server.getLatestLedger();
  const topics = [[xdr.ScVal.scvSymbol("paid").toXDR("base64"), nativeToScVal(freelancer, { type: "address" }).toXDR("base64")]];
  const probe = await server.getEvents({ startLedger: sequence - 1, filters: [], limit: 1 });
  const from = Math.max(DEPLOY_LEDGER, probe.oldestLedger);
  const windows: number[] = [];
  for (let start = from; start <= sequence; start += EVENT_SCAN_STEP) windows.push(start);

  const pages = await Promise.all(
    windows.map((start) =>
      server.getEvents({
        startLedger: start,
        endLedger: Math.min(start + EVENT_SCAN_STEP, sequence + 1),
        filters: [{ type: "contract", contractIds: [CONTRACT_ID], topics }],
        limit: 100,
      }),
    ),
  );
  return pages
    .flatMap((p) => p.events)
    .map((e) => {
      const v = scValToNative(e.value);
      return {
        gross: BigInt(v.gross),
        net: BigInt(v.net),
        tax: BigInt(v.tax),
        ref: String(v.receipt_ref),
        payer: String(v.payer),
        txHash: e.txHash,
        at: new Date(e.ledgerClosedAt),
      };
    })
    .reverse();
}
