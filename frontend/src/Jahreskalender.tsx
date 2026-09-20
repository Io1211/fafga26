import { useEffect, useState } from "react";
import { api, Kennzahlen } from "./api";
import { Up } from "./icons";

const MONATSNAMEN = ["Januar", "Februar", "Maerz", "April", "Mai", "Juni", "Juli",
  "August", "September", "Oktober", "November", "Dezember"];
const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const JAHR = 2026;

function parseTage(datum: string): number[] {
  const m = datum.match(/^(\d{1,2})\.(?:[–-](\d{1,2})\.)?\d{2}\.$/);
  if (!m) return [];
  const start = Number(m[1]);
  const end = m[2] ? Number(m[2]) : start;
  const tage: number[] = [];
  for (let d = start; d <= end; d++) tage.push(d);
  return tage;
}

function tageImMonat(monatName: string) {
  const monatIndex = MONATSNAMEN.indexOf(monatName);
  if (monatIndex < 0) return { zellen: [] as (number | null)[] };
  const ersterTag = new Date(JAHR, monatIndex, 1).getDay();
  const versatz = (ersterTag + 6) % 7; // Montag = 0
  const anzahl = new Date(JAHR, monatIndex + 1, 0).getDate();
  const zellen: (number | null)[] = Array(versatz).fill(null);
  for (let tag = 1; tag <= anzahl; tag++) zellen.push(tag);
  return { zellen };
}

export default function Jahreskalender({ onStudio }: { onStudio?: () => void }) {
  const [k, setK] = useState<Kennzahlen | null>(null);
  const [monatTab, setMonatTab] = useState<"jahr" | "monat">("jahr");
  const [aktiverMonat, setAktiverMonat] = useState<string | null>(null);

  useEffect(() => {
    api.kennzahlen().then(setK).catch(() => {});
  }, []);

  const name = aktiverMonat ?? (k?.monate ?? []).find((m) => m.aktiv)?.monat ?? "September";
  const monat = (k?.monate ?? []).find((m) => m.monat === name);

  const eventTage = new Map<number, string[]>();
  (monat?.termine ?? []).forEach((t) => {
    parseTage(t.datum).forEach((tag) => {
      eventTage.set(tag, [...(eventTage.get(tag) ?? []), t.titel]);
    });
  });
  const { zellen } = tageImMonat(name);

  return (
    <div className="card">
      <div className="rowhead">
        <div>
          <div className="eyebrow">Kampagnen, Anlässe und Content</div>
          <h2>Social-Media-Jahreskalender</h2>
        </div>
        <div className="spacer" />
        <div className="tabs">
          <button data-on={monatTab === "jahr"} onClick={() => setMonatTab("jahr")}>Jahr</button>
          <button data-on={monatTab === "monat"} onClick={() => setMonatTab("monat")}>Monat</button>
        </div>
        {onStudio && <button className="btn primary" onClick={onStudio}><Up />Beitrag planen</button>}
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
          {monat?.termine?.length ? (
            <div style={{ marginTop: 14 }}>
              <div className="eyebrow">Termine im {monat.monat}</div>
              <div className="chips" style={{ marginTop: 6 }}>
                {monat.termine.map((t) => (
                  <span className="chip" key={t.titel}>{t.titel} · {t.datum}</span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="eyebrow">{name} {JAHR}</div>
          <div className="daygrid">
            {WOCHENTAGE.map((w) => <div className="weekday" key={w}>{w}</div>)}
            {zellen.map((tag, i) =>
              tag === null ? (
                <div className="day empty" key={"leer" + i} />
              ) : (
                <div className={"day" + (eventTage.has(tag) ? " event" : "")} key={tag}>
                  <div className="num">{tag}</div>
                  {(eventTage.get(tag) ?? []).map((titel) => (
                    <div className="ev" key={titel}>{titel}</div>
                  ))}
                </div>
              )
            )}
          </div>
          {!monat?.termine?.length && (
            <div className="quellen" style={{ marginTop: 14 }}>
              Für {name} sind noch keine Termine hinterlegt.
            </div>
          )}
        </>
      )}
    </div>
  );
}
