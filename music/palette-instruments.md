# Palette d'instruments — logiciel de boucles live

Règle de sélection : uniquement des sons **CC0 / domaine public / « sans restriction »**,
utilisables dans un logiciel, sans royalties **et sans obligation de citer l'auteur**.
Vérifié le 2026-10-25.

## 1. Instruments enregistrés (échantillons)

### Claviers
| Instrument | Source | Licence |
|---|---|---|
| Piano à queue (Steinway, 4 nuances) | Splendid Grand Piano (AKAI) — github.com/sfzinstruments/SplendidGrandPiano | Domaine public |
| Piano droit | Upright Piano KW — freepats.zenvoid.org | CC0 |
| Vieux piano « honky-tonk » | Old Piano FB — freepats.zenvoid.org | CC0 |
| Piano électrique Rhodes 1977 | jRhodes3d — github.com/sfzinstruments/jlearman.jRhodes3d | CC0 |
| Piano FM années 80 (type DX7) | FM Synthesized Piano 1 & 2 — freepats.zenvoid.org | CC0 |
| Synthé FM 80s (Yamaha TX81Z) | VCSL › Electrophones — github.com/sgossner/VCSL | CC0 |
| Orgues (drawbar, percussif, rock) | Electric Organ — freepats.zenvoid.org | CC0 |

### Vents
| Instrument | Source | Licence |
|---|---|---|
| Flûte, piccolo, clarinette, hautbois, basson | VSCO-2 CE › Woodwinds — github.com/sgossner/VSCO-2-CE | CC0 |
| Ocarina, autres aérophones | VCSL › Aerophones | CC0 |
| Flûte, flûte basse (studio anéchoïque) | University of Iowa MIS — theremin.music.uiowa.edu/MIS.html | « sans restriction » |

### Cordes
| Instrument | Source | Licence |
|---|---|---|
| Violon, alto, violoncelle, contrebasse (arco, pizz) | VSCO-2 CE › Strings | CC0 |
| Violon | University of Iowa MIS | « sans restriction » |
| Cordes pincées du monde | VCSL › Chordophones | CC0 |
| Basse électrique | D. Smolken bass — github.com/sfzinstruments | CC0 |

### Cuivres et percussions mélodiques
| Instrument | Source | Licence |
|---|---|---|
| Cor, trompette, trombone, tuba | VSCO-2 CE › Brass | CC0 |
| Marimba, xylophone, glockenspiel, cloches tubulaires | VSCO-2 CE › Percussion | CC0 |
| Percussions (peaux, idiophones) | VCSL › Membranophones / Idiophones | CC0 |

### Pads et textures (ambient)
| Instrument | Source | Licence |
|---|---|---|
| Synth Pad Choir, Sweep, New Age, Bowed | Synth Pad — freepats.zenvoid.org | CC0 |
| Boucles, textures, percussions électroniques | Sample Pi — github.com/alex-esc/sample-pi | CC0 |

Raccourci pratique : **github.com/danigb/samples** rassemble déjà Splendid Grand, jRhodes,
Old Piano, Smolken, Sample Pi et VCSL au format web (ogg/mp3), compatible avec la bibliothèque `smplr`.

## 2. Sons synthétisés en code (synthwave, arcade, ambient)

Aucun fichier son : le son est calculé en direct. Il n'y a donc **aucun problème de licence**, les fichiers sont très légers,
et chaque réglage peut être assigné à un potard du MiniLab 3.

| Famille | Recette |
|---|---|
| **Synthwave** — lead | 2 oscillateurs en dents de scie légèrement désaccordés + chorus + delay |
| **Synthwave** — pad « Juno » | dents de scie + filtre passe-bas lent + chorus large |
| **Synthwave** — basse arpégée | dents de scie / carré, enveloppe courte, arpégiateur |
| **Synthwave** — cuivres 80s | dents de scie + filtre à enveloppe (attaque lente) |
| **Arcade / chiptune** — mélodie | onde carrée / pulse 12,5 %, 25 %, 50 % (sons NES, Game Boy) |
| **Arcade** — basse | onde triangle |
| **Arcade** — percussions | générateur de bruit + enveloppe très courte |
| **Arcade** — arpèges « accords » | arpèges très rapides sur une seule voix |
| **Ambient** — nappes évolutives | oscillateurs + filtre modulé par un LFO lent + reverb longue |
| **Ambient** — textures | lecture granulaire d'un échantillon CC0 ci-dessus |

Outil envisagé : **Tone.js** (licence MIT). Votre musique et vos sons restent à vous. La licence MIT demande seulement
de garder son fichier de licence dans le code du logiciel. Ce fichier n'apparaît ni dans l'interface ni dans les morceaux.

## 3. Écartés (attribution obligatoire ou licence floue)
- Salamander Grand Piano, FluidR3 GM, MusyngKite (CC-BY / CC-BY-SA : il faut citer l'auteur)
- Sonatina Symphonic Orchestra (CC Sampling Plus)
- Sons d'Ableton (licence liée à Ableton)
- Packs Legowelt, LANDR, etc. (gratuits pour faire de la musique, mais leur intégration dans un logiciel n'est pas autorisée clairement)
- FreePats : seules les banques marquées CC0 sont retenues, d'autres sont sous GPL ou CC-BY

## Lot 2 installé (2026-10-26) — tous CC0, vérifiés sur la page source
| Instruments | Source | Licence |
|---|---|---|
| Guitare classique, électrique clean / jazz / saturée (FSBS #2), ukulélé | freepats.zenvoid.org (archives SFZ+FLAC) | CC0 1.0 |
| Basse YR aux doigts / au médiator, Lately Bass (TX81Z), Synth Bass 2 (DX7), Upright Piano KW (small) | freepats.zenvoid.org | CC0 1.0 |
| Violon solo, altos, violons pizz / trémolo, hautbois, basson, piccolo, trombone, tuba, trompette bouchée | github.com/sgossner/VSCO-2-CE | CC0 |
| Piano Steinway B, harmonica, flûte à bec alto, batterie (grosse caisse, caisse claire, charleston, toms baguette, cymbale, claps, cloche, tambourin), percussions (cajón, bongos, congas, shaker, claves) | github.com/sgossner/VCSL | CC0 |
Exclus : MuldjordKit (CC-BY), boîtes à rythmes danigb (licence floue), steel guitar (GPL).
