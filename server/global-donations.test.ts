import test from 'node:test';
import assert from 'node:assert/strict';
import type { GameDatabaseState } from '../src/types/game';
import { getConfirmedGlobalDonations, maskParticipantName } from './globalDonations';

test('mascara completamente os sobrenomes e parte de cada nome', () => {
  assert.equal(maskParticipantName('João Silva'), 'Jo*** Si***');
  assert.equal(maskParticipantName('Maria Souza'), 'Ma*** So***');
  assert.equal(maskParticipantName(''), 'Pa***');
  assert.equal(maskParticipantName('A'), 'A***');
});

test('mostra somente ativações Pix aprovadas com registro correspondente no ledger', () => {
  const state = {
    users: [
      { id: 1, name: 'João Silva' },
      { id: 2, name: 'Maria Souza' },
      { id: 3, name: 'Ana Pereira' }
    ],
    activationRequests: [
      { requesterUserId: 1, troncoUserId: 2, treeId: 5, amount: 25, status: 'approved' },
      { requesterUserId: 3, troncoUserId: 2, treeId: 5, amount: 25, status: 'approved' },
      { requesterUserId: 1, troncoUserId: 3, treeId: 6, amount: 25, status: 'pending' },
      { requesterUserId: 2, troncoUserId: 3, treeId: 6, amount: 25, status: 'rejected' }
    ],
    ledger: [
      { id: 1, type: 'FORTALECIMENTO_TRONCO', fromUserId: 1, toUserId: 2, treeId: 5, amount: 25, createdAt: '2026-10-22T10:00:00.000Z' },
      { id: 2, type: 'FORTALECIMENTO_TRONCO', fromUserId: 3, toUserId: 2, treeId: 5, amount: 25, createdAt: '2026-10-23T10:00:00.000Z' },
      { id: 3, type: 'FORTALECIMENTO_TRONCO', fromUserId: 1, toUserId: 3, treeId: 6, amount: 25, createdAt: '2026-10-24T10:00:00.000Z' },
      { id: 4, type: 'FORTALECIMENTO_TRONCO', fromUserId: 2, toUserId: 3, treeId: 6, amount: 25, createdAt: '2026-10-25T10:00:00.000Z' },
      { id: 5, type: 'CONCESSAO_INICIAL_SEMENTES', fromUserId: null, toUserId: 2, treeId: 5, amount: 25, createdAt: '2026-10-26T10:00:00.000Z' }
    ]
  } as unknown as GameDatabaseState;

  const all = getConfirmedGlobalDonations(state);
  assert.equal(all.total, 2);
  assert.deepEqual(all.items.map(item => item.id), [2, 1]);
  assert.deepEqual(all.items[1], {
    id: 1, donor: 'Jo*** Si***', recipient: 'Ma*** So***',
    amount: 25, createdAt: '2026-10-22T10:00:00.000Z'
  });
  assert.equal(JSON.stringify(all.items).includes('João'), false);
  assert.equal(JSON.stringify(all.items).includes('Maria'), false);

  const first = getConfirmedGlobalDonations(state, 1, 1);
  const second = getConfirmedGlobalDonations(state, 2, 1);
  assert.deepEqual(first.items.map(item => item.id), [2]);
  assert.deepEqual(second.items.map(item => item.id), [1]);
  assert.equal(getConfirmedGlobalDonations(state, 3, 1).items.length, 0);
});

test('não publica doações sem ativação aprovada', () => {
  const state = { users: [], ledger: [{
    id: 1, type: 'FORTALECIMENTO_TRONCO', fromUserId: 1, toUserId: 2,
    treeId: 5, amount: 25, createdAt: '2026-10-22T10:00:00Z'
  }], activationRequests: [] } as unknown as GameDatabaseState;
  assert.equal(getConfirmedGlobalDonations(state).total, 0);
});
