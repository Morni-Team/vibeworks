import type { Shape } from "../types";

// Demo-Instanz (DEMO_MODE=true): Hinweisleiste und Anmeldung ohne Passwort.

const de = {
  banner: {
    text: "Demo – nur zum Ansehen. Änderungen sind gesperrt, jede Nacht beginnt alles von vorn.",
    signUp: "Eigenes Konto anlegen",
    install: "Selbst installieren",
  },
  login: {
    title: "Ohne Konto reinschauen",
    hint: "Die Demo zeigt VibeWorks mit Beispielprojekten – schreibgeschützt.",
    button: "Demo ansehen",
    busy: "Öffne die Demo …",
  },
  errors: {
    notReady: "Die Demo wird gerade vorbereitet – bitte gleich noch einmal versuchen.",
  },
};

const en: Shape<typeof de> = {
  banner: {
    text: "Demo – view only. Changes are locked, and everything starts over every night.",
    signUp: "Create your own account",
    install: "Install it yourself",
  },
  login: {
    title: "Look around without an account",
    hint: "The demo shows VibeWorks with sample projects – read-only.",
    button: "Open the demo",
    busy: "Opening the demo …",
  },
  errors: {
    notReady: "The demo is being prepared – please try again in a moment.",
  },
};

export default { de, en };
