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
import { getNetworkDetails, isConnected, requestAccess, signTransaction } from "@stellar/freighter-api";

export const NETWORK = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const CONTRACT_ID = "CDGZLOQDUVBC4SCX5HCNRCJ3OF56Y5SNBY2RP22CI7PSCR7CX245YETA";
export const USDC = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
export const TAX_BPS = 800n;
export const EXPLORER = "https://stellar.expert/explorer/testnet";
const DECIMALS = 7;
const PATH_SLIPPAGE = 1.05;
// Ledger del despliegue del contrato: no hay eventos antes de esto.
const DEPLOY_LEDGER = 4_766_344;
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

/** Mismo reparto que el contrato, con el mismo redondeo hacia arriba de la reserva. */
export function split(gross: bigint) {
  const tax = (gross * TAX_BPS + 9_999n) / 10_000n;
  return { gross, tax, net: gross - tax };
}

export function short(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

// Firmante solo para pruebas locales en testnet (npm run dev + ?dev=client|freelancer).
// Las llaves viven en .env.development.local (Vite no lo carga en build), que no se sube al repo. En build de produccion no existe.
function devKeypair(): Keypair | null {
  if (!import.meta.env.DEV) return null;
  const role = new URLSearchParams(location.search).get("dev");
  const secret =
    role === "client" ? import.meta.env.VITE_DEV_CLIENT_SECRET
    : role === "freelancer" ? import.meta.env.VITE_DEV_FREELANCER_SECRET
    : undefined;
  return secret ? Keypair.fromSecret(secret) : null;
}

/** Rechaza si la promesa no responde: sin extensión, Freighter no contesta nunca. */
function within<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, no) => setTimeout(() => no(new Error(msg)), ms))]);
}

export const FREIGHTER_INSTALL = "https://www.freighter.app/";

export async function connectWallet(): Promise<string> {
  const dev = devKeypair();
  if (dev) return dev.publicKey();
  const here = await within(isConnected(), 4000, "no-freighter").catch(() => ({ isConnected: false }));
  if (!here?.isConnected) throw new Error("No encontramos la extensión Freighter en este navegador.");
  const access = await within(requestAccess(), 90_000, "Freighter no respondió. Ábrelo y vuelve a intentar.");
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
  const best = paths.records[0];
  const sendMax = (Number(best.source_amount) * PATH_SLIPPAGE).toFixed(7);
  // El sendMax corresponde a esta ruta: hay que ejecutar la misma, no una vacia.
  const hops = best.path.map((a: { asset_code?: string; asset_issuer?: string }) =>
    a.asset_code && a.asset_issuer ? new Asset(a.asset_code, a.asset_issuer) : Asset.native(),
  );

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
      path: hops,
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

/** Bruto cobrado en el mes, leido del contrato: no depende de cuantos eventos guarde el RPC. */
export async function monthGross(freelancer: string): Promise<{ period: number; gross: bigint }> {
  const client = (await honorarios()) as any;
  const period = Number((await client.current_period()).result);
  const tx = await client.month_gross({ freelancer, period });
  return { period, gross: BigInt(tx.result) };
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

  // Cada ventana se pagina hasta agotarla: con limit fijo, los cobros sobrantes
  // desaparecian sin aviso y la lista mostraba menos de los que hay.
  const scan = async (start: number) => {
    const endLedger = Math.min(start + EVENT_SCAN_STEP, sequence + 1);
    const filters = [{ type: "contract" as const, contractIds: [CONTRACT_ID], topics }];
    const out: Awaited<ReturnType<typeof server.getEvents>>["events"] = [];
    let page = await server.getEvents({ startLedger: start, endLedger, filters, limit: 100 });
    out.push(...page.events);
    while (page.events.length === 100 && page.cursor) {
      page = await server.getEvents({ cursor: page.cursor, filters, limit: 100 });
      out.push(...page.events);
    }
    return out;
  };

  const pages = await Promise.all(windows.map(scan));
  return pages
    .flat()
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
