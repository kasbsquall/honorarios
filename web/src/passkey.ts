import { contract } from "@stellar/stellar-sdk";
import { IndexedDBStorage, SmartAccountKit } from "smart-account-kit";
import { CONTRACT_ID, NETWORK, RPC_URL } from "./stellar";

// Contratos de OpenZeppelin ya desplegados en testnet (stellar/smart-account-kit, demo/.env.example).
const ACCOUNT_WASM_HASH = "1b5f4534a76322da2ad7c745f6900857a6802b0ca79850c35a03561df997785a";
const WEBAUTHN_VERIFIER = "CC7EKIHQP3TN4CARQDND6CEOY2UXLWWC2X5GHTD5NLAT7BG5GPZIOM3F";
// Relayer publico de SDF para testnet: paga las comisiones de la smart wallet.
const RELAYER_URL = "https://smart-account-relayer-proxy.sdf-ecosystem.workers.dev";

let kit: SmartAccountKit | null = null;

function getKit(): SmartAccountKit {
  kit ??= new SmartAccountKit({
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK,
    accountWasmHash: ACCOUNT_WASM_HASH,
    webauthnVerifierAddress: WEBAUTHN_VERIFIER,
    relayerUrl: RELAYER_URL,
    rpName: "Honorarios",
    storage: new IndexedDBStorage(),
  });
  return kit;
}

/** Restaura la sesion guardada sin pedir la passkey. */
export async function restorePasskey(): Promise<string | null> {
  try {
    const res = await getKit().connectWallet();
    return res?.contractId ?? null;
  } catch {
    return null;
  }
}

export async function createPasskeyWallet(name: string): Promise<string> {
  const res = await getKit().createWallet("Honorarios", name || "freelancer", { autoSubmit: true });
  if (res.submitResult && !res.submitResult.success) {
    throw new Error("No se pudo desplegar la wallet. Intenta de nuevo en un momento.");
  }
  return res.contractId;
}

export async function connectPasskey(): Promise<string> {
  const res = await getKit().connectWallet({ prompt: true });
  if (!res) throw new Error("No encontramos una wallet para esta passkey.");
  return res.contractId;
}

export async function disconnectPasskey() {
  await getKit().disconnect();
}

/** Retira reserva firmando con la passkey. La comision la paga el relayer. */
export async function withdrawWithPasskey(freelancer: string, to: string, amount: bigint): Promise<string> {
  const client = (await contract.Client.from({ contractId: CONTRACT_ID, networkPassphrase: NETWORK, rpcUrl: RPC_URL })) as any;
  const tx = await client.withdraw_tax({ freelancer, to, amount });
  const res = await getKit().signAndSubmit(tx);
  if (!res.success) throw new Error("El retiro no se completó. Revisa el monto y vuelve a intentar.");
  return res.hash;
}

/** Emite el recibo firmando con la passkey. Solo lo emitido se puede cobrar despues. */
export async function issueWithPasskey(freelancer: string, ref: string, gross: bigint, concept: string): Promise<string> {
  const client = (await contract.Client.from({ contractId: CONTRACT_ID, networkPassphrase: NETWORK, rpcUrl: RPC_URL })) as any;
  const tx = await client.issue({ freelancer, receipt_ref: ref, gross, concept });
  const res = await getKit().signAndSubmit(tx);
  if (!res.success) throw new Error("El recibo no se emitió. Si ya usaste ese N° de recibo, elige otro.");
  return res.hash;
}

/** Renueva la vida de la reserva en la red. No mueve fondos y la comision la paga el relayer. */
export async function extendWithPasskey(freelancer: string): Promise<string> {
  const client = (await contract.Client.from({ contractId: CONTRACT_ID, networkPassphrase: NETWORK, rpcUrl: RPC_URL })) as any;
  const tx = await client.extend_reserve({ freelancer }, { restore: true });
  const res = await getKit().signAndSubmit(tx);
  if (!res.success) throw new Error("No se pudo renovar la reserva. Intenta de nuevo en un momento.");
  return res.hash;
}
