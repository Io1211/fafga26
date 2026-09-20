import { useEffect, useState } from "react";
import { api, Idea, Kennzahlen } from "./api";
import { Haus, Spark, Team, Up } from "./icons";

export default function Uebersicht({ onStudio, onIdeen }:
  { onStudio: () => void; onIdeen: () => void }) {
  const [k, setK] = useState<Kennzahlen | null>(null);
  const [ideen, setIdeen] = useState<Idea[]>([]);
  const [laedt, setLaedt] = useState(false);

  useEffect(() => { api.kennzahlen().then(setK).catch(() => {}); }, []);

  async function erzeugen() {
    setLaedt(true);
    try { setIdeen((await api.ideas(2)).ideen); } finally { setLaedt(false); }
  }

  const gast = ideen.find((i) => i.ziel === "gast");
  const team = ideen.find((i) => i.ziel === "team");

  return (
    <>
      <div className="kpis">
        {(k?.kacheln ?? []).map((t) => (
          <div className="card kpi" key={t.label}>
            <div className="lbl">{t.label}</div>
            <div className="val">{t.wert}</div>
            {typeof t.delta === "number" ? (
              <div className={"delta " + (t.delta >= 0 ? "up" : "down")}>
                {t.delta >= 0 ? "+" : "−"}{Math.abs(t.delta).toFixed(1)} % zur Vorwoche
              </div>
            ) : <div className="hint">{t.hinweis}</div>}
          </div>
        ))}
      </div>

      <div className="grid2">
        <div className="card">
          <div className="rowhead">
            <div>
              <div className="eyebrow">Selbst gemacht · ohne Agentur</div>
              <h2>Was heute sichtbar werden soll</h2>
            </div>
            <div className="spacer" />
            <button className="btn" onClick={erzeugen} disabled={laedt}>
              <Spark />{laedt ? "denkt …" : "Ideen erzeugen"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[["gast", gast], ["team", team]].map(([art, idee]) => {
              const i = idee as Idea | undefined;
              const istTeam = art === "team";
              return (
                <div className={"ideacard" + (istTeam ? " team" : "")} key={art as string}>
                  <div className="who">
                    <div className="ic">{istTeam ? <Team /> : <Haus />}</div>
                    <div>
                      <h3>{istTeam ? "Mitarbeitende finden" : "Gäste gewinnen"}</h3>
                      <div className="eyebrow">{i?.anlass ?? (istTeam ? "Kultur, Benefits, Team" : "Erlebnis, Genuss, Region")}</div>
                    </div>
                  </div>
                  <p>{i?.hook ?? "Auf „Ideen erzeugen“ tippen — die Vorschläge bauen ausschließlich auf euren hinterlegten Belegen auf."}</p>
                  {i && <div className="quellen">Quelle: {i.quelle}</div>}
                  <div className="chips">
                    {(i ? i.szenen.slice(0, 3) : ["Beleg", "Hausfarbe", "Kein erfundener Satz"])
                      .map((c, n) => <span className="chip" key={n}>{c}</span>)}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn primary" onClick={onStudio}>Foto hochladen</button>
            <button className="btn" onClick={onIdeen}>Alle Ideen ansehen</button>
          </div>
        </div>

        <div className="card">
          <div className="rowhead">
            <h2 style={{ fontSize: 19 }}>Kanäle</h2>
            <div className="spacer" />
            <span className="eyebrow">{k?.kanaele.length ?? 0} aktiv</span>
          </div>
          {(k?.kanaele ?? []).map((c) => (
            <div key={c.name} style={{ display: "flex", gap: 12, alignItems: "center", margin: "14px 0" }}>
              <div className="kk">{c.kuerzel}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", marginBottom: 6 }}>
                  <span>{c.name}</span>
                  <span className={"delta " + (c.delta >= 0 ? "up" : "down")}
                    style={{ marginLeft: "auto" }}>
                    {c.delta >= 0 ? "+" : "−"}{Math.abs(c.delta).toFixed(1)} %
                  </span>
                </div>
                <div className="bar"><i style={{ width: `${c.anteil * 100}%` }} /></div>
              </div>
            </div>
          ))}
          {k?.beispieldaten && (
            <div className="quellen" style={{ marginTop: 14 }}>
              Kennzahlen sind Beispieldaten. Produktiv kommen sie aus den Kanal-APIs.
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="rowhead">
          <div>
            <div className="eyebrow">Kampagnen, Anlässe und Content</div>
            <h2>Social-Media-Jahreskalender</h2>
          </div>
          <div className="spacer" />
          <button className="btn primary"><Up />Beitrag planen</button>
        </div>
        <div className="months">
          {(k?.monate ?? []).map((m) => (
            <div className="month" key={m.monat} data-on={!!m.aktiv}>
              <div className="m">{m.monat}</div>
              <div className="t">{m.thema}</div>
              <div className="f">
                {m.kanaele.map((c) => <span className="kk" key={c}>{c}</span>)}
                <span className="n">{m.posts}<small>Posts</small></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
