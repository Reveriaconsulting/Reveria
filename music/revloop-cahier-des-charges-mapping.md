# RevLoop — Cahier des charges : mapping des touches

Version 1 — 27/10/2026
Destinataire : outil de développement (à coller tel quel dans le prompt)

## 1. Objectif
Permettre à l'utilisateur d'assigner librement chaque contrôle d'un clavier MIDI (touches, pads, knobs, faders, molettes) à une fonction ou un instrument de RevLoop. L'app doit fonctionner avec n'importe quel clavier MIDI, le MiniLab 3 étant le premier profil livré.

Plateformes : iPhone, Mac, PC. Le comportement doit être identique.

## 2. Fonctionnalités

### 2.1 Détection automatique du clavier
- Lister les appareils MIDI connectés et afficher leur nom
- Si le clavier est le MiniLab 3, charger le profil MiniLab 3 automatiquement
- Sinon, charger le profil générique « Clavier MIDI »
- Gérer branchement et débranchement à chaud, sans redémarrer l'app

### 2.2 Apprentissage MIDI (« MIDI Learn »)
- L'utilisateur appuie sur « Assigner » à côté d'une fonction, puis touche le contrôle voulu sur son clavier
- L'app enregistre le type de message (note, CC, pitch bend), le numéro et le canal
- Possibilité de réassigner ou d'effacer une assignation
- Un message clair signale les conflits : « Cette touche est déjà utilisée pour X. Remplacer ? »

### 2.3 Zones du clavier
- Découper les touches en zones, chacune liée à un instrument (exemple : zone basse = basse, zone haute = piano)
- Les pads peuvent être réservés à la batterie ou aux déclencheurs de boucles
- **Aucun chevauchement de notes entre deux zones** : l'app doit l'interdire ou avertir (problème rencontré dans Live, où une touche déclenchait aussi un son de batterie)
- Transposition par zone (octave +/−)

### 2.4 Fonctions assignables
| Contrôle | Fonctions possibles |
|---|---|
| Touches | Jouer un instrument, déclencher un sample (futur sampleur) |
| Pads | Sons de batterie, lancement/arrêt de boucles |
| Knobs | Volume, filtre, réverbération, delay, tempo |
| Faders | Volume par famille (rythme, mélodie, basse, nappes) |
| Molettes | Pitch bend, modulation |

### 2.5 Profils
- Enregistrer la configuration sous un nom (ex. « Live démo », « Composition »)
- Charger, dupliquer, renommer, supprimer un profil
- Profil par défaut MiniLab 3 fourni et non modifiable (« Restaurer par défaut »)
- Sauvegarde locale sur l'appareil (pas de serveur, pas de compte)
- Export/import d'un profil en fichier (JSON), pour passer du Mac à l'iPhone

## 3. Écran de réglage
- Schéma simple d'un clavier avec les contrôles cliquables
- Liste des assignations en cours, avec bouton « Réinitialiser »
- Mode test : une touche pressée s'illumine à l'écran et affiche son numéro de note, ce qui sert aussi au diagnostic
- Libellés en français (anglais prévu ensuite)

## 4. Contraintes techniques
- Entrée MIDI via les API système (CoreMIDI sur Apple), compatibilité MIDI USB et Bluetooth
- Latence : le son doit partir sans délai perceptible (objectif sous 20 ms)
- Aucun plantage si un message MIDI inattendu arrive (aftertouch, sysex, etc.) : ignorer proprement
- Les noms de notes varient selon les logiciels (C3 = 60 ou C4 = 60) : afficher le numéro MIDI et le nom, et fixer une convention unique dans l'app

## 5. Hors périmètre de cette version
- Import de plugins VST/AUv3
- Sampleur (enregistrement et import audio) : prochaine étape
- Assistant guide
- Partage de profils entre utilisateurs en ligne

## 6. Critères de validation (à tester)
1. Brancher le MiniLab 3 : le profil MiniLab 3 se charge seul
2. Brancher un autre clavier MIDI : le profil générique se charge
3. Assigner une touche via « Assigner » : elle déclenche la bonne fonction
4. Essayer d'assigner une touche déjà utilisée : un avertissement apparaît
5. Zone basse = basse, zone haute = piano : jouer sur toute l'étendue, aucun son parasite de batterie
6. Débrancher puis rebrancher le clavier : l'app reste stable et garde ses assignations
7. Quitter puis rouvrir l'app : les profils sont conservés
8. Exporter un profil sur le Mac et l'importer sur l'iPhone : le résultat est identique

## 7. Questions ouvertes
- L'app est-elle en natif (Swift) ou multiplateforme (web, Flutter, etc.) ? Cela change l'accès au MIDI, surtout sur PC et sur iPhone.
- Le Bluetooth MIDI doit-il être supporté dès la première version ?
