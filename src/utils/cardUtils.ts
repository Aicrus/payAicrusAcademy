export type CardBrand = 'visa' | 'mastercard' | 'elo' | 'unknown';

export function detectCardBrand(number: string): CardBrand {
  const cleanNumber = number.replace(/\D/g, '');

  // Visa: começa com 4
  if (/^4/.test(cleanNumber)) {
    return 'visa';
  }

  // Mastercard: começa com 51-55 ou 2221-2720
  if (/^5[1-5]/.test(cleanNumber) || /^2[2-7][2-7]\d{2}/.test(cleanNumber)) {
    return 'mastercard';
  }

  // Elo: começa com 636368, 438935, 504175, 451416, 509048, 509067, 509049, 509069, 509050, 509074, 509068, 509040, 509045, 509051, 509046, 509066, 509047, 509042, 509052, 509043, 509064, 509040
  if (/^(636368|438935|504175|451416|509048|509067|509049|509069|509050|509074|509068|509040|509045|509051|509046|509066|509047|509042|509052|509043|509064|509040)/.test(cleanNumber)) {
    return 'elo';
  }

  return 'unknown';
}

export function formatCardNumber(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  const groups = cleanValue.match(/.{1,4}/g) || [];
  return groups.join(' ');
} 