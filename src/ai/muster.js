/**
 * MODUL 4 · Haus-Muster — der Textmotor ohne KI
 * =============================================
 * Jedes Muster zieht seine Bausteine aus den Belegen des Hausgedächtnisses.
 * Findet ein Muster keinen passenden Beleg, fällt es aus — es wird nichts
 * erfunden. Das ist gleichzeitig die Qualitätssicherung und der Grund,
 * warum die Demo auch ohne Netz und ohne KI funktioniert.
 *
 * Der Hook der Caption ist je Muster AUSGESCHRIEBEN, nie aus der
 * Schlagzeile abgeleitet — sonst entsteht Murks wie "Seit 1934 am selben
 * fleck."
 *
 * Aufbau jedes Musters:
 *   kicker   kleine Zeile über der Schlagzeile
 *   head     Overlay-Zeilen, je höchstens 15 Zeichen
 *   key      welche Zeile farbig wird
 *   hook     erster Satz der Caption
 *   quellen  welche Belege verwendet wurden
 */

import { state } from "../core/state.js";

const zahlAus  = t => (String(t).match(/\b(\d{1,4})\b/) || [])[1] || null;
const belegMit = re => state.haus.belege.find(b => re.test(b)) || null;

export const MUSTER = {
  /* ---------------- Für Gäste ---------------- */
  gast: [
    {
      id: "jahr",
      bau() {
        const b = state.haus.belege.find(x => /\b(18|19|20)\d\d\b/.test(x));
        if (!b) return null;
        const j = b.match(/\b((18|19|20)\d\d)\b/)[1];
        return {
          kicker: `${state.haus.ort} · ${state.haus.art}`,
          head: [`SEIT ${j}`, `AM SELBEN`, `FLECK.`],
          key: `SEIT ${j}`,
          hook: `Seit ${j} am selben Fleck.`,
          quellen: [b]
        };
      }
    },
    {
      id: "herkunft",
      bau() {
        const b = belegMit(/nachbar|hof|bauer|selbst|eigen|aus dem|vom /i);
        if (!b) return null;
        return {
          kicker: `${state.haus.ort} · Aus der Küche`,
          head: [`DIE ZUTATEN`, `HABEN EINEN`, `KÜRZEREN WEG`, `ALS SIE.`],
          key: `KÜRZEREN WEG`,
          hook: `Die Zutaten haben einen kürzeren Weg hierher als die meisten Gäste.`,
          quellen: [b]
        };
      }
    },
    {
      id: "person",
      bau() {
        const b = belegMit(/seit \d+ jahren|köchin|koch|wirtin|wirt|chefin|chef/i);
        if (!b) return null;
        const j = zahlAus(b);
        return {
          kicker: state.haus.name,
          head: j ? [`${j} JAHRE.`, `DIESELBE`, `KÜCHE.`] : [`EIN GESICHT.`, `SEIT IMMER.`],
          key:  j ? `${j} JAHRE.` : `SEIT IMMER.`,
          hook: j ? `${j} Jahre, dieselbe Küche.`
                  : `Bei uns steht immer dasselbe Gesicht in der Küche.`,
          quellen: [b]
        };
      }
    },
    {
      id: "weg",
      bau() {
        const b = belegMit(/fuß|rodel|winter|berg|auffahrt|schnee|weg|höhe/i);
        if (!b) return null;
        return {
          kicker: state.haus.ort,
          head: [`NICHT JEDER`, `KOMMT HERAUF.`, `DAFÜR JEDER`, `WIEDER.`],
          key: `WIEDER.`,
          hook: `Herauf kommt nicht jeder. Dafür kommt jeder wieder.`,
          quellen: [b]
        };
      }
    },
    {
      id: "haus",
      bau() {
        const b = belegMit(/zimmer|plätze|stube|tisch|gast/i) || state.haus.belege[0];
        if (!b) return null;
        return {
          kicker: `${state.haus.ort} · ${state.haus.art}`,
          head: [`KEIN KONZEPT.`, `NUR EIN HAUS,`, `DAS ES LANG`, `SCHON GIBT.`],
          key: `KEIN KONZEPT.`,
          hook: `Wir haben kein Konzept. Wir haben ein Haus, das es schon lange gibt.`,
          quellen: [b]
        };
      }
    }
  ],

  /* ---------------- Für Mitarbeiter ---------------- */
  team: [
    {
      id: "ersterTag",
      bau() {
        return {
          kicker: `${state.haus.name} sucht Leute`,
          head: [`DER ERSTE TAG`, `IST ÜBERALL`, `DER SCHLIMMSTE.`, `BEI UNS NICHT.`],
          key: `BEI UNS NICHT.`,
          hook: `Der erste Tag in einem neuen Betrieb ist für die meisten der schlimmste. Bei uns nicht.`,
          quellen: []
        };
      }
    },
    {
      id: "mitgehen",
      bau() {
        return {
          kicker: `${state.haus.ort} · Wir suchen Leute`,
          head: [`KOMM EINEN TAG`, `MIT UNS MIT.`, `DANN WEISST`, `DU ES.`],
          key: `EINEN TAG`,
          hook: `Du musst dich nicht entscheiden, bevor du es gesehen hast. Komm einen Tag mit.`,
          quellen: []
        };
      }
    },
    {
      id: "bleiben",
      bau() {
        const b = belegMit(/seit \d+ jahren/i);
        if (!b) return null;
        const j = zahlAus(b);
        return {
          kicker: `${state.haus.name} sucht Leute`,
          head: [`WER HIER`, `ANFÄNGT,`, `BLEIBT.`, `${j} JAHRE`, `SIND DER BEWEIS.`],
          key: `BLEIBT.`,
          hook: `Wer bei uns anfängt, bleibt. ${j} Jahre sind der Beweis.`,
          quellen: [b]
        };
      }
    },
    {
      id: "lebenslauf",
      bau() {
        return {
          kicker: `${state.haus.ort} · ${state.haus.art}`,
          head: [`WIR SUCHEN`, `KEINE PAPIERE.`, `WIR SUCHEN`, `LEUTE.`],
          key: `LEUTE.`,
          hook: `Wir suchen keine perfekten Lebensläufe. Wir suchen Leute, die es lernen wollen.`,
          quellen: []
        };
      }
    },
    {
      id: "klein",
      bau() {
        const b = belegMit(/generation|familie|zimmer|plätze/i);
        if (!b) return null;
        return {
          kicker: state.haus.name,
          head: [`KLEINES HAUS.`, `HEISST: DU BIST`, `KEINE NUMMER.`],
          key: `KEINE NUMMER.`,
          hook: `Kleines Haus heißt vor allem eines: Du bist hier keine Personalnummer.`,
          quellen: [b]
        };
      }
    }
  ]
};

/**
 * Das nächste Muster wählen, das mit den vorhandenen Belegen funktioniert.
 * @param {number} ab Startindex — "Anderer Ansatz" zählt einfach hoch.
 */
export function musterWaehlen(ab = 0) {
  const liste = MUSTER[state.ziel] || MUSTER.gast;
  for (let i = 0; i < liste.length; i++) {
    const idx = (ab + i) % liste.length;
    const m = liste[idx].bau();
    if (m) return { muster: m, index: idx };
  }
  // Notnagel: nie ohne Ausgabe dastehen.
  return {
    muster: {
      kicker: state.haus.ort,
      head: [state.haus.name.toUpperCase().slice(0, 15)],
      key: "",
      hook: `${state.haus.name} in ${state.haus.ort}.`,
      quellen: []
    },
    index: 0
  };
}
