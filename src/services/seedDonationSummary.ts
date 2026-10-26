import type { LedgerEntry } from '../types/game';

/** Counts recorded seed transfers to a Tronco; pending activation requests are not ledger entries. */
export function summarizeRecordedDonations(
  entries: readonly Pick<LedgerEntry, 'type' | 'toUserId' | 'fromUserId' | 'treeId'>[],
  recipientId: number,
  cycleTreeId: number | null
): { donations: number; donors: number } {
  const received = entries.filter(entry =>
    entry.type === 'FORTALECIMENTO_TRONCO' &&
    entry.toUserId === recipientId &&
    entry.fromUserId !== null &&
    (cycleTreeId === null || entry.treeId === cycleTreeId)
  );

  return {
    donations: received.length,
    donors: new Set(received.map(entry => entry.fromUserId)).size
  };
}

/** Informational display only: seeds are not redeemable Brazilian reais. */
export function formatIllustrativeSeedBRL(amount: number): string {
  return `${Math.max(0, Number.isFinite(amount) ? amount : 0).toFixed(2)}R$`;
}
