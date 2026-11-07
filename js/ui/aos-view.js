// The learning panel: the formula as typed, the pending operations the TI-30
// keeps aside, and a sentence for every step of "Punkt vor Strich".

import { t, tm, rank, sym, onLang } from '../i18n.js';
import { plain } from '../calc/format.js';
import { MAX_PENDING, MAX_PARENS } from '../calc/aos.js';

export const EXAMPLES = [
  { id: 'prec', keys: '2 + 3 * 4 =' },
  { id: 'paren', keys: 'on on ( 2 + 3 ) * 4 =' },
  { id: 'left', keys: '10 - 4 - 3 =' },
  { id: 'pow', keys: '1 + 2 * 3 ^ 2 =' },
  { id: 'full', keys: '1 + 2 * 3 ^ ( 4 + ( 5 *' },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class AosView {
  constructor(root, { onExample }) {
    this.root = root;
    this.onExample = onExample;
    this.story = [];
    this.last = null;
    root.innerHTML = `
      <h2 data-i18n="panel.title"></h2>
      <p class="intro" data-i18n="panel.intro"></p>
      <div class="examples"><span class="lbl" data-i18n="panel.examples"></span></div>
      <section class="box tape-box">
        <h3 data-i18n="panel.tape"></h3>
        <div class="tape" aria-live="polite"></div>
        <ol class="history"></ol>
      </section>
      <section class="box stack-box">
        <h3><span data-i18n="panel.pending"></span> <span class="meter pend-meter"></span></h3>
        <div class="stack"></div>
        <div class="xreg"><span data-i18n="panel.display"></span> <b class="xval"></b></div>
        <div class="parens"></div>
      </section>
      <section class="box story-box">
        <h3 data-i18n="panel.story"></h3>
        <ol class="story" aria-live="polite"></ol>
      </section>`;
    const ex = root.querySelector('.examples');
    for (const e of EXAMPLES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill';
      b.dataset.i18n = `ex.${e.id}`;
      b.addEventListener('click', () => this.onExample(e));
      ex.appendChild(b);
    }
    this.el = {
      tape: root.querySelector('.tape'),
      history: root.querySelector('.history'),
      stack: root.querySelector('.stack'),
      meter: root.querySelector('.pend-meter'),
      xval: root.querySelector('.xval'),
      parens: root.querySelector('.parens'),
      story: root.querySelector('.story'),
    };
    onLang(() => this.last && this.render(this.last.state, null));
  }

  /** Turn AOS events into stored story lines (numbers formatted once). */
  addEvents(events) {
    if (!events?.length) return;
    this.story = events.map((e) => {
      const p = { ...e };
      for (const k of ['a', 'b', 'r']) if (p[k] !== undefined) p[k] = plain(p[k]);
      return p;
    });
  }

  clearStory() {
    this.story = [];
  }

  render(state, events) {
    this.addEvents(events);
    this.last = { state };
    const { el } = this;

    // the formula as typed
    if (state.tape.length) {
      el.tape.innerHTML = state.tape.map((tok) => {
        const cls = /^[+−×÷^√]$/.test(tok) ? 'tok op' : /^[()]$/.test(tok) ? 'tok par' : tok === '=' ? 'tok eq' : 'tok';
        return `<span class="${cls}">${esc(tok)}</span>`;
      }).join(' ');
    } else el.tape.innerHTML = `<span class="hint">${esc(t('panel.tape.empty'))}</span>`;
    el.history.innerHTML = state.history.slice(-3).reverse().map((h) => `<li>${esc(h)}</li>`).join('');

    // pending operations, top of the stack first
    const rows = [];
    let level = 0;
    for (const e of state.stack) {
      if (e.type === '(') {
        level++;
        rows.push(`<div class="slot paren" style="--lvl:${level}">( <small>${esc(t('panel.paren'))} ${level}</small></div>`);
      } else {
        const r = rank(e.op);
        rows.push(`<div class="slot op r${r}" style="--lvl:${level}"><b>${esc(plain(e.a))} ${esc(sym(e.op))}</b> <span class="dots">…</span><span class="rank">${esc(t(`rank.${r}`))}</span></div>`);
      }
    }
    const free = Math.max(0, MAX_PENDING - state.pending);
    for (let i = 0; i < free; i++) rows.push(`<div class="slot free">${esc(t('panel.slot.free'))}</div>`);
    el.stack.innerHTML = rows.reverse().join('') || '';
    el.meter.textContent = t('panel.pending.count', { n: state.pending });
    el.meter.classList.toggle('full', state.pending >= MAX_PENDING);
    el.xval.textContent = state.error ? 'Error' : plain(state.x);
    el.parens.textContent = t('panel.parens', { n: state.depth });
    el.parens.classList.toggle('hidden', state.depth === 0 && !state.stack.some((e) => e.type === '('));
    el.parens.dataset.max = MAX_PARENS;

    // the story
    const lines = this.story.map((e) => `<li class="ev ${e.kind}">${esc(tm(e.kind, e))}</li>`);
    if (state.error) {
      lines.push(`<li class="ev err">${esc(t(`err.${state.error}`))} ${esc(t('err.clear'))}</li>`);
    }
    el.story.innerHTML = lines.join('') || `<li class="hint">${esc(t('panel.story.empty'))}</li>`;
  }
}
