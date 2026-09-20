import { useEffect, useState } from "react";
import { api, House } from "./api";
import { Cal, Cam, Chart, Doc, Gear, Grid, Haus, Logo, Mail, Search, Send, Spark } from "./icons";
import Uebersicht from "./Uebersicht";
import FotoVideoEditor from "./FotoVideoEditor";
import Ideen from "./Ideen";
import Jahreskalender from "./Jahreskalender";
import Assistent from "./Assistent";
import Kanaele from "./Kanaele";
import Kennzahlen from "./Kennzahlen";
import Inbox from "./Inbox";

type View = "uebersicht" | "studio" | "ideen" | "jahreskalender" | "assistent" | "kanaele" | "kennzahlen" | "inbox";

const SIMULIERT: View[] = ["jahreskalender", "kanaele", "kennzahlen", "inbox"];

const NAV: { id: View; label: string; icon: JSX.Element; badge?: string }[] = [
  { id: "uebersicht", label: "Übersicht", icon: <Grid /> },
  // Ausgeblendet: der Ideen-Assistent ist ins Studio gewandert. Dort füllt
  // ein Anweisungsfeld die Textfelder direkt, statt in einem eigenen Schritt.
  // Ansicht und Komponente bleiben bestehen, nur der Eintrag fehlt.
  { id: "studio", label: "Studio", icon: <Doc /> },
  { id: "ideen", label: "Caption-Ideen", icon: <Spark /> },
  { id: "jahreskalender", label: "Jahreskalender", badge: "simuliert", icon: <Cal /> },
  { id: "kanaele", label: "Kanäle", badge: "simuliert", icon: <Send /> },
  { id: "kennzahlen", label: "Kennzahlen", badge: "simuliert", icon: <Chart /> },
  { id: "inbox", label: "Inbox", badge: "simuliert", icon: <Mail /> },
];

export default function App() {
  const [view, setView] = useState<View>("uebersicht");
  const [house, setHouse] = useState<House | null>(null);
  const [mistral, setMistral] = useState<boolean | null>(null);

  useEffect(() => {
    api.house().then(setHouse).catch(() => {});
    api.health().then((h) => setMistral(h.mistral)).catch(() => setMistral(null));
  }, []);

  const heute = new Date().toLocaleDateString("de-AT", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <Logo className="mark" />
          <div>
            <b>Postify</b>
            <span>Idee, Foto, Post</span>
          </div>
        </div>

        <div className="prop">
          <div className="ic"><Haus /></div>
          <div style={{ minWidth: 0 }}>
            <b>{house?.name ?? "…"}</b>
            <small>{house ? `${house.ort} · ${house.art}` : ""}</small>
          </div>
        </div>

        <div className="navlabel">Cockpit</div>
        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.id} data-on={view === n.id} onClick={() => setView(n.id)}>
              {n.icon}{n.label}
              {n.badge && <span className="badge">{n.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="focus">
          <b><Spark />September Fokus</b>
          <p>Erntezeit, Herbstküche und offene Stellen im Service.</p>
        </div>

        <button className="nav" style={{ border: 0, background: "none", padding: "10px 12px",
          display: "flex", gap: 12, color: "var(--muted)" }}>
          <Gear />Einstellungen
        </button>
      </aside>

      <main className="main">
        <div className="card top">
          <div>
            <h1>{view === "studio" ? "Studio" : view === "ideen" ? "Caption-Ideen"
              : view === "jahreskalender" ? "Jahreskalender"
              : view === "assistent" ? "Ideen-Assistent"
              : view === "kanaele" ? "Kanäle"
              : view === "kennzahlen" ? "Kennzahlen"
              : view === "inbox" ? "Inbox" : "Operations-Cockpit"}</h1>
            <div className="sub">{heute} · {house?.name ?? ""}
              {SIMULIERT.includes(view) && <> · <span className="tag grau">simuliert</span></>}
            </div>
          </div>
          <div className="spacer" />
          <div className="search"><Search />Suchen</div>
          <span className={"tag " + (mistral ? "gast" : "grau")}>
            {mistral === null ? "Backend offline" : mistral ? "Mistral verbunden" : "Haus-Muster"}
          </span>
          <div className="avatar">LM</div>
        </div>

        {view === "uebersicht" && <Uebersicht onStudio={() => setView("studio")} onIdeen={() => setView("ideen")} />}
        {view === "assistent" && <Assistent />}
        {view === "studio" && <FotoVideoEditor house={house} />}
        {view === "ideen" && <Ideen />}
        {view === "jahreskalender" && <Jahreskalender onStudio={() => setView("studio")} />}
        {view === "kanaele" && <Kanaele />}
        {view === "kennzahlen" && <Kennzahlen />}
        {view === "inbox" && <Inbox />}
      </main>
    </div>
  );
}
