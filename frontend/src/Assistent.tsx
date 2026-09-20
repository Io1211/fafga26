import { useRef, useState } from "react";
import { api, AssistentPost, Prioritaet } from "./api";

const PRIORITAETEN: { id: Prioritaet; label: string; hint: string }[] = [
  { id: "zimmer", label: "Zimmer", hint: "Auslastung fürs Wochenende zeigen" },
  { id: "restaurant", label: "Restaurant", hint: "Freie Tische sichtbar machen" },
  { id: "veranstaltung", label: "Veranstaltung", hint: "Anlass ankündigen" },
  { id: "tagesgericht", label: "Tagesgericht", hint: "Mittagsgeschäft ankurbeln" },
  { id: "sichtbarkeit", label: "Nur sichtbar bleiben", hint: "Kein akuter Anlass" },
];

const AUSGABEN = [
  { id: "post", label: "Post-Idee mit Caption" },
  { id: "story", label: "Story-Variante" },
  { id: "reel", label: "Reel-Drehplan" },
  { id: "sprachen", label: "Deutsch & Englisch" },
] as const;
type Ausgabe = (typeof AUSGABEN)[number]["id"];

export default function Assistent() {
  const [prioritaet, setPrioritaet] = useState<Prioritaet | null>(null);
  const [vorschau, setVorschau] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<AssistentPost | null>(null);
  const [ausgabe, setAusgabe] = useState<Ausgabe>("post");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ueber, setUeber] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const kamera = useRef<HTMLInputElement>(null);

  async function nimm(f: File | undefined, p: Prioritaet | null) {
    if (!f || !p) return;
    setErgebnis(null); setFehler(null);
    setVorschau(URL.createObjectURL(f));
    setLaedt(true);
    try { setErgebnis(await api.assistent(f, p)); }
    catch (e) { setFehler(String(e)); }
    finally { setLaedt(false); }
  }

  function neuStarten() {
    setPrioritaet(null); setVorschau(null); setErgebnis(null); setFehler(null); setAusgabe("post");
  }

  return (
    <div className="assistent">
      <div className="panel">
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Schritt 1</div>
          <h2 style={{ marginTop: 0, marginBottom: 14 }}>Was möchtest du heute besser auslasten?</h2>
          <div className="priorities">
            {PRIORITAETEN.map((p) => (
              <button key={p.id} className="priority" data-on={prioritaet === p.id}
                onClick={() => { setPrioritaet(p.id); setErgebnis(null); setVorschau(null); }}>
                <b>{p.label}</b>
                <span>{p.hint}</span>
              </button>
            ))}
          </div>

          {prioritaet && (
            <>
              <div className="eyebrow" style={{ marginTop: 24, marginBottom: 10 }}>Schritt 2</div>
              {vorschau ? (
                <div className="preview"><img src={vorschau} alt="" /></div>
              ) : (
                <div
                  className="drop" data-over={ueber}
                  onClick={() => input.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setUeber(true); }}
                  onDragLeave={() => setUeber(false)}
                  onDrop={(e) => { e.preventDefault(); setUeber(false); nimm(e.dataTransfer.files[0], prioritaet); }}
                >
                  <div>
                    <h2 style={{ color: "var(--ink)", marginBottom: 8 }}>Foto auswählen oder aufnehmen</h2>
                    <p style={{ margin: 0 }}>JPEG, PNG oder WebP.</p>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="btn primary" onClick={() => input.current?.click()} disabled={laedt}>
                  {laedt && <span className="spin" />}
                  {vorschau ? "Anderes Foto" : "Foto auswählen"}
                </button>
                <button className="btn" onClick={() => kamera.current?.click()} disabled={laedt}>
                  Foto aufnehmen
                </button>
              </div>
              <input ref={input} type="file" accept="image/*" hidden
                onChange={(e) => nimm(e.target.files?.[0], prioritaet)} />
              <input ref={kamera} type="file" accept="image/*" capture="environment" hidden
                onChange={(e) => nimm(e.target.files?.[0], prioritaet)} />
            </>
          )}

          {fehler && <div className="card warn" style={{ marginTop: 14 }}>{fehler}</div>}
        </div>

        {ergebnis && (
          <>
            <div className="card empfehlung">
              <div className="eyebrow">Empfehlung · {ergebnis.empfehlung.anlass}</div>
              <p className="empfehlung-text">„{ergebnis.empfehlung.text}“</p>
              {ergebnis.empfehlung.quellen.length > 0 && (
                <div className="quellen" style={{ marginTop: 10 }}>
                  Grundlage: {ergebnis.empfehlung.quellen.join(" · ")}
                </div>
              )}
            </div>

            <div className="card">
              <div className="tabs" style={{ flexWrap: "wrap" }}>
                {AUSGABEN.map((a) => (
                  <button key={a.id} data-on={ausgabe === a.id} onClick={() => setAusgabe(a.id)}>
                    {a.label}
                  </button>
                ))}
              </div>

              {ausgabe === "post" && (
                <div style={{ marginTop: 16 }}>
                  <div className="preview"><img src={ergebnis.renders.post} alt="" /></div>
                  <div className="caption" style={{ marginTop: 12 }}>{ergebnis.text.caption}</div>
                  <div className="chips" style={{ marginTop: 10 }}>
                    {ergebnis.text.hashtags.map((t) => <span className="chip" key={t}>{t}</span>)}
                  </div>
                  <button className="btn" style={{ marginTop: 12 }}
                    onClick={() => navigator.clipboard.writeText(
                      ergebnis.text.caption + "\n\n" + ergebnis.text.hashtags.join(" "))}>
                    Text kopieren
                  </button>
                </div>
              )}

              {ausgabe === "story" && (
                <div style={{ marginTop: 16 }}>
                  <div className="preview"><img src={ergebnis.renders.story} alt="" /></div>
                </div>
              )}

              {ausgabe === "reel" && (
                <div style={{ marginTop: 16 }}>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>Drehplan</div>
                  <ol className="quellen" style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                    {ergebnis.szenen.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
              )}

              {ausgabe === "sprachen" && (
                <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Deutsch</div>
                    <div className="caption">{ergebnis.text.caption}</div>
                  </div>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Englisch</div>
                    <div className="caption">{ergebnis.caption_en}</div>
                  </div>
                  <button className="btn" style={{ width: "fit-content" }}
                    onClick={() => navigator.clipboard.writeText(
                      ergebnis.text.caption + "\n\n---\n\n" + ergebnis.caption_en)}>
                    Beide kopieren
                  </button>
                </div>
              )}
            </div>

            {ergebnis.warnungen.length > 0 && (
              <div className="card warn">
                {ergebnis.warnungen.map((w, i) => <div key={i}>{w}</div>)}
              </div>
            )}

            <button className="btn" onClick={neuStarten}>Neuer Durchlauf</button>
          </>
        )}
      </div>
    </div>
  );
}
