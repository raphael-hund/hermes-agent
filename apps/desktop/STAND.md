# Stand: Focus-Workspace

Der Branch `desktop/focus-workspace` baut Hermes Desktop zu einem ruhigen
Arbeitsbereich mit drei Spalten um. Basis ist `2bd378ed1b`. Das Backend bleibt
unverändert.

## Das ist gebaut

- **Theme:** «Focus» ist der neue Standard. Die Flächen sind fest gesetzt:
  Chat #202020, Seiten #222222, aktive Zeile #2c2c2c. Farbe tragen nur Avatare
  und die Marke.
- **Marke:** `HermesMark` ist ein kleiner heller Geist mit 3 feinen
  Umlaufbahnen. Er steht oben in der Profil-Spalte und im leeren Chat.
- **Leerzustände:** Ein leerer Chat zeigt die Marke und einen ruhigen Satz.
  Ein leerer Bot-Chat zeigt ein kleines Gesicht und den Namen in Lesegrösse.
- **Eingabe:** Die Eingabe ist eine Pille. Der Radius kommt aus dem neuen
  Token `--composer-radius`. Ohne Focus bleibt der alte Wert.
- **Start-Layout:** Das Preset «Focus workspace» wird pro Installation
  einmal übernommen. Offene Tabs bleiben erhalten. Danach gehört das Layout dem
  Nutzer.
- **Profil-Spalte:** Oben stehen die Marke und «Hermes». Die Zeilen sind ruhig,
  13px gross und haben einen sichtbaren Tastaturfokus. Sessions bleiben ein
  Tab daneben.
- **Job-Spalte:** Sie zeigt die Jobs des gewählten Profils sofort an. Die
  letzte gute Liste gilt pro Verbindung und Profil. Ein Wechsel zeigt also
  nie fremde Jobs.

## Das bleibt unverändert

- Die Bot-Identität bleibt Profil plus kanonische «Bot Chat»-Sitzung. Es gibt
  keinen gespeicherten Session-Zeiger.
- Senden, Stoppen, Anhänge, Rückfragen, Freigaben und Fehler laufen über die
  bestehenden Komponenten.
- Modellrouten, Anbieter, MCP und Gedächtnis bleiben gleich.
- Die Job-Spalte liest nur. Pausieren, Löschen und Anlegen passieren erst auf
  Klick.

## Diese Prüfungen laufen

- **Typecheck:** `npx tsc -p tsconfig.json --noEmit` meldet keine Fehler.
- **Tests:** Themes, Komponenten, Pane-Shell, Contrib und der Bot-Mode laufen
  mit vitest grün.
- **Neue Tests:** Das Start-Layout wird einmal übernommen und behält offene
  Tabs. Die letzte Job-Liste bleibt beim Profil. Beide Tests sind ohne den Fix
  rot.

## Diese Punkte sind offen

- **Vorschau:** Der Bau läuft in einer isolierten Electron-Vorschau. Die
  Screenshots fehlen noch.
- **Prettier:** Einige Bot-Mode-Dateien waren schon auf der Basis nicht mit
  Prettier formatiert. Sie sind bewusst unverändert geblieben.
