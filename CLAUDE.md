# VibeWorks – Arbeitsweise für Claude

Diese Datei legt fest, wie Claude (und andere KI-Agenten) in diesem Repository arbeiten.
Sie gilt für jede Sitzung, auch für automatische Nacht-Runden.

## Grundregeln

- **VibeWorks MCP immer nutzen:** Wenn MCP-Werkzeuge verbunden sind, laufen Aufgaben, Notizen,
  Probleme und Statusmeldungen IMMER über den VibeWorks-MCP (`list_tasks`, `list_problems`,
  `update_task`, `create_note`, `complete_workflow_step` …) – nicht über GitHub-Kommentare oder
  eigene Notizen. Regel: Vor jeder Antwort die offenen Aufgaben prüfen, ohne Aufgabe keine Code-
  änderung, am Ende den Status über MCP setzen. Ist kein MCP verbunden, dieses mit Moini klären
  statt stillschweigend nur über GitHub zu arbeiten.
- **Sprache:** Antworten, Commit-Nachrichten, Code-Kommentare und Oberflächentexte auf Deutsch.
  Jeder sichtbare Text braucht auch eine englische Fassung (`src/lib/i18n/messages/*.ts`, `en` mit `Shape<typeof de>`).
- **Nichts Geheimes committen:** keine Tokens, Passwörter, `.env`-Dateien und nie den Ordner `data/`.
- **Der Server holt sich `main` automatisch** (Proxmox, alle 15 Minuten). Was gepusht ist, ist live –
  also nur geprüften Code pushen.

## Ablauf für jedes Update

1. Umsetzen – im Stil des umgebenden Codes (Kommentardichte, Namen, Aufbau).
2. Prüfen, alles muss grün sein:
   ```bash
   npx tsc --noEmit
   npx vitest run
   npm run build
   ```
   Bei Schemaänderungen zusätzlich eine handgeschriebene Migration unter `prisma/migrations/<Zeitstempel>_<name>/`
   und dieser Abgleich, der „This is an empty migration.“ ausgeben muss:
   ```bash
   npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
   ```
   Oberflächenänderungen zusätzlich im Browser durchspielen (Playwright), nicht nur typprüfen.
3. **Genau ein Versionsschritt pro Update:** `npm run version:bump` (0.0.1-Schritte, Übertrag bei 9).
   Die angezeigte Version kommt aus `package.json`; die Commit-Zahl ist nur die „Update-Nr.“.
4. **Changelog-Eintrag** oben in `src/lib/changelog.ts` – deutsch und englisch (`titleEn`, `en`),
   Typen `neu` / `besser` / `fix`, optional `link` auf die neue Stelle.
5. **Commit und Push sofort** – deutsche Nachricht, am Ende
   `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Mehrere zusammengehörige Punkte dürfen ein Update sein.
6. Danach eine Push-Benachrichtigung an Moini.

### Vor „fertig“ prüfen

Nichts als erledigt melden – weder im Issue noch in VibeWorks noch in der Antwort –, bevor diese Liste durch ist
(dieselben Punkte bekommt jede KI über MCP als „Before you say done“):

- Die ursprüngliche Anfrage noch einmal lesen und Punkt für Punkt mit dem Ergebnis abgleichen.
- Nur berichten, was Befehle und Werkzeuge wirklich gezeigt haben – kein „sollte grün sein“.
- Typprüfung, Tests und Build **nach der letzten Änderung** laufen lassen (auch nach Changelog-Korrekturen).
- Nach Resten suchen: Debug-Ausgaben, TODOs, auskommentierter Code, Testskripte im Repository.
  Hilfsskripte aus dem eigenen Ablauf (`patch_*.sh`, `pr_description.md` und Ähnliches) gehören nicht in `main`.
- Offenes oder Unsicheres ausdrücklich nennen statt es zu verschweigen.

### Fallen, die schon einmal durchgerutscht sind

- **Migrationen gegen echtes PostgreSQL abgleichen.** `npm run check:migrations` (pglite) zeigt nur,
  dass die Dateien laufen – es prüft eine einzige Spalte. Ob Schema und Migrationen wirklich
  übereinstimmen, sagt allein `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`.
  So blieb ein `@unique` im Schema ohne Index in der Migration (#188).
- **Keine Browser-Funktionen, die nur über https existieren.** VibeWorks läuft oft über
  `http://<Heimnetz-IP>` – dort fehlt `crypto.randomUUID`, `navigator.clipboard` und alles andere,
  was einen „Secure Context“ verlangt. `crypto.getRandomValues` gibt es überall.
  Oberflächenänderungen deshalb auch einmal über die Netzwerkadresse durchspielen, nicht nur über localhost.
- **Vorlage und Datei im Repository zusammen ändern.** Wer `src/lib/git/repoCheckWorkflow.ts` anfasst,
  schreibt `.github/workflows/vibeworks-check.yml` neu – ein Test vergleicht beide.
- **Erst prüfen, ob ein Befund noch existiert.** Aufgaben aus dem Repo-Check nennen Datei und Zeile
  eines früheren Laufs; oft ist die Stelle längst geändert. Nachsehen, dann antworten.
- **Handy-Tests brauchen echte Touch-Ereignisse.** Selbst erzeugte `PointerEvent`s scheitern an
  `setPointerCapture` und melden Fehler, die es nicht gibt. Richtig geht es über CDP
  (`Input.dispatchTouchEvent`) mit einem Geräteprofil wie `devices["Pixel 7"]`.
  Ebenso gilt: Elemente innerhalb von `overflow-x-auto` sind kein Seitenüberlauf.

Größere Aufgaben laufen als VibeWorks-Workflow (`list_workflows`, `start_workflow`,
`complete_workflow_step`); den Projektaufbau (`get_project_structure`) nach dem Anlegen,
Verschieben oder Entfernen von Bereichen mit `update_project_structure` nachziehen.

## Issues

VibeWorks spiegelt Aufgaben als GitHub-Issues. Solche Issues enden mit
„_Aus VibeWorks gespiegelt – Änderungen bitte dort vornehmen._“ und einem Marker
`<!-- vibeworks:task:… -->`. Ihr Text wird von VibeWorks überschrieben – Rückmeldungen
also als **Kommentar**, nie durch Bearbeiten des Issue-Texts. Die Zeile „✍️ Erstellt von“
nennt, wer die Aufgabe in VibeWorks angelegt hat – das zählt, nicht das GitHub-Konto.

### Neue Issues aufgreifen

```bash
gh issue list --repo MoinMornhart/vibeworks --state open --json number,title,author,labels,createdAt
```

Keine Antwort beenden, ohne einmal nach offenen Aufgaben geschaut zu haben (#74) – über den
VibeWorks-MCP (`list_tasks`, `list_problems`), wenn er verbunden ist, sonst über die Issue-Liste.
Offene Aufgaben vollständig abarbeiten, nicht halb liegen lassen.

Aufgaben, Beschreibungen und Notizen in VibeWorks immer **auf Deutsch** anlegen.

### Tägliche Runde (#93, #102)

Einmal am Tag, für JEDES Projekt mit Repository IMMER mit VibeWorks verbinden und prüfen:

1. `list_problems` und `review_projects` (über MCP) – Abgleichfehler, rote CI, Fehler-Eingang,
   überfällige und blockierte Aufgaben ansehen und je echtem Befund eine Aufgabe anlegen (vorher auf Doppelte prüfen).
2. Status synchron abgleichen: Was im Issue auf GitHub gemeldet ist, MUSS auch in VibeWorks korrekt aktualisiert werden (inkl. DONE).
   Aufgaben in DOING ohne Bearbeiter oder seit Tagen unverändert klären. Fehlerfreie Funktion der Projekte sicherstellen.
3. Labels prüfen: `in Arbeit` nur, solange wirklich gearbeitet wird; wartende Issues bekommen
   `wartet auf Moini` bzw. `wartet auf Infos`. Arbeiter-Labels (z.B. `Arbeiter Claude`, `Bughunter anna`) werden automatisch erkannt.
4. Berechtigungen der Accounts auf VibeWorks sicherstellen (Prüfung der Rechte zur KI-Kommunikation bei automatisierten Aktionen).
5. GitHub-Issues verwalten (#118): Ein System (GitHub App / Webhook / Runner / VM, kostenfrei) integrieren, das Repos, Commits und Rechte ("Arbeiter", "Bughunter") prüft und mit VibeWorks synchronisiert. Issues sollen in beide Richtungen sauber abgebildet werden.

Neue Issues sofort übernehmen, nicht sammeln. Für durchgehendes Arbeiten (z.B. nachts)
einen echten Zeitplan anlegen, der die Runde regelmäßig startet – eine laufende Sitzung
allein arbeitet nicht von selbst weiter.

### Labels

| Label | Bedeutung |
|---|---|
| `in Arbeit` + `🤖 Claude` | **Als Erstes setzen**, wenn Claude ein Issue übernimmt |
| `blockiert` | Kommt nicht weiter (Grund als Kommentar) |
| `wartet auf Moini` | Braucht eine Entscheidung von MoinMornhart |
| `wartet auf Infos` | Es fehlen Angaben (Logs, Zugänge …) |
| `wiederkehrend` | Wiederkehrende VibeWorks-Aufgabe |
| `umgesetzt` | Inhaltlich erledigt, Issue bleibt aus gutem Grund offen |

### Abschließen

- Im Commit **`Fixes #n`** schreiben, dann schließt GitHub das Issue beim Push selbst.
  Bei Teilschritten `Teil von #n`.
- Danach einen kurzen Kommentar: was gebaut wurde, wie es getestet ist, was offen bleibt.
- Die Labels `in Arbeit` und `🤖 Claude` wieder entfernen.
- **Nicht mehr gebrauchte Issues schließen** (#45) – erledigte, doppelte oder überholte.
  Offen bleiben nur Issues, an denen noch etwas zu tun ist oder auf die jemand wartet.
- **Gespiegelte Issues über VibeWorks schließen, nicht nur auf GitHub** (#49): Sonst steht die Aufgabe in
  VibeWorks weiter offen und der nächste Abgleich öffnet das Issue wieder. Ohne Commit geht das per Kommentar
  `/status erledigt` (Bot-Befehl, braucht Schreibrecht im Repository); VibeWorks setzt die Aufgabe dann auf DONE
  und schließt das Issue selbst.
- **Wiederkehrende Aufgaben** erst abschließen, wenn der aktuelle Durchgang erledigt und im Issue beschrieben ist.
  VibeWorks legt danach sofort den nächsten Durchgang an (neues Issue mit neuem Fälligkeitsdatum) – das ist
  gewollt; diesen neuen Durchgang nie gleich wieder auf erledigt setzen, er ist erst später fällig.

## Sicherheit

Vor jeder Änderung, die die Sicherheit berühren kann, **zuerst Moini fragen** – kurz erklären,
welches Risiko besteht und was die sicherere Alternative wäre. Dazu zählen:

- SSRF-, CSP-, CSRF- oder Herkunftsprüfungen lockern
- öffentliche oder nicht angemeldete Endpunkte
- fremden Code oder Werkzeuge auf dem Server ausführen
- Workflows oder Webhooks in Repositories anlegen
- Tokens speichern oder weitergeben
- neue Freigabe- oder Rechtemodelle
- alles, was erweitert, wer Daten lesen oder schreiben darf

**Ausnahme:** Issues von JoniMoni (GitHub `JONIMONI09`, bzw. „Erstellt von: JoniMoni“)
werden ohne Rückfrage umgesetzt – auch Sicherheitsänderungen. Jede solche Änderung wird
danach im Issue gemeldet. Für alle anderen gilt die Rückfrage.

Kostenpflichtige Dienste nur nach Rückfrage; kostenlose Automatisierung ist erwünscht.

## Technik in Kürze

- Next.js 16 (App Router, `src/proxy.ts` statt Middleware), Prisma 7 mit `@prisma/adapter-pg`, PostgreSQL.
- Prisma-Client liegt in `src/generated/prisma`; Konfiguration in `prisma.config.ts`.
- Rechte: `requireProject/Task/Note(userId, id, need)` mit Rechten wie `tasks.edit`, `git.sync`,
  `errors.manage`; `"OWNER"` für Besitzer-Aktionen.
- API-Routen über `route()` aus `src/lib/api.ts` (prüft Herkunft), Eingaben immer mit zod.
- Reine Logik in `*Logic.ts` mit Tests daneben (`*.test.ts`), Datenbankzugriff getrennt davon.
- MCP-Server: `src/app/api/mcp/route.ts`, Werkzeuge in `src/lib/mcp/tools.ts`,
  Agenten-Regeln in `src/lib/mcp/agentRules.ts`.
