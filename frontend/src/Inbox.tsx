import { useState } from "react";
import { Facebook, Insta, LinkedIn, Mail, Reply, Star } from "./icons";

type Plattform = "google" | "instagram" | "facebook" | "linkedin";
type Status = "offen" | "beantwortet";

type Nachricht = {
  id: string;
  plattform: Plattform;
  typ: string;
  sender: string;
  datum: string;
  status: Status;
  text: string;
  antwort?: string;
};

const START: Nachricht[] = [
  { id: "n1", plattform: "google", typ: "Rezension", sender: "Maria K.", datum: "Heute, 09:14",
    status: "offen",
    text: "Wunderschöner Aufenthalt, das Frühstück war ein Highlight! Kommen im Herbst gern wieder." },
  { id: "n2", plattform: "instagram", typ: "DM", sender: "@lisa.travels", datum: "Heute, 08:02",
    status: "offen",
    text: "Habt ihr im Oktober noch Zimmer frei für ein verlängertes Wochenende zu zweit?" },
  { id: "n3", plattform: "facebook", typ: "Kommentar", sender: "Facebook-Nutzer", datum: "Gestern, 18:47",
    status: "offen",
    text: "Sucht ihr noch Personal für die Rezeption? Kann ich mich bei euch bewerben?" },
  { id: "n4", plattform: "instagram", typ: "Kommentar", sender: "@bergurlaub_at", datum: "Gestern, 14:20",
    status: "beantwortet",
    text: "Das Foto von der Terrasse ist ein Traum – welches Objektiv nutzt ihr dafür?",
    antwort: "Danke euch! Wir fotografieren mit einem 24mm — schaut gern in unseren Reels vorbei 📸" },
  { id: "n5", plattform: "google", typ: "Rezension", sender: "Thomas B.", datum: "Mo, 11:03",
    status: "beantwortet",
    text: "Sehr freundliches Team, Zimmer war sauber. Parkplatzsituation könnte besser sein.",
    antwort: "Vielen Dank für das ehrliche Feedback, Thomas! Wir arbeiten an zusätzlichen Stellplätzen." },
  { id: "n6", plattform: "linkedin", typ: "Kommentar", sender: "Sabine H.", datum: "Mo, 09:40",
    status: "offen",
    text: "Spannender Einblick ins Team – stellt ihr aktuell auch Saisonkräfte für den Winter ein?" },
];

const LABEL: Record<Plattform, string> = {
  google: "Google", instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn",
};

const ICON: Record<Plattform, JSX.Element> = {
  google: <Star />, instagram: <Insta />, facebook: <Facebook />, linkedin: <LinkedIn />,
};

const STATUS_FILTER: { id: "alle" | Status; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "offen", label: "Offen" },
  { id: "beantwortet", label: "Beantwortet" },
];

export default function Inbox() {
  const [nachrichten, setNachrichten] = useState(START);
  const [statusFilter, setStatusFilter] = useState<"alle" | Status>("alle");
  const [plattformFilter, setPlattformFilter] = useState<"alle" | Plattform>("alle");
  const [ausgewaehlt, setAusgewaehlt] = useState<string | null>(START[0]?.id ?? null);
  const [entwurf, setEntwurf] = useState("");

  const gefiltert = nachrichten.filter((n) =>
    (statusFilter === "alle" || n.status === statusFilter) &&
    (plattformFilter === "alle" || n.plattform === plattformFilter));

  const aktive = nachrichten.find((n) => n.id === ausgewaehlt) ?? null;
  const offenAnzahl = nachrichten.filter((n) => n.status === "offen").length;

  function waehleAus(n: Nachricht) {
    setAusgewaehlt(n.id);
    setEntwurf(n.antwort ?? "");
  }

  function senden() {
    if (!aktive || !entwurf.trim()) return;
    setNachrichten((liste) => liste.map((n) =>
      n.id === aktive.id ? { ...n, status: "beantwortet", antwort: entwurf.trim() } : n));
  }

  return (
    <>
      <div className="card">
        <div className="rowhead">
          <div>
            <div className="eyebrow">Übersicht</div>
            <h2>Inbox</h2>
          </div>
          <div className="spacer" />
          <span className="eyebrow">{offenAnzahl} offen</span>
        </div>
        <p className="quellen" style={{ margin: 0 }}>
          Hier laufen Rezensionen, Kommentare und Direktnachrichten von euren Kanälen zusammen. Die
          echte Anbindung an Google, Instagram, Facebook und LinkedIn folgt — aktuell ein Platzhalter
          zum Einrichten der Oberfläche.
        </p>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="rowhead" style={{ flexWrap: "wrap", rowGap: 10 }}>
            <div className="tabs">
              {STATUS_FILTER.map((f) => (
                <button key={f.id} data-on={statusFilter === f.id} onClick={() => setStatusFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="spacer" />
            <div className="tabs">
              <button data-on={plattformFilter === "alle"} onClick={() => setPlattformFilter("alle")}>Alle Kanäle</button>
              {(Object.keys(LABEL) as Plattform[]).map((p) => (
                <button key={p} data-on={plattformFilter === p} onClick={() => setPlattformFilter(p)}>
                  {LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="inbox-list">
            {gefiltert.map((n) => (
              <div className="inbox-item" key={n.id} onClick={() => waehleAus(n)}
                style={{ borderColor: n.id === ausgewaehlt ? "var(--accent)" : undefined, cursor: "pointer" }}>
                <div className="inbox-avatar">{ICON[n.plattform]}</div>
                <div className="inbox-content">
                  <div className="inbox-header">
                    <span className="inbox-sender">{n.sender}</span>
                    <span className="inbox-platform">{LABEL[n.plattform]} · {n.typ}</span>
                    <div className="spacer" />
                    <span className="entwurf-meta">{n.datum}</span>
                  </div>
                  <div className="inbox-preview">{n.text}</div>
                </div>
                <span className={"tag " + (n.status === "offen" ? "team" : "gast")}>
                  {n.status === "offen" ? "Offen" : "Beantwortet"}
                </span>
              </div>
            ))}
            {gefiltert.length === 0 && (
              <p className="quellen" style={{ margin: "8px 0" }}>Keine Nachrichten für diese Auswahl.</p>
            )}
          </div>
          <div className="quellen" style={{ marginTop: 14 }}>Beispieldaten für die Demo, nicht angebunden.</div>
        </div>

        <div className="card">
          <div className="rowhead">
            <h2 style={{ fontSize: 19 }}>Antworten</h2>
          </div>
          {aktive ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="ideacard">
                <div className="who">
                  <div className="ic">{ICON[aktive.plattform]}</div>
                  <div>
                    <h3>{aktive.sender}</h3>
                    <div className="eyebrow">{LABEL[aktive.plattform]} · {aktive.typ} · {aktive.datum}</div>
                  </div>
                </div>
                <p>{aktive.text}</p>
              </div>

              <div className="field">
                <label>Eure Antwort</label>
                <textarea value={entwurf} onChange={(e) => setEntwurf(e.target.value)}
                  placeholder="Antwort schreiben …" />
              </div>

              <button className="btn primary" onClick={senden} disabled={!entwurf.trim()}
                style={{ alignSelf: "flex-start" }}>
                <Reply />{aktive.status === "beantwortet" ? "Antwort aktualisieren" : "Antwort senden"}
              </button>

              {aktive.status === "beantwortet" && (
                <div className="quellen">Zuletzt beantwortet — Nachricht senden aktualisiert die gespeicherte Antwort.</div>
              )}
            </div>
          ) : (
            <p className="quellen" style={{ margin: 0 }}>
              <Mail /> Wählt links eine Nachricht aus, um sie zu beantworten.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
