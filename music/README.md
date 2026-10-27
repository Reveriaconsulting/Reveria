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

Manquent encore pour un logiciel complet : `logiciel/sons/` (instruments + `instruments.json`), `logiciel/outils/`, `application/` (Electron), `iphone/` (Xcode).
