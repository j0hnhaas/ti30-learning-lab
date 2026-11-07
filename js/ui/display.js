// 9-position red LED display with bubble lenses, drawn as SVG seven-segment digits.
// Unlike the HP-45, the TI-30 puts the decimal point inside a digit position.

import { toCells, CELLS } from '../calc/format.js';

const NS = 'http://www.w3.org/2000/svg';
const CW = 24; // cell width
const CH = 40; // cell height

// segments: a b c d e f g
const MAP = {
  0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg',
  6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '',
  E: 'adefg', r: 'eg', o: 'cdeg',
};
const SEGS = 'abcdefg';

function hseg(x1, x2, y, t) {
  const h = t / 2;
  return `${x1},${y} ${x1 + h},${y - h} ${x2 - h},${y - h} ${x2},${y} ${x2 - h},${y + h} ${x1 + h},${y + h}`;
}

function vseg(x, y1, y2, t) {
  const h = t / 2;
  return `${x},${y1} ${x + h},${y1 + h} ${x + h},${y2 - h} ${x},${y2} ${x - h},${y2 - h} ${x - h},${y1 + h}`;
}

function segmentPolys(ox) {
  const t = 3.2;
  const x0 = ox + 5;
  const y0 = 7;
  const w = 11;
  const h = 24;
  const m = y0 + h / 2;
  return {
    a: hseg(x0 + 1, x0 + w - 1, y0, t),
    g: hseg(x0 + 1, x0 + w - 1, m, t),
    d: hseg(x0 + 1, x0 + w - 1, y0 + h, t),
    f: vseg(x0, y0 + 1, m - 1, t),
    b: vseg(x0 + w, y0 + 1, m - 1, t),
    e: vseg(x0, m + 1, y0 + h - 1, t),
    c: vseg(x0 + w, m + 1, y0 + h - 1, t),
  };
}

export class LedDisplay {
  constructor(container) {
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${CELLS * CW + 6} ${CH}`);
    this.svg.setAttribute('class', 'led');
    this.svg.setAttribute('role', 'img');
    this.svg.innerHTML = `
      <defs>
        <filter id="ledglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.1" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="lens" cx="45%" cy="35%" r="65%">
          <stop offset="0" stop-color="#fff" stop-opacity=".18"/>
          <stop offset=".45" stop-color="#fff" stop-opacity=".03"/>
          <stop offset="1" stop-color="#000" stop-opacity=".4"/>
        </radialGradient>
      </defs>`;
    this.cells = [];
    for (let i = 0; i < CELLS; i++) {
      const ox = i * CW;
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('transform', 'skewX(-6) translate(5,0)');
      const segs = {};
      for (const [name, pts] of Object.entries(segmentPolys(ox))) {
        const p = document.createElementNS(NS, 'polygon');
        p.setAttribute('points', pts);
        p.setAttribute('class', 'seg');
        g.appendChild(p);
        segs[name] = p;
      }
      const dp = document.createElementNS(NS, 'circle');
      dp.setAttribute('cx', ox + 19.5);
      dp.setAttribute('cy', 31);
      dp.setAttribute('r', 1.9);
      dp.setAttribute('class', 'seg');
      g.appendChild(dp);
      segs.dp = dp;
      this.svg.appendChild(g);
      const lens = document.createElementNS(NS, 'ellipse');
      lens.setAttribute('cx', ox + CW / 2 + 3);
      lens.setAttribute('cy', CH / 2);
      lens.setAttribute('rx', CW / 2 - 1);
      lens.setAttribute('ry', CH / 2 - 2);
      lens.setAttribute('fill', 'url(#lens)');
      lens.setAttribute('class', 'lens');
      this.svg.appendChild(lens);
      this.cells.push(segs);
    }
    container.appendChild(this.svg);
    this.current = undefined;
    this.timer = null;
  }

  stopAnim() {
    clearInterval(this.timer);
    this.timer = null;
  }

  paint(cells) {
    cells.forEach((c, i) => {
      const segs = this.cells[i];
      const on = c.segs ?? MAP[c.ch] ?? '';
      for (const s of SEGS) segs[s].classList.toggle('on', on.includes(s));
      segs.dp.classList.toggle('on', !!c.dp);
    });
  }

  /** @param {string|null} text display string ('.' = point of the digit before), null = dark */
  show(text) {
    this.stopAnim();
    if (text === this.current) return;
    this.current = text;
    this.svg.setAttribute('aria-label', text ? text.trim() : '');
    if (text === 'Error') {
      this.paint(toCells('    Error'));
      return;
    }
    this.paint(text ? toCells(text) : Array.from({ length: CELLS }, () => ({ ch: ' ' })));
  }

  /**
   * Random segments while the chip is busy: collectors call it the TI-30's
   * "LED slide show" during trigonometry and logarithms.
   * @param {number|null} ms how long, or null for ever (the 0 INV TAN loop)
   */
  busy(ms, done) {
    this.stopAnim();
    this.current = undefined;
    const t0 = performance.now();
    const frame = () => {
      if (ms !== null && performance.now() - t0 >= ms) {
        this.stopAnim();
        done?.();
        return;
      }
      this.paint(this.cells.map(() => ({
        segs: SEGS.split('').filter(() => Math.random() < 0.3).join(''),
        dp: Math.random() < 0.08,
      })));
    };
    frame();
    this.timer = setInterval(frame, 45);
  }

  /** Battery saver: the display is off, only a decimal point travels across. */
  travel() {
    this.stopAnim();
    this.current = undefined;
    let pos = CELLS - 1;
    const frame = () => {
      this.paint(this.cells.map((_, i) => ({ ch: ' ', dp: i === pos })));
      pos = (pos + CELLS - 1) % CELLS;
    };
    frame();
    this.timer = setInterval(frame, 260);
  }
}
