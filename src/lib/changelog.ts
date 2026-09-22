// Änderungsverlauf – einzige Quelle für die Versionsanzeige in der App.
// Neueste Version zuerst. Ein Test stellt sicher, dass der oberste Eintrag
// zur Version in package.json passt.
//
// Versionsschema: Zählwerk mit Übertrag bei 9 (0.0.9 → 0.1.0 → … → 0.9.9 → 1.0.0),
// hochgezählt mit `npm run version:bump`.
//
// Deutsch ist maßgeblich; titleEn und en sind die englischen Fassungen für
// die Oberfläche auf Englisch. Fehlen sie, zeigt der Dialog Deutsch.

export type ChangeType = "neu" | "besser" | "fix";

export interface ChangelogChange {
  type: ChangeType;
  text: string;
  en?: string;
  /** Seite oder Einstellung der Neuerung (Pfad dieser Instanz) – Hinweis in der Glocke und „Ansehen“ im Verlauf führen dorthin */
  link?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  titleEn?: string;
  changes: ChangelogChange[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.5.4",
    date: "2026-09-22",
    title: "Repo-Check läuft bei jedem Commit",
    titleEn: "Repo check now runs on every commit",
    changes: [
      {
        type: "fix",
        text: "Der Repo-Check startete bisher nur, wenn sich seine eigene Datei änderte – bei normalen Code-Änderungen also nie. Jetzt läuft er bei jedem Commit auf dem Hauptzweig und bei Pull Requests; reine Textänderungen wie Doku lösen ihn weiterhin nicht aus",
        en: "The repo check only started when its own file changed – so never on normal code changes. It now runs on every commit to the main branch and on pull requests; pure text changes like docs still don't trigger it",
      },
      {
        type: "besser",
        text: "Die Prüfwerkzeuge sind auf feste Versionen festgelegt statt auf „neueste“ – derselbe Stand liefert damit wieder dasselbe Ergebnis",
        en: "The scanning tools are pinned to fixed versions instead of “latest” – the same code now yields the same result again",
      },
      {
        type: "besser",
        text: "Der Repo-Check benutzt dieselbe Code-Analyse-Ausnahmeliste wie das Projekt selbst, sofern vorhanden – keine doppelten Meldungen mehr für längst geduldete Stellen",
        en: "The repo check uses the project's own code-analysis baseline where present – no more duplicate reports for long-accepted spots",
      },
    ],
  },
  {
    version: "1.5.3",
    date: "2026-09-22",
    title: "Code-Analyse aufgeräumt",
    titleEn: "Code analysis tidied up",
    changes: [
      {
        type: "besser",
        text: "16 Typ-Angaben waren nach außen geöffnet, obwohl sie niemand von außen braucht – jetzt bleiben sie in ihrer Datei. Die Code-Analyse ist dadurch wieder ohne geduldete Ausnahmen sauber",
        en: "16 type declarations were exposed although nothing outside uses them – they now stay in their own file. The code analysis is clean again without tolerated exceptions",
      },
    ],
  },
  {
    version: "1.5.2",
    date: "2026-09-22",
    title: "Nacharbeiten aus der Code-Prüfung",
    titleEn: "Follow-ups from the code review",
    changes: [
      {
        type: "fix",
        text: "CI-Designer: „Schritt hinzufügen“ warf einen Fehler, sobald VibeWorks nicht über https oder localhost aufgerufen wurde – im Heimnetz also immer. Die Kennung eines Schritts entsteht jetzt ohne den Zufallsgeber, den es nur über https gibt",
        en: "CI designer: “Add step” threw an error whenever VibeWorks was opened without https or localhost – so always on a home network. A step's id is now created without the random source that only exists over https",
      },
      {
        type: "fix",
        text: "OAuth für KI-Programme: Kennung und Rückkehr-Adresse werden jetzt gegen die Anmeldung des Programms geprüft. Vorher war beides frei wählbar – ein untergeschobener Link hätte den Zugangsschlüssel abfangen können. Die Freigabe-Seite nennt dafür jetzt den echten Namen des Programms statt „OAuth-Programm“",
        en: "OAuth for AI programs: client id and return address are now checked against the program's registration. Before, both were freely choosable – a planted link could have intercepted the access key. The consent page now shows the program's real name instead of “OAuth program”",
        link: "/verbinden",
      },
      {
        type: "fix",
        text: "Fehlt der Git-Zugang, meldet VibeWorks das wieder klar, statt mit leerem Schlüssel anzufragen und „Bad credentials“ zu bekommen",
        en: "Without a Git access, VibeWorks says so clearly again instead of asking with an empty key and getting “Bad credentials”",
      },
      {
        type: "besser",
        text: "Weitere Kleinigkeiten: der Zugangsschlüssel gilt nicht mehr als sofort abgelaufen, Autorisierungen sind je Adresse begrenzt und werden aufgeräumt, und die Tageszusammenfassung fällt nicht mehr für alle aus, wenn ein Lauf abbricht",
        en: "More small things: the access key is no longer reported as already expired, authorizations are limited per address and cleaned up, and the daily summary no longer fails for everyone when a run breaks off",
      },
    ],
  },
  {
    version: "1.5.1",
    date: "2026-09-19",
    title: "OAuth-Freigabe kehrt zum Programm zurück",
    titleEn: "OAuth approval now returns to the program",
    changes: [
      {
        type: "fix",
        text: "Nach dem Erlauben auf der Freigabe-Seite hing ChatGPT ewig: Der Browser kehrte nie zur Programm-Adresse zurück. Jetzt wird die Autorisierung dorthin abgeschlossen (mit Code und state) – auch eine Ablehnung meldet sich sauber zurück",
        en: "After approving on the consent page, ChatGPT hung forever: the browser never returned to the program's address. The authorization now completes there (with code and state) – a denial also reports back cleanly",
        link: "/verbinden",
      },
      {
        type: "besser",
        text: "Die Freigabe-Seite zeigt den state des Programms nicht mehr an – er bleibt serverseitig gemerkt und kommt nur auf der Rückkehr mit",
        en: "The consent page no longer shows the program's state – it stays server-side and only travels on the return trip",
      },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-09-19",
    title: "OAuth-Metadaten sind wieder öffentlich – ChatGPT verbindet sich jetzt",
    titleEn: "OAuth metadata is public again – ChatGPT now connects",
    changes: [
      {
        type: "fix",
        text: "Der Anmelde-Schutz hat versehentlich die OAuth-Metadaten unter /.well-known hinter die Anmeldung geschickt – ChatGPT meldete „does not implement OAuth“. Die Metadaten sind wieder frei lesbar (sie enthalten nichts Geheimes) und liegen auch am pfadbasierten Ort, den ChatGPT fragt",
        en: "The login guard accidentally sent OAuth metadata under /.well-known behind the login – ChatGPT reported “does not implement OAuth”. The metadata is freely readable again (it contains no secrets) and is also served at the path-based location ChatGPT queries",
      },
      {
        type: "besser",
        text: "Die 401-Antwort des MCP-Endpunkts trägt den Ressourcen-Metadaten-Zeiger jetzt direkt im WWW-Authenticate-Header – Clients, die nur diesem folgen, finden den Weg",
        en: "The MCP endpoint's 401 response now carries the resource-metadata pointer directly in the WWW-Authenticate header – clients that only follow this pointer find their way",
      },
    ],
  },
  {
    version: "1.4.9",
    date: "2026-09-19",
    title: "MCP mit OAuth (PKCE): ChatGPT & Co. verbinden sich selbst",
    titleEn: "MCP with OAuth (PKCE): ChatGPT & Co. connect themselves",
    changes: [
      {
        type: "neu",
        text: "KI-Programme, die OAuth verlangen (z. B. ChatGPT-Connectors), registrieren sich jetzt selbst am MCP-Endpunkt – die Freigabe bleibt beim Menschen auf der bewährten Seite „KI-Programm verbinden“",
        en: "AI programs that require OAuth (e.g. ChatGPT connectors) now register themselves at the MCP endpoint – approval stays with you on the proven “Connect an AI program” page",
        link: "/verbinden",
      },
      {
        type: "besser",
        text: "Der MCP-Endpunkt wirbt OAuth-Server-Metadaten mit PKCE (S256) aus – genau das verlangte ChatGPT und lehnte den Connector vorher ab",
        en: "The MCP endpoint now advertises OAuth server metadata with PKCE (S256) – exactly what ChatGPT requires and previously rejected",
      },
    ],
  },
  {
    version: "1.4.8",
    date: "2026-09-19",
    title: "Bot klar erkennbar: neutraler Name, Organisations-Unterstützung",
    titleEn: "Bot clearly recognizable: neutral name, organization support",
    changes: [
      {
        type: "besser",
        text: "Der Bot per Klick heißt jetzt neutral „vibeworks-bot“ – sein Name leitet sich nicht mehr vom persönlichen Konto ab, sondern ist klar als Bot erkennbar",
        en: "The one-click bot is now neutrally named “vibeworks-bot” – its name no longer derives from the personal account, making it clearly recognizable as a bot",
        link: "/account#git-zugang",
      },
      {
        type: "neu",
        text: "Bot in Organisationen: Auf der Installationsseite lässt sich ein Organisations-Konto wählen – der Bot arbeitet damit auch in Organisations-Repositories; die Verbindungsseite erklärt den Weg",
        en: "Bot in organizations: the installation page lets you pick an organization account – the bot then also works in organization repositories; the connections page explains the path",
      },
    ],
  },
  {
    version: "1.4.7",
    date: "2026-09-19",
    title: "Schlüssel-Formular aufgeräumt: Felder nebeneinander statt rechts gequetscht",
    titleEn: "Key form tidied up: fields side by side instead of squeezed to the right",
    changes: [
      {
        type: "fix",
        text: "Beim Anlegen eines API-Schlüssels hingen Name, Gültigkeit und Knopf verloren rechts in einer schmalen Spalte – jetzt als saubere Karte mit Feldern nebeneinander (auf dem Handy untereinander)",
        en: "When creating an API key, name, validity and button hung lost on the right in a narrow column – now a clean card with fields side by side (stacked on mobile)",
        link: "/account#mcp",
      },
    ],
  },
  {
    version: "1.4.6",
    date: "2026-09-19",
    title: "Bot-Identität transparent: Hinweis + Installations-Link, wenn der Bot fehlt",
    titleEn: "Bot identity transparent: hint + install link when the bot is missing",
    changes: [
      {
        type: "neu",
        text: "KI-Kommentare im Issue melden jetzt, unter welcher Identität sie erschienen sind – und liefern einen Installations-Link, wenn der Bot im Repository fehlt (sonst läuft der Kommentar unter dem Konto des Besitzers)",
        en: "AI comments on an issue now report which identity they were posted under – and include an install link when the bot is missing in the repository (otherwise the comment runs under the owner's account)",
        link: "/account#git-zugang",
      },
      {
        type: "besser",
        text: "Schreibfehler des Bots (HTTP 403) erklären jetzt, dass der Bot-App Rechte fehlen – mit direktem Link zu den App-Einstellungen zur erneuten Freigabe",
        en: "Bot write failures (HTTP 403) now explain that the bot app lacks permissions – with a direct link to the app settings for re-approval",
      },
    ],
  },
  {
    version: "1.4.5",
    date: "2026-09-19",
    title: "CI-Designer wie ein Flow-Editor: Start-Node, verbinden, Node-Menü",
    titleEn: "CI designer like a flow editor: start node, connect, node menu",
    changes: [
      {
        type: "neu",
        text: "Start-Node zeigt, wo die Pipeline beginnt – die Blöcke hängen sichtbar dahinter",
        en: "A start node shows where the pipeline begins – the blocks hang visibly behind it",
        link: "/projects#ci",
      },
      {
        type: "neu",
        text: "Nodes verbinden wie im Flow-Editor: Ausgang antippen, Ziel antippen – der Block wandert in den Ablauf dahinter",
        en: "Connect nodes like in a flow editor: tap the output, tap the target – the block moves into the flow behind it",
        link: "/projects#ci",
      },
      {
        type: "neu",
        text: "Node-Menü am Kästchen: bearbeiten, danach einfügen, verschieben, entfernen – ohne die Liste unten zu brauchen",
        en: "Node menu on the box: edit, insert after, move, remove – without needing the list below",
        link: "/projects#ci",
      },
      {
        type: "besser",
        text: "Auf Handys: größere Werkzeug-Knöpfe (44 px) und mehr Platz für die Node-Ansicht",
        en: "On phones: bigger tool buttons (44 px) and more room for the node view",
        link: "/projects#ci",
      },
    ],
  },
  {
    version: "1.4.4",
    date: "2026-09-19",
    title: "CI-Designer: Vollbild und Bearbeiten direkt an den Nodes",
    titleEn: "CI designer: fullscreen and editing right at the nodes",
    changes: [
      {
        type: "neu",
        text: "Vollbild-Knopf für die Node-Ansicht – ohne Browserleiste, zurück per Esc oder Knopf, mit Speichern direkt im Vollbild",
        en: "Fullscreen button for the node view – no browser bars, exit with Esc or the button, saving right in fullscreen",
        link: "/projects#ci",
      },
      {
        type: "neu",
        text: "Node antippen bearbeitet ihn direkt am Kästchen (Name, Wann, Skript, Version, Befehle) – nicht mehr nur in der Liste unten",
        en: "Tap a node to edit it right there (name, when, script, version, commands) – no longer only in the list below",
        link: "/projects#ci",
      },
      {
        type: "fix",
        text: "Der Pfeil-Knopf verwirrte: Er zeigt jetzt klar „Als Liste zeigen“ und in der Liste gibt es den Rückweg „Als Nodes zeigen“",
        en: "The arrow button was confusing: it now clearly says “Show as list” and the list has the way back, “Show as nodes”",
        link: "/projects#ci",
      },
    ],
  },
  {
    version: "1.4.3",
    date: "2026-09-18",
    title: "CI-Designer als eigene Seite mit Node-Ansicht, Sparmodus für Handys",
    titleEn: "CI designer on its own page with node view, saver mode for phones",
    changes: [
      {
        type: "neu",
        text: "Der CI-Designer hat jetzt eine eigene Seite: die Pipeline als verbundene Nodes mit Zoomen und Verschieben, laufende Schritte leuchten und fließen, alles bleibt einstell- und startbar",
        en: "The CI designer now has its own page: the pipeline as connected nodes with zoom and pan, running steps glow and flow, everything stays configurable and startable",
        link: "/projects#ci",
      },
      {
        type: "neu",
        text: "Lighthouse-Check einstellbar: wann geprüft wird (täglich oder wöchentlich, mit Uhrzeit) stellt der Besitzer direkt am Panel ein",
        en: "Lighthouse check configurable: when to check (daily or weekly, with a time) is set by the owner right in the panel",
      },
      {
        type: "besser",
        text: "Sparmodus auf Handys: Hintergrundanimationen ruhen und die Netz-Simulation rechnet seltener – weniger Strom, alles bleibt bedienbar",
        en: "Saver mode on phones: background animations pause and the graph simulation runs less often – less battery, everything stays usable",
      },
    ],
  },
  {
    version: "1.4.2",
    date: "2026-09-18",
    title: "Codennetz-Zoom endgültig repariert",
    titleEn: "Code graph zoom truly fixed",
    changes: [
      {
        type: "fix",
        text: "Der Zwei-Finger-Zoom nahm fälschlich die Ansicht vom Laden der Seite als Ausgang – nach dem ersten Einpassen zog das Netz deshalb beim Auseinanderziehen zusammen; jetzt stimmt die Geste in jeder Lage",
        en: "Two-finger zoom wrongly used the view from page load as its base – after the first auto-fit spreading fingers contracted the graph; the gesture now behaves correctly in every state",
        link: "/projects#code-graph",
      },
      {
        type: "besser",
        text: "Vollbild klappt jetzt auch in Safari auf dem iPhone/iPad (herstellerspezifischer Aufruf ergänzt)",
        en: "Fullscreen now also works in Safari on iPhone/iPad (vendor-specific call added)",
      },
    ],
  },
  {
    version: "1.4.1",
    date: "2026-09-18",
    title: "Codennetz auf dem Handy richtig bedienbar",
    titleEn: "Code graph fully usable on phones",
    changes: [
      {
        type: "fix",
        text: "Zwei-Finger-Zoom im Codennetz funktioniert jetzt zuverlässig: die Geste zoomt das Netz statt der Seite, auseinander ziehen vergrößert wirklich",
        en: "Two-finger zoom in the code graph now works reliably: the gesture zooms the graph instead of the page, spreading fingers truly zooms in",
        link: "/projects#code-graph",
      },
      {
        type: "besser",
        text: "Vollbild nutzt auf dem Handy den echten Vollbildmodus – keine Browserleiste und keine aufklappende Tastatur mehr; die Schaltfläche ist größer und leichter zu treffen",
        en: "Fullscreen on phones now uses true fullscreen – no browser bar and no popping-up keyboard anymore; the button is larger and easier to hit",
      },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-09-18",
    title: "Handy-Verbesserungen",
    titleEn: "Mobile improvements",
    changes: [
      {
        type: "fix",
        text: "Das Codennetz läuft jetzt auch auf Touch-Geräten: zwei Finger zoomen, Ziehen und Antippen funktionieren zuverlässig, Vollbild füllt das Handydisplay korrekt",
        en: "The code graph now works on touch devices: pinch with two fingers to zoom, dragging and tapping are reliable, fullscreen fills the phone screen correctly",
        link: "/projects#code-graph",
      },
      {
        type: "fix",
        text: "Lange Adressen und Befehle (Ideen-Eingang, Portfolio, Aufbau, API-Schlüssel) brechen auf schmalen Bildschirmen nicht mehr Zeichen für Zeichen – die Schaltflächen rücken unter die Box",
        en: "Long addresses and commands (idea inbox, portfolio, structure, API keys) no longer wrap character by character on narrow screens – buttons move below the box",
      },
    ],
  },
  {
    version: "1.3.9",
    date: "2026-09-18",
    title: "Repo-Check auf Wunschzweig",
    titleEn: "Repo check on a chosen branch",
    changes: [
      {
        type: "neu",
        text: "Der Repo-Check kann jetzt einen anderen Zweig prüfen: Zweig eintragen (leer = Standardzweig) – Workflow-Datei, Läufe und Berichte stammen dann von dort",
        en: "The repo check can now check a different branch: enter a branch (empty = default) – workflow file, runs and reports then come from there",
        link: "/projects#repo-check",
      },
    ],
  },
  {
    version: "1.3.8",
    date: "2026-09-18",
    title: "Arbeiter aus Issue-Kommentaren",
    titleEn: "Workers from issue comments",
    changes: [
      {
        type: "besser",
        text: "Wer an einem Issue arbeitet, zeigt die Aufgabe jetzt auch aus Kommentaren: KI-Antworten über VibeWorks und Bot-Befehle zählen als Bearbeiter",
        en: "Who works on an issue now also shows from comments: AI replies via VibeWorks and bot commands count as workers",
        link: "/account#git",
      },
    ],
  },
  {
    version: "1.3.7",
    date: "2026-09-18",
    title: "KI-Agenten arbeiten immer über VibeWorks",
    titleEn: "AI agents always work through VibeWorks",
    changes: [
      {
        type: "besser",
        text: "Neue Pflichtregel für KI-Agenten: Status, Notizen und Probleme laufen immer über den VibeWorks-MCP – in der Arbeitsweise, den Agenten-Regeln und als Skill-Datei",
        en: "New mandatory rule for AI agents: status, notes and problems always go through the VibeWorks MCP – in the working guide, the agent rules and as a skill file",
        link: "/account#mcp",
      },
    ],
  },
  {
    version: "1.3.6",
    date: "2026-09-18",
    title: "Fenster-Verbindung repariert",
    titleEn: "Device connect fixed",
    changes: [
      {
        type: "fix",
        text: "Fertig-Meldung beim Verbinden eines KI-Programms: Hinweis zum automatischen Schließen und Knopf „Fenster schließen“ erscheinen wieder in der richtigen Sprache",
        en: "Done screen when connecting an AI program: the auto-close hint and the “Close window” button show up again in the right language",
        link: "/verbinden",
      },
    ],
  },
  {
    version: "1.3.5",
    date: "2026-09-17",
    title: "Ansicht aufräumen",
    titleEn: "Tidy up your view",
    changes: [
      {
        type: "neu",
        text: "Neue Seite „Ansicht“ im Profilmenü: Was du nicht brauchst, blendest du aus – Menüpunkte, Karten auf der Startseite und Bereiche der Projektseite",
        en: "New “View” page in the profile menu: hide what you don't need – menu entries, cards on the start page and sections of the project page",
        link: "/ansicht",
      },
      {
        type: "neu",
        text: "„Nur das Nötigste“ blendet mit einem Klick alles Zusätzliche aus, „Alles anzeigen“ holt es zurück",
        en: "“Only the essentials” hides all extras in one click, “Show everything” brings them back",
        link: "/ansicht",
      },
      {
        type: "besser",
        text: "Die Auswahl gilt nur für dich, wird nichts gelöscht und lässt sich jederzeit zurücknehmen; Projekte, Aufgaben und Notizen bleiben immer sichtbar",
        en: "The choice applies only to you, deletes nothing and can be undone at any time; projects, tasks and notes always stay visible",
      },
    ],
  },
  {
    version: "1.3.4",
    date: "2026-09-17",
    title: "Abhängigkeiten aufgefrischt",
    titleEn: "Dependencies refreshed",
    changes: [
      {
        type: "besser",
        text: "Neuere Versionen von lucide-react (Symbole) und Electron (Windows-App)",
        en: "Newer versions of lucide-react (icons) and Electron (Windows app)",
      },
    ],
  },
  {
    version: "1.3.3",
    date: "2026-09-17",
    title: "Notfallwege beim Anmelden – mit Nachfrage",
    titleEn: "Emergency sign-in routes – with a check",
    changes: [
      {
        type: "neu",
        text: "Beim zweiten Faktor gibt es jetzt drei Wege: Code aus der App, Wiederherstellungscode oder – wenn du es erlaubst – ein 6-stelliger Code an deine hinterlegte E-Mail-Adresse (10 Minuten gültig)",
        en: "The second factor now offers three routes: a code from the app, a recovery code or – if you allow it – a 6-digit code sent to the e-mail address on file (valid for 10 minutes)",
      },
      {
        type: "neu",
        text: "Nach jeder Anmeldung über einen Notfallweg fragt VibeWorks nach: „Warst du das?“ – per E-Mail und in der Glocke, mit Zeitpunkt, Adresse und Gerät. Ein Klick beendet alle Sitzungen des Kontos",
        en: "After every sign-in using an emergency route VibeWorks asks “was that you?” – by e-mail and in the bell, with time, address and device. One click ends all sessions of the account",
      },
      {
        type: "neu",
        text: "Der E-Mail-Weg ist abgeschaltet, bis du ihn unter Konto → Zwei-Faktor einschaltest; das Umschalten verlangt Passwort oder Code",
        en: "The e-mail route stays off until you switch it on under Account → Two-factor; switching it asks for your password or a code",
        link: "/account",
      },
    ],
  },
  {
    version: "1.3.2",
    date: "2026-09-17",
    title: "Dateifilter: Zweig wählbar, Funde gebündelt",
    titleEn: "File filter: pick a branch, findings grouped",
    changes: [
      {
        type: "neu",
        text: "Dateifilter: Zweig auswählen und dort prüfen. Entfernen per Pull Request bleibt dem Hauptzweig vorbehalten – das steht jetzt auch dabei",
        en: "File filter: pick a branch and check it there. Removing via pull request stays with the main branch – and says so now",
        link: "/#file-filter",
      },
      {
        type: "besser",
        text: "Funde stehen nach Muster gebündelt („dist/ – 128 Dateien“) statt als lange Liste, mit Beispielen, Auswahl je Muster und einem Knopf, um einen Vorschlag als Regel zu übernehmen. Erkannt wird mehr: Bauordner, Medien, Datenbanken und Archive",
        en: "Findings are grouped by pattern (“dist/ – 128 files”) instead of one long list, with examples, selection per pattern and a button to turn a suggestion into a rule. More is detected: build folders, media, databases and archives",
      },
      {
        type: "besser",
        text: "Hinweis am Pull-Request-Bereich: Der rote Haken „vibeworks/dateifilter“ kommt vom Dateifilter, nicht von deiner CI",
        en: "Note in the pull request section: the red check “vibeworks/dateifilter” comes from the file filter, not from your CI",
      },
    ],
  },
  {
    version: "1.3.1",
    date: "2026-09-17",
    title: "Issues aus dem Repository bleiben aktuell",
    titleEn: "Issues from the repository stay up to date",
    changes: [
      {
        type: "neu",
        text: "Wird aus einem Issue eine Aufgabe, kommt eine Meldung mit Nummer, Titel und Absender – und der Hinweis, wenn sie für die KI gesperrt ist",
        en: "When an issue becomes a task you get a notification with number, title and sender – plus a note when it is locked for the AI",
      },
      {
        type: "besser",
        text: "Übernommene Aufgaben ziehen nach: Ändert sich Titel, Text oder Label am Issue, folgt die Aufgabe. Eigene Aufgaben aus VibeWorks bleiben unberührt",
        en: "Imported tasks follow along: if the issue's title, text or labels change, the task follows. Tasks created in VibeWorks stay untouched",
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-09-17",
    title: "Meldungen-Seite mit eigenen Regeln",
    titleEn: "Notification page with your own rules",
    changes: [
      {
        type: "neu",
        text: "Antworten im Issue einer Aufgabe melden sich jetzt – mit Text, Absender und Sprung zur Aufgabe",
        en: "Replies in the issue of a task are now reported – with text, sender and a jump to the task",
      },
      {
        type: "neu",
        text: "Neue Seite „Meldungen“ (Zahnrad in der Glocke): alle Benachrichtigungen durchsuchen, nach Anlass und Ungelesenem filtern, mehrere auswählen, als gelesen markieren oder löschen",
        en: "New “Notifications” page (gear in the bell): search all notifications, filter by event and unread, select several, mark them read or delete them",
        link: "/meldungen",
      },
      {
        type: "neu",
        text: "Eigene Regeln: wichtige Wörter (kommen immer durch und werden hervorgehoben), nur von bestimmten Leuten, nur aus bestimmten Projekten – dazu eine Liste offener Aufgaben, in denen deine Wörter vorkommen",
        en: "Your own rules: important words (always get through and are highlighted), only from certain people, only from certain projects – plus a list of open tasks containing your words",
        link: "/meldungen",
      },
    ],
  },
  {
    version: "1.2.9",
    date: "2026-09-17",
    title: "Bessere Suche, eigene Rückfragen, aufräumbare Glocke",
    titleEn: "Better search, own dialogs, tidier bell",
    changes: [
      {
        type: "fix",
        text: "Suche: Esc schließt die Schnellsuche immer – auch wenn der Fokus auf einem Treffer liegt; ein Klick daneben ebenso. Gefunden wird jetzt auch in geteilten und Team-Projekten, mitten im Wort („hook“ findet „Webhook“) und unabhängig von Reihenfolge, Groß- und Kleinschreibung. Ein Aufgaben-Treffer springt direkt zur Aufgabe",
        en: "Search: Esc always closes the quick search – even when a result has the focus; so does a click next to it. It now also finds things in shared and team projects, inside words (“hook” finds “Webhook”) and regardless of order and letter case. A task result jumps straight to the task",
      },
      {
        type: "besser",
        text: "Keine Browser-Popups mehr: Rückfragen und Eingaben laufen in VibeWorks-Fenstern – mit rotem Knopf, wo etwas gelöscht wird",
        en: "No more browser pop-ups: confirmations and inputs use VibeWorks dialogs – with a red button where something gets deleted",
      },
      {
        type: "neu",
        text: "Ungespeicherte Eingaben: Beim Schließen fragt VibeWorks, ob der Text als Entwurf bleiben oder verworfen werden soll – beim Bearbeiten warnt es vor dem Verwerfen",
        en: "Unsaved input: when closing, VibeWorks asks whether to keep the text as a draft or discard it – when editing it warns before discarding",
      },
      {
        type: "neu",
        text: "Glocke: mehrere Meldungen auswählen (auch alle), zusammen als gelesen markieren oder löschen, dazu ein Mülleimer für alle",
        en: "Bell: select several notifications (or all), mark them read or delete them together, plus a bin for all of them",
      },
    ],
  },
  {
    version: "1.2.8",
    date: "2026-09-17",
    title: "Lighthouse-Check der Live-Seite",
    titleEn: "Lighthouse check of the live site",
    changes: [
      {
        type: "neu",
        text: "Lighthouse-Check (GitHub, pro Projekt einschaltbar): einmal pro Woche prüft der kostenlose GitHub-Runner die Live-Seite auf Leistung, Barrierefreiheit, Best Practices und SEO und sucht kaputte Links. Fällt ein Wert deutlich unter den besten bisherigen oder ist ein Link kaputt, erscheint eine Aufgabe, die sich selbst erledigt",
        en: "Lighthouse check (GitHub, can be turned on per project): once a week the free GitHub runner checks the live site for performance, accessibility, best practices and SEO and looks for broken links. If a score drops clearly below the best so far or a link is broken, a task appears that completes itself",
      },
      {
        type: "besser",
        text: "Repo-Check und Lighthouse-Check teilen sich die Bausteine für Workflow-Dateien, Läufe und Artefakte",
        en: "Repo check and Lighthouse check share the building blocks for workflow files, runs and artifacts",
      },
    ],
  },
  {
    version: "1.2.7",
    date: "2026-09-17",
    title: "Team-Workflows",
    titleEn: "Team workflows",
    changes: [
      {
        type: "neu",
        text: "Team-Workflows: KI-Workflows einmal auf der Team-Seite anlegen – sie gelten in allen Projekten, die an das Team freigegeben sind, auch für die KI über MCP. Ein Projekt-Workflow mit gleichem Schlüssel hat Vorrang",
        en: "Team workflows: create AI workflows once on the team page – they apply to every project shared with the team, including for the AI over MCP. A project workflow with the same key takes precedence",
        link: "/teams",
      },
      {
        type: "neu",
        text: "Neues Team-Recht „Team-Workflows verwalten“ – die Standardrolle Admin und alle Rollen, die das Team verwalten dürfen, haben es",
        en: "New team permission “Manage team workflows” – the default Admin role and every role allowed to manage the team have it",
      },
    ],
  },
  {
    version: "1.2.6",
    date: "2026-09-17",
    title: "Aufbau-Wächter und Wochenbericht",
    titleEn: "Structure watcher and weekly report",
    changes: [
      {
        type: "neu",
        text: "Wochenbericht: montags ab 8 Uhr kommt über deine Kanäle, was in der Vorwoche passiert ist – erledigte Aufgaben, Workflow-Durchläufe mit belegten Schritten, neue Fehler und schlafende Projekte. Abschaltbar unter Benachrichtigungen",
        en: "Weekly report: on Mondays from 8 am your channels get what happened last week – completed tasks, workflow runs with verified steps, new errors and sleeping projects. Can be turned off under notifications",
        link: "/account#benachrichtigungen",
      },
      {
        type: "neu",
        text: "Aufbau-Wächter: Projekte mit Aufbau-Tabelle werden täglich mit dem Repository verglichen – fehlen Pfade oder sind neue Ordner nicht beschrieben, erscheint die Aufgabe „Projektaufbau aktualisieren“. Sie erledigt sich selbst, sobald die Tabelle wieder stimmt",
        en: "Structure watcher: projects with a structure table are compared with the repository every day – if paths are missing or new folders aren't described, the task “Update project structure” appears. It completes itself once the table matches again",
      },
    ],
  },
  {
    version: "1.2.5",
    date: "2026-09-17",
    title: "Doku und Bilder auf dem neuesten Stand",
    titleEn: "Docs and screenshots up to date",
    changes: [
      {
        type: "besser",
        text: "README und Webseite beschreiben die aktuellen Funktionen: KI-Anbindung per Einzeiler, Gerätecode und Projekt-Schlüssel, KI-Workflows, Projektaufbau, CI-Designer, Abhängigkeiten für sechs Sprachen, Teams und Rollen, Discord – Veraltetes ist raus",
        en: "README and website describe the current features: AI connection via one-liner, device code and project keys, AI workflows, project structure, CI designer, dependencies for six languages, teams and roles, Discord – outdated parts removed",
      },
      {
        type: "besser",
        text: "Neue Screenshots auf Deutsch und Englisch (auch Heute, Rückblick, CI-Designer und KI-Workflows) und ein neu aufgenommenes Vorführ-GIF",
        en: "New screenshots in German and English (including Today, review, CI designer and AI workflows) and a freshly recorded demo GIF",
      },
    ],
  },
  {
    version: "1.2.4",
    date: "2026-09-17",
    title: "Aufgeräumter Code nach dem Repo-Check",
    titleEn: "Tidier code after the repo check",
    changes: [
      {
        type: "besser",
        text: "Repo-Check-Funde abgearbeitet: Import-Zyklus zwischen Anmeldung und API-Hilfen aufgelöst, 104 ungenutzte Exporte entfernt, Desktop- und Webseiten-Dateien als Einstiegspunkte eingetragen",
        en: "Repo check findings fixed: import cycle between sign-in and API helpers removed, 104 unused exports dropped, desktop and website files registered as entry points",
      },
      {
        type: "fix",
        text: "Abhängigkeiten-Check: reguläre Ausdrücke für pyproject.toml und pom.xml fest statt zur Laufzeit gebaut (Semgrep-Hinweis)",
        en: "Dependency check: regular expressions for pyproject.toml and pom.xml are now fixed instead of built at runtime (Semgrep finding)",
      },
    ],
  },
  {
    version: "1.2.3",
    date: "2026-09-17",
    title: "CI-Designer mit Live-Anzeige, KI-Anleitungen für alle KIs, übersichtliche Rechte",
    titleEn: "CI designer with live view, AI instructions for every AI, clearer permissions",
    changes: [
      {
        type: "neu",
        text: "CI-Designer (GitHub): Auslöser wählen (Push, Pull Request, Zeitplan, von Hand), Blöcke einfügen, verschieben und bedingt ausführen (Node, npm-Skripte, fallow, Python/pytest, Go, Rust, eigene Befehle) – VibeWorks schreibt daraus den Workflow ins Repository, startet ihn und zeigt jeden Block live mit Ladesymbol, grünem Haken oder rotem Kreuz",
        en: "CI designer (GitHub): choose triggers (push, pull request, schedule, manual), insert, move and conditionally run blocks (Node, npm scripts, fallow, Python/pytest, Go, Rust, custom commands) – VibeWorks writes the workflow to the repository, starts it and shows every block live with spinner, green check or red cross",
      },
      {
        type: "neu",
        text: "MCP: get_ci, save_ci und run_ci – die KI sieht die Pipeline samt Zustand jedes Blocks und kann sie mit Erlaubnis ändern und starten. Eigene Skripte dürfen keine GitHub-Ausdrücke enthalten, damit niemand Repository-Geheimnisse ausliest",
        en: "MCP: get_ci, save_ci and run_ci – the AI sees the pipeline with the state of every block and can change and start it with permission. Custom scripts may not contain GitHub expressions, so nobody can read repository secrets",
      },
      {
        type: "neu",
        text: "KI-Anleitung nicht nur als CLAUDE.md: auch AGENTS.md (Codex, Cline, Jules …), GEMINI.md, Copilot-, Cursor-, Windsurf- und Cline-Regeln – im Projektmenü und über das MCP-Werkzeug get_agent_file. Die Projekt-Durchsicht erkennt jede davon",
        en: "AI instructions beyond CLAUDE.md: also AGENTS.md (Codex, Cline, Jules …), GEMINI.md, Copilot, Cursor, Windsurf and Cline rules – in the project menu and via the MCP tool get_agent_file. The project review recognises all of them",
      },
      {
        type: "besser",
        text: "Rollen: Rechte nach Bereichen mit Erklärung, heikle Rechte markiert, „Alle/Keine“ und eine Liste, was nur Besitzer dürfen. Neu vergebbar: „KI-Workflows verwalten“, „CI verwalten und starten“ und „Projekt-Schlüssel freigeben“ – bestehende Rollen behalten, was sie bisher durften",
        en: "Roles: permissions grouped by area with explanations, sensitive ones marked, “All/None” and a list of what only owners may do. New to grant: “Manage AI workflows”, “Manage and start CI” and “Grant project keys” – existing roles keep what they could do before",
        link: "/roles",
      },
    ],
  },
  {
    version: "1.2.2",
    date: "2026-09-17",
    title: "Projekt-Schlüssel für andere KIs, Issue-Gespräche über MCP, fallow in der CI",
    titleEn: "Project keys for other AIs, issue conversations over MCP, fallow in CI",
    changes: [
      {
        type: "neu",
        text: "Projekt-Schlüssel: ein API-Schlüssel nur für ausgewählte Projekte (eigene und solche, in denen du Mitglieder einladen darfst) – mit Laufzeit, Pause-Knopf und deutlicher Warnung. Er sieht keine Docs, Prompts, Suche, Zeiten oder deinen Tagesplan",
        en: "Project keys: an API key for selected projects only (your own and those where you may invite members) – with a lifetime, pause button and a clear warning. It sees no docs, prompts, search, time tracking or your daily plan",
        link: "/account#mcp",
      },
      {
        type: "neu",
        text: "Besitzer fremder Projekte werden über jeden solchen Schlüssel benachrichtigt und können ihm im Projekt („KI-Schlüssel mit Zugriff“) den Zugriff entziehen – der Inhaber erfährt es ebenfalls",
        en: "Owners of other people's projects are notified about every such key and can revoke its access in the project (“AI keys with access”) – the key holder is told as well",
      },
      {
        type: "neu",
        text: "MCP: list_task_comments und add_task_comment – KIs lesen und schreiben im Issue einer Aufgabe, gepostet über den Projekt-Bot und mit dem Namen des Schlüssels unterschrieben",
        en: "MCP: list_task_comments and add_task_comment – AIs read and write in a task's issue, posted through the project bot and signed with the key's name",
      },
      {
        type: "besser",
        text: "Repo-Check und eigene CI nutzen jetzt fallow (kostenlos): ungenutzte Dateien, Exporte und Abhängigkeiten sowie Import-Zyklen in JavaScript/TypeScript. VibeWorks selbst prüft jeden Push mit Typen, Tests, fallow und Build",
        en: "Repo check and our own CI now use fallow (free): unused files, exports and dependencies plus import cycles in JavaScript/TypeScript. VibeWorks itself checks every push with types, tests, fallow and build",
      },
    ],
  },
  {
    version: "1.2.1",
    date: "2026-09-17",
    title: "Discord-Bot per Klick",
    titleEn: "Discord bot in one click",
    changes: [
      {
        type: "neu",
        text: "Discord-Bot: unter Konto → Discord mit einem Klick in den eigenen Server einladen, Kanal wählen – er leitet deine Benachrichtigungen weiter und schickt einen Kurzbericht (täglich oder montags: offen, erledigt, in Arbeit, laufende KI-Workflows, Probleme)",
        en: "Discord bot: invite it to your own server in one click under Account → Discord and pick a channel – it forwards your notifications and sends a short report (daily or on Mondays: open, done, in progress, running AI workflows, problems)",
        link: "/account#discord",
      },
      {
        type: "neu",
        text: "Befehle in Discord: /vibeworks status, aufgaben, probleme und hier (Kanal wechseln) – Antworten sieht nur das Discord-Konto, das den Bot eingeladen hat",
        en: "Commands in Discord: /vibeworks status, tasks, problems and here (switch channel) – only the Discord account that invited the bot sees the answers",
      },
      {
        type: "neu",
        text: "Administration: Discord-Anwendung der Instanz einmal einrichten – mit Schritt-für-Schritt-Anleitung und „Befehle anmelden“; Token und Secret liegen verschlüsselt",
        en: "Administration: set up the instance's Discord application once – with step-by-step guide and “Register commands”; token and secret are stored encrypted",
        link: "/admin#discord-admin",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-09-17",
    title: "Abhängigkeiten für alle Sprachen, Zweig wählbar",
    titleEn: "Dependencies for all languages, choose a branch",
    changes: [
      {
        type: "neu",
        text: "Der Abhängigkeiten-Check liest jetzt neben package.json auch requirements.txt, pyproject.toml, Cargo.toml, go.mod, composer.json, Gradle (inkl. Versionskatalog) und pom.xml – auch in Unterordnern (Monorepos). Neueste Versionen kommen aus PyPI, crates.io, dem Go-Proxy, Packagist und Maven Central, Sicherheitslücken kostenlos von OSV.dev",
        en: "The dependency check now reads requirements.txt, pyproject.toml, Cargo.toml, go.mod, composer.json, Gradle (incl. version catalogs) and pom.xml besides package.json – in subfolders too (monorepos). Latest versions come from PyPI, crates.io, the Go proxy, Packagist and Maven Central, vulnerabilities for free from OSV.dev",
      },
      {
        type: "neu",
        text: "Abhängigkeiten für einen anderen Zweig prüfen (zur Ansicht – Aufgaben entstehen weiter nur aus dem Hauptzweig), Filter nach Sprache, gefundene Manifeste und Links zur jeweiligen Registry",
        en: "Check dependencies of another branch (view only – tasks are still created from the main branch only), filter by language, found manifests and links to each registry",
      },
      {
        type: "besser",
        text: "Code-Netz: Pakete mit Sicherheitslücke sind rot, mit großem Update gelb umrandet",
        en: "Code network: packages with a vulnerability have a red outline, with a major update a yellow one",
      },
      {
        type: "fix",
        text: "Nach oben offene Angaben wie „>=2.0“ lösen keine Sicherheitswarnungen für die Untergrenze mehr aus – installiert ist dort meist eine neuere Version",
        en: "Open-ended ranges like “>=2.0” no longer raise vulnerability warnings for the lower bound – a newer version is usually installed",
      },
    ],
  },
  {
    version: "1.1.9",
    date: "2026-09-17",
    title: "KI-Programme ohne Kopieren verbinden",
    titleEn: "Connect AI programs without copying",
    changes: [
      {
        type: "neu",
        text: "Geräte-Anmeldung für KI-Programme: Das Programm holt sich selbst einen Code, du erlaubst ihn einmal unter /verbinden (mit Umfang „nur lesen“, „Aufgaben“ oder „alles“) – den Schlüssel holt sich das Programm danach selbst ab. Kein Kopieren mehr; jeder so erstellte Schlüssel steht in deinem Konto und landet als Meldung im Posteingang",
        en: "Device sign-in for AI programs: the program requests a code itself, you allow it once at /verbinden (read only, tasks or everything) – the program then picks up its key on its own. No more copying; every key created this way appears in your account and as a message in your inbox",
        link: "/verbinden",
      },
      {
        type: "besser",
        text: "Ohne gültigen Schlüssel nennt der MCP-Endpunkt den Weg zur Geräte-Anmeldung – so findet eine KI ihn selbst",
        en: "Without a valid key the MCP endpoint points to device sign-in – so an AI can find it on its own",
        link: "/account#mcp",
      },
    ],
  },
  {
    version: "1.1.8",
    date: "2026-09-16",
    title: "KI-Workflows, Projektaufbau und strengere KI-Regeln",
    titleEn: "AI workflows, project structure and stricter AI rules",
    changes: [
      {
        type: "neu",
        text: "KI-Workflows: Checklisten, die die KI Schritt für Schritt abarbeitet – jeder Schritt mit Prüfung und Beleg, feste Reihenfolge, bis zum Ende erinnert VibeWorks bei jedem Aufruf an den nächsten Schritt. Mitgeliefert: Feature, Fehler beheben, Release, Durchsicht, Projektaufbau; eigene legt man im Projekt an (oder die KI mit save_workflow)",
        en: "AI workflows: checklists the AI works through step by step – each step with a check and evidence, fixed order, and VibeWorks reminds the AI of the next step with every call until the end. Built-in: feature, bug fix, release, review, project structure; add your own in the project (or let the AI use save_workflow)",
      },
      {
        type: "neu",
        text: "Projektaufbau: Tabelle je Projekt mit Bereich, Pfad, Zweck und Funktionsweise – die KI legt sie per MCP aus dem echten Code an und hält sie aktuell, VibeWorks markiert Pfade, die es nicht mehr gibt, und schreibt die Tabelle in die CLAUDE.md",
        en: "Project structure: a table per project with area, path, purpose and how it works – the AI builds it from the real code over MCP and keeps it current, VibeWorks flags paths that no longer exist and adds the table to CLAUDE.md",
      },
      {
        type: "besser",
        text: "Regeln für die KI: neue Abschnitte „Before you say done“ und „Don't guess“ – nichts als fertig melden, was nicht geprüft ist, keine erfundenen Dateien oder Testergebnisse; die Standard-Erinnerung sagt das auch. Workflows stehen der KI zusätzlich als Befehle (MCP-Prompts) zur Verfügung",
        en: "AI rules: new sections “Before you say done” and “Don't guess” – nothing reported as done without verification, no invented files or test results; the default reminder says so too. Workflows are also offered to the AI as commands (MCP prompts)",
        link: "/account#mcp",
      },
      {
        type: "besser",
        text: "review_projects meldet fehlenden oder veralteten Projektaufbau",
        en: "review_projects reports a missing or outdated project structure",
      },
      {
        type: "fix",
        text: "Laufende Arbeitsuhr an Aufgaben löste beim Laden gelegentlich einen Darstellungsfehler aus, wenn die Aufgabe gerade erst begonnen wurde",
        en: "The running work clock on tasks occasionally caused a rendering error on load when the task had just been started",
      },
    ],
  },
  {
    version: "1.1.7",
    date: "2026-09-16",
    title: "Erste Schritte, Erledigte löschen, Projekt-Überblick für die KI",
    titleEn: "Getting started, clear done tasks, project review for the AI",
    changes: [
      {
        type: "neu",
        text: "Erste Schritte auf dem Dashboard: zeigt, was noch offen ist (Git, Repository, KI-Anbindung, Bot, zweiter Faktor, Benachrichtigungen, Fehler-Eingang, Team) – Erledigtes lässt sich ausblenden oder die Liste ganz schließen",
        en: "Getting started on the dashboard: shows what's still open (Git, repository, AI connection, bot, second factor, notifications, error inbox, team) – hide what's done or close the list",
        link: "/#erste-schritte",
      },
      {
        type: "neu",
        text: "Erledigte auf einmal löschen: Papierkorb-Knopf in der Erledigt-Spalte, mit Rückfrage – die Issues bleiben geschlossen",
        en: "Clear done tasks in one go: bin button in the Done column, with confirmation – issues stay closed",
      },
      {
        type: "neu",
        text: "MCP-Werkzeug review_projects: die KI prüft alle eigenen oder die Projekte eines Teams auf einmal – vollständige Doku (Beschreibung, Notizen, README und CLAUDE.md im Repository) und offene Arbeit (überfällige, blockierte, liegengebliebene Aufgaben, rote CI, Abgleichfehler) – und bekommt eine Bewertung mit Hinweisen, schwächste zuerst",
        en: "MCP tool review_projects: the AI checks all own projects or a team’s projects at once – complete docs (description, notes, README and CLAUDE.md in the repository) and open work (overdue, blocked, stale tasks, red CI, sync errors) – and gets a score with hints, weakest first",
      },
      {
        type: "neu",
        text: "Eigene Erinnerung an die KI mit Ablauf: gilt unbegrenzt, 1 Tag, 1 Woche oder 1 Monat",
        en: "Custom AI reminder with expiry: indefinitely, 1 day, 1 week or 1 month",
        link: "/account#mcp",
      },
      {
        type: "fix",
        text: "update_doc nimmt append auch als true (hängt dann content an) – vorher kam ein Fehler",
        en: "update_doc also accepts append as true (then appends content) – it used to fail",
      },
    ],
  },
  {
    version: "1.1.6",
    date: "2026-09-16",
    title: "TypeScript 7 und vitest 5",
    titleEn: "TypeScript 7 and vitest 5",
    changes: [
      {
        type: "besser",
        text: "TypeScript 7 (der neue, deutlich schnellere Compiler) prüft jetzt Code und Build; vitest 5 führt die Tests aus – beide ohne Änderungen am Code, alle Tests grün",
        en: "TypeScript 7 (the new, much faster compiler) now checks code and build; vitest 5 runs the tests – both without code changes, all tests green",
      },
    ],
  },
  {
    version: "1.1.5",
    date: "2026-09-16",
    title: "Code-Netz für Kotlin, Java, Go, C, Rust – Tokens täglich geprüft",
    titleEn: "Code network for Kotlin, Java, Go, C, Rust – tokens checked daily",
    changes: [
      {
        type: "fix",
        text: "Code-Netz: Repositories in Kotlin, Java, Go, C/C++, Rust und Shell werden jetzt verstanden – vorher blieb das Netz bei ihnen leer und meldete fälschlich „keine Dateien lesbar“. Enthält ein Repository gar keine unterstützte Sprache, steht das jetzt so da",
        en: "Code network: repositories in Kotlin, Java, Go, C/C++, Rust and shell are now understood – before, the network stayed empty for them and wrongly reported “no files readable”. If a repository has no supported language at all, it now says so",
      },
      {
        type: "neu",
        text: "Git-Zugänge werden einmal am Tag geprüft: gilt der Token noch, hat er die nötigen Rechte (GitHub-Scopes, GitLab)? Fehlt etwas, kommt eine Benachrichtigung; unter Konto → Git-Zugänge stehen die Rechte samt „Jetzt prüfen“",
        en: "Git access is checked once a day: is the token still valid, does it have the required permissions (GitHub scopes, GitLab)? If something is missing you get a notification; Account → Git access shows the permissions and “Check now”",
        link: "/account#git-zugang",
      },
    ],
  },
  {
    version: "1.1.4",
    date: "2026-09-16",
    title: "Code-Netz: Verbindung prüfen",
    titleEn: "Code network: check the connection",
    changes: [
      {
        type: "neu",
        text: "„Verbindung prüfen“ im Code-Netz: Schritt für Schritt – Adresse, Abgleich, Zugang, git auf dem Server, Leserecht beim Anbieter, Erreichbarkeit per git, lokale Kopie – mit Grund und passendem Knopf (z. B. „Token prüfen“, wenn eine Berechtigung fehlt)",
        en: "“Check connection” in the code network: step by step – address, sync, access, git on the server, read access at the provider, reachability via git, local copy – with the reason and a matching button (e.g. “Check token” when a permission is missing)",
      },
      {
        type: "fix",
        text: "Code-Netz: Jede Aktion bekommt jetzt eine Meldung – auch wenn das Holen scheitert oder nur ein alter Stand da ist; dann startet die Prüfung gleich mit",
        en: "Code network: every action now gets a message – also when fetching fails or only an old state is there; the check then starts right away",
      },
      {
        type: "fix",
        text: "Auch Bild-Links in Notizen laufen über die Link-Hinweisseite",
        en: "Image links in notes also go through the link notice page",
      },
    ],
  },
  {
    version: "1.1.3",
    date: "2026-09-16",
    title: "Links werden vor dem Öffnen geprüft",
    titleEn: "Links are checked before opening",
    changes: [
      {
        type: "neu",
        text: "Links in Notizen, Docs und Community öffnen über eine Hinweisseite: Sie zeigt das echte Ziel und warnt bei Auffälligem – unverschlüsselt, IP-Adresse, nachgeahmte Marke, Kurz-Link, versteckte Zugangsdaten, verdächtige Endung. Geprüft wird nur die Adresse, kein fremder Dienst",
        en: "Links in notes, docs and community open via a notice page: it shows the real destination and warns about anything suspicious – unencrypted, IP address, imitated brand, short link, hidden credentials, suspicious ending. Only the address is checked, no third-party service",
      },
      {
        type: "besser",
        text: "Links innerhalb von VibeWorks gehen nach 5 Sekunden automatisch weiter; unauffällige Links lassen sich ohne Nachfrage öffnen (abschaltbar) – gefährliche Adressen wie javascript: werden gar nicht erst verlinkt",
        en: "Links within VibeWorks continue automatically after 5 seconds; unsuspicious links can open without asking (optional) – dangerous addresses like javascript: aren't linked at all",
      },
    ],
  },
  {
    version: "1.1.2",
    date: "2026-09-16",
    title: "KI sieht die echten Spaltennamen",
    titleEn: "AI sees the real column names",
    changes: [
      {
        type: "fix",
        text: "MCP: Jede Aufgabe nennt jetzt die Spalte, wie sie im Brett heißt – umbenannte und eigene Spalten inklusive –, und get_project liefert alle Spalten. Eine KI sieht also „Kann gelöscht werden“ statt nur BLOCKED",
        en: "MCP: every task now names its column as shown on the board – renamed and custom columns included – and get_project lists all columns. An AI now sees “Can be deleted” instead of just BLOCKED",
      },
      {
        type: "besser",
        text: "create_task und update_task nehmen auch den Spaltennamen als Status an; unbekannte Namen werden mit der Liste der gültigen Spalten abgelehnt",
        en: "create_task and update_task also accept the column name as status; unknown names are rejected with the list of valid columns",
      },
      {
        type: "fix",
        text: "Repo-Check-Befunde in den Installations- und Update-Skripten behoben (ShellCheck ohne Meldung)",
        en: "Fixed repo check findings in the install and update scripts (ShellCheck clean)",
      },
    ],
  },
  {
    version: "1.1.1",
    date: "2026-09-16",
    title: "Merge-Konflikte im Browser lösen",
    titleEn: "Resolve merge conflicts in the browser",
    changes: [
      {
        type: "neu",
        text: "Merge-Konflikte: VibeWorks zeigt Pull Requests mit Konflikten – auch die, die GitHub nicht im Web lösen kann –, jede Konfliktstelle mit Pull Request, gemeinsamem Stand und Zielzweig und übernimmt eine Seite per Klick",
        en: "Merge conflicts: VibeWorks lists pull requests with conflicts – including those GitHub can't resolve on the web – shows each conflict with pull request, common ancestor and target branch, and takes a side in one click",
      },
      {
        type: "neu",
        text: "Editor mit Syntaxprüfung (JSON mit Zeile, HTML-Tags, Klammern) und „JSON formatieren“ – auch für große Dateien; die Lösung landet als Merge-Commit im Zweig des Pull Requests, nur wenn er sich inzwischen nicht verändert hat",
        en: "Editor with syntax check (JSON with line, HTML tags, brackets) and “format JSON” – also for large files; the resolution lands as a merge commit on the pull request's branch, only if it hasn't changed in the meantime",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-09-16",
    title: "Dateifilter und Sprachwerkzeuge im Repo-Check",
    titleEn: "File filter and language tools in the repo check",
    changes: [
      {
        type: "neu",
        text: "Dateifilter: Müll-Muster (z. B. *.exe, .env, node_modules/) finden solche Dateien im Repository – mit Vorschlägen – und entfernen sie per Pull Request samt .gitignore-Eintrag",
        en: "File filter: junk patterns (e.g. *.exe, .env, node_modules/) find such files in the repository – with suggestions – and remove them via pull request including a .gitignore entry",
      },
      {
        type: "neu",
        text: "Geschützte Dateien: Offene Pull Requests, die sie löschen, umbenennen oder ihre Endung ändern – oder Müll hinzufügen –, bekommen den roten Status „vibeworks/dateifilter“; mit einer Branch-Regel ist das Mergen gesperrt, bis man in VibeWorks erlaubt",
        en: "Protected files: open pull requests that delete, rename or change their extension – or add junk – get the red status “vibeworks/dateifilter”; with a branch rule merging is blocked until you allow it in VibeWorks",
      },
      {
        type: "besser",
        text: "Repo-Check prüft je nach Sprache zusätzlich mit Bandit (Python), ShellCheck, Hadolint (Dockerfiles) und actionlint (Workflows) – alles kostenlos; bestehende Repositories bekommen das beim nächsten Check automatisch",
        en: "The repo check additionally runs Bandit (Python), ShellCheck, Hadolint (Dockerfiles) and actionlint (workflows) depending on the language – all free; existing repositories get this automatically on the next check",
      },
    ],
  },
  {
    version: "1.0.9",
    date: "2026-09-16",
    title: "Issues aus GitHub werden Aufgaben, Rollen für Konten",
    titleEn: "GitHub issues become tasks, roles for accounts",
    changes: [
      {
        type: "neu",
        text: "Neue Issues, die direkt im Repository entstehen, landen beim Abgleich als Aufgaben in VibeWorks – von Konten mit Schreibrecht oder mit Rolle. Wahlweise auch alle, fremde dann für KI gesperrt",
        en: "New issues created directly in the repository become tasks in VibeWorks on sync – from accounts with write access or a role. Optionally all of them, with others locked for AI",
      },
      {
        type: "neu",
        text: "GitHub-Konten lassen sich im Projekt als Arbeiter oder Bughunter eintragen: ihre Issues gelten als vertrauenswürdig (Bughunter mit Label „bug“ und hoher Priorität), und sie dürfen dem Bot Befehle geben",
        en: "GitHub accounts can be added to a project as worker or bug hunter: their issues count as trusted (bug hunters with the label “bug” and high priority), and they may give the bot commands",
      },
      {
        type: "besser",
        text: "Übernommene Issues behalten ihren Text – VibeWorks gleicht dort nur Status und Labels ab",
        en: "Taken-over issues keep their text – VibeWorks only syncs status and labels there",
      },
    ],
  },
  {
    version: "1.0.8",
    date: "2026-09-16",
    title: "MCP per Einzeiler, strengere Regeln für KI",
    titleEn: "MCP in one line, stricter rules for AI",
    changes: [
      {
        type: "neu",
        text: "Neuer API-Schlüssel: ein Einzeiler für macOS/Linux (curl) und Windows (PowerShell) trägt VibeWorks in Claude Code ein und speichert die Agenten-Regeln – auch für Gemini CLI. Der Schlüssel steht dabei nie in einer Adresse",
        en: "New API key: a one-liner for macOS/Linux (curl) and Windows (PowerShell) adds VibeWorks to Claude Code and saves the agent rules – also for Gemini CLI. The key never appears in a URL",
        link: "/account#mcp",
      },
      {
        type: "besser",
        text: "Agenten-Regeln verschärft: jede Antwort beginnt und endet mit dem Blick auf die Aufgaben, keine Arbeit ohne Aufgabe, der Status stimmt immer",
        en: "Agent rules tightened: every reply starts and ends with checking the tasks, no work without a task, the status is always true",
      },
      {
        type: "fix",
        text: "Wiederkehrende Aufgaben: Eine KI kann die gerade entstandene nächste Wiederholung nicht mehr sofort wieder erledigen – das hatte eine Kette neuer Issues ausgelöst",
        en: "Recurring tasks: an AI can no longer immediately complete the next occurrence that was just created – this had triggered a chain of new issues",
      },
    ],
  },
  {
    version: "1.0.7",
    date: "2026-09-16",
    title: "Eigene Spalten im Aufgabenbrett",
    titleEn: "Your own columns on the task board",
    changes: [
      {
        type: "neu",
        text: "Bis zu 6 eigene Spalten (z. B. „Review“ oder „Warten auf Kunde“) in den Brett-Einstellungen – jede gehört zu einer Grundspalte, damit Issues und Fortschritt stimmen. Karten lassen sich hineinziehen oder im Dialog auswählen",
        en: "Up to 6 extra columns (e.g. “Review” or “Waiting for client”) in the board settings – each belongs to a base column so issues and progress stay right. Drag cards in or pick the column in the dialog",
      },
      {
        type: "besser",
        text: "Ab 5 Spalten scrollt das Brett seitlich, statt die Karten zu quetschen; auch Zusatz-Spalten lassen sich für KI sperren",
        en: "With 5 or more columns the board scrolls sideways instead of squeezing the cards; extra columns can be locked for AI too",
      },
    ],
  },
  {
    version: "1.0.6",
    date: "2026-09-16",
    title: "Für KI gesperrte Bereiche, Issues nur unter eigenem Namen",
    titleEn: "Areas locked for AI, issues only under your own name",
    changes: [
      {
        type: "neu",
        text: "Aufgaben und ganze Spalten lassen sich „für KI sperren“: Über MCP sind sie unsichtbar (Listen, Suche, Heute, Probleme, CLAUDE.md), direkte Zugriffe melden „nicht gefunden“, und das Issue zeigt keinen Inhalt",
        en: "Tasks and whole columns can be “locked for AI”: they are invisible over MCP (lists, search, today, problems, CLAUDE.md), direct access reports “not found”, and the issue shows no content",
      },
      {
        type: "fix",
        text: "Sicherheit: Aufgaben, die nicht der Projektbesitzer angelegt hat, landen nicht mehr unter dessen GitHub-Konto – das Issue schreibt der eigene Git-Zugang der Person oder der Bot, sonst gibt es einen klaren Hinweis",
        en: "Security: tasks not created by the project owner no longer appear under the owner's GitHub account – the person's own Git access or the bot writes the issue, otherwise there's a clear notice",
      },
    ],
  },
  {
    version: "1.0.5",
    date: "2026-09-16",
    title: "Bot mit Befehlen, Unterhaltung im Info-Fenster",
    titleEn: "Bot commands, conversation in the info panel",
    changes: [
      {
        type: "neu",
        text: "Der Bot hört auf Befehle in Issue-Kommentaren: /status erledigt, /prio 3, /übernehmen, /fällig 01.10.2026, /ki Hinweis, /info, /hilfe – nur von Mitarbeitenden mit Schreibrecht, und er antwortet jedes Mal im Issue",
        en: "The bot follows commands in issue comments: /status erledigt, /prio 3, /übernehmen, /fällig 01.10.2026, /ki note, /info, /hilfe – only from collaborators with write access, and it always replies in the issue",
      },
      {
        type: "neu",
        text: "Info-Fenster: die Unterhaltung aus dem Issue lesen und direkt aus VibeWorks antworten – dein Name steht dabei",
        en: "Info panel: read the issue conversation and reply straight from VibeWorks – your name is added",
      },
      {
        type: "besser",
        text: "KI-Schritte im Info-Fenster zeigen jetzt auch, welche KI eine Aufgabe nur gelesen hat (z. B. per list_tasks), und jede KI hat eine feste Kennung (KI-ID), die auch bei den API-Schlüsseln steht",
        en: "AI steps in the info panel now also show which AI only read a task (e.g. via list_tasks), and every AI has a fixed ID that also appears with the API keys",
      },
      {
        type: "besser",
        text: "Konto → Git-Zugänge erklärt, wie der Bot arbeitet",
        en: "Account → Git access explains how the bot works",
        link: "/account#git-zugang",
      },
    ],
  },
  {
    version: "1.0.4",
    date: "2026-09-16",
    title: "Code-Netz sagt, was los ist",
    titleEn: "Code network tells you what's going on",
    changes: [
      {
        type: "fix",
        text: "Code-Netz scheitert nicht mehr still: Es sagt, wenn das Repository noch nicht abgeglichen ist, der Abgleich scheitert, keine Dateien lesbar sind oder nur ein älterer Stand gezeigt wird – und meldet kurz, wenn das Laden geklappt hat",
        en: "The code network no longer fails silently: it says when the repository hasn't been synced, sync fails, no files are readable or only an older state is shown – and briefly confirms when loading worked",
      },
      {
        type: "fix",
        text: "Automatische Aufgaben (Fehler als Aufgabe, Repo-Check) tragen nicht mehr „Claude“ als Bearbeiter ein – das Feld bleibt leer, bis jemand die Aufgabe übernimmt",
        en: "Automatic tasks (error to task, repo check) no longer fill in “Claude” as assignee – the field stays empty until someone takes the task",
      },
      {
        type: "besser",
        text: "MCP: Fehlermeldungen und Hinweise für die KI sind immer englisch; Inhalte bleiben in deiner Sprache",
        en: "MCP: error messages and notes for the AI are always English; content stays in your language",
      },
      {
        type: "neu",
        text: "Ändern sich die Agenten-Regeln, erinnert VibeWorks die KI, sie neu zu holen – unter Konto → API-Schlüssel steht dann „Regeln veraltet“",
        en: "When the agent rules change, VibeWorks reminds the AI to fetch them again – Account → API keys then shows “Rules outdated”",
      },
    ],
  },
  {
    version: "1.0.3",
    date: "2026-09-16",
    title: "Absturzberichte kommen an",
    titleEn: "Crash reports get through",
    changes: [
      {
        type: "fix",
        text: "Fehler-Eingang: Eine Absturzschleife mit Hunderten Meldungen blockiert nicht mehr alles – Apps schicken bis zu 50 Berichte in einer Anfrage, gleiche Abstürze werden zusammengezählt",
        en: "Error inbox: a crash loop with hundreds of reports no longer blocks everything – apps send up to 50 reports in one request, identical crashes are counted together",
      },
      {
        type: "besser",
        text: "Der Fehler-Eingang versteht mehr Formate: verschachtelte Fehler, deutsche Feldnamen (nachricht, typ), Zusatzangaben wie Absturzgrund und Exit-Code sowie Log-Zeilen wie „<Zeit> [CRASH] Text“",
        en: "The error inbox understands more formats: nested errors, German field names (nachricht, typ), extra details like crash reason and exit code, and log lines like “<time> [CRASH] text”",
      },
      {
        type: "neu",
        text: "Einbau-Schnipsel für Electron-Apps: meldet abgestürzte Renderer- und GPU-Prozesse gesammelt",
        en: "Snippet for Electron apps: reports crashed renderer and GPU processes in batches",
      },
    ],
  },
  {
    version: "1.0.2",
    date: "2026-09-16",
    title: "Bot per Klick, KI-Agenten schreiben Deutsch",
    titleEn: "One-click bot, AI agents write in your language",
    changes: [
      {
        type: "neu",
        text: "Bot per Klick: Unter Konto → Git-Zugänge legt ein Knopf bei GitHub eine eigene App an – nur Name und Repositories bestätigen, kein zweites Konto, kein Token. Sie darf nur Issues schreiben (kein Code, keine Webhooks); Issues erscheinen dann als Bot",
        en: "One-click bot: under Account → Git access a button creates your own GitHub app – just confirm name and repositories, no second account, no token. It can only write issues (no code, no webhooks); issues then appear as the bot",
        link: "/account#git-zugang",
      },
      {
        type: "fix",
        text: "KI-Agenten legen Aufgaben, Beschreibungen und Notizen jetzt in der Sprache deines Kontos an statt auf Englisch",
        en: "AI agents now create tasks, descriptions and notes in your account's language instead of English",
      },
      {
        type: "besser",
        text: "Agenten-Regeln: keine Antwort mehr ohne Blick auf die offenen Aufgaben über MCP, und offene Aufgaben werden vollständig abgearbeitet",
        en: "Agent rules: no reply without checking open tasks over MCP, and open tasks are worked through completely",
      },
    ],
  },
  {
    version: "1.0.1",
    date: "2026-09-16",
    title: "Eigene Spaltennamen überall, Hinweis an die KI",
    titleEn: "Custom column names everywhere, note for the AI",
    changes: [
      {
        type: "fix",
        text: "Umbenannte Spalten (z. B. „Blockiert“) heißen jetzt überall so – in der Aufgabenliste, im Aufgaben-Dialog, im Info-Fenster und auf der Team-Seite, nicht nur im Board",
        en: "Renamed columns (e.g. “Blocked”) now show their name everywhere – in the task list, the task dialog, the info panel and the team page, not just on the board",
      },
      {
        type: "besser",
        text: "„Hinweis an Claude“ heißt jetzt „Hinweis an die KI“ – er gilt für jedes Modell. Ein hinterlegter Hinweis ist auf der Karte (KI-Symbol) und im Aufgaben-Dialog zu sehen",
        en: "“Note for Claude” is now “Note for the AI” – it applies to any model. A saved note shows on the card (AI badge) and in the task dialog",
      },
      {
        type: "besser",
        text: "Lässt sich die Code-Kopie für Code-Netz und Code-Suche nicht holen, bekommst du eine Benachrichtigung – höchstens einmal am Tag je Projekt, mit direktem Link",
        en: "If the code copy for the code network and code search can't be fetched, you get a notification – at most once a day per project, with a direct link",
      },
      {
        type: "fix",
        text: "Sicherheit (Repo-Check): Verschlüsselung verlangt die volle Prüfsummenlänge, Übersetzungen lesen nur eigene Einträge, Protokolle nutzen feste Formatstrings, und ein weiterer regulärer Ausdruck kommt ohne Nutzereingabe aus",
        en: "Security (repo check): encryption requires the full authentication tag length, translations only read own entries, logs use fixed format strings, and another regular expression no longer depends on input",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-09-17",
    title: "Beta-Ansicht für Admins",
    titleEn: "Beta view for admins",
    changes: [
      {
        type: "neu",
        text: "Admins können unter Administration → Einstellungen die Beta-Ansicht starten: Dort erscheinen künftig neue Oberflächen zuerst – nur zum Ansehen, das Backend nimmt in dieser Zeit keine Änderungen an. Ein roter Balken oben zeigt den Modus, das rote ✕ beendet ihn. Andere Konten merken davon nichts",
        en: "Admins can start the beta view under Administration → Settings: upcoming screens will appear there first – for looking only, the backend accepts no changes meanwhile. A red bar at the top shows the mode, the red ✕ ends it. Other accounts are not affected",
        link: "/admin",
      },
    ],
  },
  {
    version: "0.9.9",
    date: "2026-09-17",
    title: "Fehler-Agent",
    titleEn: "Error agent",
    changes: [
      {
        type: "neu",
        text: "Fehler-Eingang: Mit dem Fehler-Agent wird jeder neue Fehler – und jeder erledigte, der wiederkommt – sofort zur Notfix-Aufgabe für Claude: dringend, heute fällig, ohne Stack-Details. Einschalten kann der Besitzer im Fehler-Eingang; höchstens 5 Aufgaben pro Stunde",
        en: "Error inbox: with the error agent, every new error – and every resolved one that comes back – instantly becomes a Notfix task for Claude: urgent, due today, without stack details. The owner switches it on in the error inbox; at most 5 tasks per hour",
      },
      {
        type: "fix",
        text: "Entwicklung: Die Test-Umgebung ist zurück auf vitest 4",
        en: "Development: the test runner is back on vitest 4",
      },
    ],
  },
  {
    version: "0.9.8",
    date: "2026-09-17",
    title: "Code-Netz: Vollbild und Mausrad",
    titleEn: "Code network: full screen and mouse wheel",
    changes: [
      {
        type: "fix",
        text: "Code-Netz: Das Mausrad zoomt jetzt das Netz, statt die ganze Seite zu scrollen",
        en: "Code network: the mouse wheel now zooms the network instead of scrolling the whole page",
      },
      {
        type: "neu",
        text: "Code-Netz im Vollbild – ein Klick, und das Netz füllt das ganze Fenster (Esc beendet). Klappt das Holen der Code-Kopie nicht, steht jetzt verständlich da, warum, und „Kopie jetzt holen“ versucht es sofort noch einmal",
        en: "Code network in full screen – one click and the network fills the whole window (Esc exits). If fetching the code copy fails, it now says why in plain words, and “Fetch copy now” retries right away",
      },
    ],
  },
  {
    version: "0.9.7",
    date: "2026-09-17",
    title: "Eingeschränkt statt kaputt",
    titleEn: "Limited, not broken",
    changes: [
      {
        type: "fix",
        text: "Sind in einem Repository die Issues abgeschaltet, versucht VibeWorks es nicht mehr bei jedem Abgleich neu – das sparte keine GitHub-Aufrufe und konnte andere Projekte ausbremsen. Stattdessen pausieren die Issues einen Tag, die Fehlermarken an den Aufgaben verschwinden, und das Projekt zeigt einen ruhigen Hinweis mit „Jetzt erneut prüfen“. Commits, CI und Abhängigkeiten laufen ganz normal weiter",
        en: "If issues are disabled in a repository, VibeWorks no longer retries on every sync – that wasted GitHub calls and could slow down other projects. Instead, issues pause for a day, the error marks on tasks disappear and the project shows a calm note with “Check again now”. Commits, CI and dependencies keep working as usual",
      },
      {
        type: "besser",
        text: "Die KI sieht in get_repo_status jetzt, welche Bereiche eingeschränkt sind (Commits, Issues, CI, Abhängigkeiten) – und dass der Rest des Repositories trotzdem funktioniert",
        en: "The AI now sees in get_repo_status which areas are limited (commits, issues, CI, dependencies) – and that the rest of the repository still works",
      },
    ],
  },
  {
    version: "0.9.6",
    date: "2026-09-17",
    title: "Wünsche pro Tag einstellbar",
    titleEn: "Wishes per day configurable",
    changes: [
      {
        type: "neu",
        text: "Administration: Wie viele Wünsche (z. B. an Claude) jedes Team-Mitglied pro Tag einreichen darf, ist jetzt einstellbar – 1 bis 20, Standard 3",
        en: "Administration: how many wishes (e.g. for Claude) each team member may submit per day is now configurable – 1 to 20, default 3",
      },
      {
        type: "besser",
        text: "Klarere Beschriftungen: Bei ntfy, Webhook und E-Mail steht jetzt, ob VibeWorks dorthin sendet (Benachrichtigungen) oder von dort empfängt (Ideen-Eingang)",
        en: "Clearer labels: ntfy, webhook and e-mail now say whether VibeWorks sends there (notifications) or receives from there (idea inbox)",
      },
    ],
  },
  {
    version: "0.9.5",
    date: "2026-09-17",
    title: "Einstellungen je MCP-Schlüssel",
    titleEn: "Settings per MCP key",
    changes: [
      {
        type: "neu",
        text: "Jeder API-Schlüssel hat jetzt eigene Einstellungen: was die KI damit darf (nur lesen, lesen und Aufgaben, alles) und wie sie erinnert wird – Standard-Erinnerung, eigener Text oder aus, bei jedem n-ten Aufruf. So vergisst die KI nicht, den Status aktuell zu halten",
        en: "Every API key now has its own settings: what the AI may do with it (read only, read and tasks, everything) and how it is reminded – default reminder, custom text or off, on every n-th call. That way the AI doesn't forget to keep the status up to date",
        link: "/account#mcp",
      },
    ],
  },
  {
    version: "0.9.4",
    date: "2026-09-17",
    title: "Feedback-Eingang",
    titleEn: "Feedback inbox",
    changes: [
      {
        type: "neu",
        text: "Community: Wer eigene Projekte vorstellt, sieht jetzt „Feedback zu deinen Projekten“ – alle Ideen, Fragen und Fehlerberichte an einem Ort, filterbar nach offen und Art, mit Direktlink zum Beitrag",
        en: "Community: anyone showcasing projects now sees “Feedback on your projects” – all ideas, questions and bug reports in one place, filterable by open and kind, with a direct link to the post",
        link: "/community",
      },
      {
        type: "neu",
        text: "Admins können Community-Projekte als „offiziell“ markieren – sie stehen dann ganz oben und tragen ein Abzeichen, damit Neue wissen, wo ihr Feedback besonders willkommen ist",
        en: "Admins can mark community projects as “official” – they appear at the top with a badge, so newcomers know where their feedback is especially welcome",
      },
    ],
  },
  {
    version: "0.9.3",
    date: "2026-09-17",
    title: "Klare Rückmeldungen",
    titleEn: "Clear feedback",
    changes: [
      {
        type: "besser",
        text: "Legt man eine Aufgabe aus dem Repo-Check oder dem Fehler-Eingang an, erscheint unten rechts „Aufgabe erfolgreich erstellt“ – nicht mehr nur ein Hinweis irgendwo im Panel. Der Knopf heißt jetzt „Als Aufgabe erstellen“",
        en: "Creating a task from the repo check or the error inbox now shows “Task created successfully” in the bottom right – no longer just a note somewhere in the panel. The button is now called “Create as task”",
      },
      {
        type: "fix",
        text: "Sicherheit: Das Muster in der Code-Dateiliste (z. B. „src/*.ts“) wird ohne regulären Ausdruck geprüft – ein Muster mit sehr vielen * konnte die Prüfung sonst extrem verlangsamen. Dazu meldet Firefox keinen CSP-Hinweis zu 'self' mehr",
        en: "Security: the pattern in the code file list (e.g. “src/*.ts”) is checked without a regular expression – a pattern with very many * could otherwise slow the check down extremely. Firefox also no longer reports a CSP note about 'self'",
      },
    ],
  },
  {
    version: "0.9.2",
    date: "2026-09-17",
    title: "Memo-Netz und Zweige",
    titleEn: "Memo network and branches",
    changes: [
      {
        type: "fix",
        text: "Code-Netz und Code-Suche funktionieren jetzt auch für GitHub-, GitLab- und Gitea-Projekte: VibeWorks holt dafür bei Bedarf den neuesten Commit als lokale Kopie – mit dem Git-Zugang des Projekts und bei jedem neuen Commit frisch. Bisher gab es die Kopie nur bei allgemeinen Git-Servern",
        en: "Code network and code search now also work for GitHub, GitLab and Gitea projects: VibeWorks fetches the latest commit as a local copy when needed – with the project's Git access and fresh on every new commit. Before, the copy only existed for generic Git servers",
      },
      {
        type: "neu",
        text: "Memo-Netz: an jede Datei im Code-Netz lassen sich Memos heften – Stolperfallen, Zusammenhänge, Hinweise. Sie erscheinen als gelbe Punkte, und die KI kann sie über MCP lesen, anlegen und löschen",
        en: "Memo network: pin memos to any file in the code network – pitfalls, connections, hints. They show up as yellow dots, and the AI can read, add and delete them via MCP",
      },
      {
        type: "neu",
        text: "Zweig wählen: hat ein Repository mehrere Zweige, zeigt das Code-Netz jeden davon – auch Code-Suche und Dateiliste über MCP nehmen einen Zweig an. Oben steht, auf welchem Commit das Netz beruht",
        en: "Pick a branch: if a repository has several branches, the code network shows each of them – code search and the file list via MCP take a branch too. The header shows which commit the network is based on",
      },
    ],
  },
  {
    version: "0.9.1",
    date: "2026-09-17",
    title: "Hinweis an Claude",
    titleEn: "Note for Claude",
    changes: [
      {
        type: "neu",
        text: "Im Info-Fenster einer Aufgabe gibt es jetzt „Hinweis an Claude“: eigener Prompt und Arbeitsweise, mit Bausteinen wie „erst Tests schreiben“ oder „vor dem Push auf mein OK warten“. Die KI bekommt ihn über MCP bei der Aufgabe mit – privat, nie im Issue",
        en: "The task info panel now has “Note for Claude”: your own prompt and way of working, with snippets like “write tests first” or “wait for my OK before pushing”. The AI receives it with the task via MCP – private, never in the issue",
      },
      {
        type: "besser",
        text: "Repo-Check: „Als Aufgabe für Claude“ öffnet jetzt erst das Aufgaben-Fenster mit dem Vorschlag – Titel, Text, Priorität und Bearbeiter lassen sich vor dem Anlegen anpassen. Gibt es schon eine offene Aufgabe dazu, sagt VibeWorks das",
        en: "Repo check: “Task for Claude” now opens the task dialog with the suggestion first – title, text, priority and assignee can be adjusted before creating. If an open task already exists, VibeWorks says so",
      },
    ],
  },
  {
    version: "0.9.0",
    date: "2026-09-17",
    title: "Team sieht die KI arbeiten",
    titleEn: "Team sees the AI at work",
    changes: [
      {
        type: "neu",
        text: "Die Team-Seite zeigt bei „Woran arbeitet Claude gerade?“ jetzt eine laufende Uhr an Aufgaben in Arbeit und darunter die letzten Schritte der KI in den Team-Projekten – welches Werkzeug, an welcher Aufgabe, wann. Schritte aus anderen Projekten bleiben draußen",
        en: "The team page's “What is Claude working on?” now shows a running clock on tasks in progress and, below, the AI's latest steps in the team's projects – which tool, on which task, when. Steps from other projects stay out",
      },
    ],
  },
  {
    version: "0.8.9",
    date: "2026-09-17",
    title: "Code-Netz",
    titleEn: "Code network",
    changes: [
      {
        type: "neu",
        text: "Neues „Code-Netz“ auf der Projektseite: jede Datei ein Punkt, jeder Import eine Linie, farbig nach Bereich. Ziehen, zoomen, suchen – ein Klick zeigt, was eine Datei nutzt und wer sie nutzt, mit Link ins Repository. Abhängigkeiten und Repo-Check bleiben wie sie sind",
        en: "New “Code network” on the project page: each file a dot, each import a line, colored by area. Drag, zoom, search – a click shows what a file uses and who uses it, with a link into the repository. Dependencies and repo check stay as they are",
      },
      {
        type: "neu",
        text: "Die KI sieht das Netz auch: get_code_graph zeigt, welche Dateien eine Datei einbinden – damit sie vor einer Änderung weiß, was betroffen ist",
        en: "The AI sees the network too: get_code_graph shows which files import a file – so it knows what a change affects",
      },
    ],
  },
  {
    version: "0.8.8",
    date: "2026-09-17",
    title: "Konsole bleibt sauber",
    titleEn: "Clean console",
    changes: [
      {
        type: "fix",
        text: "Die Meldung „eval blockiert“ konnte auf einzelnen Seiten wiederkommen, wenn dort ein Formular geladen wurde, bevor die Einstellung dagegen griff. Sie gilt jetzt, bevor irgendein anderer Code der App im Browser läuft",
        en: "The “eval blocked” message could come back on some pages when a form loaded before the setting against it took effect. It now applies before any other app code runs in the browser",
      },
    ],
  },
  {
    version: "0.8.7",
    date: "2026-09-17",
    title: "Info-Fenster: sehen, was Claude macht",
    titleEn: "Info panel: see what Claude does",
    changes: [
      {
        type: "neu",
        text: "Jede Aufgabe hat ein Info-Fenster (ⓘ auf der Karte oder „Info“ im Dialog): aktueller Stand, jeder Schritt der KI über MCP, Commits, die das Issue nennen, der Verlauf und erfasste Zeiten. Es bleibt offen, während man weiterarbeitet, und aktualisiert sich selbst",
        en: "Every task has an info panel (ⓘ on the card or “Info” in the dialog): current state, every AI step via MCP, commits mentioning the issue, the history and tracked time. It stays open while you keep working and refreshes itself",
      },
      {
        type: "neu",
        text: "Ist eine Aufgabe in Arbeit, läuft auf der Karte eine Uhr mit – so sieht das ganze Team, wer gerade woran sitzt und wie lange schon",
        en: "While a task is in progress, a clock runs on its card – so the whole team sees who is working on what and for how long",
      },
    ],
  },
  {
    version: "0.8.6",
    date: "2026-09-16",
    title: "Abhängigkeiten aktualisiert",
    titleEn: "Dependencies updated",
    changes: [
      {
        type: "besser",
        text: "React 19.3, lucide-react 1.x (Symbole), vitest 5 und neuere Typdefinitionen – ohne sichtbare Änderungen. TypeScript 7 bleibt vorerst draußen, bis Next.js die neue Fassung unterstützt",
        en: "React 19.3, lucide-react 1.x (icons), vitest 5 and newer type definitions – with no visible changes. TypeScript 7 stays out for now until Next.js supports the new version",
      },
    ],
  },
  {
    version: "0.8.5",
    date: "2026-09-16",
    title: "Prioritäten für Aufgaben",
    titleEn: "Task priorities",
    changes: [
      {
        type: "neu",
        text: "Aufgaben haben jetzt eine Priorität – niedrig, normal, hoch oder dringend. Sie steht im Aufgaben-Dialog, als Zeichen auf der Karte und im gespiegelten Issue",
        en: "Tasks now have a priority – low, normal, high or urgent. It sits in the task dialog, shows as a marker on the card and appears in the mirrored issue",
      },
      {
        type: "besser",
        text: "Die KI arbeitet nach Priorität: list_tasks liefert Dringendes zuerst, create_task und update_task setzen die Priorität, und die Agenten-Regeln sagen es ausdrücklich. Notfix und Repo-Check-Aufgaben sind automatisch dringend bzw. hoch",
        en: "The AI works by priority: list_tasks returns urgent work first, create_task and update_task set the priority, and the agent rules say so explicitly. Notfix and repo check tasks are automatically urgent or high",
      },
    ],
  },
  {
    version: "0.8.4",
    date: "2026-09-16",
    title: "Repo-Check als Aufgaben",
    titleEn: "Repo check as tasks",
    changes: [
      {
        type: "neu",
        text: "Repo-Check: jeder Befund lässt sich mit einem Klick als Aufgabe für Claude anlegen – mit genau dem Prüfauftrag aus der Erklärung. Dazu eine Einstellung für den Besitzer, ob Aufgaben automatisch entstehen: aus, nur Dringendes (Geheimnisse, Lücken) oder alles. Die Sammel-Aufgaben halten sich selbst aktuell",
        en: "Repo check: every finding can become a task for Claude with one click – with exactly the instructions from the explanation. Plus an owner setting for automatic tasks: off, only urgent (secrets, vulnerabilities) or everything. The collective tasks keep themselves up to date",
      },
      {
        type: "fix",
        text: "Teilen: Wer Mitglieder einladen darf, sieht jetzt auch einen schon eingeschalteten öffentlichen Link und kann ihn kopieren. Ein- und Ausschalten bleibt beim Besitzer",
        en: "Sharing: anyone allowed to invite members now also sees an already enabled public link and can copy it. Switching it on or off stays with the owner",
      },
      {
        type: "besser",
        text: "GitHub-Workflows sind auf feste Versionen gepinnt – auch in der Vorlage für den Repo-Check, die bestehende Checks beim nächsten Lauf übernehmen. Dazu eine CLAUDE.md mit dem kompletten Arbeitsablauf für Issues",
        en: "GitHub workflows are pinned to fixed versions – including the repo check template, which existing checks pick up on their next run. Plus a CLAUDE.md with the complete issue workflow",
      },
    ],
  },
  {
    version: "0.8.3",
    date: "2026-09-16",
    title: "Notfix und Code-Suche",
    titleEn: "Notfix and code search",
    changes: [
      {
        type: "neu",
        text: "„Notfix“ im Fehler-Eingang: ein Klick macht aus einem Fehler eine dringende Aufgabe für Claude – heute fällig, klar gekennzeichnet. Stack und Seitenangaben bleiben wie bisher im Eingang und wandern nicht ins Issue",
        en: "“Notfix” in the error inbox: one click turns an error into an urgent task for Claude – due today, clearly marked. Stack traces and page details stay in the inbox and never reach the issue",
      },
      {
        type: "neu",
        text: "Zwei neue MCP-Werkzeuge: Claude kann jetzt die Dateien des verknüpften Repositories auflisten und im Code nach einer Stelle suchen – mit Datei, Zeile und Fundstelle, statt Pfade zu raten. Gesucht wird in der Kopie, die VibeWorks ohnehin schon geholt hat",
        en: "Two new MCP tools: Claude can list the files of the linked repository and search the code, with file, line and the matching line, instead of guessing paths. It searches the copy VibeWorks has already fetched",
      },
    ],
  },
  {
    version: "0.8.2",
    date: "2026-09-16",
    title: "Admin vergibt ein neues Passwort",
    titleEn: "Admin sets a new password",
    changes: [
      {
        type: "neu",
        text: "Auf „Passwort vergessen?“ gibt es jetzt den kurzen Weg: einen Admin um ein neues Passwort bitten. Das geht auch ohne hinterlegte E-Mail-Adresse und ohne eingerichteten E-Mail-Versand",
        en: "“Forgot your password?” now has a short path: ask an admin for a new password. This works without an e-mail address in the account and without a configured e-mail sender",
        link: "/reset",
      },
      {
        type: "besser",
        text: "Admins bekommen die Bitte als Benachrichtigung und sehen sie in der Benutzerliste; sobald sie ein Passwort setzen, verschwindet der Hinweis wieder. Höchstens eine Bitte pro Stunde und Konto",
        en: "Admins receive the request as a notification and see it in the user list; once they set a password, the marker disappears. At most one request per account per hour",
      },
    ],
  },
  {
    version: "0.8.1",
    date: "2026-09-16",
    title: "Passwort vergessen",
    titleEn: "Forgot password",
    changes: [
      {
        type: "neu",
        text: "„Passwort vergessen?“ auf der Anmeldeseite: Link an die im Konto hinterlegte E-Mail, eine Stunde gültig, nur einmal nutzbar; danach sind alle anderen Geräte abgemeldet. Muss ein Admin erst einschalten (Administration → Einstellungen) und braucht eingerichteten E-Mail-Versand. Ob es ein Konto gibt, verrät die Seite nie",
        en: "“Forgot your password?” on the sign-in page: a link to the e-mail in your account, valid for one hour, single use; afterwards all other devices are signed out. An admin has to enable it first (Administration → Settings) and e-mail sending must be configured. The page never reveals whether an account exists",
      },
      {
        type: "besser",
        text: "Sicherheitsfragen gibt es bewusst nicht – sie sind ratbar. Wer keine E-Mail hinterlegt hat, bekommt sein Passwort weiterhin vom Admin gesetzt",
        en: "Deliberately no security questions – they're guessable. Without an e-mail address, an admin still sets the password for you",
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-09-15",
    title: "Kritisches kommt immer durch",
    titleEn: "Critical alerts always get through",
    changes: [
      {
        type: "neu",
        text: "Kritische Meldungen – neuer App-Fehler, Live-Seite nicht erreichbar, Geheimnis im Repository – gehen mit höchster ntfy-Priorität raus und kommen so auch bei „Nicht stören“ durch (in der ntfy-App erlauben). Abschaltbar unter Benachrichtigungen in der ntfy-Kachel",
        en: "Critical alerts – a new app error, the live site down, a secret in the repository – go out with the highest ntfy priority and so get through “Do not disturb” too (allow it in the ntfy app). Can be switched off under Notifications in the ntfy tile",
        link: "/account#benachrichtigungen",
      },
    ],
  },
  {
    version: "0.7.9",
    date: "2026-09-15",
    title: "Team-Seite: Übersicht, Claude, Wünsche, Chat",
    titleEn: "Team page: overview, Claude, wishes, chat",
    changes: [
      {
        type: "neu",
        text: "Jedes Team hat eine eigene Seite (Klick auf den Team-Namen): Mitglieder mit Rollen, Team-Projekte mit offenen Aufgaben und Fehlern, letzte Aktivität – und „Woran arbeitet Claude gerade?“ mit allen Aufgaben, bei denen Claude Bearbeiter ist",
        en: "Every team has its own page (click the team name): members with roles, team projects with open tasks and errors, recent activity – and “What is Claude working on?” with all tasks assigned to Claude",
        link: "/teams",
      },
      {
        type: "neu",
        text: "Team-Chat nur für Mitglieder – z. B. um direkt mit dem Bughunter zu sprechen",
        en: "Team chat for members only – e.g. to talk to the bughunter directly",
      },
      {
        type: "neu",
        text: "Wünsche ans Team: jedes Mitglied bis zu 3 am Tag; wer das Team verwaltet, macht mit einem Klick eine Aufgabe in einem Team-Projekt daraus oder lehnt mit Grund ab – die Person bekommt jeweils eine Meldung",
        en: "Wishes to the team: every member up to 3 a day; whoever manages the team turns one into a task in a team project with one click or declines with a reason – the person gets notified either way",
      },
    ],
  },
  {
    version: "0.7.8",
    date: "2026-09-15",
    title: "Befunde verständlich, Fork-Meldung, Beiträge als Aufgabe",
    titleEn: "Findings explained, fork alerts, posts as tasks",
    changes: [
      {
        type: "neu",
        text: "Repo-Check erklärt jeden Befund in einfacher Sprache – was er bedeutet und wie man ihn behebt – und liefert einen fertigen Prompt für Claude Code zum Kopieren. Umgesetzt wird weiter bei dir, VibeWorks schreibt nichts ins Repository",
        en: "The repo check explains every finding in plain words – what it means and how to fix it – and provides a ready-made prompt for Claude Code to copy. Fixing still happens on your side, VibeWorks writes nothing into the repository",
      },
      {
        type: "neu",
        text: "Fork-Meldung: forkt jemand ein Repository eines Projekts, kommt eine Nachricht mit Link zum Fork – nichts wird kopiert. Neuer Anlass „Fork“ (braucht den Webhook)",
        en: "Fork alert: if someone forks a project's repository, you get a message with a link to the fork – nothing is copied. New event “Fork” (needs the webhook)",
      },
      {
        type: "neu",
        text: "Community: Mitglieder ab „Bearbeiter“ übernehmen einen Beitrag mit einem Klick als Aufgabe (mit Issue, wenn das Projekt spiegelt) – Beiträge anderer bleiben intern",
        en: "Community: members from “Editor” up turn a post into a task with one click (with an issue if the project mirrors) – posts by others stay internal",
      },
      {
        type: "besser",
        text: "MCP-Regeln: die KI fragt vor dem Speichern, in welchem Werkzeug sie läuft und wohin die Regeln sollen",
        en: "MCP rules: the AI asks which tool it runs in and where the rules should go before saving them",
      },
    ],
  },
  {
    version: "0.7.7",
    date: "2026-09-15",
    title: "Brett einstellen, Bearbeiter aus dem Team, neue Benachrichtigungs-Seite",
    titleEn: "Set up the board, assignees from the team, new notification page",
    changes: [
      {
        type: "neu",
        text: "Aufgabenbrett einstellen (Zahnrad): Spalten umbenennen, Reihenfolge ändern, Spalten ausblenden und lange Spalten nach 5, 10, 20 oder 50 Karten einklappen – gilt für alle im Projekt, der Status dahinter bleibt gleich",
        en: "Set up the task board (gear icon): rename columns, change their order, hide columns and collapse long ones after 5, 10, 20 or 50 cards – applies to everyone in the project, the status behind stays the same",
      },
      {
        type: "neu",
        text: "Bearbeiter: Vorschläge aus den Leuten im Projekt (Besitzer, Mitglieder, Teams). Wer eingetragen wird, bekommt eine Meldung in der Glocke – neuer Anlass „Aufgabe zugewiesen“",
        en: "Assignee: suggestions from the people in the project (owner, members, teams). Whoever is entered gets a notification in the bell – new event “Task assigned”",
      },
      {
        type: "besser",
        text: "Benachrichtigungs-Einstellungen neu: Kanäle als Kacheln mit Status, Anlässe nach Themen gruppiert mit Schaltern und „Alle an/aus“",
        en: "Notification settings redesigned: channels as tiles with status, events grouped by topic with switches and “All on/off”",
        link: "/account#benachrichtigungen",
      },
      {
        type: "besser",
        text: "„Neue Aufgabe mit Details“ hat ein eigenes Symbol – das Zahnrad stellt jetzt das Brett ein",
        en: "“New task with details” has its own icon – the gear now sets up the board",
      },
    ],
  },
  {
    version: "0.7.6",
    date: "2026-09-15",
    title: "Bot-Konto für Issues und Rolle „Bughunter“",
    titleEn: "Bot account for issues and “Bughunter” role",
    changes: [
      {
        type: "neu",
        text: "Bot-Konto für Issues: je Git-Verbindung lässt sich der Token eines zweiten Kontos (z. B. „vibeworks-bot“) eintragen – dann legt VibeWorks Issues und Status-Labels unter dem Bot an statt unter deinem Profil. Commits, CI und Import laufen weiter über deinen Zugang",
        en: "Bot account for issues: per Git connection you can enter the token of a second account (e.g. “vibeworks-bot”) – VibeWorks then creates issues and status labels as the bot instead of under your profile. Commits, CI and import keep using your access",
        link: "/account#git-zugang",
      },
      {
        type: "neu",
        text: "Neue Standardrolle „Bughunter“: Aufgaben, Notizen, Zeit, Git- und Live-Prüfung und Fehler-Eingang – ohne Mitglieder, Kosten und Projektangaben. Vergeben im Teilen-Dialog",
        en: "New built-in role “Bughunter”: tasks, notes, time, Git and live checks and the error inbox – without members, costs or project details. Assigned in the share dialog",
      },
    ],
  },
  {
    version: "0.7.5",
    date: "2026-09-15",
    title: "Wer hat's angelegt? Klare MCP-Fehler",
    titleEn: "Who created it? Clear MCP errors",
    changes: [
      {
        type: "neu",
        text: "Aufgaben merken sich, wer sie in VibeWorks angelegt hat – auf der Karte, im Dialog und im Issue („✍️ Erstellt von …“; per KI über MCP und Automatisches werden als solches genannt). Bestehende Aufgaben bekommen den Ersteller aus dem Aktivitätsprotokoll",
        en: "Tasks remember who created them in VibeWorks – on the card, in the dialog and in the issue (“✍️ Erstellt von …”; created by AI via MCP and automatic ones are labelled as such). Existing tasks get their creator from the activity log",
      },
      {
        type: "besser",
        text: "MCP-Fehler 401 nennen die Ursache (missing, malformed, invalid_or_revoked, account_inactive); am Schlüssel steht, von welcher Adresse und mit welchem Programm er zuletzt benutzt wurde, dazu wie lange Schlüssel und Sitzungen gelten",
        en: "MCP 401 errors name the cause (missing, malformed, invalid_or_revoked, account_inactive); each key shows the address and program it was last used from, plus how long keys and sessions last",
        link: "/account#mcp",
      },
      {
        type: "besser",
        text: "Abgelaufene Anmeldung: die Anmeldeseite sagt jetzt, warum, statt stumm zurückzuspringen",
        en: "Expired sign-in: the sign-in page now says why instead of silently jumping back",
      },
      {
        type: "besser",
        text: "„KI & MCP“ steht direkt im Profilmenü",
        en: "“AI & MCP” is right in the profile menu",
      },
      {
        type: "fix",
        text: "Keine CSP-Meldung „eval blockiert“ und keine Schrift-Warnung (Cascadia Code) mehr in der Browser-Konsole",
        en: "No more CSP “eval blocked” message and no font warning (Cascadia Code) in the browser console",
      },
    ],
  },
  {
    version: "0.7.4",
    date: "2026-09-15",
    title: "Hinweise auf Neues und schönere Scrollbars",
    titleEn: "What's new notices and nicer scrollbars",
    changes: [
      {
        type: "neu",
        text: "Nach einem Update meldet die Glocke neue Funktionen in deiner Sprache – ein Klick führt direkt zur passenden Einstellung. Abschaltbar unter Benachrichtigungen („Neue Funktionen“)",
        en: "After an update the bell announces new features in your language – a click takes you straight to the matching setting. Can be switched off under Notifications (“New features”)",
        link: "/account#benachrichtigungen",
      },
      {
        type: "besser",
        text: "Im Änderungsverlauf führt „Ansehen“ bei neuen Funktionen direkt zur Einstellung",
        en: "In the changelog, “View” takes you straight to the setting of a new feature",
      },
      {
        type: "besser",
        text: "Schönere Scrollbars überall – schmal, ohne graue Spur, in den Farben deines Designs und beim Anfassen in der Akzentfarbe; auch in Firefox",
        en: "Nicer scrollbars everywhere – slim, no grey track, in your design's colours and in the accent colour while you drag; in Firefox too",
      },
    ],
  },
  {
    version: "0.7.3",
    date: "2026-09-15",
    title: "MCP: Regeln für KI-Agenten und Protokoll",
    titleEn: "MCP: rules for AI agents and call log",
    changes: [
      {
        type: "neu",
        text: "Regeln für KI-Agenten: Beim ersten Verbinden holt sich die KI mit get_agent_rules eine Skill-Datei (englisch, mit der aktuellen Werkzeugliste), speichert sie lokal – Claude Code, Gemini oder AGENTS.md – und bestätigt mit confirm_agent_rules. Bis dahin erinnert jede Antwort daran; ob bestätigt ist, steht am Schlüssel",
        en: "Rules for AI agents: on first connect the AI fetches a skill file with get_agent_rules (English, with the current tool list), saves it locally – Claude Code, Gemini or AGENTS.md – and confirms with confirm_agent_rules. Until then every answer reminds it; the key shows whether it's confirmed",
        link: "/account#mcp",
      },
      {
        type: "neu",
        text: "MCP-Protokoll im Konto: welche Werkzeuge deine Schlüssel aufgerufen haben, mit Ergebnis, Fehler und Dauer – ohne Inhalte, nach 30 Tagen gelöscht. Am Schlüssel steht außerdem, welcher Client ihn benutzt",
        en: "MCP call log in your account: which tools your keys called, with result, error and duration – without contents, deleted after 30 days. Each key also shows which client uses it",
      },
      {
        type: "besser",
        text: "Ältere MCP-Clients funktionieren weiter, bekommen aber den Hinweis, sich zu aktualisieren; Aufrufe unbekannter Werkzeuge landen im Protokoll",
        en: "Older MCP clients keep working but get a note to update; calls to unknown tools show up in the log",
      },
    ],
  },
  {
    version: "0.7.2",
    date: "2026-09-15",
    title: "Entwürfe und Passwort-Erinnerung",
    titleEn: "Drafts and password reminder",
    changes: [
      {
        type: "neu",
        text: "Angefangene Texte bleiben erhalten, wenn man die Seite verlässt oder neu lädt: neue Aufgabe, neues Projekt, neue Notiz, Community-Beitrag, Antwort und Chat. Hinweis „Entwurf wiederhergestellt · Verwerfen“; beim Abmelden werden alle Entwürfe gelöscht, Anmeldedaten nie gespeichert",
        en: "Unfinished texts survive leaving or reloading the page: new task, new project, new note, community post, reply and chat. Note “Draft restored · Discard”; signing out deletes all drafts, sign-in data is never stored",
      },
      {
        type: "neu",
        text: "Erinnerung zum Passwortwechsel – unter Konto → Passwort einstellbar (aus, 90, 180 oder 365 Tage). Die Meldung kommt über die Glocke und die Kanäle, ein Klick führt direkt zur Einstellung",
        en: "Password change reminder – set under Account → Password (off, 90, 180 or 365 days). It arrives via the bell and your channels, a click takes you straight to the setting",
        link: "/account#passwort",
      },
      {
        type: "besser",
        text: "Strengere Passwortregeln für neue Passwörter: mindestens 12 Zeichen und ein Sonderzeichen (ein Leerzeichen zählt – Passphrasen gehen weiter). Beim Tippen zeigen Häkchen, was schon erfüllt ist; bestehende Passwörter bleiben gültig",
        en: "Stricter rules for new passwords: at least 12 characters and one special character (a space counts – passphrases still work). Checkmarks show what's already met while typing; existing passwords stay valid",
      },
    ],
  },
  {
    version: "0.7.1",
    date: "2026-09-15",
    title: "Glocke und Bearbeiter",
    titleEn: "Bell and assignees",
    changes: [
      {
        type: "neu",
        text: "Glocke in der Kopfleiste: zeigt die neuesten Benachrichtigungen mit Zahl der ungelesenen. Ein Klick öffnet das Ziel, einzeln als gelesen/ungelesen markieren, löschen oder alle auf einmal als gelesen markieren",
        en: "Bell in the top bar: shows the latest notifications with the number of unread ones. A click opens the target; mark single ones read/unread, delete them or mark all as read at once",
      },
      {
        type: "neu",
        text: "Bearbeiter an Aufgaben: wer daran arbeitet (z. B. „anna“ oder „Claude“), steht auf der Karte und im Issue („👤 Bearbeitet von“). Umgekehrt zeigen Zuweisungen im Issue und Labels wie „🤖 Claude“, wer das Issue gerade macht",
        en: "Assignees on tasks: who works on it (e.g. “anna” or “Claude”) shows on the card and in the issue (“👤 Bearbeitet von”). The other way round, issue assignees and labels like “🤖 Claude” show who is working on the issue",
      },
      {
        type: "besser",
        text: "MCP: create_task und update_task kennen „assignee“ – eine KI trägt beim Start ihren Namen ein, damit alle sehen, wer dran ist",
        en: "MCP: create_task and update_task know “assignee” – an AI enters its name when it starts, so everyone sees who is on it",
      },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-09-15",
    title: "Team-Rollen und eigene Rollen",
    titleEn: "Team roles and your own roles",
    changes: [
      {
        type: "neu",
        text: "Team-Rollen mit eigenen Rechten: Mitglieder einladen, Mitglieder entfernen, Rollen im Team vergeben, Team umbenennen und löschen. Standardrollen Admin, Einlader und Mitglied – bisherige Admins und Mitglieder behalten ihre Rechte",
        en: "Team roles with their own permissions: inviting members, removing members, assigning roles in the team, renaming and deleting the team. Built-in roles Admin, Inviter and Member – existing admins and members keep their permissions",
      },
      {
        type: "neu",
        text: "Jedes Team legt seine eigenen Rollen an (Teams → Team → Rollen dieses Teams) – wer „Rollen vergeben“ darf, nur bis zu den eigenen Rechten. In der Mitgliederliste wählt man die Rolle per Auswahlfeld",
        en: "Every team creates its own roles (Teams → team → This team's roles) – whoever may assign roles, only up to their own permissions. In the member list you pick the role from a dropdown",
      },
      {
        type: "neu",
        text: "Eigene Projekt-Rollen direkt im Teilen-Dialog anlegen („Eigene Rolle anlegen“) – sie stehen danach sofort zur Auswahl",
        en: "Create your own project roles right in the share dialog (“Create your own role”) – they're available for selection straight away",
      },
      {
        type: "besser",
        text: "Admins pflegen unter Administration → Rollen jetzt auch Vorlagen für Team-Rollen",
        en: "Under Administration → Roles, admins now also maintain templates for team roles",
      },
      {
        type: "fix",
        text: "Die Versionsanzeige kommt jetzt aus dem Änderungsverlauf – vorher zählten auch die Repo-Check-Commits mit, deshalb stand dort z. B. 0.7.1 statt 0.6.9. „Update Nr.“ zählt weiter alle Commits",
        en: "The version display now comes from the changelog – previously the repo check commits were counted too, which showed e.g. 0.7.1 instead of 0.6.9. “Update no.” still counts all commits",
      },
      {
        type: "fix",
        text: "„Token auf GitHub erstellen“ fragt überall dieselben, vollständigen Rechte an (repo, admin:repo_hook, workflow) – vorher fehlte im Git-Bereich „repo“, damit gingen private Repositories und der Repo-Check nicht",
        en: "“Create token on GitHub” now requests the same complete scopes everywhere (repo, admin:repo_hook, workflow) – previously “repo” was missing in the Git section, so private repositories and the repo check didn't work",
      },
    ],
  },
  {
    version: "0.6.9",
    date: "2026-09-15",
    title: "Rollen",
    titleEn: "Roles",
    changes: [
      {
        type: "neu",
        text: "Rollen statt nur „Ansehen/Bearbeiten“: zehn einzelne Rechte (Aufgaben, Aufgaben löschen, Notizen, Projektangaben, Kosten, Zeit erfassen, Git prüfen, Live-Prüfung, Fehler-Eingang, Mitglieder einladen). Standardrollen: Betrachter, Mitwirkender, Bearbeiter, Manager – bestehende Mitglieder behalten ihre Rechte",
        en: "Roles instead of just “view/edit”: ten individual permissions (tasks, deleting tasks, notes, project details, costs, time tracking, Git checks, live check, error inbox, inviting members). Built-in roles: Viewer, Contributor, Editor, Manager – existing members keep their permissions",
      },
      {
        type: "neu",
        text: "Eigene Rollen im Profilmenü unter Rollen; Admins pflegen Vorlagen für alle und passen die Standardrollen an (Administration → Rollen). Vergeben werden Rollen im Teilen-Dialog – an Mitglieder, bei Anfragen und an Teams",
        en: "Your own roles in the profile menu under Roles; admins maintain templates for everyone and adjust the built-in roles (Administration → Roles). Roles are assigned in the share dialog – to members, on requests and to teams",
      },
      {
        type: "besser",
        text: "Sicherheit: Wer Mitglieder einladen darf, vergibt nur Rollen bis zu den eigenen Rechten und stuft niemanden um, der mehr darf. Öffentlicher Link, Team-Freigaben, Repository, Token und Löschen bleiben immer beim Besitzer; wird eine eigene Rolle gelöscht, bleibt nur Lesen",
        en: "Security: whoever may invite members only assigns roles up to their own permissions and can't change anyone who may do more. Public link, team shares, repository, token and deletion always stay with the owner; if a custom role is deleted, only read access remains",
      },
      {
        type: "besser",
        text: "Zeit erfassen ist jetzt ein eigenes Recht (ab „Mitwirkender“) – Betrachter lesen nur noch",
        en: "Time tracking is now its own permission (from “Contributor” up) – viewers only read",
      },
    ],
  },
  {
    version: "0.6.8",
    date: "2026-09-15",
    title: "Teams",
    titleEn: "Teams",
    changes: [
      {
        type: "neu",
        text: "Teams (Profilmenü → Teams): Konten zu Teams zusammenfassen und Projekte an ein ganzes Team freigeben – zum Ansehen oder Bearbeiten (Projekt → Teilen → Teams). Wer später dazukommt, sieht die Projekte sofort; wer geht oder entfernt wird, verliert den Zugriff sofort",
        en: "Teams (profile menu → Teams): group accounts into teams and share projects with a whole team – to view or edit (project → Share → Teams). Whoever joins later sees the projects right away; whoever leaves or is removed loses access immediately",
      },
      {
        type: "neu",
        text: "Beitritt nur per Einladung, die angenommen werden muss; Team-Admins verwalten Mitglieder, und ein Team behält immer einen Admin. Benachrichtigung bei Einladungen, „Mit mir geteilt“ zeigt „über Team …“",
        en: "Joining only by invitation, which has to be accepted; team admins manage members, and a team always keeps an admin. Notification for invitations, “Shared with me” shows “via team …”",
      },
      {
        type: "besser",
        text: "Sicherheit: Freigeben darf nur der Projektbesitzer und nur an Teams, in denen er selbst ist; Löschen, Teilen und Token bleiben beim Besitzer. Ist jemand zusätzlich einzeln eingeladen, gilt die stärkere Rolle. Nur im Mehrbenutzerbetrieb",
        en: "Security: only the project owner can share, and only with teams they belong to; deleting, sharing and tokens stay with the owner. If someone is also invited individually, the stronger role applies. Multi-user mode only",
      },
    ],
  },
  {
    version: "0.6.7",
    date: "2026-09-15",
    title: "Vorstellungs-Folien",
    titleEn: "Presentation slides",
    changes: [
      {
        type: "neu",
        text: "Projekt präsentieren: Im Projekt über das Menü „Weitere Aktionen“ → Präsentieren baut VibeWorks Folien aus deinen Angaben – Titel, je Überschrift der Beschreibung eine Folie, Stand mit Aufgaben, letzte Commits, Live-Seite, nächste Schritte und ein Schluss mit Links",
        en: "Present a project: in a project via the “More actions” menu → Present, VibeWorks builds slides from your details – title, one slide per heading of the description, status with tasks, recent commits, live site, next steps and a closing slide with links",
      },
      {
        type: "neu",
        text: "Blättern mit Pfeiltasten, Leertaste, Klick oder Wischen, F für Vollbild, Esc zurück – in den Farben des Projekts, passend zu Hell und Dunkel. Nur für Projektmitglieder",
        en: "Navigate with arrow keys, space, click or swipe, F for fullscreen, Esc to go back – in the project's colors, fitting light and dark mode. Only for project members",
      },
    ],
  },
  {
    version: "0.6.6",
    date: "2026-09-15",
    title: "Community-Chat",
    titleEn: "Community chat",
    changes: [
      {
        type: "neu",
        text: "Chat in der Community: ein Lobby-Chat für alle auf der Instanz und ein Chat je vorgestelltem Projekt. Neue Nachrichten erscheinen von selbst, Enter sendet",
        en: "Chat in the community: a lobby chat for everyone on the instance and a chat for each presented project. New messages show up by themselves, Enter sends",
      },
      {
        type: "neu",
        text: "Moderation wie bei den Beiträgen: Nachrichten ausblenden, löschen und melden; im Projekt-Chat moderiert der Besitzer, in der Lobby die Admins. Gemeldete Nachrichten stehen in Administration → Community, Sperren gelten auch im Chat",
        en: "Moderation like for posts: hide, delete and report messages; the owner moderates the project chat, admins moderate the lobby. Reported messages show up under Administration → Community, bans apply to the chat too",
      },
      {
        type: "besser",
        text: "Sicherheit: Chat-Nachrichten werden als reiner Text gezeigt (kein HTML, kein Markdown), höchstens 1.000 Zeichen und 20 Nachrichten je Minute",
        en: "Security: chat messages are shown as plain text (no HTML, no Markdown), at most 1,000 characters and 20 messages per minute",
      },
    ],
  },
  {
    version: "0.6.5",
    date: "2026-09-15",
    title: "Community",
    titleEn: "Community",
    changes: [
      {
        type: "neu",
        text: "Community für die Konten deiner Instanz (Mehrbenutzerbetrieb): Projekte vorstellen und dazu Fragen, Ideen und Fehlerberichte schreiben, mit Antworten und Markdown. Antwortet der Projektbesitzer auf eine Frage, gilt sie als beantwortet",
        en: "Community for the accounts of your instance (multi-user mode): present projects and write questions, ideas and bug reports about them, with replies and Markdown. When the project owner answers a question, it counts as answered",
      },
      {
        type: "neu",
        text: "Moderation: Der Projektbesitzer kann Beiträge ausblenden, schließen, löschen und Leute für sein Projekt sperren; alle können melden. Admins sehen unter Administration → Community alle Meldungen und können Konten für die ganze Community sperren",
        en: "Moderation: the project owner can hide, close and delete posts and ban people from their project; everyone can report. Admins see all reports under Administration → Community and can ban accounts from the whole community",
      },
      {
        type: "neu",
        text: "Benachrichtigung bei neuen Beiträgen zu deinem Projekt und bei Antworten auf deine Beiträge",
        en: "Notifications for new posts on your project and for replies to your posts",
      },
      {
        type: "besser",
        text: "Datenschutz: Die Community zeigt nur Name, Kurzbeschreibung, Stand, Tags und Links der Projekte, die du ausdrücklich freigibst – Beschreibung, Notizen und Aufgaben bleiben privat, und niemand bekommt dadurch Zugriff auf das Projekt. Ausgeblendetes sehen nur Autor und Moderation; Gesperrte können lesen, aber nicht schreiben",
        en: "Privacy: the community only shows name, summary, status, tags and links of projects you explicitly share – description, notes and tasks stay private, and nobody gets access to the project through it. Hidden posts are only visible to their author and moderators; banned people can read but not write",
      },
    ],
  },
  {
    version: "0.6.4",
    date: "2026-09-15",
    title: "Einladungslinks",
    titleEn: "Invitation links",
    changes: [
      {
        type: "neu",
        text: "Einladungslinks: Unter Administration → Einladungen erzeugst du Links für neue Konten – einmal nutzbar, 1, 7 oder 30 Tage gültig, mit Notiz. Sie funktionieren auch, wenn die Selbstregistrierung aus ist; so kommen Leute gezielt in deine Instanz (Grundlage für die Community)",
        en: "Invitation links: under Administration → Invitations you create links for new accounts – single use, valid for 1, 7 or 30 days, with a note. They work even when self-registration is off, so you can bring people into your instance on purpose (the basis for the community)",
      },
      {
        type: "besser",
        text: "Sicherheit: VibeWorks speichert vom Link nur einen Fingerabdruck und zeigt ihn nur beim Erzeugen; Einlösen und Konto anlegen geschehen in einem Schritt (zweimal geht nicht, ein vergebener Name verbraucht die Einladung nicht). Eingeladene bekommen immer ein normales Benutzerkonto, offene Links lassen sich zurückziehen",
        en: "Security: VibeWorks only stores a fingerprint of the link and shows it only when creating it; redeeming and creating the account happen in one step (no second use, a taken username doesn't use up the invitation). Invited people always get a regular user account, open links can be revoked",
      },
    ],
  },
  {
    version: "0.6.3",
    date: "2026-09-15",
    title: "Fehler-Eingang",
    titleEn: "Error inbox",
    changes: [
      {
        type: "neu",
        text: "Fehler-Eingang: Deine Apps melden Laufzeitfehler direkt an VibeWorks – mit fertigen Schnipseln für Browser, Node.js und Skripte. Gleichartige Fehler werden zusammengefasst (auch über neue Builds hinweg), mit Zähler, Stack und Version",
        en: "Error inbox: your apps report runtime errors straight to VibeWorks – with ready-made snippets for browser, Node.js and scripts. Similar errors are grouped (even across new builds), with count, stack and version",
      },
      {
        type: "neu",
        text: "Erledigen, Ignorieren oder als Aufgabe übernehmen; ein erledigter Fehler, der wiederkommt, ist wieder offen. Neue Fehler melden sich als Benachrichtigung (höchstens 5 je Stunde und Projekt)",
        en: "Resolve, ignore or turn into a task; a resolved error that comes back is open again. New errors notify you (at most 5 per hour and project)",
      },
      {
        type: "neu",
        text: "Claude kann die Fehler lesen und abhaken: list_errors und resolve_error; list_problems zeigt offene Fehler aller Projekte",
        en: "Claude can read and tick off errors: list_errors and resolve_error; list_problems shows open errors across all projects",
      },
      {
        type: "besser",
        text: "Sicherheit: Der Schlüssel in der Adresse erlaubt nur, Fehler in dieses eine Projekt zu schreiben – ohne Cookies, mit Größen- und Mengenlimits, jederzeit erneuerbar. Details sehen nur Projektmitglieder, und eine Aufgabe aus einem Fehler enthält keinen Stack und keine Seiten-Adresse (sie kann als Issue öffentlich werden)",
        en: "Security: the key in the address only allows writing errors into this one project – no cookies, with size and rate limits, renewable any time. Only project members see details, and a task made from an error contains no stack and no page address (it may become a public issue)",
      },
    ],
  },
  {
    version: "0.6.2",
    date: "2026-09-15",
    title: "Repo-Check und Abhängigkeiten als Aufgaben",
    titleEn: "Repo check and dependencies as tasks",
    changes: [
      {
        type: "neu",
        text: "Repo-Check ohne KI: VibeWorks richtet in GitHub-Repositories einen kostenlosen Workflow ein, der Geheimnisse (Gitleaks), Sicherheitslücken (OSV-Scanner), Fehlermuster (Semgrep) und TODOs findet – Ergebnis mit Links auf die Fundstellen, montags und auf Knopfdruck",
        en: "Repo check without AI: VibeWorks sets up a free workflow in GitHub repositories that finds secrets (Gitleaks), vulnerabilities (OSV-Scanner), bug patterns (Semgrep) and TODOs – results link to the exact spot, on Mondays and on demand",
      },
      {
        type: "neu",
        text: "Was im Abhängigkeiten-Check markiert ist, steht sofort als Aufgabe im Board – eine für Sicherheitslücken, eine für Updates; die Liste pflegt sich selbst und die Aufgabe ist erledigt, sobald nichts mehr markiert ist",
        en: "Whatever the dependency check flags shows up as a task on the board right away – one for vulnerabilities, one for updates; the list keeps itself up to date and the task is done once nothing is flagged",
      },
      {
        type: "neu",
        text: "Benachrichtigung, wenn der Repo-Check neue Geheimnisse oder Lücken findet; der Check fließt in die Wochen-Vorschläge und in Claudes get_repo_status/list_problems ein",
        en: "Notification when the repo check finds new secrets or vulnerabilities; the check also feeds the weekly suggestions and Claude's get_repo_status/list_problems",
      },
      {
        type: "besser",
        text: "Sicherheit: Die Ergebnisse sehen nur Projektmitglieder, nie öffentliche Seiten; der Workflow hat nur Leserechte und gibt sein Token nicht an die Prüfwerkzeuge weiter. Ausschalten nimmt die Datei wieder aus dem Repository, und wer sie dort löscht, schaltet den Check ab",
        en: "Security: only project members see the results, never public pages; the workflow is read-only and doesn't hand its token to the scanners. Turning it off removes the file from the repository again, and deleting it there turns the check off",
      },
      {
        type: "fix",
        text: "Abhängigkeiten-Check: Markiert ein Paket einen Release Candidate als „latest“ (z. B. prisma 8.0.0-rc), zählt jetzt die höchste stabile Version",
        en: "Dependency check: if a package tags a release candidate as “latest” (e.g. prisma 8.0.0-rc), the highest stable version now counts",
      },
      {
        type: "besser",
        text: "Der GitHub-Token-Link fragt jetzt auch das Recht „workflow“ an (für den Repo-Check)",
        en: "The GitHub token link now also asks for the “workflow” scope (for the repo check)",
      },
    ],
  },
  {
    version: "0.6.1",
    date: "2026-09-15",
    title: "Sicherheits-Nachtrag zu Prisma 7",
    titleEn: "Security follow-up to Prisma 7",
    changes: [
      {
        type: "fix",
        text: "Die Prisma-Werkzeuge brachten eine veraltete MySQL-Bibliothek mit bekannten Lücken mit – jetzt auf die abgesicherte Version angehoben (VibeWorks nutzt MySQL nicht, npm audit meldet wieder keine Lücken)",
        en: "The Prisma tooling shipped an outdated MySQL library with known vulnerabilities – now raised to the patched version (VibeWorks doesn't use MySQL; npm audit reports no vulnerabilities again)",
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-09-15",
    title: "Prisma 7",
    titleEn: "Prisma 7",
    changes: [
      {
        type: "besser",
        text: "Die Datenbank-Anbindung läuft auf Prisma 7 – ohne eigene Query-Engine, direkt über den Postgres-Treiber: schlankere Installation, schnellerer Start",
        en: "The database layer runs on Prisma 7 – no separate query engine, straight through the Postgres driver: leaner install, faster startup",
      },
      {
        type: "besser",
        text: "Alle Abhängigkeiten sind jetzt aktuell (Next.js 16, zod 4, Prisma 7, SimpleWebAuthn 14) – npm audit meldet keine Lücken",
        en: "All dependencies are now up to date (Next.js 16, zod 4, Prisma 7, SimpleWebAuthn 14) – npm audit reports no vulnerabilities",
      },
    ],
  },
  {
    version: "0.5.9",
    date: "2026-09-15",
    title: "zod 4",
    titleEn: "zod 4",
    changes: [
      {
        type: "besser",
        text: "Die Eingabeprüfung läuft auf zod 4 – schneller, Fehlermeldungen unverändert auf Deutsch und Englisch",
        en: "Input validation runs on zod 4 – faster, error messages unchanged in German and English",
      },
      {
        type: "fix",
        text: "Abgesichert: Änderungen an Projekten und Prompts übernehmen nur die geschickten Felder – zod 4 hätte beim Umbenennen sonst Status, Fortschritt und Tags zurückgesetzt",
        en: "Safeguarded: changes to projects and prompts only take the fields that were sent – zod 4 would otherwise have reset status, progress and tags when renaming",
      },
    ],
  },
  {
    version: "0.5.8",
    date: "2026-09-15",
    title: "Next.js 16",
    titleEn: "Next.js 16",
    changes: [
      {
        type: "besser",
        text: "VibeWorks läuft auf Next.js 16 – gebaut mit Turbopack; die Middleware heißt jetzt Proxy und läuft auf Node.js",
        en: "VibeWorks runs on Next.js 16 – built with Turbopack; the middleware is now called proxy and runs on Node.js",
      },
    ],
  },
  {
    version: "0.5.7",
    date: "2026-09-15",
    title: "Sicherheits-Update der Abhängigkeiten",
    titleEn: "Dependency security update",
    changes: [
      {
        type: "fix",
        text: "Fünf bekannte Sicherheitslücken behoben (PostCSS in Next.js, deepmerge-ts im Prisma-Werkzeug) – npm audit meldet keine mehr",
        en: "Fixed five known vulnerabilities (PostCSS in Next.js, deepmerge-ts in the Prisma tooling) – npm audit reports none",
      },
      {
        type: "besser",
        text: "Passkeys auf SimpleWebAuthn 14, dazu nodemailer und die Node-Typen aktualisiert; VibeWorks braucht jetzt Node.js 22 oder neuer (der Installer richtet 24 ein)",
        en: "Passkeys on SimpleWebAuthn 14, plus updated nodemailer and Node types; VibeWorks now needs Node.js 22 or newer (the installer sets up 24)",
      },
    ],
  },
  {
    version: "0.5.6",
    date: "2026-09-15",
    title: "Wochen-Vorschläge",
    titleEn: "Weekly suggestions",
    changes: [
      {
        type: "neu",
        text: "Jede Woche bis zu fünf Vorschläge auf dem Dashboard – aus deinen Projekten, ohne KI: Sicherheitslücken, rote CI, Git-Fehler, Verlängerungen, Überfälliges, schlafende Projekte, große Updates, fehlende Planung",
        en: "Up to five suggestions on the dashboard every week – from your projects, no AI: vulnerabilities, red CI, Git errors, renewals, overdue tasks, sleeping projects, major updates, missing planning",
      },
      {
        type: "neu",
        text: "Annehmen legt eine Aufgabe an, merkt Überfälliges für heute vor oder heißt „weitermachen“; Abgelehntes kommt drei Wochen nicht wieder",
        en: "Accepting creates a task, puts overdue tasks on today's list or means “carry on”; dismissed ones stay away for three weeks",
      },
      {
        type: "neu",
        text: "Benachrichtigung „Vorschläge für diese Woche“ montags ab 8 Uhr",
        en: "“Suggestions for this week” notification on Mondays from 8 am",
      },
    ],
  },
  {
    version: "0.5.5",
    date: "2026-09-15",
    title: "Besseres MCP",
    titleEn: "Better MCP",
    changes: [
      {
        type: "neu",
        text: "Neue Werkzeuge für Claude: get_repo_status (Commits, CI, Abhängigkeiten, Live-Seite), list_problems (alles, was klemmt), Heute planen und Zeit erfassen",
        en: "New tools for Claude: get_repo_status (commits, CI, dependencies, live site), list_problems (everything that needs attention), planning today and tracking time",
      },
      {
        type: "neu",
        text: "Deine Prompt-Bibliothek erscheint in Claude Code als Befehle, auf Wunsch mit einem Projekt ausgefüllt",
        en: "Your prompt library shows up in Claude Code as commands, optionally filled in with a project",
      },
      {
        type: "neu",
        text: "Die CLAUDE.md jedes Projekts, „Was klemmt“ und „Heute“ lassen sich in Claude Code als Ressourcen anhängen",
        en: "Every project's CLAUDE.md, “problems” and “today” can be attached as resources in Claude Code",
      },
    ],
  },
  {
    version: "0.5.4",
    date: "2026-09-15",
    title: "Stern-Schutz",
    titleEn: "Star protection",
    changes: [
      {
        type: "neu",
        text: "Projekte mit Stern sind geschützt: Löschen und Begraben geht erst, wenn der Stern weg ist – auch in der Mehrfachauswahl",
        en: "Starred projects are protected: deleting and burying only works once the star is removed – in multi-select too",
      },
      {
        type: "neu",
        text: "Status und Repository geschützter Projekte ändern sich nur nach Bestätigung – im Dialog, auf der Karte und beim Ziehen im Kanban; Claude (MCP) darf sie gar nicht ändern",
        en: "Status and repository of protected projects only change after confirmation – in the dialog, on the card and when dragging in kanban; Claude (MCP) can't change them at all",
      },
      {
        type: "neu",
        text: "Der Friedhof fragt bei Projekten mit Stern nicht mehr nach",
        en: "The graveyard no longer asks about starred projects",
      },
      {
        type: "besser",
        text: "Fehlermeldungen im Projekt-Dialog stehen jetzt direkt über den Knöpfen statt am Ende des Formulars",
        en: "Error messages in the project dialog now appear right above the buttons instead of at the end of the form",
      },
    ],
  },
  {
    version: "0.5.3",
    date: "2026-09-14",
    title: "Repositories automatisch, jeder Git-Server",
    titleEn: "Automatic repositories, any Git server",
    changes: [
      {
        type: "neu",
        text: "Git-Verbindungen legen für jedes eigene Repository selbst ein Projekt an – beim Verbinden und alle 30 Minuten für neue (ohne Forks und archivierte; gelöschte kommen nicht wieder)",
        en: "Git connections create a project for every repository you own – when connecting and every 30 minutes for new ones (no forks or archived ones; deleted ones don't come back)",
      },
      {
        type: "neu",
        text: "Beliebiger Git-Server als Verbindung: Commits und Abhängigkeiten direkt per git, Zugang als benutzer:token – unbekannte Server ohne API gehen automatisch diesen Weg",
        en: "Any Git server as a connection: commits and dependencies fetched directly with git, access as user:token – unknown servers without an API take this route automatically",
      },
      {
        type: "neu",
        text: "Git-Fehler sichtbar: bei der Verbindung, als rotes Symbol auf der Projektkarte, als Hinweis auf dem Dashboard und als Benachrichtigung „Git-Abgleich scheitert“",
        en: "Git errors visible: at the connection, as a red icon on the project card, as a notice on the dashboard and as a “Git sync failing” notification",
      },
    ],
  },
  {
    version: "0.5.2",
    date: "2026-09-13",
    title: "Demo-Modus",
    titleEn: "Demo mode",
    changes: [
      {
        type: "neu",
        text: "Demo-Instanz mit DEMO_MODE=true: Besucher kommen mit „Demo ansehen“ ohne Passwort hinein, alles ist schreibgeschützt, Beispielprojekte entstehen von selbst und jede Nacht neu",
        en: "Demo instance with DEMO_MODE=true: visitors get in with “Open the demo” without a password, everything is read-only, sample projects are created automatically and afresh every night",
      },
      {
        type: "neu",
        text: "Der Proxmox-Installer bietet „Demo-Instanz“ als dritte Wahl (oder VIBEWORKS_DEMO=1)",
        en: "The Proxmox installer offers “Demo-Instanz” as a third choice (or VIBEWORKS_DEMO=1)",
      },
    ],
  },
  {
    version: "0.5.1",
    date: "2026-09-13",
    title: "Vorführ-GIF",
    titleEn: "Demo GIF",
    changes: [
      {
        type: "neu",
        text: "Kurze Vorführung im README und auf der Webseite: Aufgabe per Schnellerfassung → Issue → Claude Code arbeitet sie über MCP ab → erledigt",
        en: "A short demo in the README and on the website: task via quick capture → issue → Claude Code works through it via MCP → done",
      },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-09-13",
    title: "Webseite & Doku",
    titleEn: "Website & docs",
    changes: [
      {
        type: "neu",
        text: "VibeWorks hat eine eigene Webseite: moinmornhart.github.io/vibeworks – mit Installationsbefehl zum Kopieren, allen Funktionen und Screenshots",
        en: "VibeWorks has its own website: moinmornhart.github.io/vibeworks – with a copyable install command, all features and screenshots",
      },
      {
        type: "neu",
        text: "Doku auf Deutsch und Englisch: Installation, Git & Issues, Claude Code, Windows-App und alle Funktionen",
        en: "Docs in German and English: installation, Git & issues, Claude Code, Windows app and all features",
      },
    ],
  },
  {
    version: "0.4.9",
    date: "2026-09-13",
    title: "Öffentliches Portfolio",
    titleEn: "Public portfolio",
    changes: [
      {
        type: "neu",
        text: "Mein Konto → Öffentliches Portfolio: einschalten, ein paar Sätze über dich schreiben, Projekte auswählen – die Seite /u/<name> zeigt sie ohne Anmeldung mit Stand, Tags und Links (Live, Code, Details)",
        en: "My account → Public portfolio: switch it on, write a few lines about yourself, pick projects – the page /u/<name> shows them without signing in, with status, tags and links (live, code, details)",
      },
      {
        type: "neu",
        text: "Ausgeschaltet gibt es die Seite nicht; Notizen, Aufgaben und alles andere bleiben privat",
        en: "When switched off, the page doesn't exist; notes, tasks and everything else stay private",
      },
    ],
  },
  {
    version: "0.4.8",
    date: "2026-09-12",
    title: "Ideen-Eingang",
    titleEn: "Idea inbox",
    changes: [
      {
        type: "neu",
        text: "Ideen-Eingang (/inbox): Einfälle erst sammeln, später als Projekt anlegen, als Aufgabe anhängen oder verwerfen – mit Hinweis auf dem Dashboard",
        en: "Idea inbox (/inbox): collect ideas first, later create a project, attach them as a task or discard them – with a hint on the dashboard",
      },
      {
        type: "neu",
        text: "Drei Wege hinein: „Teilen“ vom Handy (VibeWorks zum Startbildschirm hinzufügen), eine geheime Einwurf-Adresse für Kurzbefehle, Tasker oder Mail-Weiterleitungen, und ein ntfy-Thema, das jede Minute abgeholt wird",
        en: "Three ways in: “Share” on your phone (add VibeWorks to your home screen), a secret drop address for Shortcuts, Tasker or mail forwarding, and an ntfy topic fetched every minute",
      },
      {
        type: "besser",
        text: "Profilmenü: Ideen-Eingang und Kosten sind jetzt direkt erreichbar",
        en: "Profile menu: idea inbox and costs are now one click away",
      },
    ],
  },
  {
    version: "0.4.7",
    date: "2026-09-12",
    title: "Abhängigkeiten-Check",
    titleEn: "Dependency check",
    changes: [
      {
        type: "neu",
        text: "Projektseite → Abhängigkeiten: liest die package.json aus dem Repository, vergleicht mit der neuesten Version bei npm (Major, Minor, Patch) und zeigt bekannte Sicherheitslücken – dieselbe Quelle wie „npm audit“",
        en: "Project page → Dependencies: reads package.json from the repository, compares with the latest npm version (major, minor, patch) and shows known vulnerabilities – the same source as “npm audit”",
      },
      {
        type: "neu",
        text: "Geprüft wird einmal am Tag beim Git-Abgleich oder sofort mit „Jetzt prüfen“; Sicherheitswarnungen stehen oben",
        en: "Checked once a day during the Git sync or right away with “Check now”; security advisories come first",
      },
      {
        type: "besser",
        text: "Heute: keine Obergrenze mehr – so viele Aufgaben vormerken, wie du willst",
        en: "Today: no upper limit any more – plan as many tasks as you like",
      },
      {
        type: "fix",
        text: "Navigation aufgeräumt: „Design“ und „Admin“ sind ins Profilmenü gewandert – so passt die Leiste auch mit laufendem Timer vollständig",
        en: "Tidier navigation: “Design” and “Admin” moved into the profile menu – so the bar fits completely even with a running timer",
      },
    ],
  },
  {
    version: "0.4.6",
    date: "2026-09-12",
    title: "Zeiterfassung & Fokus-Timer",
    titleEn: "Time tracking & focus timer",
    changes: [
      {
        type: "neu",
        text: "Timer an jeder Aufgabe (Aufgabenliste, Heute): läuft oben in der Navigation und im Tab-Titel mit, ein Klick stoppt; ein neuer Start beendet den alten",
        en: "Timer on every task (task list, Today): it runs in the navigation and the tab title, one click stops it; starting a new one ends the old one",
      },
      {
        type: "neu",
        text: "Fokus-Timer: 25 Minuten herunterzählen, danach „Fokus geschafft – Pause!“",
        en: "Focus timer: counts down 25 minutes, then “Focus done – take a break!”",
      },
      {
        type: "neu",
        text: "Erfasste Zeit im Projektkopf, auf der Heute-Seite und je Projekt im Wochenrückblick; vergessene Timer zählen höchstens zwölf Stunden",
        en: "Tracked time in the project header, on the Today page and per project in the weekly review; forgotten timers count at most twelve hours",
      },
    ],
  },
  {
    version: "0.4.5",
    date: "2026-09-12",
    title: "Kosten je Projekt",
    titleEn: "Costs per project",
    changes: [
      {
        type: "neu",
        text: "Projektseite → Kosten: Hosting, Domain, KI-API & Co. monatlich, jährlich oder einmalig eintragen, mit Summen pro Monat und Jahr",
        en: "Project page → Costs: add hosting, domain, AI APIs & co. monthly, yearly or one-off, with totals per month and year",
      },
      {
        type: "neu",
        text: "Übersicht /costs: alle Kosten je Währung, anstehende Verlängerungen der nächsten 60 Tage und je Projekt",
        en: "Overview /costs: all costs per currency, renewals in the next 60 days and per project",
      },
      {
        type: "neu",
        text: "Zwei Wochen vor einer Verlängerung (z. B. Domain) kommt eine Benachrichtigung; vergangene Termine rücken von selbst weiter",
        en: "Two weeks before a renewal (e.g. a domain) you get a notification; past dates move on by themselves",
      },
    ],
  },
  {
    version: "0.4.4",
    date: "2026-09-12",
    title: "Prompt-Bibliothek & CLAUDE.md",
    titleEn: "Prompt library & CLAUDE.md",
    changes: [
      {
        type: "neu",
        text: "Prompts: bewährte Anweisungen sammeln, durchsuchen und kopieren – Platzhalter wie {{projekt}}, {{repo}} und {{live}} füllt ein gewähltes Projekt aus; fünf Beispiele zum Start",
        en: "Prompts: collect, search and copy proven instructions – placeholders like {{project}}, {{repo}} and {{live}} are filled in by a chosen project; five examples to start with",
      },
      {
        type: "neu",
        text: "Projekt → Mehr → „CLAUDE.md erzeugen“: Beschreibung, Stand, offene Aufgaben, angepinnte Notizen und die Arbeitsweise mit VibeWorks – anpassen, kopieren oder herunterladen",
        en: "Project → More → “Generate CLAUDE.md”: description, status, open tasks, pinned notes and the VibeWorks workflow – adjust, copy or download",
      },
      {
        type: "neu",
        text: "Für Claude: MCP-Werkzeuge get_claude_md, list_prompts und get_prompt",
        en: "For Claude: MCP tools get_claude_md, list_prompts and get_prompt",
      },
      {
        type: "neu",
        text: "Schnellerfassung (Blitz, Strg+Alt+V in der Windows-App): eine Aufgabe auf einmal in „Alle Projekte“ oder „Alle mit Git“ legen",
        en: "Quick capture (lightning, Ctrl+Alt+V in the Windows app): put a task into “All projects” or “All with Git” at once",
      },
    ],
  },
  {
    version: "0.4.3",
    date: "2026-09-12",
    title: "Heute-Ansicht, Aktivität & Erfolge",
    titleEn: "Today view, activity & achievements",
    changes: [
      {
        type: "neu",
        text: "„Heute“: bis zu fünf Aufgaben aus allen Projekten für den Tag vormerken, abhaken, dazu Vorschläge (überfällig, heute fällig, in Arbeit) – vormerken auch per Sonne in der Aufgabenliste",
        en: "“Today”: plan up to five tasks from all projects for the day and check them off, with suggestions (overdue, due today, in progress) – also via the sun in the task list",
      },
      {
        type: "neu",
        text: "Rückblick: Aktivitätsgitter über das letzte Jahr aus Verlauf und Commits, aktuelle und längste Serie",
        en: "Review: activity grid over the last year from your history and commits, current and longest streak",
      },
      {
        type: "neu",
        text: "Elf kleine Erfolge – von „Erste Idee“ über „Serienheld“ bis „Friedhofsgärtner“ – mit Fortschrittsanzeige",
        en: "Eleven small achievements – from “First idea” to “Streak hero” and “Graveyard keeper” – with progress bars",
      },
      {
        type: "besser",
        text: "Projektkarten wieder ohne Titelbild – der Farbstreifen oben sitzt sauber am Rand; schon geholte Vorschaubilder werden aufgeräumt",
        en: "Project cards without a cover image again – the colour strip at the top sits cleanly on the edge; previously fetched previews are cleaned up",
      },
    ],
  },
  {
    version: "0.4.2",
    date: "2026-09-12",
    title: "Projekt-Friedhof",
    titleEn: "Project graveyard",
    changes: [
      {
        type: "neu",
        text: "Projekte ohne Änderung und Commit seit 30 Tagen erscheinen auf dem Dashboard: weitermachen, später fragen oder begraben",
        en: "Projects without a change or commit for 30 days show up on the dashboard: carry on, ask later or bury",
      },
      {
        type: "neu",
        text: "Begraben mit Todesursache und letzten Worten – der Friedhof zeigt Grabsteine mit Lebensdauer, Aufgaben, Commits und Notizen",
        en: "Bury with a cause of death and last words – the graveyard shows tombstones with lifespan, tasks, commits and notes",
      },
      {
        type: "neu",
        text: "Wiederbeleben holt ein Projekt mit seinem alten Status zurück; nichts geht beim Begraben verloren",
        en: "Bringing a project back restores its old status; nothing is lost when burying",
      },
    ],
  },
  {
    version: "0.4.1",
    date: "2026-09-12",
    title: "Live-Überwachung",
    titleEn: "Live monitoring",
    changes: [
      {
        type: "neu",
        text: "Live-Adresse am Projekt: VibeWorks prüft die fertige Seite alle 5 Minuten – Online/Offline, Antwortzeit, Erreichbarkeit über 24 Stunden, 7 und 30 Tage, 30-Tage-Balken und „Jetzt prüfen“",
        en: "Live address on a project: VibeWorks checks the finished site every 5 minutes – online/offline, response time, uptime over 24 hours, 7 and 30 days, a 30-day bar and “Check now”",
      },
      {
        type: "neu",
        text: "Benachrichtigung, wenn eine Seite ausfällt (erst nach zwei Fehlversuchen), wieder da ist oder ihr SSL-Zertifikat in 14 bzw. 3 Tagen abläuft",
        en: "Notification when a site goes down (only after two failed checks), comes back or its SSL certificate expires in 14 or 3 days",
      },
      {
        type: "neu",
        text: "Das Vorschaubild der Seite (og:image, sonst Icon) wird zum Titelbild der Projektkarte, dazu ein Globus in der Farbe des Zustands",
        en: "The site's preview image (og:image, otherwise its icon) becomes the project card's cover, plus a globe in the colour of the current state",
      },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-09-11",
    title: "Fortschritt per Analyse, Aufgaben für mehrere Projekte",
    titleEn: "Progress by analysis, tasks for several projects",
    changes: [
      {
        type: "neu",
        text: "„Fortschritt automatisch bestimmen“ analysiert jetzt Aufgaben (in Arbeit zählt halb), Commits, CI und Planung; der Status setzt den Rahmen – „Wie berechnet?“ im Projektkopf zeigt die Bestandteile",
        en: "“Determine progress automatically” now analyzes tasks (in progress counts half), commits, CI and planning; the status sets the limits – “How is it calculated?” in the project header shows the parts",
      },
      {
        type: "neu",
        text: "Aufgaben → „Für mehrere Projekte“: dieselbe Aufgabe in vielen Projekten anlegen, alle mit Git sind vorausgewählt – für Claude als MCP-Werkzeug create_task_in_projects",
        en: "Tasks → “For several projects”: create the same task in many projects, all linked to Git are preselected – for Claude as the MCP tool create_task_in_projects",
      },
    ],
  },
  {
    version: "0.3.9",
    date: "2026-09-11",
    title: "VibeWorks für Windows",
    titleEn: "VibeWorks for Windows",
    changes: [
      {
        type: "neu",
        text: "Windows-App zum Herunterladen: eigenes Fenster, Tray neben der Uhr, Schnellerfassung mit Strg+Alt+V aus jedem Programm und automatische Updates",
        en: "Windows app to download: its own window, tray next to the clock, quick capture with Ctrl+Alt+V from any program and automatic updates",
      },
      {
        type: "neu",
        text: "Benachrichtigungen kommen in der Windows-App als Windows-Meldung – der Test-Knopf funktioniert jetzt auch ganz ohne ntfy, Webhook oder E-Mail",
        en: "Notifications show up in the Windows app as Windows notifications – the test button now also works without ntfy, webhook or email",
      },
      {
        type: "neu",
        text: "Schnellerfassung als eigene Seite (/capture) für das kleine Fenster der App",
        en: "Quick capture as its own page (/capture) for the app's small window",
      },
    ],
  },
  {
    version: "0.3.8",
    date: "2026-09-11",
    title: "Claude Code direkt anbinden (MCP-Server)",
    titleEn: "Connect Claude Code directly (MCP server)",
    changes: [
      {
        type: "neu",
        text: "VibeWorks ist ein MCP-Server: Claude Code liest Projekte, Aufgaben, Notizen und Docs, legt Aufgaben an und verschiebt sie, schreibt Notizen und Docs – ganz ohne Umweg über GitHub",
        en: "VibeWorks is an MCP server: Claude Code reads projects, tasks, notes and docs, creates and moves tasks, writes notes and docs – no GitHub detour needed",
      },
      {
        type: "neu",
        text: "Mein Konto → Claude Code & API-Schlüssel: Schlüssel erstellen, fertigen Befehl kopieren, jederzeit widerrufen",
        en: "My account → Claude Code & API keys: create a key, copy the finished command, revoke it at any time",
      },
      {
        type: "besser",
        text: "Aufgaben und Notizen entstehen in der Oberfläche und über Claude auf demselben Weg – Verlauf, Fortschritt und Issues verhalten sich gleich",
        en: "Tasks and notes are created the same way in the app and through Claude – activity log, progress and issues behave identically",
      },
    ],
  },
  {
    version: "0.3.7",
    date: "2026-09-11",
    title: "Neuer Fahrplan: Stufe 4",
    titleEn: "New roadmap: stage 4",
    changes: [
      {
        type: "besser",
        text: "README: Fahrplan um Stufe 4 (MCP-Server, Live-Überwachung, Projekt-Friedhof, Heatmap, Kosten, Prompt-Bibliothek …) und die Webseite erweitert",
        en: "README: roadmap extended with stage 4 (MCP server, live monitoring, project graveyard, heatmap, costs, prompt library …) and the website",
      },
    ],
  },
  {
    version: "0.3.6",
    date: "2026-09-11",
    title: "Benachrichtigungen per ntfy, Webhook und E-Mail",
    titleEn: "Notifications via ntfy, webhook and email",
    changes: [
      {
        type: "neu",
        text: "Mein Konto → Benachrichtigungen: Push aufs Handy mit ntfy (auch eigener Server), Webhook (Discord, Slack oder JSON) und E-Mail – mit Test-Knopf",
        en: "My account → Notifications: push to your phone with ntfy (your own server works too), webhook (Discord, Slack or JSON) and email – with a test button",
      },
      {
        type: "neu",
        text: "Anlässe: fällige Aufgaben jeden Morgen um 8 Uhr, Zugriffsanfragen, per Git erledigte Aufgaben, fehlgeschlagene CI und – für Admins – installierte Updates",
        en: "Triggers: due tasks every morning at 8 am, access requests, tasks completed via Git, failed CI and – for admins – installed updates",
      },
      {
        type: "neu",
        text: "Admin → E-Mail-Versand: SMTP-Server eintragen und Test-Mail senden",
        en: "Admin → Email sending: configure the SMTP server and send a test email",
      },
    ],
  },
  {
    version: "0.3.5",
    date: "2026-09-11",
    title: "Wochenrückblick und Zeitleiste",
    titleEn: "Weekly review and timeline",
    changes: [
      {
        type: "neu",
        text: "Wochenrückblick (Navigation → Rückblick): Kennzahlen der Woche, Erledigtes je Projekt, als Nächstes Fälliges, aktivste Projekte – mit Blättern zwischen den Wochen",
        en: "Weekly review (navigation → Review): the week in numbers, completed tasks per project, what's due next, most active projects – with paging between weeks",
      },
      {
        type: "neu",
        text: "Zeitleiste über alle Projekte: Aufgaben, Notizen, Statuswechsel und Commits nach Tagen, nach Projekt filterbar",
        en: "Timeline across all projects: tasks, notes, status changes and commits by day, filterable by project",
      },
      {
        type: "besser",
        text: "Verlaufseinträge erscheinen in der gewählten Sprache; der Verlauf je Projekt reicht jetzt 1000 statt 200 Einträge zurück",
        en: "History entries appear in the chosen language; each project's history now goes back 1000 instead of 200 entries",
      },
    ],
  },
  {
    version: "0.3.4",
    date: "2026-09-11",
    title: "Projektvorlagen, Export und Import",
    titleEn: "Project templates, export and import",
    changes: [
      {
        type: "neu",
        text: "Beim Anlegen eines Projekts eine Vorlage wählen: Web-App, Hardware/IoT, Bot/Automatisierung, Lernprojekt – jeweils mit passenden Aufgaben und einer Notiz",
        en: "Pick a template when creating a project: web app, hardware/IoT, bot/automation, learning project – each with matching tasks and a note",
      },
      {
        type: "neu",
        text: "Eigene Vorlagen: jedes Projekt über „…“ → „Als Vorlage speichern“ – samt Aufgaben und Notizen",
        en: "Your own templates: save any project via “…” → “Save as template” – including tasks and notes",
      },
      {
        type: "neu",
        text: "Export als JSON: ein Projekt über „…“ im Projektkopf oder alles unter „Mein Konto → Daten“ – ohne Tokens und Geheimnisse",
        en: "Export as JSON: a single project via “…” in the project header or everything under “My account → Data” – without tokens or secrets",
      },
      {
        type: "neu",
        text: "Import unter „Mein Konto → Daten“: Projekte, Aufgaben, Notizen und Docs kommen neu dazu, nichts wird überschrieben",
        en: "Import under “My account → Data”: projects, tasks, notes and docs are added as new, nothing gets overwritten",
      },
    ],
  },
  {
    version: "0.3.3",
    date: "2026-09-11",
    title: "CI-Status und Webhooks",
    titleEn: "CI status and webhooks",
    changes: [
      {
        type: "neu",
        text: "CI-Status: GitHub Actions, GitLab-Pipelines und Gitea-Status des Hauptzweigs – als Abzeichen im Git-Bereich, mit Liste der letzten Läufe und als Punkt auf der Projektkarte",
        en: "CI status: GitHub Actions, GitLab pipelines and Gitea statuses of the main branch – as a badge in the Git section, with a list of recent runs and as a dot on the project card",
      },
      {
        type: "neu",
        text: "Webhooks: GitHub, GitLab und Gitea melden Commits, Issues und CI-Läufe sofort – Einrichtung unter Git & Updates → Zugang, mit Knopf zum automatischen Eintragen",
        en: "Webhooks: GitHub, GitLab and Gitea report commits, issues and CI runs instantly – set up under Git & updates → Access, with a button to add it automatically",
      },
      {
        type: "besser",
        text: "Der GitHub-Token-Link enthält jetzt auch das Recht „admin:repo_hook“, damit Webhooks automatisch eingetragen werden können",
        en: "The GitHub token link now also includes the “admin:repo_hook” scope so webhooks can be added automatically",
      },
    ],
  },
  {
    version: "0.3.2",
    date: "2026-09-11",
    title: "VibeWorks auf Englisch",
    titleEn: "VibeWorks in English",
    changes: [
      {
        type: "neu",
        text: "Die ganze Oberfläche gibt es jetzt auch auf Englisch – umschaltbar unter „Mein Konto“, im Benutzermenü und auf der Anmeldeseite; die Wahl gilt auf allen Geräten",
        en: "The whole interface is now available in English – switch it under “My account”, in the user menu or on the sign-in page; your choice applies on all devices",
      },
      {
        type: "neu",
        text: "Ohne Anmeldung richtet sich die Sprache nach dem Browser",
        en: "Before signing in, the language follows your browser",
      },
      {
        type: "besser",
        text: "Fehlermeldungen, Datumsangaben („vor 3 Minuten“ / „3 minutes ago“), Status, Changelog und die öffentliche Projektseite erscheinen in der gewählten Sprache",
        en: "Error messages, dates (“3 minutes ago”), statuses, the changelog and the public project page appear in the chosen language",
      },
      {
        type: "neu",
        text: "README und Installationsanleitung auf GitHub auch auf Englisch, mit englischen Screenshots",
        en: "README and installation guide on GitHub are also available in English, with English screenshots",
      },
    ],
  },
  {
    version: "0.3.1",
    date: "2026-09-11",
    title: "Schlichtere Sortierauswahl",
    titleEn: "Simpler sort picker",
    changes: [
      {
        type: "besser",
        text: "Dashboard: Die Sortierung heißt wieder einfach „Priorität“ – ohne Stern in der Beschriftung",
        en: "Dashboard: The sort option is simply called “Priority” again – no star in the label",
      },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-09-11",
    title: "Favoriten nur bei Priorität vorne",
    titleEn: "Favorites first only when sorting by priority",
    changes: [
      {
        type: "besser",
        text: "Dashboard: Projekte mit ★ stehen nur noch bei der Sortierung „Priorität“ oben – bei Zuletzt geändert, Erstellt, Name, Fortschritt und Status zählt allein das jeweilige Kriterium",
        en: "Dashboard: Projects with ★ only move to the top when sorting by “Priority” – for last modified, created, name, progress and status, only that criterion counts",
      },
      {
        type: "besser",
        text: "Sortierung „Priorität (★ zuerst)“: Favoriten, dann Kritisch bis Niedrig, bei Gleichstand das zuletzt Geänderte zuerst",
        en: "“Priority (★ first)” sort: favorites, then critical down to low, with the most recently modified first on ties",
      },
    ],
  },
  {
    version: "0.2.9",
    date: "2026-09-11",
    title: "Übersichtlicher Fahrplan",
    titleEn: "Clearer roadmap",
    changes: [
      {
        type: "besser",
        text: "README: Fahrplan als klare Liste mit ✅ (fertig) und ⏳ (kommt noch) – nichts mehr durchgestrichen",
        en: "README: Roadmap as a clear list with ✅ (done) and ⏳ (coming up) – nothing crossed out anymore",
      },
    ],
  },
  {
    version: "0.2.8",
    date: "2026-09-10",
    title: "Git-Abgleich im Hintergrund",
    titleEn: "Background Git sync",
    changes: [
      {
        type: "neu",
        text: "Der Server gleicht alle 5 Minuten selbst Commits und Issues ab – Aufgaben wandern nach „In Arbeit“ oder „Erledigt“, auch wenn niemand VibeWorks offen hat",
        en: "The server now syncs commits and issues on its own every 5 minutes – tasks move to “In progress” or “Done” even when nobody has VibeWorks open",
      },
      {
        type: "besser",
        text: "Gilt für alle Projekte mit Token oder Git-Verbindung; Takt über GIT_SYNC_INTERVAL_MIN einstellbar, mit GIT_SYNC_DISABLED=true abschaltbar",
        en: "Applies to all projects with a token or Git connection; set the interval with GIT_SYNC_INTERVAL_MIN, turn it off with GIT_SYNC_DISABLED=true",
      },
    ],
  },
  {
    version: "0.2.7",
    date: "2026-09-10",
    title: "Git-Verbindungen fürs ganze Konto",
    titleEn: "Account-wide Git connections",
    changes: [
      {
        type: "neu",
        text: "Mein Konto → Git-Verbindungen: einmal verbinden, für alle Projekte – Commits auch aus privaten Repositories, Aufgaben automatisch als Issues",
        en: "My account → Git connections: connect once, use it for every project – commits from private repositories too, tasks automatically become issues",
      },
      {
        type: "neu",
        text: "GitHub, GitLab und Gitea/Forgejo – auch selbst gehostet, im Heimnetz und auf eigenem Port; mehrere Verbindungen gleichzeitig möglich",
        en: "GitHub, GitLab and Gitea/Forgejo – self-hosted too, on your home network and on a custom port; multiple connections at once",
      },
      {
        type: "neu",
        text: "Anleitung je Anbieter mit Link zur passenden Token-Seite; das Token wird beim Speichern geprüft und zeigt, als wer du verbunden bist",
        en: "Step-by-step guide per provider with a link to the right token page; the token is verified on save and shows who you're connected as",
      },
      {
        type: "besser",
        text: "Projekte ohne eigenes Token nutzen automatisch die Verbindung zu ihrem Server – im Git-Bereich steht dann „Konto-Token aktiv“",
        en: "Projects without their own token automatically use the connection to their server – the Git section then shows “Account token active”",
      },
      {
        type: "neu",
        text: "Schon bei der Registrierung und der Ersteinrichtung lässt sich Git optional verbinden – mit kurzer Erklärung",
        en: "Git can optionally be connected right during sign-up and initial setup – with a short explanation",
      },
    ],
  },
  {
    version: "0.2.6",
    date: "2026-09-10",
    title: "Projekte teilen",
    titleEn: "Project sharing",
    changes: [
      {
        type: "neu",
        text: "Projekte teilen: öffentlicher Link, der auch ohne Konto funktioniert – Beschreibung, Aufgaben und Commits zum Lesen, Notizen bleiben privat",
        en: "Share projects: a public link that works without an account – description, tasks and commits are read-only, notes stay private",
      },
      {
        type: "neu",
        text: "Angemeldete Besucher eines Links können Zugriff anfragen (Ansehen oder Bearbeiten, mit Nachricht)",
        en: "Signed-in visitors of a link can request access (view or edit, with a message)",
      },
      {
        type: "neu",
        text: "Teilen-Dialog für Besitzer: Link erstellen, erneuern oder abschalten, Anfragen annehmen oder ablehnen, Mitglieder per Benutzername hinzufügen, Rollen ändern und entfernen",
        en: "Share dialog for owners: create, renew or disable the link, accept or decline requests, add members by username, change roles and remove members",
      },
      {
        type: "neu",
        text: "Rollen: Betrachter lesen nur, Bearbeiter ändern Aufgaben, Notizen, Status und Beschreibung – Repository, Token, Teilen und Löschen bleiben beim Besitzer",
        en: "Roles: viewers can only read, editors can change tasks, notes, status and description – repository, token, sharing and deletion stay with the owner",
      },
      {
        type: "neu",
        text: "Dashboard: Bereich „Mit mir geteilt“ und Hinweis auf offene Zugriffsanfragen",
        en: "Dashboard: “Shared with me” section and a notice about pending access requests",
      },
      {
        type: "neu",
        text: "Knopf „Token auf GitHub erstellen“ im Zugang-Feld – öffnet GitHub mit allem vorausgefüllt",
        en: "“Create token on GitHub” button in the access field – opens GitHub with everything prefilled",
      },
    ],
  },
  {
    version: "0.2.5",
    date: "2026-09-10",
    title: "Neue Projektseite auf GitHub",
    titleEn: "New project page on GitHub",
    changes: [
      {
        type: "besser",
        text: "README neu gestaltet: Banner, Abzeichen, Funktionsübersicht, Screenshots und Anleitung für Aufgaben ↔ Issues mit Claude Code",
        en: "Redesigned README: banner, badges, feature overview, screenshots and a guide for tasks ↔ issues with Claude Code",
      },
      {
        type: "besser",
        text: "Repository mit Beschreibung und Themen, damit es sich auf GitHub leichter finden lässt",
        en: "Repository description and topics so it's easier to find on GitHub",
      },
    ],
  },
  {
    version: "0.2.4",
    date: "2026-09-10",
    title: "Git & Updates, Aufgaben als Issues",
    titleEn: "Git & updates, tasks as issues",
    changes: [
      {
        type: "neu",
        text: "Projektseite: neuer Bereich „Git & Updates“ unter den Notizen – Commits aus GitHub, GitLab oder Gitea als Zeitleiste nach Tagen, mit Aktivitätsdiagramm, Mitwirkenden, Versions-Plaketten und verlinkten Issue-Nummern",
        en: "Project page: new “Git & updates” section below the notes – commits from GitHub, GitLab or Gitea as a timeline by day, with an activity chart, contributors, version badges and linked issue numbers",
      },
      {
        type: "neu",
        text: "Commits gleichen sich beim Öffnen und alle 5 Minuten selbst ab; der letzte Stand bleibt bei Fehlern erhalten",
        en: "Commits sync on open and every 5 minutes; the last known state is kept if something goes wrong",
      },
      {
        type: "neu",
        text: "Zugangstoken pro Projekt (verschlüsselt gespeichert) – für private Repositories und die Issue-Spiegelung",
        en: "Access token per project (stored encrypted) – for private repositories and issue mirroring",
      },
      {
        type: "neu",
        text: "Aufgaben werden automatisch zu Issues: Titel, Text, Fälligkeit und Status wandern mit, gelöschte Aufgaben schließen ihr Issue als „nicht geplant“",
        en: "Tasks automatically become issues: title, text, due date and status carry over, deleted tasks close their issue as “not planned”",
      },
      {
        type: "neu",
        text: "Issues sortieren sich in die Spalten: Label „in Arbeit“ → In Arbeit, „blockiert“ → Blockiert, geschlossen → Erledigt – in beide Richtungen",
        en: "Issues sort themselves into columns: label “in progress” → In progress, “blocked” → Blocked, closed → Done – in both directions",
      },
      {
        type: "neu",
        text: "Erledigte und blockierte Aufgaben verschwinden nach 2 Tagen vom Board und lassen sich per Klick wieder einblenden",
        en: "Done and blocked tasks disappear from the board after 2 days and can be shown again with a click",
      },
      {
        type: "besser",
        text: "Dashboard und Projektseite holen Änderungen selbst nach – beim Zurückkehren zum Tab und jede Minute",
        en: "Dashboard and project page pick up changes on their own – when you return to the tab and every minute",
      },
      {
        type: "fix",
        text: "Sortierung „Status (Idee → Fertig)“: Favoriten stehen nur noch innerhalb ihres Status oben, statt die Reihenfolge zu durchbrechen",
        en: "“Status (idea → done)” sort: favorites now only go to the top within their status instead of breaking the order",
      },
      {
        type: "besser",
        text: "Schutz vor Server-Side Request Forgery für alle Abrufe von Repository-Adressen",
        en: "Protection against server-side request forgery for all repository URL requests",
      },
    ],
  },
  {
    version: "0.2.3",
    date: "2026-09-10",
    title: "Sortieren nach Status",
    titleEn: "Sort by status",
    changes: [
      {
        type: "neu",
        text: "Dashboard: neue Sortierung „Status (Idee → Fertig)“ – Idee, In Planung, Offen, In Entwicklung, Fertig, Archiviert",
        en: "Dashboard: new “Status (idea → done)” sort – Idea, Planning, Open, In development, Done, Archived",
      },
      {
        type: "besser",
        text: "Aufgeklappte Auswahllisten zeigen die Farben des eigenen Designs statt des grauen Standards",
        en: "Open dropdown lists use the colors of your own design instead of the default gray",
      },
    ],
  },
  {
    version: "0.2.2",
    date: "2026-09-10",
    title: "Mini-Docs",
    titleEn: "Mini docs",
    changes: [
      {
        type: "neu",
        text: "Neuer Reiter „Docs“: eigene Seiten mit beliebig tiefen Unterseiten im Seitenbaum",
        en: "New “Docs” tab: your own pages with subpages nested as deep as you like in a page tree",
      },
      {
        type: "neu",
        text: "Markdown-Editor mit Schreiben, Geteilt und Vorschau, Werkzeugleiste (fett, kursiv, Überschrift, Listen, Checklisten, Zitat, Code, Link) und Emoji-Symbol je Seite",
        en: "Markdown editor with write, split and preview modes, a toolbar (bold, italic, heading, lists, checklists, quote, code, link) and an emoji icon per page",
      },
      {
        type: "neu",
        text: "Speichert automatisch beim Tippen, Strg+S sofort; Brotkrumen, Unterseiten-Übersicht und „Zuletzt bearbeitet“",
        en: "Saves automatically as you type, Ctrl+S saves instantly; breadcrumbs, subpage overview and “Recently edited”",
      },
      {
        type: "neu",
        text: "Seiten verschieben, nach oben/unten sortieren und samt Unterseiten löschen – Kreise im Baum sind ausgeschlossen",
        en: "Move pages, reorder them up/down and delete them along with their subpages – cycles in the tree are prevented",
      },
      {
        type: "neu",
        text: "Docs sind in der Volltextsuche und in der Schnellsuche (Strg+K) enthalten",
        en: "Docs are included in full-text search and in quick search (Ctrl+K)",
      },
    ],
  },
  {
    version: "0.2.1",
    date: "2026-09-10",
    title: "„update“ auf dem Proxmox-Host",
    titleEn: "“update” on the Proxmox host",
    changes: [
      {
        type: "neu",
        text: "Auf dem Proxmox-Host gibt es jetzt den Befehl „update“: allein holt er das neueste Update, Optionen wie --status werden durchgereicht",
        en: "The Proxmox host now has an “update” command: on its own it fetches the latest update, options like --status are passed through",
      },
      {
        type: "besser",
        text: "Fehlt im Container der update-Befehl (unvollständige Installation), repariert „update“ bzw. „vibeworks …“ die Installation automatisch",
        en: "If the update command is missing in the container (incomplete installation), “update” or “vibeworks …” repairs the installation automatically",
      },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-09-10",
    title: "Dialoge auf dem Handy oben",
    titleEn: "Dialogs at the top on phones",
    changes: [
      {
        type: "besser",
        text: "Dialoge – z. B. die Schnellerfassung über den Blitz – öffnen auf dem Handy im oberen Bereich statt ganz unten, die Tastatur verdeckt nichts mehr",
        en: "Dialogs – e.g. quick capture via the lightning bolt – open near the top on phones instead of at the very bottom, so the keyboard no longer covers anything",
      },
    ],
  },
  {
    version: "0.1.9",
    date: "2026-09-10",
    title: "Befehle direkt auf dem Proxmox-Host",
    titleEn: "Commands right on the Proxmox host",
    changes: [
      {
        type: "neu",
        text: "Befehl „vibeworks“ auf dem Proxmox-Host: status, check, update, rollback, auto on/off, domain, url, logs, shell – ohne erst in den Container zu wechseln",
        en: "“vibeworks” command on the Proxmox host: status, check, update, rollback, auto on/off, domain, url, logs, shell – without entering the container first",
      },
      {
        type: "neu",
        text: "„vibeworks repair“ repariert eine unvollständige Installation im Container, Daten und .env bleiben erhalten",
        en: "“vibeworks repair” fixes an incomplete installation in the container, keeping data and .env",
      },
      {
        type: "neu",
        text: "Adresse ändern mit „vibeworks domain …“ bzw. im Container „update --domain …“ – inklusive Neustart und Hinweisen zu Proxy und Passkeys",
        en: "Change the address with “vibeworks domain …” or, inside the container, “update --domain …” – including a restart and tips on proxies and passkeys",
      },
      {
        type: "besser",
        text: "Der Proxmox-Installer richtet den Host-Befehl automatisch ein und findet den Container später selbst wieder",
        en: "The Proxmox installer sets up the host command automatically and finds the container again later on its own",
      },
    ],
  },
  {
    version: "0.1.8",
    date: "2026-09-10",
    title: "Update per Knopfdruck",
    titleEn: "One-click updates",
    changes: [
      {
        type: "neu",
        text: "Admin-Bereich „Updates“: nach Updates suchen – mit Liste der neuen Änderungen – und das neueste Update per Knopf installieren",
        en: "Admin “Updates” section: check for updates – with a list of what's new – and install the latest update with one click",
      },
      {
        type: "neu",
        text: "Fortschritt und Log live im Browser, nach dem Neustart lädt die Seite von selbst mit der neuen Version",
        en: "Live progress and log in the browser; after the restart the page reloads on its own with the new version",
      },
      {
        type: "besser",
        text: "Die App bekommt dafür keine Root-Rechte: ein systemd-Wächter führt nur „suchen“ oder „installieren“ aus, Status schreibt allein root",
        en: "The app gets no root privileges for this: a systemd watcher only runs “check” or “install”, and only root writes the status",
      },
      {
        type: "besser",
        text: "Bestehende Installationen richten die Funktion beim nächsten automatischen Update selbst ein",
        en: "Existing installations set up the feature themselves with the next automatic update",
      },
    ],
  },
  {
    version: "0.1.7",
    date: "2026-09-10",
    title: "Version aus den Commits",
    titleEn: "Version from commits",
    changes: [
      {
        type: "neu",
        text: "Die Version ergibt sich automatisch aus der Zahl der Commits – jeder Commit ist ein Update (16 → 0.1.6, 100 → 1.0.0)",
        en: "The version is derived automatically from the number of commits – every commit is an update (16 → 0.1.6, 100 → 1.0.0)",
      },
      {
        type: "neu",
        text: "Fußzeile, Änderungsverlauf und Admin-Bereich zeigen Version, Update-Nummer und Commit (verlinkt)",
        en: "Footer, changelog and admin area show the version, update number and commit (linked)",
      },
      {
        type: "besser",
        text: "Der update-Befehl reicht Commit und Update-Nummer an den Build weiter und rechnet auch bei --status und --check so",
        en: "The update command passes the commit and update number to the build and uses the same logic for --status and --check",
      },
      {
        type: "besser",
        text: "Der Health-Endpunkt meldet Version, Commit und Update-Nummer",
        en: "The health endpoint reports version, commit and update number",
      },
    ],
  },
  {
    version: "0.1.6",
    date: "2026-09-10",
    title: "Fokus in Dialogen",
    titleEn: "Focus in dialogs",
    changes: [
      {
        type: "fix",
        text: "Dialoge rissen beim Tippen den Fokus aus dem Eingabefeld (Schnellerfassung, „Design teilen“, Passwort im Admin-Bereich)",
        en: "Dialogs stole focus from the input field while typing (quick capture, “Share design”, password in the admin area)",
      },
      {
        type: "fix",
        text: "Dialoge starten im ersten Eingabefeld statt auf dem Schließen-Knopf",
        en: "Dialogs now start in the first input field instead of on the close button",
      },
    ],
  },
  {
    version: "0.1.5",
    date: "2026-09-10",
    title: "Schnellsuche und Schnellerfassung",
    titleEn: "Quick search and quick capture",
    changes: [
      {
        type: "neu",
        text: "Schnellsuche mit Strg+K (Mac: Cmd+K): Projekte, Notizen, Aufgaben und Bereiche – komplett per Tastatur",
        en: "Quick search with Ctrl+K (Mac: Cmd+K): projects, notes, tasks and sections – fully keyboard-driven",
      },
      {
        type: "neu",
        text: "Schnellerfassung über das Blitz-Symbol: Idee oder Aufgabe mit einem Enter anlegen, der Dialog bleibt für die nächste offen",
        en: "Quick capture via the lightning bolt icon: create an idea or task with a single Enter, the dialog stays open for the next one",
      },
      {
        type: "neu",
        text: "Volltextsuche über Notizen und Aufgaben mit deutschen Wortstämmen – „Webhook“ findet auch „Webhooks“",
        en: "Full-text search across notes and tasks with German word stemming – “Webhook” also finds “Webhooks”",
      },
      {
        type: "neu",
        text: "Die Suche im Dashboard zeigt Treffer in Notizen und Aufgaben und blendet die betroffenen Projekte ein",
        en: "Dashboard search shows matches in notes and tasks and surfaces the matching projects",
      },
      {
        type: "besser",
        text: "GIN-Indizes für die Volltextsuche, Fundstellen werden hervorgehoben (als Text, nie als HTML)",
        en: "GIN indexes for full-text search; matches are highlighted (as text, never as HTML)",
      },
    ],
  },
  {
    version: "0.1.4",
    date: "2026-09-10",
    title: "Kleine Korrektur",
    titleEn: "Small fix",
    changes: [
      {
        type: "fix",
        text: "Admin-Seite: „3 Konten“ statt „3 Kontoen“",
        en: "Admin page: fixed the German plural for accounts (“3 Konten” instead of “3 Kontoen”)",
      },
    ],
  },
  {
    version: "0.1.3",
    date: "2026-09-10",
    title: "Administration",
    titleEn: "Administration",
    changes: [
      {
        type: "neu",
        text: "Admin-Seite: Betriebsart (Einzel- oder Mehrbenutzer), Selbstregistrierung und Karten je Spalte im Aufgabenbrett",
        en: "Admin page: operating mode (single or multi-user), self-registration and cards per column on the task board",
      },
      {
        type: "neu",
        text: "Konten anlegen, Rolle wechseln, deaktivieren, entsperren, Passwort neu setzen (beendet alle Sitzungen) und löschen",
        en: "Create accounts, change roles, deactivate, unlock, reset passwords (ends all sessions) and delete",
      },
      {
        type: "neu",
        text: "Übersicht je Konto: Projektzahl, Passkeys, Zwei-Faktor, letzte Anmeldung, Sperrstatus",
        en: "Per-account overview: number of projects, passkeys, two-factor, last sign-in, lock status",
      },
      {
        type: "besser",
        text: "Schutzregeln: Der letzte aktive Administrator bleibt, das eigene Konto lässt sich weder löschen noch deaktivieren",
        en: "Safeguards: the last active administrator always remains, and you can't delete or deactivate your own account",
      },
      {
        type: "besser",
        text: "Wechsel in den Einzelbetrieb nur mit genau einem Konto – niemand wird ausgesperrt",
        en: "Switching to single-user mode requires exactly one account – nobody gets locked out",
      },
    ],
  },
  {
    version: "0.1.2",
    date: "2026-09-10",
    title: "Passkeys",
    titleEn: "Passkeys",
    changes: [
      {
        type: "neu",
        text: "Passkeys: anmelden per Fingerabdruck, Gesichtserkennung oder Sicherheitsschlüssel – ohne Passwort und ohne Benutzernamen",
        en: "Passkeys: sign in with your fingerprint, face or a security key – no password and no username needed",
      },
      {
        type: "neu",
        text: "Mehrere Passkeys je Konto, benennbar und einzeln entfernbar, mit „zuletzt benutzt“",
        en: "Multiple passkeys per account, nameable and individually removable, with “last used”",
      },
      {
        type: "neu",
        text: "Der Passkey ersetzt den zweiten Faktor – nach der Passkey-Anmeldung wird kein Code abgefragt",
        en: "A passkey replaces the second factor – no code is requested after signing in with a passkey",
      },
      {
        type: "besser",
        text: "Einmal gültige Challenges aus der Datenbank, Signaturzähler gegen geklonte Schlüssel",
        en: "Single-use challenges from the database, signature counter against cloned keys",
      },
      {
        type: "besser",
        text: "Klarer Hinweis, wenn Passkeys mangels HTTPS nicht verfügbar sind",
        en: "Clear notice when passkeys aren't available due to missing HTTPS",
      },
    ],
  },
  {
    version: "0.1.1",
    date: "2026-09-10",
    title: "Zwei-Faktor-Anmeldung",
    titleEn: "Two-factor sign-in",
    changes: [
      {
        type: "neu",
        text: "Einmalcodes (TOTP) mit jeder gängigen Authenticator-App – Einrichtung per QR-Code oder Schlüssel",
        en: "One-time codes (TOTP) with any common authenticator app – set up via QR code or key",
      },
      {
        type: "neu",
        text: "Scharf erst nach einem bestätigten Code – wer beim Scannen scheitert, sperrt sich nicht aus",
        en: "Only activated after a confirmed code – if scanning fails, you won't lock yourself out",
      },
      {
        type: "neu",
        text: "Zehn Wiederherstellungscodes, nur einmal angezeigt, jeder genau einmal gültig; kopieren oder als Datei sichern",
        en: "Ten recovery codes, shown only once, each valid exactly once; copy them or save them as a file",
      },
      {
        type: "neu",
        text: "Anmeldung in zwei Schritten: erst Passwort, dann Code oder Wiederherstellungscode",
        en: "Two-step sign-in: password first, then a code or recovery code",
      },
      {
        type: "neu",
        text: "Abschalten und neue Codes verlangen das Passwort – eine offene Sitzung allein reicht nicht",
        en: "Turning it off and generating new codes requires your password – an open session alone isn't enough",
      },
      {
        type: "besser",
        text: "Ein Code gilt nur einmal: abgefangene Codes lassen sich nicht wiederverwenden",
        en: "Each code works only once: intercepted codes can't be reused",
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-09-10",
    title: "Mein Konto",
    titleEn: "My account",
    changes: [
      {
        type: "neu",
        text: "Neue Seite „Mein Konto“: Anzeigename und E-Mail ändern",
        en: "New “My account” page: change your display name and email",
      },
      {
        type: "neu",
        text: "Passwort setzen oder wechseln – alle anderen Geräte werden dabei abgemeldet, dieses bleibt angemeldet",
        en: "Set or change your password – all other devices are signed out, this one stays signed in",
      },
      {
        type: "neu",
        text: "Aktive Sitzungen mit Browser, Betriebssystem, IP und letzter Aktivität; einzeln oder überall sonst abmelden",
        en: "Active sessions with browser, operating system, IP and last activity; sign out individually or everywhere else",
      },
      {
        type: "besser",
        text: "Benutzermenü mit direkten Wegen zu Konto und Design",
        en: "User menu with direct links to account and design",
      },
    ],
  },
  {
    version: "0.0.9",
    date: "2026-09-10",
    title: "Aufgaben über alle Projekte",
    titleEn: "Tasks across all projects",
    changes: [
      {
        type: "neu",
        text: "Neue Seite „Aufgaben“: jede Aufgabe aus jedem Projekt, nach Fälligkeit geordnet – Überfällig, Heute, Diese Woche, Später, Ohne Termin",
        en: "New “Tasks” page: every task from every project, sorted by due date – Overdue, Today, This week, Later, No due date",
      },
      {
        type: "neu",
        text: "Filter nach Status und Projekt, Erledigtes einblendbar",
        en: "Filter by status and project, with an option to show completed tasks",
      },
      {
        type: "neu",
        text: "Abhaken und Bearbeiten direkt aus der Liste – inklusive nächster Fassung bei wiederkehrenden Aufgaben",
        en: "Check off and edit right from the list – including the next occurrence of recurring tasks",
      },
      {
        type: "besser",
        text: "Den heutigen Tag bestimmt der Server in fester Zeitzone (Europe/Berlin) – abends kippt nichts in den falschen Tag",
        en: "The server determines today's date in a fixed time zone (Europe/Berlin) – nothing slips into the wrong day in the evening",
      },
    ],
  },
  {
    version: "0.0.8",
    date: "2026-09-10",
    title: "Aufgaben je Projekt",
    titleEn: "Tasks per project",
    changes: [
      {
        type: "neu",
        text: "Aufgabenbrett mit Offen · In Arbeit · Blockiert · Erledigt – Ziehen zwischen und innerhalb der Spalten, die Reihenfolge wird gespeichert",
        en: "Task board with Open · In progress · Blocked · Done – drag between and within columns, the order is saved",
      },
      {
        type: "neu",
        text: "Schnell anlegen per Enter, Details im Dialog: Beschreibung (Markdown), Fälligkeit, Labels, Wiederholung",
        en: "Quick add with Enter, details in a dialog: description (Markdown), due date, labels, recurrence",
      },
      {
        type: "neu",
        text: "Fälligkeiten färben sich: überfällig rot, heute gelb, bald im Akzent",
        en: "Due dates are color-coded: overdue red, today yellow, soon in the accent color",
      },
      {
        type: "neu",
        text: "Wiederkehrende Aufgaben (täglich bis monatlich): beim Erledigen entsteht die nächste Fassung – gerechnet vom Fälligkeitsdatum",
        en: "Recurring tasks (daily to monthly): completing one creates the next occurrence – calculated from the due date",
      },
      {
        type: "neu",
        text: "Fortschritt aus Aufgaben: pro Projekt einschaltbar, auf der Karte steht „3/8“",
        en: "Progress from tasks: can be turned on per project, the card shows “3/8”",
      },
      {
        type: "neu",
        text: "Spalten zeigen höchstens 15 Karten, der Rest hinter „n weitere anzeigen“",
        en: "Columns show at most 15 cards, the rest behind “Show n more”",
      },
      {
        type: "besser",
        text: "Projekt-Kanban und Aufgabenbrett teilen sich dieselbe Drag-and-Drop-Grundlage",
        en: "Project kanban and task board share the same drag-and-drop foundation",
      },
    ],
  },
  {
    version: "0.0.7",
    date: "2026-09-10",
    title: "Notizen mit Markdown",
    titleEn: "Notes with Markdown",
    changes: [
      {
        type: "neu",
        text: "Beliebig viele Notizen je Projekt mit optionalem Titel – Überschriften, Listen, Tabellen, Code und echte Checklisten per Markdown",
        en: "As many notes per project as you like, with an optional title – headings, lists, tables, code and real checklists via Markdown",
      },
      {
        type: "neu",
        text: "Schreiben und Vorschau im Wechsel, Strg+Enter speichert",
        en: "Switch between write and preview, Ctrl+Enter saves",
      },
      {
        type: "neu",
        text: "Notizen anpinnen – angepinnte stehen oben und sind hervorgehoben",
        en: "Pin notes – pinned notes stay on top and are highlighted",
      },
      {
        type: "neu",
        text: "„bearbeitet vor …“ erscheint nur bei echter Änderung, nicht beim Anpinnen",
        en: "“Edited … ago” only appears after a real change, not when pinning",
      },
      {
        type: "besser",
        text: "Projektbeschreibung wird als Markdown dargestellt",
        en: "Project descriptions are rendered as Markdown",
      },
      {
        type: "besser",
        text: "Rohes HTML, javascript:-Links und fremde Bilder werden beim Darstellen entfernt",
        en: "Raw HTML, javascript: links and external images are stripped when rendering",
      },
    ],
  },
  {
    version: "0.0.6",
    date: "2026-09-10",
    title: "Kanban und Mehrfachauswahl",
    titleEn: "Kanban and multi-select",
    changes: [
      {
        type: "neu",
        text: "Kanban-Ansicht: Spalten je Status, Karten am Griff ziehen – mit Maus, per Touch nach kurzem Halten oder mit der Tastatur",
        en: "Kanban view: one column per status, drag cards by their handle – with the mouse, by touch after a short hold, or with the keyboard",
      },
      {
        type: "neu",
        text: "Freie Reihenfolge innerhalb einer Spalte wird gespeichert; reines Umsortieren ändert das Änderungsdatum nicht",
        en: "Custom order within a column is saved; reordering alone doesn't change the modified date",
      },
      {
        type: "neu",
        text: "Mehrfachauswahl: Status setzen, Tags ergänzen oder entfernen, Favoriten markieren, löschen",
        en: "Multi-select: set status, add or remove tags, mark favorites, delete",
      },
      {
        type: "besser",
        text: "Was der Filter ausblendet, fällt aus der Auswahl – Massenänderungen treffen nur Sichtbares",
        en: "Anything hidden by the filter drops out of the selection – bulk changes only affect what's visible",
      },
    ],
  },
  {
    version: "0.0.5",
    date: "2026-09-10",
    title: "Projekte und Dashboard",
    titleEn: "Projects and dashboard",
    changes: [
      {
        type: "neu",
        text: "Projekte anlegen, bearbeiten und löschen – ein Name genügt, alles andere lässt sich nachtragen",
        en: "Create, edit and delete projects – a name is all you need, everything else can be added later",
      },
      {
        type: "neu",
        text: "Sechs Status von Idee bis Archiviert, direkt auf der Karte umschaltbar; Priorität, Fortschritt, Akzentfarbe, Tags, Favoriten, Repository-Adresse",
        en: "Six statuses from idea to archived, switchable right on the card; priority, progress, accent color, tags, favorites, repository URL",
      },
      {
        type: "neu",
        text: "Dashboard mit Kennzahlen, Suche, Statusfiltern, fünf Sortierungen und drei Ansichten (Raster, Liste, nach Status)",
        en: "Dashboard with key figures, search, status filters, five sort options and three views (grid, list, by status)",
      },
      {
        type: "neu",
        text: "Projektseite mit allen Angaben; Ansicht, Sortierung und Archiv-Schalter werden im Browser gemerkt",
        en: "Project page with all details; view, sort order and archive toggle are remembered in the browser",
      },
      {
        type: "neu",
        text: "Verlauf je Projekt (Anlegen, Statuswechsel, Bearbeitungen) als Grundlage für Rückblick und Zeitleiste",
        en: "History per project (creation, status changes, edits) as the basis for reviews and a timeline",
      },
    ],
  },
  {
    version: "0.0.4",
    date: "2026-09-10",
    title: "Design-Editor",
    titleEn: "Design editor",
    changes: [
      {
        type: "neu",
        text: "Eigene Seite „Design“ mit Live-Vorschau – jede Änderung ist sofort sichtbar, gespeichert wird erst auf Knopfdruck",
        en: "Dedicated “Design” page with live preview – every change is visible instantly, nothing is saved until you click the button",
      },
      {
        type: "neu",
        text: "Sieben Farbschemata, freie Akzentfarbe, komplette Palette für Hell und Dunkel mit Kontrastprüfung, eigene Statusfarben",
        en: "Seven color schemes, any accent color, a full palette for light and dark with contrast checking, custom status colors",
      },
      {
        type: "neu",
        text: "Glas-Effekt: Deckkraft und Unschärfe der Karten stufenlos regelbar",
        en: "Glass effect: card opacity and blur are continuously adjustable",
      },
      {
        type: "neu",
        text: "Hintergrund: neun animierte Vorlagen mit Tempo, Intensität und eigenen Farben",
        en: "Background: nine animated presets with speed, intensity and custom colors",
      },
      {
        type: "neu",
        text: "Eigener Farbverlauf (linear, radial, konisch) mit bis zu sechs Farben, Animation und zehn Vorlagen",
        en: "Custom gradient (linear, radial, conic) with up to six colors, animation and ten presets",
      },
      {
        type: "neu",
        text: "Eigene Hintergrundbilder hochladen (PNG, JPEG, WebP, GIF, AVIF) mit Unschärfe, Abdunkelung und Anordnung",
        en: "Upload your own background images (PNG, JPEG, WebP, GIF, AVIF) with blur, dimming and positioning",
      },
      {
        type: "neu",
        text: "Designs als JSON exportieren und importieren",
        en: "Export and import designs as JSON",
      },
    ],
  },
  {
    version: "0.0.3",
    date: "2026-09-10",
    title: "Proxmox-Installer und Auto-Update",
    titleEn: "Proxmox installer and auto-update",
    changes: [
      {
        type: "neu",
        text: "Einzeiler für den Proxmox-Host: legt einen Debian-LXC an und installiert alles (Standard- und Erweitert-Modus)",
        en: "One-liner for the Proxmox host: creates a Debian LXC and installs everything (default and advanced mode)",
      },
      {
        type: "neu",
        text: "update-Befehl im Container mit --status, --check, --rollback, --ref, --auto-on/--auto-off",
        en: "update command in the container with --status, --check, --rollback, --ref, --auto-on/--auto-off",
      },
      {
        type: "neu",
        text: "Auto-Update alle 15 Minuten: eigener Release je Version, Datenbank-Backup vor der Migration, automatischer Rollback bei fehlgeschlagenem Health-Check",
        en: "Auto-update every 15 minutes: a separate release per version, database backup before migrating, automatic rollback if the health check fails",
      },
      {
        type: "neu",
        text: "Installationsanleitung unter docs/INSTALLATION.md",
        en: "Installation guide at docs/INSTALLATION.md",
      },
    ],
  },
  {
    version: "0.0.2",
    date: "2026-09-10",
    title: "Anmeldung",
    titleEn: "Sign-in",
    changes: [
      {
        type: "neu",
        text: "Einrichtungsassistent für das Administratorkonto mit Einzel- oder Mehrbenutzerbetrieb",
        en: "Setup wizard for the administrator account with single or multi-user mode",
      },
      {
        type: "neu",
        text: "Anmeldung mit Benutzername und Passwort (scrypt), serverseitige Sitzungen",
        en: "Sign-in with username and password (scrypt), server-side sessions",
      },
      {
        type: "neu",
        text: "Selbstregistrierung im Mehrbenutzerbetrieb (abschaltbar)",
        en: "Self-registration in multi-user mode (can be turned off)",
      },
      {
        type: "neu",
        text: "Schutz vor Passwortraten: Ratenbegrenzung und 15 Minuten Sperre nach 8 Fehlversuchen",
        en: "Protection against password guessing: rate limiting and a 15-minute lockout after 8 failed attempts",
      },
      {
        type: "neu",
        text: "Navigation, Benutzermenü und Änderungsverlauf hinter der Versionsnummer",
        en: "Navigation, user menu and a changelog behind the version number",
      },
    ],
  },
  {
    version: "0.0.1",
    date: "2026-09-10",
    title: "Grundgerüst",
    titleEn: "Foundation",
    changes: [
      {
        type: "neu",
        text: "Projektgerüst mit Next.js 15, Tailwind CSS 4, Prisma und PostgreSQL",
        en: "Project scaffold with Next.js 15, Tailwind CSS 4, Prisma and PostgreSQL",
      },
      {
        type: "neu",
        text: "Theme-Engine: animierte Hintergründe, Farbschemata, Hell/Dunkel und Glas-Effekt",
        en: "Theme engine: animated backgrounds, color schemes, light/dark and glass effect",
      },
      {
        type: "neu",
        text: "Health-Endpunkt und strikte Sicherheits-Header mit CSP-Nonce",
        en: "Health endpoint and strict security headers with a CSP nonce",
      },
    ],
  },
];

const CURRENT_VERSION = CHANGELOG[0].version;
