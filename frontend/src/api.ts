export type Ziel = "gast" | "team";
export type Prioritaet = "zimmer" | "restaurant" | "veranstaltung" | "tagesgericht" | "sichtbarkeit";

export interface Copy {
  kicker: string; head: string[]; key: string; caption: string;
  hashtags: string[]; quellen: string[]; focal_x: number; focal_y: number;
}
export interface PostOut {
  id: string; ziel: Ziel; text: Copy; renders: Record<string, string>;
  source_url: string; engine: string; warnungen: string[];
}
export interface Idea {
  titel: string; ziel: Ziel; anlass: string; quelle: string;
  hook: string; szenen: string[]; warum: string;
}
export interface House {
  name: string; ort: string; art: string; farbe: string; logo: string | null;
  belege: string[]; sperrliste: string[]; cta_gast: string; cta_team: string;
}
export interface Kennzahlen {
  beispieldaten: boolean;
  kacheln: { label: string; wert: string; delta?: number; hinweis?: string }[];
  kanaele: { name: string; kuerzel: string; delta: number; anteil: number }[];
  monate: { monat: string; thema: string; posts: number; kanaele: string[]; aktiv?: boolean;
    termine?: { titel: string; datum: string }[] }[];
}
export interface Signale {
  wetter: { kurz: string; tage: { datum: string; beschreibung: string; max: number; min: number }[] };
  feiertage: { kurz: string; liste: { datum: string; name: string }[] };
  events: { kurz: string; liste: { name: string; datum: string; ort: string }[] };
}
export interface Empfehlung {
  prioritaet: Prioritaet; anlass: string; text: string; quellen: string[];
}
export interface AssistentPost {
  id: string; prioritaet: Prioritaet; empfehlung: Empfehlung; text: Copy; caption_en: string;
  szenen: string[]; renders: Record<string, string>; source_url: string; engine: string;
  warnungen: string[];
}

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  return r.json() as Promise<T>;
}

export const api = {
  health: () => fetch("/api/health").then(j<{ ok: boolean; mistral: boolean }>),
  house: () => fetch("/api/house").then(j<House>),
  saveHouse: (h: House) =>
    fetch("/api/house", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(h),
    }).then(j<House>),
  kennzahlen: () => fetch("/api/kennzahlen").then(j<Kennzahlen>),
  post: (file: File, ziel: Ziel, notiz: string) => {
    const fd = new FormData();
    fd.append("file", file); fd.append("ziel", ziel); fd.append("notiz", notiz);
    return fetch("/api/posts", { method: "POST", body: fd }).then(j<PostOut>);
  },
  variante: (id: string, ziel: Ziel) => {
    const fd = new FormData(); fd.append("ziel", ziel);
    return fetch(`/api/posts/${id}/variante`, { method: "POST", body: fd }).then(j<PostOut>);
  },
  ideas: (anzahl: number, ziel?: Ziel) =>
    fetch("/api/ideas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anzahl, ziel: ziel ?? null }),
    }).then(j<{ engine: string; ideen: Idea[] }>),
  signale: () => fetch("/api/signale").then(j<Signale>),
  empfehlung: (prioritaet: Prioritaet) =>
    fetch(`/api/empfehlung?prioritaet=${prioritaet}`).then(j<Empfehlung>),
  assistent: (file: File, prioritaet: Prioritaet, notiz = "") => {
    const fd = new FormData();
    fd.append("file", file); fd.append("prioritaet", prioritaet); fd.append("notiz", notiz);
    return fetch("/api/assistent", { method: "POST", body: fd }).then(j<AssistentPost>);
  },
};
