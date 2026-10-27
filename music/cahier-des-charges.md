# Cahier des charges — RevLoop

Mis à jour le 2026-10-26. Toutes ces décisions ont été prises par l'utilisateur.
Légende : ✅ fait et validé · 🟡 fait, à confirmer · ⏳ à faire

## Objectif
Créer et jouer des **boucles MIDI en direct**, depuis un **Arturia MiniLab 3**, avec un logiciel **beaucoup plus simple qu'Ableton**.
Styles visés : instruments acoustiques (claviers, vents, cordes), synthwave, arcade et ambient.

## Plateforme
Nom du logiciel : **RevLoop** (choisi le 2026-10-26, anciennement « Boucles Live »). **Logo « La boucle »** : les nœuds Reveria forment une boucle qui tourne (nœud violet = début de la mesure), une double croche au centre. Même dessin pour l'icône Mac, l'icône iPhone et l'en-tête de l'écran (source : `application/build/icone-source.html`).
Un seul code pour tout : le dossier `logiciel` (page web), emballé pour Mac et pour iPhone.

1. ✅ **Page web dans Google Chrome** : petit serveur local (`python3 -m http.server 8765` dans `logiciel/`), puis `http://localhost:8765`.
2. ✅ **Application Mac « RevLoop »** (Electron 37, validée le 2026-10-26), installée dans **/Applications** : sans Chrome ni serveur, menu Mac (Quitter ⌘Q), MIDI + SysEx autorisés, sauvegarde par la vraie fenêtre « Enregistrer », boucles jamais ralenties quand la fenêtre est cachée.
   - **Mettre à jour** après une modification du logiciel : `./installer-mac.sh` dans le dossier `application` (le script referme RevLoop si elle est ouverte).
   - Ses réglages et sa session sont **séparés de ceux de Chrome** : passer un morceau de l'un à l'autre avec Fichier › Sauvegarder puis Fichier › Ouvrir.
   - ⏳ Windows : configuration prête (`npm run assembler-windows`), à fabriquer et tester sur un PC.
3. ✅ **Application iPhone « RevLoop »** (dossier `iphone/`, projet Xcode, validée le 2026-10-26 sur l'iPhone 11 de l'utilisateur, jouée avec le MiniLab branché). Même logiciel en plein écran, plus en natif : un **pont MIDI** (CoreMIDI) qui imite l'API web du MIDI (notes, couleurs des pads, écran du MiniLab), le son qui sort même en mode silencieux et continue écran verrouillé, l'écran qui ne se met pas en veille, la sauvegarde par « Enregistrer dans Fichiers ». iOS 16 minimum (iPhone 8 et plus récents).
   - **Brancher le MiniLab** : iPhone Lightning → adaptateur Apple « Lightning vers USB 3 pour appareil photo » avec alimentation ; iPhone USB-C → câble USB-C direct.
   - **Compte Apple gratuit** (« Personal Team ») : l'application doit être **réinstallée tous les 7 jours**, iPhone branché au Mac : `xcodebuild -project iphone/RevLoop.xcodeproj -scheme RevLoop -destination 'id=<iPhone>' -allowProvisioningUpdates build`, puis `xcrun devicectl device install app --device <iPhone> <RevLoop.app>`.
   - À surveiller : un redémarrage de l'application a été signalé une fois, puis ne s'est plus produit.

## Enregistrement des boucles (comme une pédale loop) ✅
- On enregistre en jouant sur les touches. Pas de dessin de notes à la souris.
- Une frappe sur un pad vide le met en **Prêt** : l'enregistrement démarre à la **1re note jouée**. Une 2e frappe l'arrête, et la boucle tourne aussitôt.
- Ensuite, chaque frappe coupe ou relance la boucle, qui reprend **en place**, alignée sur les autres.
- **Maintenir un pad 3 s** (réglable de 1 à 5 s dans Options) efface sa boucle et la remet en **Prêt**.
- Pas de métronome : **la 1re boucle fixe la durée de référence**.
- ✅ **Nouvelle règle (2026-10-26, remplace les multiples ×1…×16, validée)** : les boucles suivantes gardent **exactement la durée jouée**, sans arrondi ni recalage. **Seule limite** : aucune boucle ne peut durer plus que la 1re. Si on atteint cette durée sans refrapper le pad, l'enregistrement s'arrête tout seul et la boucle tourne (« duree maxi » sur l'écran du MiniLab). La tuile du pad affiche la durée en secondes.

## Organisation : 4 familles fixes ✅
| Famille | Couleur | Fader | Son de base |
|---|---|---|---|
| Rythme | orange | 1 | Batterie synthé |
| Basse | bleu | 2 | Basse synthwave |
| Nappes et accords | violet | 3 | Nappe synthé |
| Mélodie | turquoise | 4 | Lead synthwave |

Chaque famille contient **4 boucles** (16 au total).

### Sons proposés par famille (audit du 2026-10-26) ✅
La liste d'instruments (écran et Shift + bouton central) ne montre que les sons qui ont leur place dans la famille (`RANGEMENT` dans `moteur.js`) :
- **Rythme** (5) : batteries et percussions uniquement (batterie synthé, boîte à rythmes 80s, percussions 8 bits, batterie acoustique, percussions du monde) ;
- **Basse** (12) : basses synthé et électriques, contrebasse, violoncelles, basson, trombone, tuba ;
- **Nappes et accords** (26) : nappes synthé, cuivres synthé, pianos, orgue, clavecin, harpe, vibraphone, guitares, cordes en groupe, cor ;
- **Mélodie** (39) : leads synthé, vents, cuivres solistes, violon solo, pizzicato, percussions mélodiques, et les instruments polyvalents (pianos, guitares, harpe).
Les nappes synthé ne sont plus dans Mélodie ; les **leads** y restent (un lead est un son de mélodie). « Percussions » des instruments à lames devient « Percussions mélodiques ».

## Commandes du MiniLab 3
| Commande | Rôle | État |
|---|---|---|
| Touches | Jouer et enregistrer, avec l'instrument et les effets de la boucle sélectionnée | ✅ |
| Bouton central, rotation | Changer de famille (ou cliquer sur son onglet à l'écran) | ✅ |
| Bouton central, clic | Mode 8 actions : les 8 pads deviennent des actions, jusqu'au clic suivant (CC 118, ou 113/115 dans l'autre mode du clavier) | ✅ |
| Mode 8 actions + enregistrement | Le pad d'une boucle **prête ou en enregistrement** reste un pad de boucle (rouge) pour pouvoir l'arrêter ; il redevient une action dès qu'elle tourne (choix A, 2026-10-26, validé). Shift n'est pas utilisé pour cela (écarté par l'utilisateur) | ✅ |
| Shift + bouton central (tourner) | Changer l'instrument de la boucle sélectionnée, un par cran (CC 29) | ✅ |
| Shift + clic du bouton central | Sélectionner la boucle suivante (pad 1 → 2 → 3 → 4), sans la lancer ni la couper (CC 119) | 🟡 à confirmer |
| Pads 1-4 | Les 4 boucles de la famille : enregistrer, couper, relancer, appui long = réenregistrer | ✅ |
| Pads 5-8 | 4 actions sur la boucle sélectionnée | ✅ |
| Potards 1-8 | Filtre · Réverb · Chorus · Delay / Saturation · Grain · Attaque · Mouvement, sur la boucle sélectionnée (reconnus aussi dans l'autre mode du clavier) | ✅ |
| Faders 1-4 | Volume des 4 familles (reconnus aussi dans l'autre mode du clavier, CC 82, 83, 85, 17) | ✅ |
| Bande tactile droite | Volume de la boucle sélectionnée | ✅ |
| Bande tactile gauche | **Vibrato** : plie la hauteur des notes jouées en direct et de l'arpège (±2 demi-tons), revient au relâchement. **S'enregistre dans la boucle** avec les notes et se rejoue à chaque tour, comme les notes ; les gestes tardifs sont ramenés au début (ajouté le 2026-10-26, demande de l'utilisateur, validé) | ✅ |

### Effets par boucle ✅
Chaque boucle a **ses propres réglages** (potards, volume, instrument), comme une piste de table de mixage. Ils agissent sur la **boucle sélectionnée**, c'est-à-dire le dernier pad frappé ou la boucle cliquée à l'écran.
Les potards fonctionnent « au mouvement » : changer de boucle ne fait jamais sauter un réglage.

### Actions des pads ✅
Chaque famille a **8 actions** : les pads 5-8 donnent les actions 1-4, et le mode 8 actions donne en plus les actions 5-8 sur les pads 1-4. Elles se règlent dans **Édition › Réglages des pads**.
- **Jouer une note** avec l'instrument de la boucle (enregistrée si on enregistre).
- **Octave −, Octave +** : des **compteurs**. Chaque appui décale d'une octave, de −3 à +3, la boucle **et** les touches jouées. On revient à 0 avec l'autre pad. Le décalage s'affiche sur l'écran du MiniLab et sur la tuile du pad.
- **Bascules** (un appui active, un appui désactive) : Vitesse ×2, Muet.
- Les changements s'entendent **immédiatement**, sans attendre la fin de la boucle.
- **Effets tenus** (tant que le pad est enfoncé) : Coupure, Grosse réverb, Écho lancé, Filtre fermé.
- Octave − est toujours placé **avant** Octave +.
- Différence avec les boutons **Oct − / Oct +** du MiniLab : ceux-là ne décalent que les touches jouées (le logiciel n'en est pas informé), alors que les pads décalent aussi la **boucle qui tourne**. Les deux s'additionnent. L'utilisateur garde les pads Octave tels quels (décision du 2026-10-26).
- ✅ **Arpège** (ajouté et validé le 2026-10-26, fichier `arpege.js`) : une bascule par famille. Avec l'arpège actif, un accord tenu est joué note par note, **calé sur la grille de la 1re boucle**, et s'enregistre dans la boucle. Réglages dans **Édition › Arpégiateur** : sens (montant, descendant, aller-retour, au hasard), vitesse (4 à 128 notes par mesure, dont 6, 12, 24 et 48 en triolets), étendue (1 à 3 octaves). Pré-réglé sur le pad 4 du mode 8 actions pour Basse, Nappes et Mélodie. ✅ Testé par l'utilisateur le 2026-10-26 (une touche tenue est répétée en rythme).
  - ✅ **Vitesse au bouton central** (validée le 2026-10-26) : touches tenues + bouton central tourné = vitesse suivante (4 → 6 → 8 → 12 → 16 → 24 → 32 → 48 → 64 → 96 → 128 ; au-delà de 32 = roulement, ajouté et validé le 2026-10-26), affichée sur l'écran du MiniLab. Touches relâchées, le bouton change à nouveau de famille.
- Les fonctions intégrées au clavier **ne peuvent pas être désactivées par le logiciel** : Shift + pad 1 (son arpégiateur, pas calé sur les boucles) et Shift + pad 3 (changement de mode). À éviter en jeu. Le logiciel comprend toutefois les deux modes du clavier mesurés.

| Famille | Pads 5 · 6 · 7 · 8 |
|---|---|
| Rythme | Do (grosse caisse) · Ré (caisse claire) · Mi · Fa (charlestons) |
| Basse | Octave − · Octave + · Coupure · Écho lancé |
| Nappes | Grosse réverb · Filtre fermé · Octave − · Octave + |
| Mélodie | Octave − · Octave + · Vitesse ×2 · Écho lancé |

### Couleurs des pads du MiniLab ✅
| Pad | Couleur |
|---|---|
| 1-4 vide / prêt / rec / lecture / arrêt | éteint / **blanc clignotant** / rouge / **couleur de la famille** avec éclair blanc à chaque mesure / couleur de la famille faible |
| Pads d'action | couleur de la famille, **blanc vif** quand l'action est active |
| Changement de mode 8 actions | éclair blanc sur les 8 pads |

Envoyées aux 3 modes du clavier (Arturia, DAW, Utilisateur), et renvoyées toutes les 2 s.
✅ Depuis le 2026-10-26 (validé), le clavier et l'écran utilisent **les mêmes couleurs de famille** (une seule liste, `COULEURS_ECRAN`), et l'écran suit les mêmes règles (lecture = couleur de la famille, prêt = blanc, action active = blanc).

## Écran du MiniLab ✅
Le petit écran du clavier affiche, sans accents :
- **en temps normal** : ligne 1 = famille, pad sélectionné et état (« Melodie P2 lect. »), ligne 2 = instrument ;
- **pendant 1,5 s quand on bouge quelque chose** : potard (« Reverb P2 » / « 63 % »), fader (« Volume Basse » / « 79 % »), bande tactile (« Volume pad 2 »), action (« Octave + » / « active »), mode (« Mode 8 actions »).

Le message est envoyé aux 3 modes du clavier et réécrit toutes les 2 s (testé sur le clavier le 2026-10-26).

## Écran (interface) ✅
Disposé **comme le MiniLab** (d'après la photo) : menus en haut, onglets des familles, jauge de mesure, puis une rangée **bande tactile · écran · 8 potards en 2 rangées · 4 faders**, et en dessous **les 8 grands pads**.
- Tout tient sans défilement et s'adapte : grand écran, iPhone en portrait (pads en 2 rangées de 4) et en paysage.
- ✅ **Lifting du 2026-10-26** (demande : plus lisible, effets, fond Reveria) : textes plus grands, **nom de l'instrument en gros** sur chaque pad et sur l'écran (avec ♪), panneaux en verre dépoli, lueurs aux couleurs des familles (lecture vert, rec rouge qui pulse, action active), logo Reveria dans le titre. **Fond animé** (`fond.js`) : les nœuds bleus et gris du logo Reveria dérivent et se relient par des courbes ; le fond s'anime à chaque temps de la mesure et lance une onde de la couleur de la famille à chaque touche jouée. Vérifié sur grand écran, iPhone portrait et paysage.
- ✅ **Formes maison** (validées le 2026-10-26, demande : « moins générique ») : pads comme de vraies touches en caoutchouc (épaisseur, s'enfoncent à l'appui, **LED d'état** en haut, numéro « PAD 01 »), familles en **4 nœuds reliés par une chaîne** comme le logo, boutons à **coins biseautés**, potards à **capuchon et aiguille**, faders avec un **curseur**, écran à lignes façon LCD, chiffres en police « machine », bouton Démarrer en **sphère Reveria** avec une orbite.
- Au clic : changer de famille, choisir l'instrument (bouton sous chaque pad de boucle, qui sélectionne aussi la boucle sans changer son état).
- 🟡 **Pads tactiles** (ajoutés le 2026-10-27, fichier `tactile.js`, à valider sur iPhone) : toucher ou cliquer un pad de l'écran fait exactement comme le pad du MiniLab (prêt, rec, lecture, arrêt, appui long, actions 5-8), plusieurs doigts à la fois. Avant, un clic sur un pad de boucle la sélectionnait seulement.
- Jauge de mesure : avance seulement quand au moins une boucle joue.
- Menus : Fichier (Nouvelle session, Ouvrir, Sauvegarder, Sauvegarder sous, Options, Quitter), Édition (effacer une boucle ou une famille, Réglages des pads), Affichage (plein écran, taille du texte), Aide. Bouton **💾 Sauvegarder** en haut à droite.

## Sons ✅
**Chaque boucle a son propre instrument** : 18 sons fabriqués en code + **61 vrais instruments**.
- 🟡 **Ajoutés le 2026-10-26**, inspirés de la synthwave rétro 80s (fichier `logiciel/synthes.js`) :
  - **Synthwave** : Nappe Juno 80s, Piano électrique FM (style DX7), Cuivres synthé 80s, Lead doux, Cloches FM, Basse analogique 80s ;
  - **Ambient** : Nappe rêveuse, Nappe de verre, Nappe sombre ;
  - **Arcade** : Carré 8 bits, Pulse 8 bits, Basse triangle 8 bits, Percussions 8 bits ;
  - **Batteries** : Boîte à rythmes 80s (Do grosse caisse 808, Ré caisse claire, Ré#/Si clap, Mi/Fa charlestons, Fa#-Sol# toms, La crash, La# cowbell).
- 🟡 **Lot 3 ajouté le 2026-10-26** (19 sons synthé FreePats, CC0, script `outils/telecharger_lot3.py`) :
  - **Nappes** : chœur, balayée (sweep), New Age, à l'archet, cordes synthé 1 et 2, ambiances bande originale / science-fiction / « gobelins » ;
  - **Nappes et Mélodie** : cuivres synthé 1 et 2, piano DX7 « E. Piano 1 », cristal ;
  - **Mélodie** : leads carré, calliope, en quintes ; **Basse** : basse synthé 1 (+ lead basse en Basse et Mélodie) ;
  - **Rythme** : batterie électronique (même rangement que les autres batteries).
  - Hauteurs vérifiées (aucune correction : les 2 écarts mesurés venaient de sons à deux notes, note + quinte), volumes égalisés sur les altos du lot 2. À écouter.
- ✅ **Lot 2 ajouté le 2026-10-26** (validé à l'écoute) (25 instruments réels, CC0, script `outils/telecharger_lot2.py`) :
  - **Guitares** : classique, ukulélé (les 3 guitares électriques ont été **retirées** le 2026-10-26 : même en banque complète, avec grattage, ampli et haut-parleur simulés, elles ne sonnaient pas comme une guitare jouées au clavier) ;
  - **Basses** : électrique aux doigts, au médiator ; **Synthwave** : basse « Lately » TX81Z, basse DX7 ;
  - **Claviers** : piano droit Kawai, piano Steinway B ;
  - **Cordes** : violon solo, altos, violons pizzicato, violons trémolo ;
  - **Vents** : hautbois, basson, piccolo, harmonica, flûte à bec ; **Cuivres** : trombone, tuba, trompette bouchée ;
  - **Batteries** : batterie acoustique et percussions du monde, un son par note de la gamme comme la boîte à rythmes 80s (Do grosse caisse / cajón, Ré caisse claire…).
  - Hauteurs vérifiées une à une (5 instruments corrigés d'une octave), volumes égalisés. Guitare classique validée à l'écoute.
  - Guitares **clean et jazz refaites** (2026-10-26) à partir des banques complètes, car la version « small » sonnait robotique : stéréo, 2 forces de frappe, 2 prises qui alternent, relâchement naturel de 1,1 s. Les anciennes versions sont supprimées.
  - ❌ Mode guitare essayé (grattage, ampli, haut-parleur) : pas convaincant → guitares électriques supprimées. Le **grattage** est gardé pour la guitare classique et le ukulélé.

Instruments enregistrés : (piano, clavecin, orgue, piano FM 80s, clavisynth, flûte, clarinette, saxophone, ocarina, violons, violoncelles, contrebasse, harpe, trompette, cor, vibraphone, marimba, glockenspiel, kalimba, cloches).
Seulement des sons **CC0 ou du domaine public** (sans citer d'auteur), dans `logiciel/sons/` (93 Mo). Hauteurs vérifiées une à une. Détail : `palette-instruments.md`.

## Sauvegarde ✅
- **Automatique** dans Chrome, 0,5 s après chaque changement. À l'ouverture, les boucles reviennent à l'arrêt.
- ✅ **Fichiers `.boucles`** avec Fichier › Sauvegarder / Ouvrir (validé le 2026-10-26).

## À corriger
1. ~~Shift + bouton central ne change plus l'instrument~~ : cause trouvée le 2026-10-26. Avec Shift, le clavier envoie le CC 29 au lieu du 28. C'est corrigé.
2. ~~Couleurs des pads qui « sautent »~~ : **n'est plus observé** par l'utilisateur (2026-10-26). La cause disparue est probablement l'ancienne version que Chrome gardait en mémoire. Aucune correction n'est faite pour l'instant. Si le problème revient, la solution prévue reste de repeindre le pad 0,1 s et 0,3 s après chaque appui et chaque relâchement.

## Prochaines étapes (décidées le 2026-10-26)
1. ⏳ **Publier RevLoop sur l'App Store.** À prévoir :
   - le **compte développeur Apple payant** (99 € par an), obligatoire pour publier, et qui supprime aussi la réinstallation tous les 7 jours ;
   - la fiche de l'application dans App Store Connect : nom (vérifier que « RevLoop » est libre), description, mots-clés, catégorie Musique, prix (gratuit ou payant), captures d'écran iPhone (et iPad si on le garde) ;
   - une **politique de confidentialité** (page web) : RevLoop ne collecte aucune donnée, ce qui la rend simple ;
   - la **vérification d'Apple** (App Review) : bien montrer que c'est une vraie application (pont MIDI natif, son, fichiers) et pas seulement une page web emballée ; expliquer que le MiniLab (ou un clavier MIDI) est nécessaire pour jouer, et prévoir de quoi l'essayer sans clavier ;
   - les **licences** : tous les sons sont CC0 ou domaine public (`palette-instruments.md`), aucun auteur à citer ; logo et nom Reveria ;
   - plus tard, éventuellement : version Mac sur le Mac App Store, version Windows.
2. ⏳ **Faire une vidéo de démonstration** qui montre comment utiliser RevLoop avec le MiniLab 3 :
   - une version **courte et verticale pour TikTok** (et Shorts / Reels) ;
   - une version **tutoriel plus longue pour YouTube** : brancher, Démarrer, enregistrer une 1re boucle, empiler les familles, actions des pads, arpège, vibrato, sauvegarder ;
   - musique jouée en direct dans le style synthwave 80s ; à préparer : le scénario, la captation (écran + mains sur le MiniLab), le montage.
3. Points ouverts plus petits : confirmer **Shift + clic** du bouton central ; écouter les **sons synthé du lot 3** ; mettre l'**application Mac** à jour avec les deux petits ajustements faits pour l'iPhone (recherche souple du port MiniLab, message de sauvegarde).

## Hors périmètre pour l'instant
Audio réel (guitare, voix — idée : brancher sa vraie guitare par le Valeton GP-5 et l'iRig HD 2), Casio PX-S1100, mode Arrangement, export du morceau en fichier audio.

## Fichiers du projet
| Fichier | Contenu |
|---|---|
| `logiciel/index.html` | La page et sa mise en page |
| `logiciel/moteur.js` | Sons, boucles, effets, MiniLab, sauvegarde |
| `logiciel/actions.js` | Actions des pads et page de réglages |
| `logiciel/interface.js` | L'affichage (familles, pads, potards, faders) |
| `logiciel/menus.js` | Barre de menus et fichiers `.boucles` |
| `logiciel/mesure.js` | Jauge de mesure |
| `logiciel/minilab.js` | Couleurs des pads du MiniLab |
| `logiciel/arpege.js` | Arpégiateur |
| `logiciel/synthes.js` | Sons fabriqués en code (synthwave, ambient, arcade) |
| `logiciel/fond.js` | Fond d'écran animé : les nœuds Reveria |
| `logiciel/tactile.js` | Jouer au toucher : les pads de l'écran |
| `logiciel/sons/` | Les 61 instruments enregistrés (93 Mo) + `instruments.json` |
| `logiciel/outils/` | Téléchargement des sons (lots 1, 2, 3), vérification des hauteurs |
| `minilab3-mapping.md` | Carte MIDI mesurée du MiniLab 3 |
| `application/` | L'application Mac (Electron) : `main.js`, icône dans `build/`, `installer-mac.sh` |
| `iphone/` | L'application iPhone (Xcode) : `RevLoop/RevLoopApp.swift` (vue web, pont MIDI, son, fichiers), icône dans `Assets.xcassets` |
| `sauvegardes/` | Copies complètes du projet (zip) |
| `palette-instruments.md` | Sources et licences des sons |
