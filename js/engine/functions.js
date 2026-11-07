// Scientific functions of the TI-30, on 11-digit decimals.
//
// Behaviour-faithful, not algorithm-faithful: the TMC0981 ROM is not public,
// so the values come from JavaScript's double arithmetic (≈ 16 digits) and are
// rounded to the 11 internal digits. Domains and errors follow the TI-30.

import { Dec, D, ZERO, ONE, CalcError, mul, sub, div } from './decimal.js';

export const MODES = ['deg', 'rad', 'grad'];
/** Full turn per angle mode; deg and grad are exact decimals */
const TURN = { deg: D(360), grad: D(400) };
const toRad = { deg: Math.PI / 180, rad: 1, grad: Math.PI / 200 };

/** π as the TI-30 holds it: 11 digits */
export const PI = D('3.1415926536');

const num = (x) => D(x).toNumber();
const out = (v) => Dec.fromNumber(v);

/**
 * Reduce an angle to one turn. For deg and grad this is exact in decimal,
 * so sin 180° is exactly 0 and cos 90° too.
 */
function reduce(x, mode) {
  x = D(x);
  if (mode === 'rad') {
    const r = num(x) % (2 * Math.PI);
    return { r: r < 0 ? r + 2 * Math.PI : r, q: null };
  }
  const F = TURN[mode];
  const n = Math.floor(num(x) / num(F));
  let r = sub(x, mul(D(n), F), { exact: true });
  if (r.isNeg()) r = sub(r, F.neg(), { exact: true });
  // quarter turns as exact multiples: 0, 90, 180, 270 (or 0, 100, 200, 300 grad)
  const quarter = num(F) / 4;
  const rn = num(r);
  const q = Number.isInteger(rn / quarter) ? (rn / quarter) % 4 : null;
  return { r: rn * toRad[mode], q };
}

const SIN_Q = [0, 1, 0, -1];

export function sin(x, mode = 'deg') {
  const { r, q } = reduce(x, mode);
  if (q !== null) return D(SIN_Q[q]);
  return out(Math.sin(r));
}

export function cos(x, mode = 'deg') {
  const { r, q } = reduce(x, mode);
  if (q !== null) return D(SIN_Q[(q + 1) % 4]);
  return out(Math.cos(r));
}

export function tan(x, mode = 'deg') {
  const { r, q } = reduce(x, mode);
  if (q === 1 || q === 3) throw new CalcError('domain'); // tan 90°
  if (q === 0 || q === 2) return ZERO;
  return out(Math.tan(r));
}

const fromRad = (v, mode) => out(v / toRad[mode]);

export function asin(x, mode = 'deg') {
  const v = num(x);
  if (Math.abs(v) > 1) throw new CalcError('domain');
  return fromRad(Math.asin(v), mode);
}

export function acos(x, mode = 'deg') {
  const v = num(x);
  if (Math.abs(v) > 1) throw new CalcError('domain');
  return fromRad(Math.acos(v), mode);
}

export function atan(x, mode = 'deg') {
  return fromRad(Math.atan(num(x)), mode);
}

export function log(x) {
  if (D(x).sign() <= 0) throw new CalcError('domain');
  return out(Math.log10(num(x)));
}

export function ln(x) {
  if (D(x).sign() <= 0) throw new CalcError('domain');
  return out(Math.log(num(x)));
}

export function tenPow(x) {
  x = D(x);
  if (x.isInteger() && Math.abs(num(x)) <= 99) return Dec.make(1n, num(x));
  return out(10 ** num(x));
}

export function exp(x) {
  return out(Math.exp(num(x)));
}

export function sqrt(x) {
  if (D(x).isNeg()) throw new CalcError('domain');
  return out(Math.sqrt(num(x)));
}

export function square(x) {
  return mul(x, x);
}

export function recip(x) {
  return div(ONE, x);
}

/** y^x. The TI-30 works via logarithms, so a negative base is an error. */
export function power(y, x) {
  y = D(y);
  x = D(x);
  if (y.isZero()) {
    if (x.sign() > 0) return ZERO;
    throw new CalcError('domain');
  }
  if (y.isNeg()) throw new CalcError('domain');
  if (x.isZero()) return ONE;
  if (x.isInteger() && Math.abs(num(x)) <= 64) {
    // exact for small integer exponents (2 yˣ 10 = 1024)
    let r = ONE;
    let b = y;
    let n = Math.abs(num(x));
    while (n > 0) {
      if (n & 1) r = mul(r, b);
      n >>= 1;
      if (n) b = mul(b, b);
    }
    return x.isNeg() ? div(ONE, r) : r;
  }
  return out(num(y) ** num(x));
}

/** x-th root of y (INV yˣ) */
export function root(y, x) {
  x = D(x);
  if (x.isZero()) throw new CalcError('domain');
  const y0 = D(y);
  if (y0.isZero()) return ZERO;
  if (y0.isNeg()) throw new CalcError('domain');
  const r = out(num(y0) ** (1 / num(x)));
  // snap to an exact integer root when it is one (8 INV yˣ 3 = 2)
  const n = Math.round(r.toNumber());
  if (n !== 0 && Number.isInteger(num(x)) && Math.abs(num(x)) <= 64) {
    const back = power(D(n), x);
    if (back.cmp(y0) === 0) return D(n);
  }
  return r;
}
