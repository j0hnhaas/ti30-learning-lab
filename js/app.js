// Wires calculator, learning panel, settings and PWA together.

import { TI30 } from './calc/ti30.js';
import { KBD } from './calc/keys.js';
import { buildCalculator } from './ui/calculator.js';
import { AosView } from './ui/aos-view.js';
import { t, setLang, detectLang, applyStatic, getLang, onLang } from './i18n.js';
import { plain } from './calc/format.js';

// ---------------------------------------------------------------- settings
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(`ti30.${k}`);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(`ti30.${k}`, JSON.stringify(v));
    } catch { /* storage unavailable */ }
  },
};

const calc = new TI30({ early: store.get('early', true) });
const ui = buildCalculator(document.getElementById('calc'), { onKey: (id) => handleKey(id) });
const view = new AosView(document.getElementById('panel'), { onExample: playExample });
const statusEl = document.getElementById('status');

// ---------------------------------------------------------------- display
const SLEEP_MS = 30000; // the TI-30 blanks its display after 25–50 s without a key
let busy = false;
let sleeping = false;
let sleepTimer = null;
const queue = [];

function armSleep() {
  clearTimeout(sleepTimer);
  sleeping = false;
  if (!calc.on || calc.hang) return;
  sleepTimer = setTimeout(() => {
    sleeping = true;
    ui.display.travel();
    renderStatus();
  }, SLEEP_MS);
}

function refresh(events) {
  if (calc.hang) ui.display.busy(null);
  else ui.display.show(calc.displayString());
  view.render(calc.state(), events);
  renderStatus();
}

function renderStatus() {
  const s = calc.state();
  if (!s.on) {
    statusEl.innerHTML = '';
    return;
  }
  const chip = (txt, on, cls = '') => `<span class="chip ${cls}${on ? ' on' : ''}">${txt}</span>`;
  const modes = ['deg', 'rad', 'grad'].map((m) => chip(t(`mode.${m}`), s.mode === m, 'mode')).join('');
  let note = t('status.note');
  if (s.hang) note = t('status.hang');
  else if (sleeping) note = t('status.sleep');
  statusEl.innerHTML = `
    <div class="chips">${modes}${chip(t('status.inv'), s.inv)}${chip(t('status.sci'), s.sci)}${chip(t('status.k'), !!s.k)}
      <span class="chip mem${s.mem.isZero() ? '' : ' on'}">${t('status.mem')}: ${plain(s.mem)}</span></div>
    <p class="note${s.hang ? ' warn' : ''}">${note}</p>`;
}

// ---------------------------------------------------------------- keys
function handleKey(id) {
  if (busy) {
    queue.push(id);
    return;
  }
  sleeping = false;
  const before = calc.state();
  const res = calc.press(id);
  const after = calc.state();
  if (id === 'on' && before.on && after.tape.length === 0) view.clearStory();
  else if (!res.events.length && after.tape.length <= 1 && !after.error) view.clearStory();
  armSleep();
  if (res.slow && !calc.hang) {
    busy = true;
    ui.display.busy(160 + Math.random() * 140, () => {
      busy = false;
      refresh(res.events);
      if (queue.length) handleKey(queue.shift());
    });
    view.render(after, res.events);
    return;
  }
  refresh(res.events);
}

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest('input, select, textarea')) return;
  const id = KBD[e.key];
  if (!id) return;
  e.preventDefault();
  ui.flash(id);
  handleKey(id);
});

// ---------------------------------------------------------------- examples
let playing = null;
function playExample(ex) {
  clearTimeout(playing);
  if (!calc.on) handleKey('on');
  const keys = ['on', 'on', ...ex.keys.split(/\s+/).flatMap((tok) => (/^\d+$/.test(tok) ? tok.split('') : [tok]))];
  let i = 0;
  const step = () => {
    if (i >= keys.length) return;
    const k = keys[i++];
    ui.flash(k);
    handleKey(k);
    playing = setTimeout(step, k === 'on' ? 120 : 520);
  };
  step();
}

// ---------------------------------------------------------------- settings UI
const langBtn = document.getElementById('btn-lang');
const earlyBox = document.getElementById('opt-early');
earlyBox.checked = calc.early;
earlyBox.addEventListener('change', () => {
  calc.early = earlyBox.checked;
  store.set('early', calc.early);
});

function applyLang() {
  applyStatic();
  langBtn.textContent = getLang() === 'de' ? 'EN' : 'DE';
  langBtn.title = getLang() === 'de' ? 'English' : 'Deutsch';
}
onLang(() => {
  applyLang();
  refresh(null);
});
langBtn.addEventListener('click', () => {
  const l = getLang() === 'de' ? 'en' : 'de';
  store.set('lang', l);
  setLang(l);
});
setLang(detectLang(store.get('lang', null)));
armSleep();

// ---------------------------------------------------------------- PWA
let installEvt = null;
const installBtn = document.getElementById('btn-install');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice;
  installEvt = null;
  installBtn.hidden = true;
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
}

// for the console: calc.press('2') …
window.ti30 = calc;
