import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TI30 } from '../js/calc/ti30.js';

/** Type a key sequence: "2 + 3 * 4 =" – tokens separated by spaces, digits may be grouped. */
function run(seq, calc = new TI30()) {
  for (const tok of seq.trim().split(/\s+/)) {
    if (/^[\d.]+$/.test(tok)) for (const ch of tok) calc.press(ch);
    else calc.press(tok);
  }
  return calc;
}
const show = (seq, calc) => run(seq, calc).displayString();

test('Punkt vor Strich', () => {
  assert.equal(show('2 + 3 * 4 ='), '14.');
  assert.equal(show('2 * 3 + 4 ='), '10.');
  assert.equal(show('1 + 2 * 3 ^ 2 ='), '19.');
  assert.equal(show('10 - 4 - 3 ='), '3.'); // left to right
  assert.equal(show('2 ^ 3 ^ 2 ='), '64.'); // left to right as well (reconstructed)
});

test('intermediate results appear as soon as they are known', () => {
  const c = run('2 * 3 +');
  assert.equal(c.displayString(), '6.');
  const d = run('2 + 3 *');
  assert.equal(d.displayString(), '3.'); // the + still waits
  assert.equal(d.pending, 2);
});

test('parentheses and = closes everything', () => {
  assert.equal(show('( 2 + 3 ) * 4 ='), '20.');
  assert.equal(show('2 * ( 3 + 4 * ( 1 + 1 ='), '22.');
  const c = run('( ( 1 + 2');
  assert.equal(c.depth, 2);
});

test('4 pending operations, the 5th is an error', () => {
  const c = run('1 + 2 * 3 ^ ( 4 +');
  assert.equal(c.pending, 4);
  assert.equal(c.error, null);
  run('( 5 *', c);
  assert.equal(c.displayString(), 'Error');
  assert.equal(c.error, 'pending');
  run('on', c);
  assert.equal(c.displayString(), '0.');
});

test('15 parentheses', () => {
  const c = run(Array(15).fill('(').join(' '));
  assert.equal(c.depth, 15);
  run('(', c);
  assert.equal(c.error, 'paren');
});

test('two operation keys in a row: the second one counts', () => {
  assert.equal(show('6 * + 2 ='), '8.');
  assert.equal(show('1 + 2 * - 3 ='), '0.');
});

test('functions act immediately on the display', () => {
  assert.equal(show('30 sin'), '0.5');
  assert.equal(show('3 + 30 sin ='), '3.5');
  assert.equal(show('0.5 inv sin'), '30.');
  assert.equal(show('2 inv ln'), '7.3890561');
  assert.equal(show('2 sqrt'), '1.4142136');
  assert.equal(show('8 inv ^ 3 ='), '2.');
  // π has 11 digits, so sin π in radians is not quite 0
  assert.equal(show('drg pi sin'), '-1.0207-11');
  assert.equal(show('pi / 10 ='), '.31415927');
});

test('errors', () => {
  assert.equal(show('1 / 0 ='), 'Error');
  assert.equal(show('2 inv sin'), 'Error');
  const c = run('1 / 0 = 5 +');
  assert.equal(c.displayString(), 'Error'); // keys are ignored until cleared
});

test('ON/C: first CE, then C – memory stays', () => {
  const c = run('7 sto 2 + 3 on');
  assert.equal(c.displayString(), '0.');
  assert.equal(c.pending, 1);
  run('4 =', c);
  assert.equal(c.displayString(), '6.');
  run('2 + 3 on on', c);
  assert.equal(c.pending, 0);
  run('rcl', c);
  assert.equal(c.displayString(), '7.');
});

test('memory: STO RCL SUM INV SUM EXC', () => {
  const c = run('5 sto 3 sum rcl');
  assert.equal(c.displayString(), '8.');
  run('2 inv sum rcl', c);
  assert.equal(c.displayString(), '6.');
  run('9 exc', c);
  assert.equal(c.displayString(), '6.');
  run('rcl', c);
  assert.equal(c.displayString(), '9.');
});

test('OFF loses everything', () => {
  const c = run('5 sto off on rcl');
  assert.equal(c.displayString(), '0.');
});

test('scientific notation', () => {
  assert.equal(show('6.022 ee 23'), '6.022 23');
  assert.equal(show('1.5 ee 3 neg'), '1.5-03');
  assert.equal(show('1.5 ee 3 ='), '1500.');
  assert.equal(show('1.5 ee 3 = ee'), '1.5 03');
  assert.equal(show('1.5 ee 3 = ee inv ee'), '1500.');
  assert.equal(show('99999999 * 10 ='), '1. 09');
  assert.equal(show('1 ee 99 * 10 ='), 'Error');
});

test('entry: 8 digits, sign change', () => {
  assert.equal(show('123456789'), '12345678.');
  assert.equal(show('12 neg'), '-12.');
  assert.equal(show('12 = neg'), '-12.');
  assert.equal(show('.5'), '0.5');
});

test('percent and constant (reconstructed)', () => {
  assert.equal(show('200 + 5 pct ='), '210.');
  assert.equal(show('50 * 20 pct ='), '10.');
  const c = run('3 * 4 k =');
  assert.equal(c.displayString(), '12.');
  run('5 =', c);
  assert.equal(c.displayString(), '20.');
});

test('the 1976 bug: 0 INV TAN never comes back', () => {
  const c = run('0 inv tan');
  assert.equal(c.hang, true);
  run('on 5 +', c);
  assert.equal(c.hang, true); // even ON/C does not help
  run('off on', c);
  assert.equal(c.hang, false);
  const later = new TI30({ early: false });
  assert.equal(show('0 inv tan', later), '0.');
});

test('tape shows the formula as typed', () => {
  const c = run('2 + 3 * 4');
  assert.deepEqual(c.state().tape, ['2', '+', '3', '×', '4']);
  run('=', c);
  assert.equal(c.state().tape.join(' '), '2 + 3 × 4 = 14');
  run('+ 1 =', c);
  assert.equal(c.state().tape.join(' '), '14 + 1 = 15');
  const d = run('( 1 + 2 ) sq');
  assert.equal(d.state().tape.join(' '), '( 1 + 2 )²');
});
