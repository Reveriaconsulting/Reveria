# Carte MIDI du MiniLab 3 (mesurée le 2026-10-25)

Mode du clavier pendant le test : **Arturia** (mode par défaut, Ableton fermé). Port lu : `Minilab3 MIDI`.
Le canal est affiché ici de 1 à 16 (mido affiche de 0 à 15).

| Commande | Message envoyé | Valeurs | Remarques |
|---|---|---|---|
| Pads 1 à 8 (banque A) | Note on/off, canal 10, notes **36 à 43** | vélocité 1-127 | Envoient aussi la **pression** (aftertouch polyphonique) tant qu'on appuie |
| Pads banque B | non testé | — | Notes probablement 44 à 51 (à vérifier) |
| Potards 1 à 8 | CC **86, 87, 89, 90, 110, 111, 116, 117**, canal 1 | 0-127 | Potards sans fin : le logiciel peut recaler leur valeur (pas de saut quand on change de boucle) |
| Faders 1 à 4 | CC **14, 15, 30, 31**, canal 1 | 0-127 | Physiques : la position = la valeur |
| Bouton central — rotation | CC **28**, canal 1 | relatif : 65+ = droite, 63− = gauche | Rotation sans fin, idéale pour naviguer |
| Bouton central — clic | CC **118**, canal 1 | 127 appuyé / 0 relâché | ✅ Transmis au logiciel |
| Shift | CC **27**, canal 1 | 127 appuyé / 0 relâché | ✅ Le logiciel sait quand Shift est tenu |
| Shift + bouton central (rotation) | CC **29**, canal 1 | 65 = 1 cran à droite, 62 = 1 cran à gauche | Mesuré le 2026-10-26 : un AUTRE numéro que sans Shift (28). **Un seul message par cran** |
| Shift + clic du bouton central | CC **119**, canal 1 | 127 appuyé / 0 relâché | Mesuré le 2026-10-26 |
| Bande tactile gauche | Pitch bend | −8192 à +8191, revient à 0 | Revient au centre quand on lâche |
| Bande tactile droite | CC **1** (modulation) | 0-127 | Garde sa valeur |
| Hold, Octave − / + | rien | — | ❌ Gérés en interne par le clavier |
| Touches du clavier | non capturées pendant le test | — | Note on/off standard (à revérifier) |

## Combinaisons réservées par le clavier (manuel Arturia)
Shift + pad 1 = arpégiateur · Shift + pad 2 = banque A/B · Shift + pad 3 = mode · Shift + pads 4-7 = boucle/stop/lecture/enregistrement · Shift + pad 8 = tempo tapé · Shift + touches = canal MIDI.

## Autre mode (Shift + pad 3 « Prog », mesuré le 2026-10-26)
Shift = CC **9**, bouton central = CC **112** (et parfois **114**) avec ou sans Shift, valeurs relatives séparées par des « 64 » (repos), clic = CC **113** ou **115** (115 mesuré le 2026-10-26). Le logiciel les reconnaît aussi. Potards 1-8 = CC **74, 71, 76, 77, 93, 18, 19, 16** (valeurs absolues, mesurés le 2026-10-26, reconnus par le logiciel). Faders 1-4 = CC **82, 83** (mesurés le 2026-10-26), **85, 17** (confirmés : les 4 faders marchent le 2026-10-26). Bande tactile droite = CC 1 (canal 8). Pads de ce mode pas encore mesurés.

## Écran (vérifié le 2026-10-26)
`F0 00 20 6B 7F 42 04 01 60 01 <ligne 1 ASCII> 00 02 <ligne 2 ASCII> 00 F7` : texte sur 2 lignes en mode Arturia (01). Le logiciel l'envoie aussi en 00 et 02. Caractères simples uniquement, sans accents.
**En mode DAW**, l'écran affiche « DAW » tant qu'on n'a pas envoyé `F0 00 20 6B 7F 42 02 02 40 6A 21 F7` (initialisation). Le logiciel l'envoie au démarrage puis toutes les 2 s.

## Possibilités non encore vérifiées (vues dans le script Ableton du MiniLab 3)
- Écrire du texte sur l'écran du MiniLab.
- Changer la couleur de chaque pad.
- Recaler la valeur des potards depuis le logiciel.
Ces fonctions passent par des messages spéciaux (SysEx) et doivent être testées.
