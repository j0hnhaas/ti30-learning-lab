# ti30-learning-lab

**TI-30 (1976) simulation – and a look at how a calculator understands “multiply before add”.**
*Simulation des TI-30 (1976) – und ein Blick darauf, wie ein Rechner „Punkt vor Strich“ versteht.*

Schwesterprojekt von [hp45-cordic](https://github.com/j0hnhaas/hp45-cordic). Dort geht es darum, *wie* ein Rechner sin oder ln ausrechnet. Hier geht es darum, *in welcher Reihenfolge* er rechnet.

[Deutsch](#deutsch) · [English](#english)

---

## Deutsch

Der TI-30 kam 1976 für 24,95 $ auf den Markt und wurde mit rund 15 Millionen Stück wohl der meistverkaufte Taschenrechner überhaupt. Mit ihm kam das **AOS** (Algebraic Operating System) in die Schulen: Man tippt `2 + 3 × 4 =` so ein, wie es im Heft steht, und der Rechner beachtet selbst „Punkt vor Strich“.

Das ist schwieriger, als es klingt. Der Rechner liest von links nach rechts. Wenn nach `2 + 3` ein `×` kommt, darf er das `+` noch nicht ausrechnen, denn die 3 gehört zum `×`. Er muss sich `2 +` merken. Der TI-30 hat Platz für **4 wartende Rechnungen** und **15 offene Klammern**. Der rote Faden dieses Projekts ist die Frage: **Wie versteht ein Rechner Punkt vor Strich?**

### Was es schon gibt (Stufe 1)

- **Rechner:** alle 40 Tasten in der Original-Anordnung, AOS mit 3 Rängen (+ − / × ÷ / yˣ ˣ√y), Klammern, Speicher (STO, RCL, SUM, INV SUM, EXC), DRG, EE, K, %, π.
- **Panel „Was wartet gerade?“:**
  - die Rechnung so, wie sie getippt wurde
  - die wartenden Rechnungen als Stapel mit 4 Plätzen, farbig nach Rang, Klammern als Ebenen
  - zu jedem Tastendruck ein Satz, was passiert ist: „× bindet stärker als das wartende +, also wartet auch 3 ×“ oder „Jetzt kommt ein schwächeres +. × wird zuerst gerechnet: 3 × 4 = 12.“
  - fünf Beispiele zum Abspielen, darunter eines, das alle 4 Plätze füllt und mit dem fünften „Error“ auslöst
- **Authentische Details:**
  - 9 rote LED-Stellen mit Lupenlinsen (Vorzeichen + 8 Ziffern), der Dezimalpunkt sitzt in der Ziffer
  - 11 Stellen intern, Anzeige 5/4-gerundet auf 8 Stellen; wissenschaftlich 5 Stellen Mantisse + 2 Stellen Exponent
  - die führende Null fällt weg, wenn der Platz nicht reicht: π ÷ 10 zeigt `.31415927`
  - bei Winkelfunktionen und Logarithmen flackern die LEDs kurz („LED-Diashow“)
  - nach 30 s ohne Taste geht die Anzeige aus, nur ein Dezimalpunkt wandert
  - **der Fehler der frühen Serie:** `0 INV tan` rechnet endlos, nur OFF hilft (abschaltbar)
  - OFF löscht alles, auch den Speicher
- **PWA:** installierbar, offline, Deutsch und Englisch

### Verhaltenstreu, nicht algorithmisch treu

Das ROM des TMC0981 (2048 × 9 Bit) ist in MAME dokumentiert, aber nicht öffentlich. Die Simulation rechnet deshalb nicht mit dem Original-Programm:
- + − × ÷ rechnet sie exakt dezimal auf 11 Stellen (BigInt), 5/4-gerundet.
- sin, ln usw. kommen aus JavaScript (≈ 16 Stellen) und werden auf 11 Stellen gerundet.
- Folge: Die Simulation ist *genauer* als das Original. Der Forensik-Test `arcsin(arccos(arctan(tan(cos(sin 9°)))))` liefert hier ≈ 9,0004, der echte TI-30 9,177087103. Das ist Stoff für eine spätere Stufe.

### Offene Fragen

Diese Punkte sind rekonstruiert. Hinweise anhand eines Originalgeräts oder des Handbuchs sind willkommen:
- **Interne Stellen:** Das Handbuch (1976) nennt 11 Stellen. Andere Quellen sprechen von 10. Eingestellt ist 11 (`DIGITS` in `js/engine/decimal.js`).
- **K:** Hier merkt sich K die oberste wartende Rechnung samt zweiter Zahl (`3 × 4 K =` → 12, dann `5 =` → 20).
- **%:** Nach + oder − bezieht sich % auf die erste Zahl (`200 + 5 % =` → 210), sonst teilt es durch 100.
- **yˣ hintereinander** wird von links nach rechts gerechnet: `2 yˣ 3 yˣ 2 =` → 64.
- **Grenze der Festkomma-Anzeige:** wissenschaftlich unter 10⁻⁷.
- **Winkelmodus:** Wie zeigt der TI-30 DEG/RAD/GRAD an? Hier steht er in der Lernleiste unter dem Rechner.
- **Underflow** (|x| < 10⁻⁹⁹) zeigt hier „Error“.
- **Negative Basis bei yˣ** ergibt „Error“ (Rechnung über Logarithmen).

### Starten und Entwickeln

Kein Build-Schritt, keine Abhängigkeiten, nur ES-Module.

```bash
python3 -m http.server 8030      # dann http://localhost:8030 öffnen
npm test                          # Engine-, AOS- und Rechnertests (node --test)
```

Wenn du Dateien änderst, erhöhe `VERSION` in `sw.js`. Ein Test prüft, dass `sw.js` jede Datei kennt.

**PC-Tastatur:** Ziffern, `.`, `+ − * /`, `( )`, Enter für =, Esc/Backspace für ON/C, `i` INV, `s c t` sin cos tan, `g` log, `l` lnx, `q` x², `r` √x, `^` yˣ, `e` EE, `n` +/-, `p` π, `%`, `k` K, `d` DRG, `m` STO, `M` RCL, `x` EXC.

### Projektstruktur

```
index.html, css/style.css, manifest.webmanifest, sw.js, icons/, images/wood.svg
js/engine/   decimal.js (11-stellige Dezimalzahlen, BigInt), functions.js (sin … yˣ)
js/calc/     aos.js (Punkt vor Strich: Stapel, Ränge, Klammern, Ereignisse),
             ti30.js (Tasten → Zustand → Anzeige), format.js (LED-Format), keys.js
js/ui/       display.js (LED), calculator.js, aos-view.js (Panel)
js/i18n.js, js/app.js, tests/
```

### Roadmap

- [x] **Stufe 1:** Rechner, AOS-Engine mit Ereignissen, Panel „Was wartet gerade?“, PWA, DE/EN
- [ ] **Stufe 2 – Labor „Punkt vor Strich“:** eine Rechnung Schritt für Schritt abspielen, mit Zahlen- und Operatorstapel. Dazu der Vergleich: derselbe Term auf einem einfachen Rechner ohne Vorrang (Kettenrechnung: 2 + 3 × 4 = 20), auf dem TI-30 (AOS) und mit RPN (Link zu hp45-cordic).
- [ ] **Stufe 3 – Zeitleiste der TI-30-Generationen:** TI-30 LED (1976), TI-30 LCD (1978), TI-30 II (1981), TI-30 SLR (1982), TI-30 Galaxy, TI-30X, TI-30X IIS, MultiView und MathPrint. Für jede Generation die Frage: Wie viele Rechnungen dürfen warten, gibt es implizite Multiplikation, sieht man den Term?
- [ ] **Stufe 4 – Forensik und Fehler:** der Forensik-Test (9,177087103), 0 INV tan, Rundung und Schutzstellen
- [ ] Tastenhilfe und Glossar wie bei hp45-cordic

### Quellen

- TI-30 Owner's Manual, 1976 (Auszug bei manualslib)
- TI Learning Center, Faltblatt CB-272, 1976 (zitiert im Datamath Calculator Museum)
- Datamath Calculator Museum: TI-30, SR-40, TMC0980-Familie
- Andy4495, *TI-30 Keypad Interface* (Tastaturmatrix eines Originalgeräts)
- Smithsonian NMAH, Objekt 1339213 (TI-30)

---

## English

The TI-30 (1976, $24.95) was probably the best-selling calculator ever. It brought TI's **AOS** to schools: you type `2 + 3 × 4 =` as it is written, and the calculator applies the order of operations itself. To do that it has to keep operations waiting: up to **4 pending operations** and **15 open parentheses**. This project asks: **how does a calculator understand “multiply before add”?**

**Stage 1 (now):** all 40 keys in the original layout, AOS with three ranks, parentheses, memory, DRG, EE, K, %, π. A panel shows the formula as typed, the pending operations as a 4-slot stack and one sentence per key press explaining what happened. Authentic details: 9-digit red bubble LED, 11 internal digits, 8 displayed with 5/4 rounding, the dropped leading zero (`.31415927`), the LED flicker during trig and logs, the travelling decimal point of the battery saver, and the early-series bug where `0 INV tan` loops until OFF.

**Accuracy:** behaviour-faithful, not algorithm-faithful. The TMC0981 ROM is not public, so arithmetic is exact 11-digit decimal and functions come from JavaScript, rounded to 11 digits. The simulation is therefore more accurate than the original (forensic test: ≈ 9.0004 here, 9.177087103 on a real TI-30).

**Run:** `python3 -m http.server 8030`, test with `npm test`. No build step.

**Roadmap:** step-by-step lab comparing chain calculation, AOS and RPN · timeline of the TI-30 generations · forensics and bugs.

MIT License. TI-30 and Texas Instruments are trademarks of Texas Instruments Incorporated. This project is unaffiliated and uses no original ROM code or logos.
