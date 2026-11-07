// What the TI-30 shows: 8 digits plus the sign, in 9 LED positions.
// The decimal point sits inside a digit position (unlike the HP-45).
//
// Fixed notation, rounded 5/4 to 8 digits; trailing zeros are dropped.
// If the 8 positions are not enough for a leading zero, it is left out:
// π ÷ 10 shows ".31415927" (report on the HP Museum forum).
// Scientific notation: 5 mantissa digits and a two-digit exponent.

import { D, roundPlaces, roundTo } from '../engine/decimal.js';

export const CELLS = 9;
export const SHOWN = 8;
/** Fixed notation for 10⁻⁷ ≤ |x| < 10⁸, otherwise scientific (reconstructed) */
export const FIX_MIN_EXP = -7;

const digitCount = (s) => (s.match(/\d/g) || []).length;

function dropLeadingZero(s) {
  if (digitCount(s) > SHOWN) return s.replace(/^(-?)0\./, '$1.');
  return s;
}

function trimFraction(s) {
  if (!s.includes('.')) return `${s}.`;
  return s.replace(/0+$/, '');
}

export function formatSci(v) {
  v = D(v);
  if (v.isZero()) return '0.' + ' 00';
  const m = roundTo(v, 5);
  const e = m.exponent();
  const digits = (m.c < 0n ? -m.c : m.c).toString();
  const mant = trimFraction(`${digits[0]}.${digits.slice(1)}`);
  const ex = `${e < 0 ? '-' : ' '}${String(Math.abs(e)).padStart(2, '0')}`;
  return `${m.isNeg() ? '-' : ''}${mant}${ex}`;
}

/** @returns {string} digits with '.' marking the decimal point of the digit before it */
export function formatValue(v, sci = false) {
  v = D(v);
  if (v.isZero()) return sci ? formatSci(v) : '0.';
  const e = v.exponent();
  if (!sci && e < SHOWN && e >= FIX_MIN_EXP) {
    const places = e >= 0 ? SHOWN - (e + 1) : SHOWN;
    const r = roundPlaces(v, places);
    if (r.exponent() < SHOWN) return dropLeadingZero(trimFraction(r.toString()));
  }
  return formatSci(v);
}

/**
 * The number being typed in.
 * @param {{mant: string, neg: boolean, exp: string|null, expNeg: boolean}} entry
 */
export function formatEntry(entry, sci = false) {
  let m = entry.mant || '0';
  if (m.startsWith('.')) m = `0${m}`;
  if (!m.includes('.')) m += '.';
  m = dropLeadingZero(m);
  const sign = entry.neg ? '-' : '';
  if (entry.exp === null && !sci) return sign + m;
  // scientific entry: the mantissa keeps 5 digits on screen
  let out = '';
  let n = 0;
  for (const ch of m) {
    if (/\d/.test(ch)) {
      if (n === 5) break;
      n++;
    }
    out += ch;
  }
  const ex = (entry.exp ?? '').padStart(2, '0');
  return `${sign}${out}${entry.expNeg ? '-' : ' '}${ex}`;
}

/** Split a display string into 9 cells { ch, dp }, right-aligned. */
export function toCells(s) {
  const cells = [];
  for (const ch of s) {
    if (ch === '.') {
      if (cells.length === 0 || cells[cells.length - 1].dp) cells.push({ ch: ' ', dp: true });
      else cells[cells.length - 1].dp = true;
    } else cells.push({ ch, dp: false });
  }
  while (cells.length < CELLS) cells.unshift({ ch: ' ', dp: false });
  return cells.slice(-CELLS);
}

/** Short readable number for the tape and the AOS view (not the LED). */
export function plain(v) {
  v = D(v);
  if (v.isZero()) return '0';
  const e = v.exponent();
  if (e >= 10 || e < -6) {
    const m = roundTo(v, 8);
    const digits = (m.c < 0n ? -m.c : m.c).toString();
    const mant = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits;
    return `${m.isNeg() ? '−' : ''}${mant}·10^${e}`;
  }
  return roundTo(v, 10).toString().replace('-', '−');
}
