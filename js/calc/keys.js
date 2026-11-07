// TI-30 keyboard: 8 rows × 5 columns, 40 keys.
// Matrix taken from the keypad wiring of an original TI-30 LED
// (github.com/Andy4495/TI-30-Keypad-Interface). The legends are printed on
// the key plate above the keys; blue legends work together with INV.

export const LAYOUT = [
  [
    { id: 'recip', label: '1/x', kbd: '' },
    { id: 'sq', label: 'x²', kbd: 'q' },
    { id: 'sqrt', label: '√x', kbd: 'r' },
    { id: 'off', label: 'OFF', kind: 'power' },
    { id: 'on', label: 'ON/C', kind: 'power', kbd: 'Escape' },
  ],
  [
    { id: 'inv', label: 'INV', inv: true, kbd: 'i' },
    { id: 'sin', label: 'sin', inv: 'sin⁻¹', kbd: 's' },
    { id: 'cos', label: 'cos', inv: 'cos⁻¹', kbd: 'c' },
    { id: 'tan', label: 'tan', inv: 'tan⁻¹', kbd: 't' },
    { id: 'drg', label: 'DRG', kbd: 'd' },
  ],
  [
    { id: 'k', label: 'K', kbd: 'k' },
    { id: 'ee', label: 'EE', inv: 'EE ✕', kbd: 'e' },
    { id: 'log', label: 'log', inv: '10ˣ', kbd: 'g' },
    { id: 'ln', label: 'lnx', inv: 'eˣ', kbd: 'l' },
    { id: '^', label: 'yˣ', inv: 'ˣ√y', kbd: '^' },
  ],
  [
    { id: 'pi', label: 'π', kbd: 'p' },
    { id: 'pct', label: '%', kbd: '%' },
    { id: '(', label: '(', kbd: '(' },
    { id: ')', label: ')', kbd: ')' },
    { id: '/', label: '÷', kind: 'op', kbd: '/' },
  ],
  [
    { id: 'sto', label: 'STO', kind: 'mem', kbd: 'm' },
    { id: '7', label: '7', kind: 'digit' },
    { id: '8', label: '8', kind: 'digit' },
    { id: '9', label: '9', kind: 'digit' },
    { id: '*', label: '×', kind: 'op', kbd: '*' },
  ],
  [
    { id: 'rcl', label: 'RCL', kind: 'mem', kbd: 'M' },
    { id: '4', label: '4', kind: 'digit' },
    { id: '5', label: '5', kind: 'digit' },
    { id: '6', label: '6', kind: 'digit' },
    { id: '-', label: '−', kind: 'op', kbd: '-' },
  ],
  [
    { id: 'sum', label: 'SUM', kind: 'mem', inv: 'SUM −' },
    { id: '1', label: '1', kind: 'digit' },
    { id: '2', label: '2', kind: 'digit' },
    { id: '3', label: '3', kind: 'digit' },
    { id: '+', label: '+', kind: 'op', kbd: '+' },
  ],
  [
    { id: 'exc', label: 'EXC', kind: 'mem', kbd: 'x' },
    { id: '0', label: '0', kind: 'digit' },
    { id: '.', label: '•', kind: 'digit', kbd: '.' },
    { id: 'neg', label: '+/-', kind: 'digit', kbd: 'n' },
    { id: '=', label: '=', kind: 'op', kbd: 'Enter' },
  ],
];

/** PC keyboard → key id */
export const KBD = {};
for (const row of LAYOUT) {
  for (const k of row) {
    if (k.kind === 'digit' && /^\d$/.test(k.id)) KBD[k.id] = k.id;
    if (k.kbd) KBD[k.kbd] = k.id;
  }
}
Object.assign(KBD, { ',': '.', '=': '=', Backspace: 'on', Delete: 'on' });
