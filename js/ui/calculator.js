// Builds the TI-30 body: display window, name plate and the 40-key plate.

import { LAYOUT } from '../calc/keys.js';
import { LedDisplay } from './display.js';

export function buildCalculator(root, { onKey }) {
  root.innerHTML = '';
  const calc = document.createElement('div');
  calc.className = 'calc';
  calc.innerHTML = `
    <div class="calc-head">
      <div class="window"><div class="window-glass"></div></div>
      <div class="nameplate"><span class="maker">TEXAS INSTRUMENTS</span><span class="model">TI-30</span></div>
    </div>
    <div class="keys" role="group" aria-label="TI-30"></div>`;
  root.appendChild(calc);
  const display = new LedDisplay(calc.querySelector('.window-glass'));
  const keysEl = calc.querySelector('.keys');
  const opZone = document.createElement('div');
  opZone.className = 'op-zone';
  keysEl.appendChild(opZone);

  const buttons = {};
  LAYOUT.forEach((row, r) => {
    row.forEach((k, c) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.gridRow = r + 1;
      cell.style.gridColumn = c + 1;
      const legend = document.createElement('span');
      legend.className = `legend${k.inv ? ' inv' : ''}`;
      legend.textContent = k.label;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `key ${k.kind ?? 'fn'}`;
      b.dataset.key = k.id;
      b.setAttribute('aria-label', k.label);
      if (typeof k.inv === 'string') b.title = `${k.label} · INV ${k.label}: ${k.inv}`;
      cell.append(legend, b);
      keysEl.appendChild(cell);
      buttons[k.id] = b;
    });
  });

  keysEl.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.key');
    if (!b) return;
    e.preventDefault();
    b.classList.add('down');
    onKey(b.dataset.key);
  });
  const up = () => keysEl.querySelectorAll('.key.down').forEach((b) => b.classList.remove('down'));
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  // keyboard access (Tab + Enter/Space) without pointer
  keysEl.addEventListener('click', (e) => {
    const b = e.target.closest('.key');
    if (b && e.detail === 0) onKey(b.dataset.key);
  });

  return {
    display,
    flash(id) {
      const b = buttons[id];
      if (!b) return;
      b.classList.add('down');
      setTimeout(() => b.classList.remove('down'), 120);
    },
  };
}
