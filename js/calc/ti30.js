// TI-30 (1976) – the calculator as a state machine: keys in, display out.
//
// Behaviour-faithful reconstruction from the owner's manual, the TI leaflet
// CB-272 and collectors' reports. Details that are not documented (marked
// "reconstructed") follow the usual behaviour of TI's AOS calculators of the
// time. See README, "Offene Fragen".

import { D, ZERO, CalcError, add, sub, mul, div } from '../engine/decimal.js';
import * as fn from '../engine/functions.js';
import { AOS, OPS } from './aos.js';
import { formatValue, formatEntry, plain } from './format.js';

export const MODES = fn.MODES;

/** functions that keep the chip busy long enough to see the LEDs flicker */
const SLOW = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'tenPow', 'exp']);

/** Key → tape label for unary functions; prefix functions wrap, suffixes follow. */
const UNARY = {
  sin: { pre: 'sin' }, cos: { pre: 'cos' }, tan: { pre: 'tan' },
  asin: { pre: 'sin⁻¹' }, acos: { pre: 'cos⁻¹' }, atan: { pre: 'tan⁻¹' },
  log: { pre: 'log' }, ln: { pre: 'ln' }, tenPow: { pre: '10^' }, exp: { pre: 'e^' },
  sqrt: { pre: '√' }, recip: { pre: '1/' }, sq: { post: '²' }, pct: { post: '%' }, neg: { pre: '−' },
};

export class TI30 {
  constructor({ early = true } = {}) {
    /** early production (1976): 0 INV TAN never finishes */
    this.early = early;
    this.aos = new AOS();
    this.powerOn();
  }

  // ------------------------------------------------------------ power
  powerOn() {
    this.on = true;
    this.mem = ZERO; // no continuous memory: OFF loses everything
    this.mode = 'deg';
    this.clearAll();
  }

  powerOff() {
    this.on = false;
    this.hang = false;
  }

  clearAll() {
    this.aos.reset();
    this.x = ZERO;
    this.entry = null;
    this.inv = false;
    this.sci = false;
    this.error = null;
    this.hang = false;
    this.k = null; // constant: { op, b }
    this.kArmed = false;
    this.lastKey = null;
    this.tape = [];
    this.cur = null; // tape text of the current operand, or null when it is already in the tape
    this.fresh = true;
    this.history = [];
    this.lastSlow = false;
  }

  // ------------------------------------------------------------ helpers
  get pending() { return this.aos.pending; }
  get depth() { return this.aos.depth; }

  value() {
    return this.entry ? this.entryValue() : this.x;
  }

  entryValue() {
    const e = this.entry;
    let m = e.mant || '0';
    if (m === '.') m = '0';
    const exp = e.exp ? Number(e.exp) * (e.expNeg ? -1 : 1) : 0;
    return D(`${e.neg ? '-' : ''}${m}e${exp}`);
  }

  /** End number entry: the typed digits become the value in the display register. */
  commit() {
    if (!this.entry) return;
    this.x = this.entryValue();
    this.entry = null;
    this.cur = plain(this.x);
  }

  startNumber() {
    if (this.fresh) this.newTape();
    this.entry = { mant: '', neg: false, exp: null, expNeg: false };
  }

  newTape() {
    if (this.tape.length) this.history.push(this.tape.join(' '));
    if (this.history.length > 6) this.history.shift();
    this.tape = [];
    this.fresh = false;
  }

  /** A value that replaces the operand (RCL, π). */
  setOperand(v, label) {
    if (this.fresh) this.newTape();
    this.entry = null;
    this.x = v;
    this.cur = label ?? plain(v);
  }

  // ------------------------------------------------------------ display
  displayString() {
    if (!this.on) return null;
    if (this.error) return 'Error';
    if (this.entry) return formatEntry(this.entry, this.sci);
    return formatValue(this.x, this.sci);
  }

  // ------------------------------------------------------------ keys
  /**
   * Press a key. Returns { events, slow } for the UI:
   * events from the AOS (what waited, what was computed), slow = a function
   * that keeps the TI-30 busy for a moment.
   */
  press(key) {
    if (key === 'off') {
      this.powerOff();
      return { events: [] };
    }
    if (!this.on) {
      if (key === 'on') this.powerOn();
      return { events: [] };
    }
    if (this.hang) return { events: [] }; // only OFF helps
    if (this.error) {
      if (key === 'on') this.clearAll();
      return { events: [] };
    }
    const inv = this.inv;
    if (key !== 'inv') this.inv = false;
    this.lastSlow = false;
    try {
      this.handle(key, inv);
    } catch (err) {
      if (!(err instanceof CalcError)) throw err;
      this.error = err.reason;
      this.aos.reset();
      this.entry = null;
    }
    if (key !== 'inv') this.lastKey = inv && key !== 'on' ? `inv-${key}` : key;
    return { events: this.aos.takeEvents(), slow: this.lastSlow };
  }

  handle(key, inv) {
    if (/^\d$/.test(key)) return this.digit(key);
    switch (key) {
      case '.': return this.point();
      case 'ee': return inv ? this.leaveSci() : this.ee();
      case 'neg': return this.changeSign();
      case 'inv': this.inv = !inv; return;
      case 'on': return this.clear();
      case '+': case '-': case '*': case '/': return this.binary(key);
      case '^': return this.binary(inv ? 'root' : '^');
      case '(': return this.open();
      case ')': return this.close();
      case '=': return this.equals();
      case 'k': return this.constant();
      case 'pi': return this.setOperand(fn.PI, 'π');
      case 'drg': this.mode = MODES[(MODES.indexOf(this.mode) + 1) % 3]; return;
      case 'sto': this.commit(); this.mem = this.x; return;
      case 'rcl': return this.setOperand(this.mem, 'M');
      case 'sum': this.commit(); this.mem = inv ? sub(this.mem, this.x) : add(this.mem, this.x); return;
      case 'exc': {
        this.commit();
        const m = this.mem;
        this.mem = this.x;
        return this.setOperand(m, 'M');
      }
      case 'pct': return this.percent();
      case 'sin': case 'cos': case 'tan': return this.unary(inv ? `a${key}` : key);
      case 'log': return this.unary(inv ? 'tenPow' : 'log');
      case 'ln': return this.unary(inv ? 'exp' : 'ln');
      case 'sqrt': case 'sq': case 'recip': return this.unary(key);
      default: return undefined;
    }
  }

  digit(d) {
    if (!this.entry) this.startNumber();
    const e = this.entry;
    if (e.exp !== null) {
      e.exp = (e.exp + d).slice(-2); // the exponent keeps the last two digits
      return;
    }
    const n = (e.mant.match(/\d/g) || []).length - (e.mant.startsWith('0.') ? 1 : 0);
    if (n >= 8) return; // 8 digits can be typed in
    if (e.mant === '0') e.mant = '';
    e.mant += d;
  }

  point() {
    if (!this.entry) this.startNumber();
    const e = this.entry;
    if (e.exp !== null || e.mant.includes('.')) return;
    e.mant = (e.mant || '0') + '.';
  }

  ee() {
    if (this.entry && this.entry.exp === null) {
      this.entry.exp = '';
      return;
    }
    // without a number being typed: just switch the display to scientific notation
    this.sci = true;
  }

  leaveSci() {
    this.commit();
    this.sci = false;
  }

  changeSign() {
    if (this.entry) {
      if (this.entry.exp !== null) this.entry.expNeg = !this.entry.expNeg;
      else this.entry.neg = !this.entry.neg;
      return;
    }
    this.applyUnary('neg', this.x.neg());
  }

  clear() {
    // first press clears the entry (CE), the second one everything (C). Memory stays.
    if (this.entry && this.lastKey !== 'on') {
      this.entry = null;
      this.x = ZERO;
      this.cur = null;
      return;
    }
    const { mem, mode, history, tape } = this;
    this.clearAll();
    this.mem = mem;
    this.mode = mode;
    this.history = history;
    if (tape.length) this.history.push(`${tape.join(' ')}  · C`);
  }

  // ------------------------------------------------------------ functions
  unary(name) {
    this.commit();
    const x = this.x;
    if (name === 'atan' && this.early && x.isZero()) {
      // early production: arctan of 0 loops forever (documented bug, c. 1976)
      this.hang = true;
      return;
    }
    let r;
    switch (name) {
      case 'sin': case 'cos': case 'tan': case 'asin': case 'acos': case 'atan':
        r = fn[name](x, this.mode); break;
      case 'log': r = fn.log(x); break;
      case 'ln': r = fn.ln(x); break;
      case 'tenPow': r = fn.tenPow(x); break;
      case 'exp': r = fn.exp(x); break;
      case 'sqrt': r = fn.sqrt(x); break;
      case 'sq': r = fn.square(x); break;
      case 'recip': r = fn.recip(x); break;
      default: return;
    }
    this.lastSlow = SLOW.has(name);
    this.applyUnary(name, r);
  }

  applyUnary(name, r) {
    const u = UNARY[name];
    let text = this.cur;
    if (text === null) {
      // the operand is a finished group in the tape: wrap it
      const t = this.tape;
      if (t[t.length - 1] === ')') {
        let depth = 0;
        let i = t.length - 1;
        for (; i >= 0; i--) {
          if (t[i] === ')') depth++;
          if (t[i] === '(') depth--;
          if (depth === 0) break;
        }
        const group = t.splice(i).join(' ');
        text = group;
      } else if (this.fresh && this.tape.length) {
        text = plain(this.x);
        this.newTape();
      } else text = plain(this.x);
    } else if (this.fresh) this.newTape();
    if (u.pre) text = `${u.pre}${/^[a-z]/.test(u.pre) ? ' ' : ''}${text}`;
    if (u.post) text = `${text}${u.post}`;
    this.cur = text;
    this.x = r;
  }

  percent() {
    // reconstructed: after + or − the percentage refers to the first number
    // (200 + 5 % = 210); otherwise % simply divides by 100
    this.commit();
    const t = this.aos.topOp();
    const p = div(this.x, D(100));
    this.applyUnary('pct', t && (t.op === '+' || t.op === '-') ? mul(t.a, p) : p);
  }

  // ------------------------------------------------------------ AOS
  pushOperandToTape() {
    if (this.fresh) {
      // continue with the last result
      this.newTape();
      if (this.cur === null) this.cur = plain(this.x);
    }
    if (this.cur !== null) this.tape.push(this.cur);
    this.cur = null;
  }

  binary(op) {
    const afterOp = this.lastKey in OPS || this.lastKey === 'inv-^';
    if (afterOp && !this.entry && this.aos.topOp()) {
      // two operation keys in a row: the second one replaces the first
      this.x = this.aos.replace(op);
      this.tape[this.tape.length - 1] = OPS[op].sym;
      return;
    }
    this.commit();
    this.pushOperandToTape();
    this.x = this.aos.operator(op, this.x);
    this.tape.push(OPS[op].sym);
    this.kArmed = false;
  }

  open() {
    if (this.fresh) this.newTape();
    if (this.entry) {
      // "2 ( 3": the TI-30 has no implied multiplication, the typed number is dropped
      this.entry = null;
    }
    this.cur = null;
    this.aos.open();
    this.tape.push('(');
  }

  close() {
    if (this.aos.depth === 0) return;
    this.commit();
    this.pushOperandToTape();
    this.x = this.aos.close(this.x);
    this.tape.push(')');
  }

  equals() {
    this.commit();
    if (this.kArmed && this.k && this.aos.stack.length === 0) {
      // constant: the stored operation is applied to the new number
      this.pushOperandToTape();
      this.tape.push(OPS[this.k.op].sym, `${plain(this.k.b)} (K)`);
      this.aos.operator(this.k.op, this.x);
      this.x = this.k.b;
    } else {
      this.pushOperandToTape();
    }
    this.x = this.aos.equals(this.x);
    this.tape.push('=', plain(this.x));
    this.cur = null;
    this.fresh = true;
    if (this.k) this.kArmed = true;
  }

  /** K: remember the last operation and its second number (reconstructed). */
  constant() {
    this.commit();
    const t = this.aos.topOp();
    if (!t) return;
    this.k = { op: t.op, b: this.x };
  }

  /** State for the learning panel. */
  state() {
    return {
      on: this.on,
      mode: this.mode,
      inv: this.inv,
      sci: this.sci,
      mem: this.mem,
      k: this.k,
      error: this.error,
      hang: this.hang,
      pending: this.pending,
      depth: this.depth,
      stack: this.aos.snapshot(),
      x: this.value(),
      typing: !!this.entry,
      tape: [...this.tape, ...(this.entry ? [plain(this.entryValue())] : this.cur !== null && !this.fresh ? [this.cur] : [])],
      history: this.history,
    };
  }
}
