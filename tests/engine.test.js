import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, add, sub, mul, div, roundPlaces, CalcError, DIGITS } from '../js/engine/decimal.js';
import * as fn from '../js/engine/functions.js';
import { formatValue, formatSci, formatEntry, toCells } from '../js/calc/format.js';

const s = (v) => v.toString();

test('11 internal digits, 5/4 rounding', () => {
  assert.equal(DIGITS, 11);
  assert.equal(s(div(1, 3)), '0.33333333333');
  assert.equal(s(div(2, 3)), '0.66666666667');
  assert.equal(s(add('0.1', '0.2')), '0.3');
  assert.equal(s(mul('12345678901', 10)), '123456789010');
  assert.equal(s(sub(1, '1e-12')), '1'); // below the 11th digit
  assert.equal(s(div(-2, 3)), '-0.66666666667');
});

test('range: |x| < 10^100', () => {
  assert.throws(() => mul('1e60', '1e60'), CalcError);
  assert.throws(() => div(1, 0), (e) => e.reason === 'div0');
  assert.equal(s(mul('9.9999999999e98', 1)), '999999999990000000000000000000000000000000000000000000000000000000000000000000000000000000000000000');
});

test('exact angles in degrees and grads', () => {
  assert.equal(s(fn.sin(30)), '0.5');
  assert.equal(s(fn.cos(90)), '0');
  assert.equal(s(fn.sin(180)), '0');
  assert.equal(s(fn.sin(-90)), '-1');
  assert.equal(s(fn.tan(45)), '1');
  assert.equal(s(fn.sin(100, 'grad')), '1');
  assert.throws(() => fn.tan(90), CalcError);
  assert.equal(s(fn.asin(1)), '90');
  assert.equal(s(fn.atan(1, 'grad')), '50');
});

test('logarithms, powers and roots', () => {
  assert.equal(s(fn.log(1000)), '3');
  assert.equal(s(fn.tenPow(2)), '100');
  assert.equal(s(fn.exp(1)), '2.7182818285');
  assert.equal(s(fn.power(2, 10)), '1024');
  assert.equal(s(fn.root(8, 3)), '2');
  assert.throws(() => fn.ln(0), CalcError);
  assert.throws(() => fn.power(-2, 2), CalcError); // via logarithms
  assert.throws(() => fn.sqrt(-1), CalcError);
});

test('display: 8 digits, leading zero dropped when needed', () => {
  assert.equal(formatValue(div(fn.PI, 10)), '.31415927');
  assert.equal(formatValue(D('0.5')), '0.5');
  assert.equal(formatValue(D(5)), '5.');
  assert.equal(formatValue(div(2, 3)), '.66666667');
  assert.equal(formatValue(div(200, 3)), '66.666667');
  assert.equal(formatValue(D('12345678')), '12345678.');
  assert.equal(formatValue(D('123456789')), '1.2346 08');
  assert.equal(formatValue(D('-0.000012345')), '-.00001235');
  assert.equal(formatValue(D('1.5e-9')), '1.5-09');
  assert.equal(formatSci(D('-6.02214e23')), '-6.0221 23');
  assert.equal(formatValue(D(0)), '0.');
});

test('entry display', () => {
  assert.equal(formatEntry({ mant: '12', neg: false, exp: null }), '12.');
  assert.equal(formatEntry({ mant: '.5', neg: true, exp: null }), '-0.5');
  assert.equal(formatEntry({ mant: '6.0221409', neg: false, exp: '23', expNeg: false }), '6.0221 23');
  assert.equal(formatEntry({ mant: '3', neg: false, exp: '', expNeg: true }), '3.-00');
});

test('LED cells: the decimal point lives inside a digit', () => {
  const c = toCells('.31415927');
  assert.equal(c.length, 9);
  assert.deepEqual(c[0], { ch: ' ', dp: true });
  assert.equal(c.map((x) => x.ch).join(''), ' 31415927');
  assert.equal(toCells('-1.2346-07').map((x) => x.ch).join(''), '-12346-07');
  assert.equal(s(roundPlaces(D('0.125'), 2)), '0.13');
});
