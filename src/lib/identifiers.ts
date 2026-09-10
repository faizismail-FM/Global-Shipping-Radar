/** IMO number check digit: weights 7..2 over the first six digits, mod 10. */
export function imoCheckDigit(sixDigits: string): number {
  let sum = 0;
  for (let i = 0; i < 6; i++) sum += Number(sixDigits[i]) * (7 - i);
  return sum % 10;
}

export function isValidImo(value: string): boolean {
  const digits = value.replace(/^IMO\s*/i, '').trim();
  if (!/^\d{7}$/.test(digits)) return false;
  return imoCheckDigit(digits.slice(0, 6)) === Number(digits[6]);
}

/** ISO 6346 letter values: A=10 … Z=38 with multiples of 11 skipped. */
const ISO6346_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ISO6346_VALUES = [10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38];
function iso6346LetterValue(ch: string): number {
  return ISO6346_VALUES[ISO6346_LETTERS.indexOf(ch)] ?? 0;
}

/** Compute the ISO 6346 check digit for a 10-character owner+serial prefix. */
export function containerCheckDigit(prefix10: string): number {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = prefix10[i] as string;
    const v = /[A-Z]/.test(ch) ? iso6346LetterValue(ch) : Number(ch);
    sum += v * 2 ** i;
  }
  return (sum % 11) % 10;
}

export function isValidContainerNumber(value: string): boolean {
  const v = value.toUpperCase().replace(/\s|-/g, '');
  if (!/^[A-Z]{4}\d{7}$/.test(v)) return false;
  return containerCheckDigit(v.slice(0, 10)) === Number(v[10]);
}

/** Loose container-number shape used by the smart search classifier. */
export function looksLikeContainerNumber(value: string): boolean {
  const v = value.toUpperCase().replace(/\s|-/g, '');
  return /^[A-Z]{3}[UJZ]\d{4,7}$/.test(v);
}

export function normalizeContainerNumber(value: string): string {
  return value.toUpperCase().replace(/\s|-/g, '');
}
