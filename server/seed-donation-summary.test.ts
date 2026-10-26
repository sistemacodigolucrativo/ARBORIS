import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LedgerEntry } from '../src/types/game';
import { formatIllustrativeSeedBRL, summarizeRecordedDonations } from '../src/services/seedDonationSummary';

type Entry = Pick<LedgerEntry, 'type' | 'toUserId' | 'fromUserId' | 'treeId'>;
const transfer = (fromUserId: number, treeId = 7, toUserId = 9): Entry => ({
  type: 'FORTALECIMENTO_TRONCO', fromUserId, toUserId, treeId
});

test('counts transfers and unique donors only for the recipient and current tree', () => {
  const entries: Entry[] = [
    transfer(1), transfer(1), transfer(2),
    transfer(3, 8), transfer(4, 7, 10),
    { type: 'CONCESSAO_INICIAL_SEMENTES', fromUserId: null, toUserId: 9, treeId: 7 },
    { type: 'RESERVA_VAGA', fromUserId: 5, toUserId: 9, treeId: 7 }
  ];
  assert.deepEqual(summarizeRecordedDonations(entries, 9, 7), { donations: 3, donors: 2 });
  assert.deepEqual(summarizeRecordedDonations(entries, 9, 8), { donations: 1, donors: 1 });
  assert.deepEqual(summarizeRecordedDonations(entries, 9, null), { donations: 4, donors: 3 });
  assert.deepEqual(summarizeRecordedDonations([], 9, 7), { donations: 0, donors: 0 });
});

test('displays the explicitly requested reference format without changing wallet amounts', () => {
  assert.equal(formatIllustrativeSeedBRL(25), '25.00R$');
  assert.equal(formatIllustrativeSeedBRL(0), '0.00R$');
});
