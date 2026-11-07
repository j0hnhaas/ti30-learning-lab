// AOS – Algebraic Operating System: how the TI-30 understands "Punkt vor Strich".
//
// The calculator reads a formula from left to right, exactly as it is typed.
// An operation whose right operand might still belong to a stronger operation
// has to wait. The TI-30 has room for 4 such pending operations and 15 open
// parentheses (TI Learning Center leaflet CB-272, 1976).
//
// The stack holds entries { type: 'op', op, a } (left operand a waiting for its
// right operand) and { type: '(' }. Everything is reported as events, so the
// UI can tell the story step by step.

import { CalcError, add, sub, mul, div } from '../engine/decimal.js';
import { power, root } from '../engine/functions.js';

export const MAX_PENDING = 4;
export const MAX_PARENS = 15;

/** Ranks: 1 = "Strich" (+ −), 2 = "Punkt" (× ÷), 3 = powers and roots */
export const OPS = {
  '+': { prec: 1, sym: '+', fn: add },
  '-': { prec: 1, sym: '−', fn: (a, b) => sub(a, b) },
  '*': { prec: 2, sym: '×', fn: mul },
  '/': { prec: 2, sym: '÷', fn: div },
  '^': { prec: 3, sym: '^', fn: power },
  root: { prec: 3, sym: '√', fn: root },
};

export function applyOp(a, op, b) {
  return OPS[op].fn(a, b);
}

export class AOS {
  constructor() {
    this.reset();
  }

  reset() {
    this.stack = [];
    this.events = [];
  }

  get pending() {
    return this.stack.filter((e) => e.type === 'op').length;
  }

  get depth() {
    return this.stack.filter((e) => e.type === '(').length;
  }

  top() {
    return this.stack[this.stack.length - 1];
  }

  /** Top pending operation, if it is not hidden behind a parenthesis. */
  topOp() {
    const t = this.top();
    return t && t.type === 'op' ? t : null;
  }

  /** Clear the event list (the UI reads it after every key). */
  takeEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  /**
   * Work off all waiting operations with rank ≥ prec, down to the next "(".
   * Returns the new value of the display register.
   */
  reduce(x, prec, reason) {
    let t = this.topOp();
    while (t && OPS[t.op].prec >= prec) {
      this.stack.pop();
      const r = applyOp(t.a, t.op, x);
      this.events.push({ kind: 'reduce', a: t.a, op: t.op, b: x, r, reason });
      x = r;
      t = this.topOp();
    }
    return x;
  }

  /** A binary operation key with left operand x. Returns the value to display. */
  operator(op, x) {
    const prec = OPS[op].prec;
    const below = this.topOp();
    x = this.reduce(x, prec, below && OPS[below.op].prec > prec ? 'prec' : 'left');
    const waiting = this.topOp();
    if (this.pending >= MAX_PENDING) throw new CalcError('pending');
    this.stack.push({ type: 'op', op, a: x });
    this.events.push({ kind: 'wait', op, a: x, under: waiting ? waiting.op : null });
    return x;
  }

  /** The operation key was pressed right after another one: the new one wins. */
  replace(op) {
    const t = this.topOp();
    if (!t) return null;
    this.stack.pop();
    this.events.push({ kind: 'replace', from: t.op, to: op });
    return this.operator(op, t.a);
  }

  open() {
    if (this.depth >= MAX_PARENS) throw new CalcError('paren');
    this.stack.push({ type: '(' });
    this.events.push({ kind: 'open', depth: this.depth });
  }

  /** ")" – work off everything inside the innermost parenthesis. */
  close(x) {
    if (this.depth === 0) return x; // a ")" without "(" is ignored
    x = this.reduce(x, 0, 'paren');
    this.stack.pop();
    this.events.push({ kind: 'close', depth: this.depth, r: x });
    return x;
  }

  /** "=" closes all parentheses and completes every pending operation. */
  equals(x) {
    while (this.stack.length) {
      x = this.reduce(x, 0, 'equals');
      if (this.top()?.type === '(') this.stack.pop();
    }
    this.events.push({ kind: 'equals', r: x });
    return x;
  }

  snapshot() {
    return this.stack.map((e) => ({ ...e }));
  }
}
