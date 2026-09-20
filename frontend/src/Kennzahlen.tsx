import { useState } from "react";
import { Facebook, Insta, LinkedIn } from "./icons";

type KanalId = "instagram" | "facebook" | "linkedin";

const KANAELE: { id: KanalId; label: string; kurz: string; farbe: string; icon: JSX.Element }[] = [
  { id: "instagram", label: "Instagram", kurz: "IG", farbe: "var(--series-1)", icon: <Insta /> },
  { id: "facebook", label: "Facebook", kurz: "FB", farbe: "var(--series-2)", icon: <Facebook /> },
  { id: "linkedin", label: "LinkedIn", kurz: "LI", farbe: "var(--series-3)", icon: <LinkedIn /> },
];

const WOCHEN = ["KW 26", "KW 27", "KW 28", "KW 29", "KW 30", "KW 31", "KW 32", "KW 33"];

const REICHWEITE: Record<KanalId, number[]> = {
  instagram: [1200, 1350, 1290, 1480, 1600, 1550, 1720, 1810],
  facebook: [640, 600, 710, 680, 750, 790, 820, 860],
  linkedin: [210, 240, 230, 260, 300, 310, 340, 360],
};

const INTERAKTIONEN: Record<KanalId, number> = { instagram: 1580, facebook: 690, linkedin: 240 };

const KPIS = [
  { label: "Reichweite (28 Tage)", wert: "18.240", delta: 12.4,
    spark: [11200, 11600, 11400, 12100, 12800, 13500, 13100, 14200, 15000, 15600, 16800, 18240] },
  { label: "Interaktionen", wert: "2.510", delta: 8.1,
    spark: [1620, 1700, 1680, 1810, 1900, 1950, 2020, 2100, 2180, 2260, 2380, 2510] },
  { label: "Neue Follower", wert: "364", delta: -3.2,
    spark: [420, 400, 410, 390, 380, 385, 370, 375, 368, 360, 358, 364] },
  { label: "Engagement-Rate", wert: "4,6 %", delta: 0.6,
    spark: [3.9, 4.0, 3.8, 4.1, 4.2, 4.0, 4.3, 4.2, 4.4, 4.3, 4.5, 4.6] },
];

const TOP_POSTS: { titel: string; kanal: KanalId; datum: string; reichweite: number; interaktionen: number }[] = [
  { titel: "Herbstmenü – Kürbissuppe", kanal: "instagram", datum: "12. Sep", reichweite: 4210, interaktionen: 312 },
  { titel: "Weinverkostung Freitag", kanal: "instagram", datum: "5. Sep", reichweite: 3080, interaktionen: 201 },
  { titel: "Mitarbeiter gesucht: Service", kanal: "facebook", datum: "9. Sep", reichweite: 1860, interaktionen: 96 },
  { titel: "Team-Ausflug ins Weingut", kanal: "linkedin", datum: "2. Sep", reichweite: 960, interaktionen: 54 },
];

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1))));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}

function fmt(n: number) {
  return n.toLocaleString("de-AT");
}

function Sparkline({ werte }: { werte: number[] }) {
  const w = 100, h = 30, pad = 3;
  const min = Math.min(...werte), max = Math.max(...werte);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (werte.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const pts = werte.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const lastPts = werte.slice(-2).map((v, i) => `${x(werte.length - 2 + i)},${y(v)}`).join(" ");
  const lastX = x(werte.length - 1), lastY = y(werte[werte.length - 1]);
  return (
    <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--fg-faint)" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={lastPts} fill="none" stroke="var(--accent)" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={3} fill="var(--accent)" stroke="var(--card)" strokeWidth={2} />
    </svg>
  );
}

function hbarPath(x0: number, y0: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, h / 2, w));
  if (w <= 0.5) return `M${x0},${y0} h0.5 v${h} h-0.5 Z`;
  return `M${x0},${y0} H${x0 + w - rr} Q${x0 + w},${y0} ${x0 + w},${y0 + rr} ` +
    `V${y0 + h - rr} Q${x0 + w},${y0 + h} ${x0 + w - rr},${y0 + h} H${x0} Z`;
}

function ReichweiteChart() {
  const [hover, setHover] = useState<number | null>(null);
  const [tabelle, setTabelle] = useState(false);
  const W = 640, H = 220, padL = 12, padR = 12, padT = 12, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = WOCHEN.length;
  const max = niceMax(Math.max(...KANAELE.flatMap((k) => REICHWEITE[k.id])));
  const steps = 4;

  const x = (i: number) => padL + (innerW * i) / (n - 1);
  const y = (v: number) => padT + innerH * (1 - v / max);

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idx = Math.round(((px - padL) / innerW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, idx)));
  }

  return (
    <div className="card chart-card">
      <div className="rowhead">
        <div>
          <div className="eyebrow">Letzte 8 Wochen</div>
          <h2 style={{ fontSize: 19 }}>Reichweite je Kanal</h2>
        </div>
        <div className="spacer" />
        <div className="chart-legend">
          {KANAELE.map((k) => (
            <span className="legend-item" key={k.id}>
              <i style={{ background: k.farbe }} />{k.label}
            </span>
          ))}
        </div>
        <button className="btn" style={{ marginLeft: 12 }} onClick={() => setTabelle((t) => !t)}>
          {tabelle ? "Diagramm" : "Als Tabelle"}
        </button>
      </div>

      {tabelle ? (
        <div style={{ overflowX: "auto" }}>
          <table className="kz-table">
            <thead>
              <tr>
                <th>Woche</th>
                {KANAELE.map((k) => <th key={k.id}>{k.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {WOCHEN.map((w, i) => (
                <tr key={w}>
                  <td>{w}</td>
                  {KANAELE.map((k) => <td key={k.id}>{fmt(REICHWEITE[k.id][i])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
            {Array.from({ length: steps + 1 }, (_, s) => {
              const v = (max / steps) * s;
              const gy = y(v);
              return (
                <g key={s}>
                  <line x1={padL} x2={W - padR} y1={gy} y2={gy} stroke="var(--line)" strokeWidth={1} />
                  <text x={2} y={gy - 3} fontSize={9} fill="var(--fg-faint)" fontFamily="var(--mono)">
                    {fmt(Math.round(v))}
                  </text>
                </g>
              );
            })}

            {KANAELE.map((k) => {
              const werte = REICHWEITE[k.id];
              const pts = werte.map((v, i) => `${x(i)},${y(v)}`).join(" ");
              const lastX = x(n - 1), lastY = y(werte[n - 1]);
              return (
                <g key={k.id}>
                  <polyline points={pts} fill="none" stroke={k.farbe} strokeWidth={2}
                    strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx={lastX} cy={lastY} r={4} fill={k.farbe} stroke="var(--card)" strokeWidth={2} />
                  <text x={lastX + 7} y={lastY + 3} fontSize={10} fill="var(--muted)">{k.kurz}</text>
                </g>
              );
            })}

            {hover !== null && (
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB}
                stroke="var(--fg-faint)" strokeWidth={1} />
            )}

            <rect x={padL} y={padT} width={innerW} height={innerH} fill="transparent"
              onMouseMove={onMove} onMouseLeave={() => setHover(null)} />

            {WOCHEN.map((w, i) => (
              (i === 0 || i === n - 1 || i === hover) && (
                <text key={w} x={x(i)} y={H - 8} fontSize={9} fill="var(--fg-faint)"
                  textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                  fontFamily="var(--mono)">{w}</text>
              )
            ))}
          </svg>

          {hover !== null && (
            <div className="chart-tooltip" style={{ left: `${(x(hover) / W) * 100}%` }}>
              <b>{WOCHEN[hover]}</b>
              {KANAELE.map((k) => (
                <div key={k.id} className="chart-tooltip-row">
                  <i style={{ background: k.farbe }} />
                  <span>{k.label}</span>
                  <b>{fmt(REICHWEITE[k.id][hover])}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="quellen" style={{ marginTop: 12 }}>Kennzahlen sind Beispieldaten. Produktiv kommen sie aus den Kanal-APIs.</div>
    </div>
  );
}

function InteraktionenChart() {
  const max = niceMax(Math.max(...Object.values(INTERAKTIONEN)));
  const rowH = 20, gap = 22, labelW = 84, valueW = 56, padR = 8;

  return (
    <div className="card chart-card">
      <div className="rowhead">
        <div>
          <div className="eyebrow">Letzte 28 Tage</div>
          <h2 style={{ fontSize: 19 }}>Interaktionen je Kanal</h2>
        </div>
      </div>
      <svg viewBox={`0 0 400 ${KANAELE.length * gap + 6}`} width="100%" height={KANAELE.length * gap + 6}>
        {KANAELE.map((k, i) => {
          const val = INTERAKTIONEN[k.id];
          const trackW = 400 - labelW - valueW - padR;
          const w = (val / max) * trackW;
          const y0 = i * gap;
          return (
            <g key={k.id} tabIndex={0}>
              <title>{`${k.label}: ${fmt(val)} Interaktionen`}</title>
              <text x={0} y={y0 + rowH / 2 + 4} fontSize={11} fill="var(--ink)">{k.label}</text>
              <rect x={labelW} y={y0 + 2} width={trackW} height={rowH - 4} rx={2} fill="var(--surface-2)" />
              <path d={hbarPath(labelW, y0 + 2, w, rowH - 4, 4)} fill={k.farbe} />
              <text x={labelW + trackW + 8} y={y0 + rowH / 2 + 4} fontSize={11} fill="var(--muted)"
                fontFamily="var(--mono)">{fmt(val)}</text>
            </g>
          );
        })}
      </svg>
      <div className="quellen" style={{ marginTop: 12 }}>Beispieldaten für die Demo, nicht angebunden.</div>
    </div>
  );
}

export default function Kennzahlen() {
  return (
    <>
      <div className="kpis">
        {KPIS.map((k) => (
          <div className="card kpi" key={k.label}>
            <div className="lbl">{k.label}</div>
            <div className="val">{k.wert}</div>
            <div className={"delta " + (k.delta >= 0 ? "up" : "down")}>
              {k.delta >= 0 ? "+" : "−"}{Math.abs(k.delta).toFixed(1)} % zur Vorwoche
            </div>
            <Sparkline werte={k.spark} />
          </div>
        ))}
      </div>

      <div className="grid2">
        <ReichweiteChart />
        <InteraktionenChart />
      </div>

      <div className="card">
        <div className="rowhead">
          <h2 style={{ fontSize: 19 }}>Top-Beiträge</h2>
          <div className="spacer" />
          <span className="eyebrow">{TOP_POSTS.length}</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="kz-table">
            <thead>
              <tr>
                <th>Beitrag</th><th>Kanal</th><th>Datum</th><th>Reichweite</th><th>Interaktionen</th>
              </tr>
            </thead>
            <tbody>
              {TOP_POSTS.map((p) => {
                const k = KANAELE.find((c) => c.id === p.kanal)!;
                return (
                  <tr key={p.titel}>
                    <td>{p.titel}</td>
                    <td><span className="legend-item"><i style={{ background: k.farbe }} />{k.label}</span></td>
                    <td>{p.datum}</td>
                    <td>{fmt(p.reichweite)}</td>
                    <td>{fmt(p.interaktionen)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="quellen" style={{ marginTop: 12 }}>Beispieldaten für die Demo, nicht angebunden.</div>
      </div>
    </>
  );
}
