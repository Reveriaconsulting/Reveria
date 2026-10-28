# RevLoop — Correctifs et évolutions à faire

Dernière mise à jour : 28/10/2026 (priorité 0 en grande partie faite : clavier, pads, potards et faders à l'écran)

## 1. Contexte
RevLoop est une app de boucles et d'instruments (rythme, mélodie, basse, nappes) jouée avec un clavier MIDI (Arturia MiniLab 3), sur iPhone, Mac et PC.
Objectif : élargir le public au-delà du MiniLab 3, puis valider l'intérêt avec des vidéos avant de payer le compte Apple Developer.

## 2. Évolutions à développer (par ordre de priorité)

### Priorité 0 — Clavier et pads à l'écran (jouer sans clavier MIDI)
Constat (27/10/2026) : l'app ne permet pas de jouer au toucher et n'a aucun clavier à l'écran. Sans clavier MIDI branché, elle est inutilisable. Conséquences : refus probable à la validation Apple (le testeur n'a pas de MiniLab 3, voir section 6), public limité aux possesseurs d'un clavier MIDI, impossible pour un spectateur de TikTok/YouTube d'essayer l'app.
- [x] Clavier à l'écran : 2 octaves minimum, boutons de changement d'octave (fait le 28/10/2026 ; défilement ou zoom pas faits)
- [x] Pads à l'écran (8 pads) pour la batterie et le lancement des boucles (fait le 28/10/2026)
- [x] Knobs et faders tactiles pour les réglages de base : volume par famille et par boucle, 8 potards (fait le 28/10/2026 ; pas de réglage de tempo, l'app n'en a pas : la 1re boucle donne la mesure)
- [x] Même écran de jeu que l'on utilise le tactile ou un clavier MIDI : le clavier physique prend le relais dès qu'il est détecté, même branché en cours de jeu (fait le 28/10/2026, testé en simulation, pas encore avec le vrai MiniLab sur iPhone)
- [x] Jeu multi-touch : plusieurs notes en même temps (accords), et glisser d'une touche à l'autre (fait le 28/10/2026)
- [x] Sensibilité à la vitesse (vélocité) simulée selon la position du doigt sur la touche : bas = fort (fait le 28/10/2026)
- [ ] Faible latence : le son part dès l'appui (objectif sous 20 ms). Le son part dès l'appui du doigt ; mesuré environ 21 ms sur Mac dans Chrome, à mesurer sur un vrai iPhone
- [ ] Le guide (priorité 3) affiche l'écran tactile quand aucun clavier n'est branché, et le schéma du MiniLab 3 quand il est détecté
- [ ] Textes de l'app : ne plus supposer qu'un MiniLab 3 est branché (fait pour la ligne d'état ; reste l'aide et les astuces)
Critère de validation : sur un iPhone sans aucun accessoire, on peut choisir un instrument, jouer une mélodie et des pads, et enregistrer une boucle.

### Priorité 1 — Mapping des touches
- [ ] Permettre à l'utilisateur d'assigner chaque touche, pad, knob et fader à une fonction ou un instrument
- [ ] Compatibilité avec n'importe quel clavier MIDI (pas seulement le MiniLab 3)
- [ ] Profil prêt à l'emploi pour le MiniLab 3
- [ ] Sauvegarde et chargement de plusieurs configurations
- [ ] Séparation claire pads (drums) / touches (mélodie), sans chevauchement de notes (problème déjà rencontré dans Live avec la touche Ré)

### Priorité 2 — Sampleur (import et enregistrement audio)
- [ ] Enregistrer la voix ou un son depuis le micro
- [ ] Importer un fichier audio (WAV, MP3)
- [ ] Réglage de la note d'origine du son
- [ ] Découpe (début / fin) du son
- [ ] Mode boucle pour qu'un son court dure tant que la touche est enfoncée
- [ ] Jouer le son sur tout le clavier (changement de hauteur)
- [ ] Plus tard : étirement temporel pour garder la durée du son
- [ ] Autorisation micro iOS/macOS avec un texte explicatif clair

### Priorité 3 — Assistant guide
- [ ] Version 1 : tutoriel pas à pas intégré (branchement, premier son, premier loop)
- [ ] Version 2 (optionnelle) : assistant IA, à prévoir seulement avec un budget d'API et une politique de confidentialité adaptée

#### Étape ultérieure : rendre interactives les références au MiniLab 3
Constat : plusieurs pages de l'app contiennent des phrases fixes sur le MiniLab 3 et son mapping. Exemple, en bas de la liste des instruments : « ★ = le son de base de la famille Mélodie. Astuce : Shift + bouton central du MiniLab fait défiler cette liste. » Ce texte est statique : l'utilisateur doit le lire, le comprendre et retrouver le bon bouton sur son clavier.

À faire (après le mapping et le sampleur) :
- [ ] Faire l'inventaire de toutes les pages et textes qui mentionnent le MiniLab 3 ou son mapping
- [ ] Remplacer chaque phrase par une aide interactive : un schéma du MiniLab 3 où le bouton concerné (ici Shift + bouton central) clignote ou s'illumine
- [ ] Réagir en direct au clavier : quand l'utilisateur appuie sur la bonne combinaison, l'écran le confirme (liste qui défile, coche, retour visuel)
- [ ] Adapter l'aide au clavier réellement branché : instructions du profil MiniLab 3 si détecté, sinon instructions du mapping personnalisé de l'utilisateur, sans mention du MiniLab 3
- [ ] Brancher ces aides sur le mapping des touches : si l'utilisateur réassigne un contrôle, le texte et le schéma suivent automatiquement (éviter les textes écrits en dur)
- [ ] Option « Me guider » sur chaque page : mini-parcours pas à pas (ex. choisir un instrument avec le clavier seul)
- [ ] Pouvoir désactiver ces aides une fois la prise en main faite

Point de vigilance : tant que les textes sont écrits en dur, tout changement de mapping les rend faux. À corriger en même temps que le mapping, ou au plus tard avant la publication.
À vérifier : la légende « ★ » de la liste des instruments n'apparaît sur aucun instrument visible dans la capture (peut-être plus haut dans la liste). Si aucune étoile n'est affichée, la légende est trompeuse.

### Priorité 4 — Plugins (VST / AUv3)
- [ ] Reporté : impossible sur iPhone (iOS n'accepte pas les VST, seulement les AUv3)
- [ ] À étudier uniquement sur Mac/PC, si la demande des utilisateurs le justifie
- [ ] Ne jamais inclure un plugin tiers dans l'app sans licence de redistribution

## 3. Vérifications avant publication

### Droits et juridique
- [ ] Origine de tous les sons et boucles de l'app : créés par moi ou sous licence commerciale (point bloquant n°1)
- [ ] Conditions d'utilisation : l'utilisateur est responsable des fichiers qu'il importe
- [ ] Politique de confidentialité (URL obligatoire pour Apple), précisant si les enregistrements restent sur l'appareil
- [ ] Vérifier le nom : recherche « RevLoop » dans l'App Store, sur l'INPI (classes 9 et 41) et la disponibilité des pseudos TikTok, YouTube, Instagram
- [ ] Activité déclarée : confirmer avec l'expert-comptable/URSSAF le rattachement des revenus de l'app à Reveria Consulting
- [ ] Clause d'exclusivité ou d'activité annexe du contrat de travail

### Technique
- [ ] Tester sur iPhone, Mac et PC avec le MiniLab 3 et au moins un autre clavier MIDI
- [ ] Vérifier le tempo par défaut (120 BPM) et la quantification
- [ ] Éviter tout doublon de sons avec d'autres logiciels ouverts en même temps

## 4. Plan de lancement
1. Tourner 3 à 5 vidéos de démo (app, covers revisités, un morceau original) sur un compte dédié RevLoop
2. Observer les commentaires : demandes de compatibilité, de téléchargement
3. Seulement ensuite : compte Apple Developer (99 $/an), TestFlight, puis publication
4. Modèle envisagé : app gratuite avec les bases + packs d'instruments ou de boucles payants, ou app payante à petit prix (3 à 8 €). Pas de publicités au départ.

## 5. Vidéos et droits musicaux
- Covers revisités : bons pour la visibilité, mais l'ayant droit peut revendiquer les revenus. Ne pas compter les monétiser.
- Morceaux originaux composés avec RevLoop : seuls contenus sûrs à monétiser.
- Ne jamais intégrer l'enregistrement original d'un morceau protégé.

## 6. Règles de validation Apple (App Review Guidelines) et points à respecter
Objectif : passer la validation du premier coup, en respectant les règles. Cette section ne cherche pas à contourner Apple : les cas où Apple prévoit une dérogation exigent son accord préalable (voir 2.1 ci-dessous).
Source principale : App Review Guidelines d'Apple (developer.apple.com/app-store/review/guidelines), consultées le 27/10/2026. Les règles changent : relire la page juste avant la soumission.

### Risques classés par gravité pour RevLoop
| Gravité | Règle | Risque pour RevLoop | Action |
|---|---|---|---|
| Élevée | 2.1 Complétude de l'app | Apple exige que l'app soit entièrement testable. Une app injouable sans MiniLab 3 sera refusée. Le mode démo intégré n'est prévu que « à la place d'un compte démo », pour des raisons légales ou de sécurité, avec accord préalable d'Apple : ce n'est pas la bonne voie ici. | Faire la priorité 0 (clavier et pads à l'écran) : l'app est alors testable sans matériel. Mentionner le MiniLab 3 comme matériel facultatif. |
| Élevée | 2.3.1 Notes pour le testeur | Les nouvelles fonctions doivent être décrites avec précision dans « Notes for Review », sinon refus. | Rédiger des notes claires (voir modèle plus bas). |
| Élevée | 5.1.1(i) Politique de confidentialité | Lien obligatoire dans App Store Connect et dans l'app, facile à trouver. Elle doit dire quelles données sont collectées, comment, pour quoi, la durée de conservation et comment demander la suppression. | Rédiger la politique (voir contenu plus bas), l'héberger sur une page publique, l'ajouter dans les réglages de l'app. |
| Élevée | 5.1.1(ii)-(iii) Micro | Le texte d'autorisation du micro (purpose string) doit décrire clairement l'usage. Ne demander que les accès utiles. | Texte du type : « RevLoop utilise le micro pour enregistrer vos sons et les jouer au clavier. Les enregistrements restent sur votre appareil. » Ne demander le micro qu'au moment où l'utilisateur appuie sur « Enregistrer ». |
| Élevée | 5.2.1 Propriété intellectuelle | Pas de matériel protégé (marques, œuvres) sans autorisation. L'app doit être soumise par le titulaire des droits ou licenciée. Concerne tes sons et boucles. | Garder une preuve d'origine de chaque son (créé par toi, ou licence commerciale écrite). |
| Moyenne | 4.1(c) et 5.2.1 Marques | On ne peut pas utiliser la marque ou le nom de produit d'un autre développeur dans le nom ou l'icône de l'app sans accord. | Nom et icône sans « Arturia » ni « MiniLab ». Dans la fiche, rester sur la formule factuelle « compatible avec les claviers MIDI, dont le MiniLab 3 », sans logo d'Arturia. Mention « non affilié à Arturia ». À valider (voir hypothèses). |
| Moyenne | 3.1.1 Achats intégrés | Débloquer des fonctions ou du contenu payant passe par l'achat intégré d'Apple : pas de clé de licence, de QR code ou de paiement maison. Mécanisme de restauration des achats obligatoire. | Si tu vends des packs d'instruments : achats intégrés uniquement, bouton « Restaurer mes achats ». Pas de lien vers un paiement externe. |
| Moyenne | 4.3(b) Apps indistinguables | Apple refuse les catégories saturées (effets sonores, minuteurs simples…) sauf expérience nettement différente. | Mettre en avant ce qui te distingue : boucles par familles, sampleur, guide interactif, compatibilité de claviers. |
| Moyenne | 4.2 Fonctionnalité minimale | Une app « peu utile, peu unique, pas app-like » peut être refusée. | Livrer assez de contenu : instruments, boucles, enregistrement, sampleur. |
| Moyenne | 2.3.3 Captures d'écran | Elles doivent montrer l'app en cours d'utilisation, pas seulement un écran de titre. | Captures réelles : clavier à l'écran, liste des instruments, boucles. |
| Moyenne | 2.3.6 Classification d'âge | Répondre honnêtement au questionnaire d'âge. | Pas de contenu sensible dans l'app ; si l'import audio est libre, répondre en conséquence. |
| Faible | 5.1.1(v) Compte | Si pas de fonctions liées à un compte, ne pas imposer de connexion. Si un compte existe, suppression du compte dans l'app obligatoire. | Pas de compte au départ : le plus simple. |
| Faible | 5.1.2 Données et suivi | Pas de partage de données sans accord. Les pubs et statistiques tierces déclenchent l'autorisation de suivi (ATT) et compliquent la validation. | Pas de pubs ni d'outil de suivi au départ. |
| Faible | 1.2 Contenu généré par les utilisateurs | S'applique si les utilisateurs partagent des contenus entre eux (filtrage, signalement, blocage, contact). | Ne pas ajouter de partage public d'enregistrements dans la première version. L'export vers Fichiers ou les réseaux sociaux du téléphone est plus simple. |
| Faible | 2.5.1 API publiques | Utiliser uniquement les API publiques d'Apple, sur la dernière version du système. | Éviter tout contournement technique. |

### Points techniques à vérifier (hors consignes citées ci-dessus)
- **Version de l'outil de développement** : un site tiers indique que les envois après le 28/04/2026 doivent être compilés avec Xcode 26 ou supérieur. À confirmer sur la page « Upcoming requirements » d'Apple.
- **Manifeste de confidentialité (PrivacyInfo.xcprivacy)** : requis si l'app ou un composant utilise certaines API (horodatage de fichiers, espace disque, UserDefaults, etc.). À vérifier avec l'outil de développement.
- **Version Mac** : l'App Store Mac demande en général un fonctionnement en bac à sable (sandbox) avec autorisation explicite du micro et du MIDI. À vérifier dans la documentation Apple. Pour une distribution hors App Store, notarisation obligatoire.
- **Version PC** : hors règles Apple (App Store). Vérifier séparément le canal de distribution.
- **Mots-clés et nom** : j'ai une règle en tête (2.3.7) qui interdit de remplir les mots-clés avec des marques de tiers. Elle n'est pas dans l'extrait que j'ai consulté : à vérifier avant de saisir « MiniLab » ou « Arturia » dans les mots-clés.

### Modèle de « Notes for Review » (à adapter)
« RevLoop est une app de boucles et d'instruments (rythme, mélodie, basse, nappes). Elle se joue directement sur l'écran avec le clavier et les pads tactiles : aucun matériel ni compte n'est nécessaire pour la tester. Un clavier MIDI (par exemple l'Arturia MiniLab 3) peut être branché en option ; dans ce cas il prend le relais. Le micro sert uniquement à enregistrer des sons que l'utilisateur rejoue au clavier ; les enregistrements restent sur l'appareil. Il n'y a ni compte, ni publicité, ni suivi. Pour tester : 1) choisir un instrument, 2) jouer sur le clavier à l'écran, 3) enregistrer une boucle. Une vidéo de démonstration avec un clavier MIDI est jointe. »

### Contenu minimal de la politique de confidentialité
- Identité de l'éditeur (Reveria Consulting, entrepreneur individuel) et contact
- Données traitées : enregistrements audio faits par l'utilisateur ; aucune autre donnée si c'est le cas
- Où elles sont stockées (sur l'appareil) et pendant combien de temps
- Absence de partage avec des tiers (à confirmer selon les composants utilisés)
- Comment supprimer ses données (supprimer l'enregistrement ou l'app)
- Droits RGPD et contact

### Checklist avant soumission
- [ ] App jouable sans clavier MIDI (priorité 0)
- [ ] Testée sur un vrai appareil, sans plantage
- [ ] Texte d'autorisation du micro clair, demande faite au bon moment
- [ ] Politique de confidentialité en ligne, liée dans App Store Connect et dans l'app
- [ ] Preuve d'origine de tous les sons
- [ ] Nom, icône et captures sans marque tierce et fidèles à l'app
- [ ] Questionnaire d'âge et « confidentialité de l'app » remplis honnêtement
- [ ] Achats intégrés (si prévus) créés et envoyés avec l'app, restauration disponible
- [ ] Notes pour le testeur rédigées, vidéo avec le MiniLab 3 jointe
- [ ] Relecture des guidelines à jour le jour de la soumission
- [ ] En cas de refus : répondre dans le Resolution Center avec des précisions, corriger, renvoyer

### Hypothèses et limites
- Les consignes ci-dessus viennent de la page officielle d'Apple, mais les décisions du testeur varient d'un cas à l'autre.
- Le clavier et les pads à l'écran (priorité 0) rendent l'app testable sans matériel : la question de l'acceptation d'une app dépendante d'un accessoire MIDI ne se pose plus.
- Les mentions de la marque Arturia et de l'équivalent « compatible avec » sont une prudence juridique, pas un avis juridique : à faire valider si tu veux un doute levé.
