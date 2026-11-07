// Bilingual UI texts (Deutsch / English).

const RANK_DE = { 1: 'Strich', 2: 'Punkt', 3: 'Potenz' };
const RANK_EN = { 1: 'add/sub', 2: 'mul/div', 3: 'power' };
const OPNAME_DE = { '+': 'Plus', '-': 'Minus', '*': 'Mal', '/': 'Geteilt', '^': 'Hoch', root: 'Wurzel' };
const OPNAME_EN = { '+': 'plus', '-': 'minus', '*': 'times', '/': 'divided by', '^': 'to the power', root: 'root' };

const de = {
  'app.title': 'Wie versteht ein Rechner Punkt vor Strich?',
  'app.subtitle': 'Eine Lernumgebung am Beispiel des TI-30 (1976)',
  'app.doctitle': 'TI-30 · Punkt vor Strich',
  'install': 'Installieren',
  'settings.early': 'Frühe Serie 1976',
  'settings.early.title': 'Die ersten TI-30 hatten einen Fehler: 0 INV TAN rechnet endlos. Nur OFF hilft.',
  'status.inv': 'INV',
  'status.k': 'K',
  'status.sci': 'EE',
  'status.mem': 'Speicher',
  'status.note': 'Diese Leiste ist eine Lernhilfe. Der echte TI-30 zeigt nur die 8 Ziffern.',
  'status.hang': 'Der Rechner hängt in einer Endlosschleife. Nur OFF hilft.',
  'status.sleep': 'Anzeige schläft (Batterie sparen). Jede Taste weckt sie.',
  'mode.deg': 'DEG',
  'mode.rad': 'RAD',
  'mode.grad': 'GRAD',
  'panel.title': 'Was wartet gerade?',
  'panel.intro': 'Der TI-30 liest eine Rechnung von links nach rechts, genau so, wie du sie tippst. Kommt nach 2 + 3 noch ein ×, darf er das + noch nicht ausrechnen: Die 3 gehört vielleicht zum ×. Also legt er „2 +“ beiseite. Hier siehst du, was beiseiteliegt.',
  'panel.tape': 'Rechnung',
  'panel.tape.empty': 'Tippe eine Rechnung, zum Beispiel 2 + 3 × 4 =',
  'panel.pending': 'Wartende Rechnungen',
  'panel.pending.count': '{n} von 4 Plätzen belegt',
  'panel.slot.free': 'frei',
  'panel.paren': 'Klammer',
  'panel.parens': 'Offene Klammern: {n} von 15',
  'panel.display': 'Anzeige',
  'panel.story': 'Was ist passiert?',
  'panel.story.empty': 'Sobald du eine Rechentaste drückst, steht hier, was der Rechner damit macht.',
  'panel.examples': 'Ausprobieren',
  'panel.history': 'Vorher',
  'ex.prec': '2 + 3 × 4 =',
  'ex.paren': '( 2 + 3 ) × 4 =',
  'ex.pow': '1 + 2 × 3 yˣ 2 =',
  'ex.full': '5 wartende → Error',
  'ex.left': '10 − 4 − 3 =',
  'rank': 'Rang',
  'rank.1': 'Strich',
  'rank.2': 'Punkt',
  'rank.3': 'Potenz',
  'err.pending': 'Kein Platz mehr: Der TI-30 kann nur 4 Rechnungen gleichzeitig warten lassen.',
  'err.paren': 'Mehr als 15 offene Klammern passen nicht in den Speicher.',
  'err.div0': 'Durch 0 kann man nicht teilen.',
  'err.domain': 'Diese Funktion ist für diese Zahl nicht definiert.',
  'err.overflow': 'Das Ergebnis ist größer als 9,9999 × 10⁹⁹.',
  'err.underflow': 'Das Ergebnis ist kleiner als 10⁻⁹⁹.',
  'err.clear': 'Mit ON/C geht es weiter.',
  footer: 'Verhaltenstreue Simulation: Der TI-30 rechnet hier wie das Original, aber nicht mit dessen ROM-Programm. Keine Verbindung zu Texas Instruments.',
  msg: {
    wait: ({ op, a, under }) => under
      ? `${OPNAME_DE[op]} (${RANK_DE[rank(op)]}) bindet stärker als das wartende ${sym(under)}. Also kommt „${a} ${sym(op)}“ oben auf den Stapel und wartet auch.`
      : `„${a} ${sym(op)}“ wartet auf die zweite Zahl. Noch weiß der Rechner nicht, ob danach etwas Stärkeres kommt.`,
    reduce: ({ a, op, b, r, reason }) => ({
      prec: `Jetzt kommt eine schwächere Rechenart. ${sym(op)} hat Vorrang und wird zuerst gerechnet: ${a} ${sym(op)} ${b} = ${r}.`,
      left: `Gleich starke Rechenarten gehen von links nach rechts: ${a} ${sym(op)} ${b} = ${r}.`,
      paren: `Die Klammer schließt: ${a} ${sym(op)} ${b} = ${r}.`,
      equals: `= rechnet alles fertig, was noch wartet: ${a} ${sym(op)} ${b} = ${r}.`,
    })[reason],
    replace: ({ from, to }) => `Zwei Rechentasten hintereinander: ${sym(to)} ersetzt ${sym(from)}.`,
    open: ({ depth }) => `Klammer auf (Ebene ${depth}). Was jetzt kommt, wird für sich gerechnet. Alles darunter wartet.`,
    close: ({ r }) => `Klammer zu. Ihr Inhalt ist jetzt eine einzige Zahl: ${r}.`,
    equals: ({ r }) => `Ergebnis: ${r}.`,
  },
};

const en = {
  'app.title': 'How does a calculator know “multiply before add”?',
  'app.subtitle': 'A learning lab built around the TI-30 (1976)',
  'app.doctitle': 'TI-30 · Order of operations',
  'install': 'Install',
  'settings.early': 'Early 1976 series',
  'settings.early.title': 'The first TI-30 units had a bug: 0 INV TAN loops forever. Only OFF helps.',
  'status.inv': 'INV',
  'status.k': 'K',
  'status.sci': 'EE',
  'status.mem': 'Memory',
  'status.note': 'This bar is a learning aid. The real TI-30 only shows its 8 digits.',
  'status.hang': 'The calculator is stuck in an endless loop. Only OFF helps.',
  'status.sleep': 'Display asleep to save the battery. Any key wakes it up.',
  'mode.deg': 'DEG',
  'mode.rad': 'RAD',
  'mode.grad': 'GRAD',
  'panel.title': 'What is waiting right now?',
  'panel.intro': 'The TI-30 reads a calculation from left to right, exactly as you type it. If a × follows 2 + 3, it must not work out the + yet: the 3 may belong to the ×. So it puts “2 +” aside. This panel shows what has been put aside.',
  'panel.tape': 'Calculation',
  'panel.tape.empty': 'Type a calculation, for example 2 + 3 × 4 =',
  'panel.pending': 'Pending operations',
  'panel.pending.count': '{n} of 4 slots in use',
  'panel.slot.free': 'free',
  'panel.paren': 'parenthesis',
  'panel.parens': 'Open parentheses: {n} of 15',
  'panel.display': 'Display',
  'panel.story': 'What happened?',
  'panel.story.empty': 'As soon as you press an operation key, this explains what the calculator does with it.',
  'panel.examples': 'Try it',
  'panel.history': 'Earlier',
  'ex.prec': '2 + 3 × 4 =',
  'ex.paren': '( 2 + 3 ) × 4 =',
  'ex.pow': '1 + 2 × 3 yˣ 2 =',
  'ex.full': '5 pending → Error',
  'ex.left': '10 − 4 − 3 =',
  'rank': 'rank',
  'rank.1': 'add/sub',
  'rank.2': 'mul/div',
  'rank.3': 'power',
  'err.pending': 'No room left: the TI-30 can keep only 4 operations waiting.',
  'err.paren': 'More than 15 open parentheses do not fit into memory.',
  'err.div0': 'You cannot divide by 0.',
  'err.domain': 'This function is not defined for this number.',
  'err.overflow': 'The result is larger than 9.9999 × 10⁹⁹.',
  'err.underflow': 'The result is smaller than 10⁻⁹⁹.',
  'err.clear': 'Press ON/C to continue.',
  footer: 'Behaviour-faithful simulation: the TI-30 calculates like the original here, but does not run its ROM program. Not affiliated with Texas Instruments.',
  msg: {
    wait: ({ op, a, under }) => under
      ? `${cap(OPNAME_EN[op])} (${RANK_EN[rank(op)]}) binds more strongly than the waiting ${sym(under)}. So “${a} ${sym(op)}” goes on top of the stack and waits too.`
      : `“${a} ${sym(op)}” waits for its second number. The calculator cannot know yet whether something stronger follows.`,
    reduce: ({ a, op, b, r, reason }) => ({
      prec: `A weaker operation arrives. ${sym(op)} has priority and is worked out first: ${a} ${sym(op)} ${b} = ${r}.`,
      left: `Operations of equal rank go from left to right: ${a} ${sym(op)} ${b} = ${r}.`,
      paren: `The parenthesis closes: ${a} ${sym(op)} ${b} = ${r}.`,
      equals: `= finishes everything still waiting: ${a} ${sym(op)} ${b} = ${r}.`,
    })[reason],
    replace: ({ from, to }) => `Two operation keys in a row: ${sym(to)} replaces ${sym(from)}.`,
    open: ({ depth }) => `Parenthesis open (level ${depth}). What follows is worked out on its own. Everything below waits.`,
    close: ({ r }) => `Parenthesis closed. Its content is now a single number: ${r}.`,
    equals: ({ r }) => `Result: ${r}.`,
  },
};

const RANKS = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3, root: 3 };
const SYMS = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': 'yˣ', root: 'ˣ√y' };
function rank(op) { return RANKS[op]; }
function sym(op) { return SYMS[op] ?? op; }
function cap(s) { return s[0].toUpperCase() + s.slice(1); }
export { rank, sym };

const DICTS = { de, en };
let lang = 'de';
const listeners = new Set();

export function detectLang(saved) {
  if (saved === 'de' || saved === 'en') return saved;
  return (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
}

export function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  document.title = t('app.doctitle');
  listeners.forEach((f) => f(l));
}

export const getLang = () => lang;
export const onLang = (f) => listeners.add(f);

export function t(key, params) {
  let s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
  return s;
}

/** Translate an AOS event; numbers are already formatted strings. */
export function tm(kind, params) {
  const m = DICTS[lang].msg[kind] ?? DICTS.en.msg[kind];
  return m ? m(params) : kind;
}

export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
}
