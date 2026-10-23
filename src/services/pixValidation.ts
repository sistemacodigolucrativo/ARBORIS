/**
 * Validation used by both the browser and API for Brazilian Pix keys.
 * Phone is persisted in E.164 (+55 DDD number); random keys use UUID v4.
 */
export type PixKeyType = 'phone' | 'email' | 'random';
export type PixKeyResult = { valid: true; normalized: string } | { valid: false; error: string };

export function validatePixKey(type: PixKeyType, raw: string): PixKeyResult {
  const value = raw.trim();
  if (type === 'phone') {
    const compact = value.replace(/[\s().-]/g, '');
    if (!/^\+?\d+$/.test(compact)) {
      return { valid: false, error: 'Informe um telefone brasileiro com DDD e números válidos.' };
    }
    let digits = compact.replace(/^\+/, '');
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
    if (!/^[1-9][0-9]\d{8,9}$/.test(digits) || (digits.length === 11 && digits[2] !== '9')) {
      return { valid: false, error: 'Informe DDD e telefone válido, com código do país +55 opcional.' };
    }
    return { valid: true, normalized: '+55' + digits };
  }
  if (type === 'email') {
    if (value.length > 77 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value)) {
      return { valid: false, error: 'Informe um endereço de e-mail válido para a chave Pix.' };
    }
    return { valid: true, normalized: value.toLowerCase() };
  }
  if (type === 'random') {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      return { valid: false, error: 'A chave Pix aleatória deve ter o formato UUID v4 (36 caracteres).' };
    }
    return { valid: true, normalized: value.toLowerCase() };
  }
  return { valid: false, error: 'Tipo de chave Pix inválido.' };
}

export function formatBrazilianPixPhone(raw: string): string {
  const result = validatePixKey('phone', raw);
  if (!result.valid) return raw;
  const number = result.normalized.slice(3);
  const ddd = number.slice(0, 2);
  const subscriber = number.slice(2);
  const offset = subscriber.length === 9 ? 5 : 4;
  return '+55 (' + ddd + ') ' + subscriber.slice(0, offset) + '-' + subscriber.slice(offset);
}
