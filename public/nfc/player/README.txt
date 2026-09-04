NFC Mobile Player — Assets (2160×3840 Design)

Lege die Dateien mit exakt diesen Namen hier ab:

  public/nfc/player/
    background.webp          — Vollbild-Hintergrund (2160×3840 oder 9:16)
    activeplay.webp          — Track-Balken aktiv / ausgefahren
    nonactiveplay.webp       — Track-Balken inaktiv / eingefahren
    arrow_up.webp            — Pfeil hoch (Pfeil runter per CSS scaleY(-1) aus gleichem Bild)
    knob.webp                — Knopf für Trackpositionsregler

Deploy:
  - Mit Git: Dateien committen und deployen
  - Auf VPS: nach /var/www/reakton/public/nfc/player/ kopieren (SCP)
  - Nicht nur im Admin — diese Player-Grafiken sind fest im Layout verdrahtet

URLs im Browser:
  https://reakton.de/nfc/player/background.webp
  (nach Deploy prüfen)
