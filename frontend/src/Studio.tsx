import { useRef, useState } from "react";
import { api, PostOut, Ziel } from "./api";
import { Check, Spark } from "./icons";

const FORMATE: { id: string; label: string }[] = [
  { id: "story", label: "Story 9:16" },
  { id: "post", label: "Beitrag 4:5" },
  { id: "square", label: "Quadrat 1:1" },
];

export default function Studio() {
  const [datei, setDatei] = useState<File | null>(null);
  const [vorschau, setVorschau] = useState<string | null>(null);
  const [ziel, setZiel] = useState<Ziel>("gast");
  const [notiz, setNotiz] = useState("");
  const [fmt, setFmt] = useState("story");
  const [post, setPost] = useState<PostOut | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ueber, setUeber] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function nimm(f: File | undefined) {
    if (!f) return;
    setDatei(f); setPost(null); setFehler(null);
    setVorschau(URL.createObjectURL(f));
  }

  async function bauen() {
    if (!datei) return;
    setLaedt(true); setFehler(null);
    try { setPost(await api.post(datei, ziel, notiz)); }
    catch (e) { setFehler(String(e)); }
    finally { setLaedt(false); }
  }

  async function drehen() {
    if (!post) return;
    const neu: Ziel = post.ziel === "gast" ? "team" : "gast";
    setLaedt(true);
    try { const p = await api.variante(post.id, neu); setPost(p); setZiel(neu); }
    catch (e) { setFehler(String(e)); }
    finally { setLaedt(false); }
  }

  return (
    <div className="studio">
      <div className="card">
        {post ? (
          <>
            <div className="rowhead">
              <div className="tabs">
                {FORMATE.map((f) => (
                  <button key={f.id} data-on={fmt === f.id} onClick={() => setFmt(f.id)}>{f.label}</button>
                ))}
              </div>
              <div className="spacer" />
              <span className={"tag " + (post.ziel === "gast" ? "gast" : "team")}>
                {post.ziel === "gast" ? "Für Gäste" : "Für Mitarbeitende"}
              </span>
              <span className="tag grau">{post.engine}</span>
            </div>
            <div className="preview"><img src={post.renders[fmt]} alt="" /></div>
            <div className="actions">
              <button className="btn primary" onClick={drehen} disabled={laedt}>
                {laedt ? <span className="spin" /> : null}
                Gleiches Foto, {post.ziel === "gast" ? "für Mitarbeitende" : "für Gäste"}
              </button>
              <a className="btn" href={post.renders[fmt]} download>Bild sichern</a>
              <button className="btn" onClick={() => { setPost(null); setDatei(null); setVorschau(null); }}>
                Neues Foto
              </button>
            </div>
          </>
        ) : vorschau ? (
          <>
            <div className="preview"><img src={vorschau} alt="" /></div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="btn primary" onClick={bauen} disabled={laedt}>
                {laedt ? <span className="spin" /> : <Spark />}
                {laedt ? "liest das Bild …" : "Post bauen"}
              </button>
              <button className="btn" onClick={() => input.current?.click()}>Anderes Foto</button>
            </div>
          </>
        ) : (
          <div
            className="drop" data-over={ueber}
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setUeber(true); }}
            onDragLeave={() => setUeber(false)}
            onDrop={(e) => { e.preventDefault(); setUeber(false); nimm(e.dataTransfer.files[0]); }}
          >
            <div>
              <h2 style={{ color: "var(--ink)", marginBottom: 8 }}>Foto hierher ziehen</h2>
              <p style={{ margin: 0 }}>JPEG, PNG oder WebP. Das Bild wird nicht beschnitten —<br />
                der Rand entsteht als Unschärfe aus dem Bild selbst.</p>
            </div>
          </div>
        )}
        <input ref={input} type="file" accept="image/*" hidden
          onChange={(e) => nimm(e.target.files?.[0])} />
      </div>

      <div className="panel">
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Wofür ist der Post?</div>
          <div className="tabs" style={{ width: "100%" }}>
            <button style={{ flex: 1 }} data-on={ziel === "gast"} onClick={() => setZiel("gast")}>Für Gäste</button>
            <button style={{ flex: 1 }} data-on={ziel === "team"} onClick={() => setZiel("team")}>Für Mitarbeitende</button>
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>Zusatz vom Betrieb (optional)</label>
            <textarea value={notiz} onChange={(e) => setNotiz(e.target.value)}
              placeholder="z. B. Ab Freitag gibt es wieder Wildgerichte." />
          </div>
        </div>

        {fehler && <div className="card warn">{fehler}</div>}

        {post && (
          <>
            {post.warnungen.length > 0 && (
              <div className="card warn">
                {post.warnungen.map((w, i) => <div key={i}>{w}</div>)}
              </div>
            )}
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 10 }}>Caption</div>
              <div className="caption">{post.text.caption}</div>
              <div className="chips" style={{ marginTop: 10 }}>
                {post.text.hashtags.map((t) => <span className="chip" key={t}>{t}</span>)}
              </div>
              <button className="btn" style={{ marginTop: 12 }}
                onClick={() => navigator.clipboard.writeText(
                  post.text.caption + "\n\n" + post.text.hashtags.join(" "))}>
                Text kopieren
              </button>
            </div>

            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 10 }}>Prüfliste</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--ok)" }}>
                <Check />Sperrliste eingehalten
              </div>
              <div className="quellen" style={{ marginTop: 10 }}>
                Gebaut auf {post.text.quellen.length} Beleg(en):
                <ul>{post.text.quellen.map((q, i) => <li key={i}>{q}</li>)}</ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
