import { useState } from "react";
import { api, Copy, Ziel } from "./api";
import { Spark } from "./icons";
import { state, setzePost } from "../../foto-video-editor/zustand.js";

/**
 * Caption-Ideen.
 *
 * Baut auf dem auf, was im Studio schon steht: Foto, Overlay-Zeilen,
 * Zielgruppe. Daraus entstehen auf Knopfdruck mehrere fertige Captions mit
 * Hashtags — drei Anläufe mit unterschiedlichem Ton, damit man vergleichen
 * kann statt nur einen Vorschlag anzunehmen.
 *
 * Alles läuft über POST /api/posts; die Notiz trägt die Tonlage.
 */

const TONLAGEN = [
  { id: "kurz", label: "Kurz und direkt",
    notiz: "Schreib die Caption kurz und direkt. Zwei bis drei Sätze, keine Floskeln." },
  { id: "geschichte", label: "Mit Geschichte",
    notiz: "Erzähl in der Caption eine kleine wahre Geschichte aus den Belegen. Persönlich, ohne Werbesprache." },
  { id: "auffordernd", label: "Mit klarer Aufforderung",
    notiz: "Die Caption endet mit einer klaren, konkreten Aufforderung. Davor zwei Sätze Inhalt." },
];

interface Vorschlag { id: string; label: string; copy: Copy }

// Schnellwahl, was für ein Post das ist — füllt das Freitextfeld,
// das darf man dann noch genauer beschreiben.
const POST_ARTEN = [
  "Angebot / Aktion", "Veranstaltung ankündigen", "Tagesgericht", "Neu bei uns",
  "Hinter den Kulissen", "Team & Jobs", "Saison / Wetter", "Danke an die Gäste",
];

export default function CaptionIdeen() {
  const [vorschlaege, setVorschlaege] = useState<Vorschlag[]>([]);
  const [postArt, setPostArt] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [uebernommen, setUebernommen] = useState<string | null>(null);

  const motiv = state.motive[state.motiv];
  const foto: Blob | undefined = motiv?.blob;
  const zeilen: string[] = state.post?.head ?? [];

  async function erzeugen() {
    if (!foto) return;
    setLaedt(true);
    setFehler(null);
    setUebernommen(null);
    try {
      const datei = foto instanceof File
        ? foto
        : new File([foto], "foto.jpg", { type: foto.type || "image/jpeg" });

      // Die Overlay-Zeilen mitgeben, damit Bild und Text zusammenpassen.
      const aussage = zeilen.length ? ` Das Bild trägt die Zeilen: „${zeilen.join(" ")}“.` : "";
      // Was für ein Post das ist, kommt vor die Tonlage — danach richten sich
      // Aufbau und Einstieg der Caption.
      const art = postArt.trim()
        ? `Art des Posts (danach richten sich Aufbau, Einstieg und Ton): ${postArt.trim()}. `
        : "";

      const ergebnisse = await Promise.all(
        TONLAGEN.map(async (t) => {
          const antwort = await api.post(datei, state.ziel as Ziel, art + t.notiz + aussage);
          return { id: t.id, label: t.label, copy: antwort.text };
        })
      );
      setVorschlaege(ergebnisse);
    } catch (e) {
      setFehler(String(e));
    } finally {
      setLaedt(false);
    }
  }

  function uebernehmen(v: Vorschlag) {
    const alt = state.post;
    if (!alt) return;
    setzePost({
      ...alt,
      caption: v.copy.caption,
      tags: Array.isArray(v.copy.hashtags) ? v.copy.hashtags.join(" ") : "",
      quellen: v.copy.quellen ?? [],
    });
    setUebernommen(v.id);
  }

  return (
    <div className="card">
      <div className="rowhead">
        <div>
          <div className="eyebrow">Aus dem, was im Studio steht</div>
          <h2>Caption-Ideen</h2>
        </div>
        <div className="spacer" />
        <button className="btn primary" onClick={erzeugen} disabled={laedt || !foto}>
          {laedt && <span className="spin" />}
          <Spark />
          {vorschlaege.length ? "Neue Vorschläge" : "Captions vorschlagen"}
        </button>
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label>Was für ein Post ist das? (optional)</label>
        <div className="chips" style={{ marginBottom: 6 }}>
          {POST_ARTEN.map((a) => (
            <button key={a} type="button" className="chip" data-on={postArt === a}
              onClick={() => setPostArt(postArt === a ? "" : a)}>{a}</button>
          ))}
        </div>
        <input type="text" value={postArt} onChange={(e) => setPostArt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && foto && !laedt) erzeugen(); }}
          placeholder="z. B. Weinabend am Freitag ankündigen, Gäste sollen reservieren" />
      </div>

      {!foto && (
        <div className="card warn" style={{ marginTop: 12 }}>
          Noch kein Foto da. Lade im Studio oder auf der Übersicht eines hoch —
          die Captions entstehen aus dem Bild und den Zeilen darauf.
        </div>
      )}

      {foto && !vorschlaege.length && !laedt && (
        <p className="hint" style={{ marginTop: 12 }}>
          Es werden drei Fassungen gebaut: kurz und direkt, mit Geschichte, mit klarer
          Aufforderung. {zeilen.length
            ? `Die Zeilen aus dem Studio („${zeilen.join(" ")}“) fließen mit ein.`
            : "Setz im Studio noch Overlay-Zeilen, dann passen Bild und Text besser zusammen."}
        </p>
      )}

      {fehler && <div className="card warn" style={{ marginTop: 12 }}>{fehler}</div>}

      <div className="captionliste">
        {vorschlaege.map((v) => (
          <div className="captioncard" key={v.id}>
            <div className="eyebrow">{v.label}</div>
            <p className="captiontext">{v.copy.caption}</p>
            {v.copy.hashtags?.length > 0 && (
              <div className="hashtags">{v.copy.hashtags.join(" ")}</div>
            )}
            {v.copy.quellen?.length > 0 && (
              <div className="quellen">Grundlage: {v.copy.quellen.join(" · ")}</div>
            )}
            <div className="row" style={{ marginTop: 10, gap: 8 }}>
              <button
                className="btn primary"
                onClick={() => uebernehmen(v)}
                disabled={uebernommen === v.id}
              >
                {uebernommen === v.id ? "Übernommen" : "Für diesen Post übernehmen"}
              </button>
              <button
                className="btn"
                onClick={() => {
                  const text = v.copy.caption + "\n\n" + (v.copy.hashtags ?? []).join(" ");
                  navigator.clipboard?.writeText(text);
                }}
              >
                Kopieren
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
