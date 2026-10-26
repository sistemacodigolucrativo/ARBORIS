import type { GameDatabaseState } from '../src/types/game';

export interface GlobalDonationRecord {
  id: number;
  donor: string;
  recipient: string;
  amount: number;
  createdAt: string;
}

export interface GlobalDonationPage {
  items: GlobalDonationRecord[];
  total: number;
  page: number;
  pageSize: number;
}

/** Names are obscured before leaving the authenticated API. */
export function maskParticipantName(rawName: string): string {
  const parts = rawName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Pa***';
  return parts.map(part => `${part.slice(0, Math.min(2, part.length))}***`).join(' ');
}

/**
 * A donation becomes visible only when the Tronco approved the Pix activation
 * AND the corresponding immutable internal transfer exists in the ledger.
 * This feed does not certify that a bank independently verified the Pix.
 */
export function getConfirmedGlobalDonations(
  state: Pick<GameDatabaseState, 'users' | 'ledger' | 'activationRequests'>,
  page = 1,
  pageSize = 20
): GlobalDonationPage {
  const verified = new Set(
    (state.activationRequests || [])
      .filter(request => request.status === 'approved')
      .map(request => [request.requesterUserId, request.troncoUserId, request.treeId, request.amount].join(':'))
  );
  const users = new Map(state.users.map(user => [user.id, user.name || user.username]));
  const entries = state.ledger
    .filter(entry =>
      entry.type === 'FORTALECIMENTO_TRONCO' &&
      entry.fromUserId !== null &&
      entry.amount > 0 &&
      verified.has([entry.fromUserId, entry.toUserId, entry.treeId, entry.amount].join(':'))
    )
    .sort((a, b) => {
      const byDate = Date.parse(String(b.createdAt)) - Date.parse(String(a.createdAt));
      return (Number.isFinite(byDate) ? byDate : 0) || b.id - a.id;
    });

  const currentPage = Math.max(1, Math.floor(page));
  const limit = Math.max(1, Math.min(50, Math.floor(pageSize)));
  return {
    page: currentPage,
    pageSize: limit,
    total: entries.length,
    items: entries.slice((currentPage - 1) * limit, currentPage * limit).map(entry => ({
      id: entry.id,
      donor: maskParticipantName(users.get(entry.fromUserId!) || entry.fromUsername || 'Participante'),
      recipient: maskParticipantName(users.get(entry.toUserId) || entry.toUsername || 'Participante'),
      amount: entry.amount,
      createdAt: String(entry.createdAt)
    }))
  };
}
