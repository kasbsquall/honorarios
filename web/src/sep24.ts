// Retiro por un ancla SEP-24 en testnet: el ancla de pruebas de SDF acepta el USDC de Circle
// y simula la salida a un banco. En la red principal el mismo protocolo lo habla un ancla que
// liquida soles; aqui sirve para ejecutar el camino completo con dinero de prueba.
import { NETWORK, USDC, sign } from "./stellar";

export const TEST_ANCHOR = "https://testanchor.stellar.org";

export type AnchorTx = {
  id: string;
  status: string;
  amount_in?: string;
  amount_out?: string;
  amount_fee?: string;
  withdraw_anchor_account?: string;
  withdraw_memo?: string;
  withdraw_memo_type?: string;
  more_info_url?: string;
  stellar_transaction_id?: string;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`El ancla respondió ${res.status}.`);
  return res.json() as Promise<T>;
}

/** SEP-10: el ancla manda un reto, la wallet lo firma y el ancla devuelve un token de sesion. */
export async function anchorLogin(account: string): Promise<string> {
  const challenge = await json<{ transaction: string; network_passphrase: string }>(
    await fetch(`${TEST_ANCHOR}/auth?account=${account}`),
  );
  if (challenge.network_passphrase !== NETWORK) throw new Error("El ancla no es de testnet.");
  const signed = await sign(challenge.transaction, account);
  const { token } = await json<{ token: string }>(
    await fetch(`${TEST_ANCHOR}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: signed }),
    }),
  );
  return token;
}

/** Abre un retiro interactivo: el ancla devuelve la pagina donde el usuario pone sus datos. */
export async function startWithdraw(token: string, account: string, amount: string): Promise<{ id: string; url: string }> {
  return json(
    await fetch(`${TEST_ANCHOR}/sep24/transactions/withdraw/interactive`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ asset_code: USDC.code, asset_issuer: USDC.issuer, account, amount }),
    }),
  );
}

export async function anchorTx(token: string, id: string): Promise<AnchorTx> {
  const res = await json<{ transaction: AnchorTx }>(
    await fetch(`${TEST_ANCHOR}/sep24/transaction?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
  return res.transaction;
}

/** Limites del ancla para retirar USDC. El ancla de pruebas acepta montos chicos. */
export async function withdrawLimits(): Promise<{ min: number; max: number }> {
  const info = await json<{ withdraw?: Record<string, { enabled?: boolean; min_amount?: number; max_amount?: number }> }>(
    await fetch(`${TEST_ANCHOR}/sep24/info`),
  );
  const usdc = info.withdraw?.[USDC.code];
  if (!usdc?.enabled) throw new Error("El ancla de pruebas no está aceptando retiros de USDC ahora.");
  return { min: usdc.min_amount ?? 0, max: usdc.max_amount ?? Number.POSITIVE_INFINITY };
}
