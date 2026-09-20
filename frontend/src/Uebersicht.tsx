import { useEffect, useState } from "react";
import { api, Idea, Kennzahlen, Signale } from "./api";
import { Haus, Mail, Team, Up } from "./icons";

const ENTWUERFE = [
  { titel: "Herbstmenü – Kürbissuppe", meta: "Foto · Instagram · Reel", status: "Entwurf" },
  { titel: "Mitarbeiter gesucht: Service", meta: "Team-Post · Facebook", status: "In Freigabe" },
  { titel: "Weinverkostung Freitag", meta: "Story · Instagram", status: "Entwurf" },
];

const INBOX = [
  { sender: "Maria K.", plattform: "Google Rezension",
    preview: "Wunderschöner Aufenthalt, das Frühstück war ein Highlight …" },
  { sender: "@lisa.travels", plattform: "Instagram · DM",
    preview: "Habt ihr im Oktober noch Zimmer frei für ein verlängertes Wochenende?" },
  { sender: "Facebook-Nutzer", plattform: "Facebook · Kommentar",
    preview: "Sucht ihr noch Personal für die Rezeption? Kann ich mich bewerben?" },
];

export default function Uebersicht({ onStudio, onIdeen }:
  { onStudio: () => void; onIdeen: () => void }) {
  const [k, setK] = useState<Kennzahlen | null>(null);
  const [sig, setSig] = useState<Signale | null>(null);
  const [ideen, setIdeen] = useState<Idea[]>([]);
  const [laedt, setLaedt] = useState(false);
  const [monatTab, setMonatTab] = useState<"jahr" | "woche">("jahr");
  const [aktiverMonat, setAktiverMonat] = useState<string | null>(null);

  useEffect(() => {
    api.kennzahlen().then(setK).catch(() => {});
    api.signale().then(setSig).catch(() => {});
  }, []);

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
          </div>

          {sig && (sig.wetter.kurz || sig.feiertage.kurz || sig.events.kurz) && (
            <div className="chips" style={{ marginBottom: 14 }}>
              {sig.wetter.kurz && <span className="chip">☀ {sig.wetter.kurz}</span>}
              {sig.feiertage.kurz && <span className="chip">📅 {sig.feiertage.kurz}</span>}
              {sig.events.kurz && <span className="chip">📍 {sig.events.kurz}</span>}
            </div>
          )}

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

          <div className="actions">
            <button className="btn" onClick={erzeugen} disabled={laedt}>
              {laedt && <span className="spin" />}
              {laedt ? "denkt …" : "Ideen erzeugen"}
            </button>
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
          <div className="tabs">
            <button data-on={monatTab === "jahr"} onClick={() => setMonatTab("jahr")}>Jahr</button>
            <button data-on={monatTab === "woche"} onClick={() => setMonatTab("woche")}>Diese Woche</button>
          </div>
          <button className="btn primary" onClick={onStudio}><Up />Beitrag planen</button>
        </div>
        {monatTab === "jahr" ? (
          <>
            <div className="months">
              {(k?.monate ?? []).map((m) => (
                <div className="month" key={m.monat}
                  data-on={aktiverMonat ? aktiverMonat === m.monat : !!m.aktiv}
                  onClick={() => setAktiverMonat(m.monat)}>
                  <div className="m">{m.monat}</div>
                  <div className="t">{m.thema}</div>
                  <div className="f">
                    {m.kanaele.map((c) => <span className="kk" key={c}>{c}</span>)}
                    <span className="n">{m.posts}<small>Posts</small></span>
                  </div>
                </div>
              ))}
            </div>
            {(() => {
              const name = aktiverMonat ?? (k?.monate ?? []).find((m) => m.aktiv)?.monat ?? null;
              const monat = (k?.monate ?? []).find((m) => m.monat === name);
              return monat?.termine?.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="eyebrow">Termine im {monat.monat}</div>
                  <div className="chips" style={{ marginTop: 6 }}>
                    {monat.termine.map((t) => (
                      <span className="chip" key={t.titel}>{t.titel} · {t.datum}</span>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </>
        ) : (
          <div className="quellen">Wochenansicht folgt — noch nicht angebunden.</div>
        )}
      </div>

      <div className="grid2">
        <div className="card">
          <div className="rowhead">
            <h2 style={{ fontSize: 19 }}>Aktuelle Entwürfe</h2>
            <div className="spacer" />
            <span className="eyebrow">{ENTWUERFE.length}</span>
          </div>
          <div className="entwuerfe-list">
            {ENTWUERFE.map((e) => (
              <div className="entwurf-item" key={e.titel} onClick={onStudio}>
                <div className="entwurf-thumb" />
                <div className="entwurf-info">
                  <div className="entwurf-title">{e.titel}</div>
                  <div className="entwurf-meta">{e.meta}</div>
                </div>
                <span className={"entwurf-status" + (e.status === "In Freigabe" ? " in-freigabe" : "")}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
          <div className="quellen" style={{ marginTop: 14 }}>Beispieldaten für die Demo, nicht angebunden.</div>
        </div>

        <div className="card">
          <div className="rowhead">
            <h2 style={{ fontSize: 19 }}>Inbox</h2>
            <div className="spacer" />
            <span className="eyebrow">{INBOX.length} offen</span>
          </div>
          <div className="inbox-list">
            {INBOX.map((i) => (
              <div className="inbox-item" key={i.sender}>
                <div className="inbox-avatar"><Mail /></div>
                <div className="inbox-content">
                  <div className="inbox-header">
                    <span className="inbox-sender">{i.sender}</span>
                    <span className="inbox-platform">{i.plattform}</span>
                  </div>
                  <div className="inbox-preview">{i.preview}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="quellen" style={{ marginTop: 14 }}>Beispieldaten für die Demo, nicht angebunden.</div>
        </div>
      </div>
    </>
  );
}
