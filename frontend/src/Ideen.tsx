import { useState } from "react";
import { api, Idea, Ziel } from "./api";
import { Haus, Spark, Team } from "./icons";

export default function Ideen() {
  const [ideen, setIdeen] = useState<Idea[]>([]);
  const [engine, setEngine] = useState("");
  const [filter, setFilter] = useState<Ziel | "alle">("alle");
  const [laedt, setLaedt] = useState(false);

  async function erzeugen() {
    setLaedt(true);
    try {
      const r = await api.ideas(6, filter === "alle" ? undefined : filter);
      setIdeen(r.ideen); setEngine(r.engine);
    } finally { setLaedt(false); }
  }

  return (
    <div className="card">
      <div className="rowhead">
        <div>
          <div className="eyebrow">Anlässe aus dem Hausgedächtnis</div>
          <h2>Post-Ideen</h2>
        </div>
        <div className="spacer" />
        <div className="tabs">
          {(["alle", "gast", "team"] as const).map((f) => (
            <button key={f} data-on={filter === f} onClick={() => setFilter(f)}>
              {f === "alle" ? "Alle" : f === "gast" ? "Gäste" : "Mitarbeitende"}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={erzeugen} disabled={laedt}>
          {laedt ? <span className="spin" /> : <Spark />}
          {laedt ? "denkt …" : "Ideen erzeugen"}
        </button>
      </div>

      {ideen.length === 0 ? (
        <div className="drop" style={{ minHeight: 220 }}>
          <div>
            <h2 style={{ color: "var(--ink)", marginBottom: 8 }}>Noch keine Ideen</h2>
            <p style={{ margin: 0 }}>Jede Idee wird aus euren Belegen gebaut und zeigt,<br />
              auf welchem sie steht. Nichts wird dazuerfunden.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="ideagrid">
            {ideen.map((i, n) => (
              <div className={"ideacard" + (i.ziel === "team" ? " team" : "")} key={n}>
                <div className="who">
                  <div className="ic">{i.ziel === "team" ? <Team /> : <Haus />}</div>
                  <div>
                    <h3>{i.titel}</h3>
                    <div className="eyebrow">{i.anlass}</div>
                  </div>
                </div>
                <p>{i.hook}</p>
                <div className="eyebrow" style={{ marginTop: 4 }}>Drehplan</div>
                <ol className="quellen" style={{ margin: 0, paddingLeft: 18 }}>
                  {i.szenen.map((s, m) => <li key={m}>{s}</li>)}
                </ol>
                <div className="quellen" style={{ marginTop: 6 }}>Quelle: {i.quelle}</div>
              </div>
            ))}
          </div>
          <div className="quellen" style={{ marginTop: 14 }}>Textmotor: {engine}</div>
        </>
      )}
    </div>
  );
}
