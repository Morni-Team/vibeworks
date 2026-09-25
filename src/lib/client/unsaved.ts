"use client";

import { useEffect } from "react";
import { confirmDialog } from "./dialogs";
import { tk } from "@/lib/i18n/messages";

// Warnung vor ungespeicherter Arbeit (#205): Der vorhandene Schutz greift nur
// in Dialogen und beim Schließen des Fensters. Wer aber mitten im Bearbeiten
// auf einen Link in der Seitenleiste klickt, verliert seine Eingaben still.
//
// Hier registrieren Formulare, dass sie ungespeicherte Änderungen haben. Ein
// einziger Abfänger horcht dann auf Klicks auf interne Links, fragt mit dem
// VibeWorks-Dialog nach (nicht mit dem Browser-Kasten) und navigiert erst
// danach. Fremde Adressen und neue Tabs bleiben unangetastet.

const dirty = new Set<string>();
let attached = false;

function isInternalLink(el: EventTarget | null): HTMLAnchorElement | null {
  const a = el instanceof Element ? el.closest("a") : null;
  if (!a || !a.href) return null;
  if (a.target && a.target !== "_self") return null;
  if (a.hasAttribute("download") || a.dataset.noGuard === "1") return null;
  try {
    const url = new URL(a.href);
    if (url.origin !== window.location.origin) return null;
    // Nur echtes Weggehen zählt – ein Sprung auf derselben Seite nicht
    if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  } catch {
    return null;
  }
  return a;
}

function attach() {
  if (attached || typeof document === "undefined") return;
  attached = true;
  // Ein einziger Wächter fürs Schließen des Fensters – er fragt die Menge ab.
  // Wichtig: Nach einer bestätigten Navigation ist die Menge leer, sonst hielte
  // der Browser sein eigenes Fenster dagegen und das Weggehen scheiterte.
  window.addEventListener("beforeunload", (e) => {
    if (!dirty.size) return;
    e.preventDefault();
    e.returnValue = "";
  });
  document.addEventListener(
    "click",
    (e) => {
      if (!dirty.size || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = isInternalLink(e.target);
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      const ziel = a.href;
      void confirmDialog(tk("common", "leave.editMessage"), { title: tk("common", "leave.title"), danger: true }).then((ok) => {
        if (!ok) return;
        dirty.clear();
        window.location.href = ziel;
      });
    },
    true,
  );
}

/**
 * Meldet an, dass dieses Formular ungespeicherte Änderungen hat. Beim Aushängen
 * oder sobald gespeichert wurde, meldet es sich von selbst wieder ab.
 */
export function useUnsavedWarning(key: string, isDirty: boolean) {
  useEffect(() => {
    attach();
    if (!isDirty) {
      dirty.delete(key);
      return;
    }
    dirty.add(key);
    return () => {
      dirty.delete(key);
    };
  }, [key, isDirty]);
}
