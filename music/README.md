# Music — RevLoop

Looper MIDI simple (boucles par familles : Rythme, Basse, Nappes, Mélodie), piloté par un clavier MIDI (Arturia MiniLab 3 en premier profil), sur web, Mac (Electron) et iPhone (Xcode).

## Documents
| Fichier | Contenu |
|---|---|
| `cahier-des-charges.md` | Cahier des charges RevLoop (décisions, état d'avancement) |
| `revloop-correctifs-a-faire.md` | Évolutions par priorité, vérifications avant publication, règles Apple |
| `revloop-cahier-des-charges-mapping.md` | Cahier des charges du mapping des touches |
| `minilab3-mapping.md` | Carte MIDI mesurée du MiniLab 3 |
| `palette-instruments.md` | Sources et licences des sons (CC0 / domaine public) |
| `suivi-projet-minilab3.md` | Suivi d'apprentissage MiniLab 3 + Analog Lab + Ableton Live |

## Code (`logiciel/`)
Lancer : `python3 -m http.server 8765` dans `logiciel/`, puis `http://localhost:8765`.

## Application Mac / Windows (`application/`, Electron)
`main.js` (fenêtre, menu, adresse interne `app://boucles/`, droits MIDI/SysEx), `package.json`, `installer-mac.sh`.
Installer : `npm install` puis `./installer-mac.sh` (Mac) ou `npm run assembler-windows` (PC).

## Application iPhone (`iphone/`, Xcode)
`RevLoop/RevLoopApp.swift` (vue web, pont MIDI CoreMIDI, son, sauvegarde dans Fichiers), `RevLoop/Info.plist`.

## Manque encore
- `logiciel/sons/<instrument>/` : les fichiers son eux-mêmes (le catalogue `sons/instruments.json` est présent : 61 instruments, 941 fichiers). Ils se recréent avec les scripts de `logiciel/outils/` (dans l'ordre : `telecharger_sons.py`, `telecharger_lot2.py`, `telecharger_lot3.py`)
- `application/build/` (icônes `icon.icns`, `icon.png`, `icone-source.html`)
- `iphone/RevLoop.xcodeproj` et `iphone/RevLoop/Assets.xcassets`
