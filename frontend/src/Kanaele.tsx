import { useState } from "react";
import { Check, Facebook, Insta, LinkedIn, Plus } from "./icons";

type Plattform = "instagram" | "facebook" | "linkedin";

type Kanal = {
  id: Plattform;
  name: string;
  handle: string;
  verbunden: boolean;
  hinweis: string;
};

const START: Kanal[] = [
  { id: "instagram", name: "Instagram", handle: "@euer_haus", verbunden: false,
    hinweis: "Fotos, Reels und Stories für Gäste." },
  { id: "facebook", name: "Facebook", handle: "Seite noch nicht verknüpft", verbunden: false,
    hinweis: "Beiträge, Veranstaltungen und Bewertungen." },
  { id: "linkedin", name: "LinkedIn", handle: "Unternehmensseite noch nicht verknüpft", verbunden: false,
    hinweis: "Team-Posts und offene Stellen." },
];

const ICON: Record<Plattform, JSX.Element> = {
  instagram: <Insta />, facebook: <Facebook />, linkedin: <LinkedIn />,
};

export default function Kanaele() {
  const [kanaele, setKanaele] = useState(START);

  function toggle(id: Plattform) {
    setKanaele((liste) => liste.map((k) => k.id === id ? { ...k, verbunden: !k.verbunden } : k));
  }

  const verbunden = kanaele.filter((k) => k.verbunden).length;

  return (
    <>
      <div className="card">
        <div className="rowhead">
          <div>
            <div className="eyebrow">Übersicht</div>
            <h2>Kanäle</h2>
          </div>
          <div className="spacer" />
          <span className="eyebrow">{verbunden} von {kanaele.length} verbunden</span>
        </div>
        <p className="quellen" style={{ margin: 0 }}>
          Hier verwaltet ihr eure Social-Media-Konten für Hauspost. Die echte Anbindung an
          Instagram, Facebook und LinkedIn folgt — aktuell ein Platzhalter zum Einrichten der Oberfläche.
        </p>
      </div>

      <div className="kanal-grid">
        {kanaele.map((k) => (
          <div className="card kanal-card" key={k.id}>
            <div className="kanal-head">
              <div className={"kanal-ic " + k.id}>{ICON[k.id]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3>{k.name}</h3>
                <div className="eyebrow" style={{ textTransform: "none", letterSpacing: 0 }}>{k.handle}</div>
              </div>
            </div>
            <span className={"tag " + (k.verbunden ? "gast" : "grau")} style={{ alignSelf: "flex-start" }}>
              {k.verbunden ? "Verbunden" : "Nicht verbunden"}
            </span>
            <p className="kanal-hinweis">{k.hinweis}</p>
            <button className={"btn" + (k.verbunden ? "" : " primary")} onClick={() => toggle(k.id)}>
              {k.verbunden ? <Check /> : <Plus />}
              {k.verbunden ? "Verbunden" : "Konto verbinden"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
