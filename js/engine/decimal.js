// Decimal floating point with a fixed number of significant digits.
//
// The TI-30 keeps 11 digits internally (owner's manual 1976: "the calculator
// works with 11 digits"), shows 8 and rounds the display 5/4. A value is
// c × 10^q with a BigInt coefficient c of at most DIGITS digits.

export const DIGITS = 11;
export const EXP_MAX = 99; // |x| < 10^100, otherwise Error

const TEN = 10n;
const pow10 = (n) => TEN ** BigInt(n);
const absB = (b) => (b < 0n ? -b : b);
const ndig = (b) => (b === 0n ? 0 : absB(b).toString().length);

export class CalcError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason; // 'overflow' | 'underflow' | 'domain' | 'div0' | 'pending' | 'paren'
  }
}

/** Round the BigInt c (scaled by 10^q) to `sig` significant digits, 5/4 rounding. */
function roundSig(c, q, sig) {
  const n = ndig(c);
  if (n <= sig) return [c, q];
  const drop = n - sig;
  const d = pow10(drop);
  const neg = c < 0n;
  let a = absB(c);
  let r = a / d;
  if ((a % d) * 2n >= d) r += 1n; // 5/4 rounding: half away from zero
  if (ndig(r) > sig) {
    r /= TEN;
    q += 1;
  }
  return [neg ? -r : r, q + drop];
}

export class Dec {
  constructor(c, q = 0) {
    this.c = c;
    this.q = q;
  }

  /** Normalised value with DIGITS digits, trailing zeros removed. Checks the range. */
  static make(c, q, { check = true } = {}) {
    if (c === 0n) return ZERO;
    [c, q] = roundSig(c, q, DIGITS);
    while (c % TEN === 0n) {
      c /= TEN;
      q += 1;
    }
    const v = new Dec(c, q);
    if (check) {
      const e = v.exponent();
      if (e > EXP_MAX) throw new CalcError('overflow');
      if (e < -EXP_MAX) throw new CalcError('underflow');
    }
    return v;
  }

  static from(x) {
    if (x instanceof Dec) return x;
    if (typeof x === 'bigint') return Dec.make(x, 0);
    if (typeof x === 'number') return Dec.fromNumber(x);
    return Dec.parse(String(x));
  }

  /** "12.5", "-3e-7", ".5" */
  static parse(s) {
    const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(s.trim());
    if (!m || (m[2] === '' && (m[3] ?? '') === '')) throw new Error(`bad number: ${s}`);
    const frac = m[3] ?? '';
    let c = BigInt((m[2] || '0') + frac);
    if (m[1] === '-') c = -c;
    return Dec.make(c, Number(m[4] ?? 0) - frac.length);
  }

  /** From a JS double (results of transcendental functions), rounded to DIGITS. */
  static fromNumber(x) {
    if (!Number.isFinite(x)) throw new CalcError(Number.isNaN(x) ? 'domain' : 'overflow');
    if (x === 0) return ZERO;
    // 17 significant digits represent the double exactly enough; then round once to DIGITS
    return Dec.parse(x.toExponential(16));
  }

  isZero() { return this.c === 0n; }
  isNeg() { return this.c < 0n; }
  sign() { return this.c === 0n ? 0 : this.c < 0n ? -1 : 1; }

  /** Decimal exponent of the leading digit: 123 → 2, 0.05 → -2 */
  exponent() { return this.c === 0n ? 0 : this.q + ndig(this.c) - 1; }

  neg() { return new Dec(-this.c, this.q); }
  abs() { return this.c < 0n ? this.neg() : this; }

  toNumber() { return Number(`${this.c}e${this.q}`); }

  isInteger() { return this.q >= 0 || this.c % pow10(-this.q) === 0n; }

  /** Exact digits as a plain string, for tests and the lab. */
  toString() {
    if (this.c === 0n) return '0';
    const neg = this.c < 0n;
    let s = absB(this.c).toString();
    if (this.q >= 0) s += '0'.repeat(this.q);
    else {
      const k = -this.q;
      if (s.length <= k) s = '0'.repeat(k - s.length + 1) + s;
      s = `${s.slice(0, s.length - k)}.${s.slice(s.length - k)}`;
    }
    return (neg ? '-' : '') + s;
  }

  cmp(o) {
    const d = sub(this, o, { exact: true });
    return d.sign();
  }
}

export const ZERO = new Dec(0n, 0);
export const ONE = new Dec(1n, 0);
export const D = (x) => Dec.from(x);

function align(a, b) {
  const q = Math.min(a.q, b.q);
  return [a.c * pow10(a.q - q), b.c * pow10(b.q - q), q];
}

export function add(a, b) {
  a = D(a);
  b = D(b);
  if (a.isZero()) return b;
  if (b.isZero()) return a;
  // a much smaller summand cannot change the 11 digits: skip the huge alignment
  if (a.exponent() - b.exponent() > DIGITS + 2) return a;
  if (b.exponent() - a.exponent() > DIGITS + 2) return b;
  const [x, y, q] = align(a, b);
  return Dec.make(x + y, q);
}

export function sub(a, b, { exact = false } = {}) {
  a = D(a);
  b = D(b);
  if (exact) {
    const [x, y, q] = align(a, b);
    return new Dec(x - y, q);
  }
  return add(a, b.neg());
}

export function mul(a, b) {
  a = D(a);
  b = D(b);
  return Dec.make(a.c * b.c, a.q + b.q);
}

export function div(a, b) {
  a = D(a);
  b = D(b);
  if (b.isZero()) throw new CalcError('div0');
  if (a.isZero()) return ZERO;
  // scale the dividend so the quotient has DIGITS + 2 digits, then round once
  const shift = DIGITS + 2 - (ndig(a.c) - ndig(b.c));
  const num = shift > 0 ? a.c * pow10(shift) : a.c / pow10(-shift);
  let qt = num / b.c;
  const rem = num % b.c;
  // sticky digit, so that the 5/4 rounding sees an inexact tail
  const s = (num < 0n) !== (b.c < 0n) ? -1n : 1n;
  qt = qt * TEN + (rem === 0n ? 0n : s);
  return Dec.make(qt, a.q - b.q - shift - 1);
}

/** Round to `sig` significant digits (display). Range is not checked. */
export function roundTo(a, sig) {
  a = D(a);
  if (a.isZero()) return ZERO;
  const [c, q] = roundSig(a.c, a.q, sig);
  return new Dec(c, q);
}

/** Round to `dec` places after the point, 5/4. */
export function roundPlaces(a, dec) {
  a = D(a);
  if (a.isZero() || a.q >= -dec) return a;
  const drop = -dec - a.q;
  const d = pow10(drop);
  const neg = a.c < 0n;
  const x = absB(a.c);
  let r = x / d;
  if ((x % d) * 2n >= d) r += 1n;
  return new Dec(neg ? -r : r, -dec);
}
