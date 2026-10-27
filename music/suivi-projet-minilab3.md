# Suivi de projet — MiniLab 3 + Analog Lab + Ableton Live

Dernière mise à jour : 18/10/2026

## 1. Objectif
Devenir autonome pour composer des projets multi-pistes (drums, basse, lead, piano, cordes, flûte, violon…) et pouvoir jouer/improviser en live avec boucles et enregistrement.

**Objectif en cours :** drums sur les pads + piano (ou cordes) sur les touches, en même temps, avec enregistrement en boucle dans Ableton Live.

## 2. Matériel et logiciels
| Élément | Détail |
|---|---|
| Clavier | Arturia MiniLab 3 (25 touches, 8 knobs, 4 faders, 8 pads) |
| Ordinateur | Mac mini M1, macOS 26 Tahoe |
| Analog Lab | Analog Lab V 5.12.6.6914 (Intro, offerte avec le MiniLab 3), installé depuis le site Arturia |
| DAW | Ableton Live 12 Lite |
| Plug-ins Live | Sources AUv2 et VST3 activées |

## 3. Acquis (fait et vérifié)
- [x] Installation d'Analog Lab (l'installeur direct du site a réglé l'erreur d'interface que le Software Center ne corrigeait pas)
- [x] Réglages audio/MIDI : menu ☰ > Audio Midi Settings
- [x] Prise en main des knobs et des effets (reverb, delay, timbre…)
- [x] Installation d'Ableton Live et configuration de la surface de contrôle MiniLab 3 (Tempo & MIDI, Port 1)
- [x] Enregistrement d'un premier clip avec la transport du MiniLab
- [x] Piste de batterie (Drum Rack « Cutlass Kit ») jouée par les pads
- [x] Piste piano (« Ac Piano Upright ») réglée sur MIDI From Ch. 1 : elle ne répond plus aux pads

## 4. Problème en cours
**Symptôme :** la touche Ré du clavier déclenche aussi un son de batterie.

**Cause (très probable) :** la piste Drum Rack est sur « All Channels » et répond donc aux notes des touches comprises dans sa plage (≈ MIDI 36 à 51).

**Pistes de solution (à valider) :**
1. Identifier les notes réellement envoyées par les pads (tapez un pad, regardez quelle case du Drum Rack s'allume).
2. Restreindre la piste de batterie à ces notes (zone de touches dans un Instrument Rack), ou séparer par canal MIDI.
3. Contournement : bouton d'octave « + » du MiniLab (inconvénient : on ne peut plus jouer grave sans retomber sur la zone des drums).

## 5. Réglages de référence
- Mode du clavier : **Arturia** (affiché à l'écran). Mode DAW : les pads lancent des clips au lieu de jouer des sons.
- Basculer de mode : Shift + Pad 3
- Banques de pads A/B : Shift + Pad 2
- Arpégiateur : Shift + Pad 1
- Transport en mode DAW : Shift + Pad 4 (Loop), 5 (Stop), 6 (Play), 7 (Record), 8 (Tap Tempo)
- **Attention :** Shift + Pad 8 (Tap Tempo) a déjà fait passer le tempo à 281 BPM par accident. Remettre 120 BPM si besoin.
- Ne jamais laisser Analog Lab en standalone ouvert en même temps que Live (il reçoit aussi les notes du clavier et double les sons).
- Solo (S) : coupe les autres pistes.
- Quantification de lancement : 1 mesure.

## 6. Prochaines étapes (une à la fois)
1. [ ] Séparer proprement pads (drums seuls) et touches (piano seul)
2. [ ] Enregistrer une boucle de batterie sur les pads
3. [ ] Enregistrer une ligne de piano par-dessus
4. [ ] Ajouter une piste de basse
5. [ ] Ajouter une piste de cordes ou de nappe
6. [ ] Superposer plusieurs boucles (clips en Session view)
7. [ ] Apprendre les molettes (pitch, modulation) et le mode Chord
8. [ ] Configurer les pads dans le MIDI Control Center (notes/CC, mémoires utilisateur)
9. [ ] Sons de flûte et de violon (point faible d'Analog Lab : tester les instruments de la bibliothèque Live ou des packs dédiés)
10. [ ] Routine d'improvisation en live

## 7. Points de vigilance
- Les noms de notes varient selon les logiciels (C3 = 60 dans Live, C4 = 60 ailleurs).
- Le manuel du MiniLab 3 est contradictoire sur les notes des pads (C1–G1 ou C2–G2) : à vérifier directement dans Live.
- Ne pas stocker ni partager de numéros de licence ou de série dans ce document.

## 8. Journal
| Date | Fait | Reste |
|---|---|---|
| 18/10/2026 | Pads = drums seuls, piano sur les touches | La touche Ré déclenche aussi un drum |
