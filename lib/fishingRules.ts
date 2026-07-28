// Schonzeiten & Mindestmaße.
// Quelle: Landesfischereiverordnung Baden-Württemberg (LFischVO).
// ⚠️ OHNE GEWÄHR — Vereins-/Pachtregeln und gewässerspezifische Sonderregeln
// (z.B. abweichende Mindestmaße je Region/Höhenlage) können strenger sein.
// Im Zweifel Erlaubnisschein / aktuelle Verordnung prüfen.
//
// Datumsangaben als "MM-TT". Schonzeit ist inklusive und darf über den
// Jahreswechsel laufen (z.B. Aal 15.09.–01.03.).

export type FishRule = {
  schonzeitVon?: string; // "MM-TT"
  schonzeitBis?: string; // "MM-TT"
  mindestmassCm?: number;
};

export const REGELWERK_DEFAULT = "Baden-Württemberg";

export const fishingRules: Record<string, Record<string, FishRule>> = {
  "Baden-Württemberg": {
    Hecht: { schonzeitVon: "02-15", schonzeitBis: "05-15", mindestmassCm: 50 },
    Zander: { schonzeitVon: "04-01", schonzeitBis: "05-15", mindestmassCm: 45 },
    // Forelle (Standard = Bachforelle) + Unterarten
    Forelle: { schonzeitVon: "10-01", schonzeitBis: "02-28", mindestmassCm: 20 },
    Bachforelle: { schonzeitVon: "10-01", schonzeitBis: "02-28", mindestmassCm: 20 },
    Regenbogenforelle: { schonzeitVon: "10-01", schonzeitBis: "02-28" },
    Seeforelle: { schonzeitVon: "10-01", schonzeitBis: "02-28", mindestmassCm: 50 },
    "Äsche": { schonzeitVon: "02-01", schonzeitBis: "04-30", mindestmassCm: 30 },
    Bachsaibling: { schonzeitVon: "10-01", schonzeitBis: "02-28" },
    Seesaibling: { schonzeitVon: "10-01", schonzeitBis: "02-28", mindestmassCm: 25 },
    Felchen: { schonzeitVon: "10-15", schonzeitBis: "01-10", mindestmassCm: 30 },
    Karpfen: { mindestmassCm: 35 },
    Schleie: { schonzeitVon: "05-15", schonzeitBis: "06-30", mindestmassCm: 25 },
    Barbe: { schonzeitVon: "05-01", schonzeitBis: "06-15", mindestmassCm: 40 },
    Rapfen: { schonzeitVon: "03-01", schonzeitBis: "05-31", mindestmassCm: 40 },
    Nase: { schonzeitVon: "03-15", schonzeitBis: "05-31", mindestmassCm: 35 },
    Aal: { schonzeitVon: "09-15", schonzeitBis: "03-01", mindestmassCm: 50 },
    // Maifisch (Alosa alosa) ist in BW ganzjährig geschützt.
    Maifisch: { schonzeitVon: "01-01", schonzeitBis: "12-31" },
    // Nicht gelistet (Wels, Barsch, Rotauge, Rotfeder, Brasse, Döbel):
    // keine gesetzliche Schonzeit / kein Mindestmaß in BW.
  },
};

const toMMDD = (d: Date): string => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const tt = String(d.getDate()).padStart(2, "0");
  return `${mm}-${tt}`;
};

export function getFishRule(
  fish: string,
  subFish?: string,
  regelwerk: string = REGELWERK_DEFAULT
): FishRule | null {
  const rules = fishingRules[regelwerk];
  if (!rules) return null;
  if (subFish && rules[subFish]) return rules[subFish];
  return rules[fish] || null;
}

export function isInSchonzeit(rule: FishRule, date: Date): boolean {
  if (!rule.schonzeitVon || !rule.schonzeitBis) return false;
  const t = toMMDD(date);
  const { schonzeitVon: von, schonzeitBis: bis } = rule;
  // "MM-TT"-Strings sind lexikografisch vergleichbar (nullgepolstert).
  if (von <= bis) return t >= von && t <= bis;
  return t >= von || t <= bis; // Schonzeit über den Jahreswechsel
}

export function isUntermassig(rule: FishRule, lengthCm?: number | null): boolean {
  if (!rule.mindestmassCm || !lengthCm) return false;
  return lengthCm < rule.mindestmassCm;
}

// "MM-TT" -> "TT.MM."
export function formatSchonzeit(rule: FishRule): string {
  if (!rule.schonzeitVon || !rule.schonzeitBis) return "keine";
  const f = (s: string) => {
    const [mm, tt] = s.split("-");
    return `${tt}.${mm}.`;
  };
  return `${f(rule.schonzeitVon)}–${f(rule.schonzeitBis)}`;
}
