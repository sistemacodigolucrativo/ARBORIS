import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePixKey, formatBrazilianPixPhone } from '../src/services/pixValidation';

test('Pix phone normalizes Brazilian formatted and unformatted numbers', () => {
  for (const phone of ['+55 (31) 99999-9999', '31999999999', '55 31 99999-9999']) {
    assert.deepEqual(validatePixKey('phone', phone), { valid: true, normalized: '+5531999999999' });
  }
  assert.equal(formatBrazilianPixPhone('31999999999'), '+55 (31) 99999-9999');
  assert.equal(validatePixKey('phone', '31-abc').valid, false);
  assert.equal(validatePixKey('phone', '123').valid, false);
});

test('Pix e-mail rejects malformed addresses', () => {
  assert.deepEqual(validatePixKey('email', ' Pessoa@Exemplo.com.br '), { valid: true, normalized: 'pessoa@exemplo.com.br' });
  for (const email of ['sem-arroba', 'a@@b.com', 'x@y', 'x y@z.com']) {
    assert.equal(validatePixKey('email', email).valid, false);
  }
});

test('Pix EVP random key is UUID v4', () => {
  const key = '123e4567-e89b-42d3-a456-426614174000';
  assert.deepEqual(validatePixKey('random', key), { valid: true, normalized: key });
  assert.equal(validatePixKey('random', 'qualquer-coisa').valid, false);
  assert.equal(validatePixKey('random', '123e4567-e89b-12d3-a456-426614174000').valid, false);
});
