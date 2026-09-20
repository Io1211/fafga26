/**
 * Brücke zwischen React und dem Foto- und Video-Editor.
 *
 * Der Editor unter /foto-video-editor ist bewusst gewöhnliches JavaScript
 * ohne Framework — er soll auch ohne Build und ohne Server laufen. Diese
 * Datei ist die einzige Stelle, an der React davon weiß.
 *
 * Einbau in App.tsx: den bisherigen Studio-Inhalt durch <FotoVideoEditor />
 * ersetzen. Die linke Übersicht bleibt, wie sie ist.
 *
 *     {view === "studio" && <FotoVideoEditor house={house} />}
 */

import { useEffect, useRef } from "react";
import type { Copy, House } from "./api";

// Vite bündelt beides mit, obwohl es außerhalb von frontend/ liegt.
import * as editor from "../../foto-video-editor/editor.js";
import { alsBild } from "../../foto-video-editor/image.js";
import {
  state, laden, uebernehmeHaus, uebernehmeCopy, setzePost, kartenAus,
} from "../../foto-video-editor/zustand.js";
import "../../foto-video-editor/editor.css";

interface Props {
  /** Das Haus aus GET /api/house. Wird übernommen, sobald es da ist. */
  house?: House | null;
  /** Ein fertiger Textvorschlag, etwa aus POST /api/posts → PostOut.text. */
  copy?: Copy | null;
}

export default function FotoVideoEditor({ house, copy }: Props) {
  const buehne = useRef<HTMLDivElement>(null);
  const bedienung = useRef<HTMLDivElement>(null);
  const gebaut = useRef(false);

  /* Einmal aufbauen. Der Editor verwaltet seinen Inhalt danach selbst —
     React darf da nicht mehr hineinrendern, sonst löscht es ihn weg. */
  useEffect(() => {
    if (gebaut.current || !buehne.current || !bedienung.current) return;
    gebaut.current = true;

    laden();                       // gesicherte Vorlage und Feineinstellungen

    // Ohne Post bleibt die Vorschau leer — also einen Platzhaltertext setzen,
    // bis das Backend einen echten liefert.
    if (!state.post) {
      const head = ["EIN FOTO", "REICHT."];
      setzePost({
        kicker: "", head, key: "REICHT.", caption: "", tags: "",
        quellen: [], cards: kartenAus(head, "REICHT."),
      });
    }

    editor.aufbauen(buehne.current, bedienung.current);
  }, []);

  /* Haus und Text nachziehen, sobald sie eintreffen oder sich ändern. */
  useEffect(() => { if (house) uebernehmeHaus(house); }, [house]);
  useEffect(() => { if (copy) uebernehmeCopy(copy); }, [copy]);

  return (
    <div className="fve-raum">
      <div ref={buehne} />
      <div ref={bedienung} />
    </div>
  );
}

/**
 * Das fertige Bild holen, etwa um es an POST /api/posts zu hängen oder
 * herunterzuladen. Nutzt dieselbe Zeichenroutine wie die Vorschau.
 */
export function aktuellesBild(): Promise<Blob | null> {
  return alsBild();
}
