# Astrellia (anciennement RevLoop) — Correctifs et évolutions à faire

> Le 28/10/2026, l'application RevLoop a été renommée **Astrellia**. Les fichiers et dossiers gardent le nom « revloop » (identifiants internes inchangés, données conservées).

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
- [x] Même écran de jeu que l'on utilise le tactile ou un clavier MIDI : le clavier physique prend le relais dès qu'il est détecté, même branché en cours de jeu (fait et validé sur iPhone avec le MiniLab le 28/10/2026)
- [x] Jeu multi-touch : plusieurs notes en même temps (accords), et glisser d'une touche à l'autre (fait le 28/10/2026)
- [x] Sensibilité à la vitesse (vélocité) simulée selon la position du doigt sur la touche : bas = fort (fait le 28/10/2026)
- [x] Validé sur Mac et sur iPhone 11 le 28/10/2026 : clavier, accords, boucle enregistrée au doigt, bouton ✕ pour annuler ou effacer une boucle, plus de menu « Copier » ni de loupe sur un appui long
- [x] MiniLab 3 sur l'iPhone validé le 28/10/2026 : branché, il prend le relais (le clavier à l'écran se range) ; débranché puis rebranché pendant le jeu, tout suit sans redémarrer
- [x] Faible latence : le son part dès l'appui du doigt. Mesuré environ 21 ms sur Mac dans Chrome ; aucun retard ressenti sur iPhone (jugé suffisant le 28/10/2026, pas de mesure chiffrée)
- [x] Le guide adapte ses textes au tactile ou au clavier MIDI, et montre un schéma du MiniLab 3 (commande à utiliser en jaune) quand il est branché
- [x] Textes de l'app : ne plus supposer qu'un MiniLab 3 est branché (fait et validé le 28/10/2026 : aide « Jouer au doigt », astuces du MiniLab affichées seulement s'il est branché, pages Arpégiateur, Réglages des pads et À propos)
- [x] Équivalents tactiles du bouton central du MiniLab (validé sur iPhone le 28/10/2026) : bouton « 8 actions » (donc l'Arpège), flèches ‹ › pour choisir la boucle à régler sans la frapper
- [x] Bande tactile du MiniLab réglée comme le vibrato au doigt (±½ demi-ton, validé le 28/10/2026)
- [x] Vibrato au doigt (revu et validé le 28/10/2026) : on tient une note d'un doigt, et d'un 2e doigt on balance sur la bande « Vibrato » à gauche du clavier (±½ demi-ton, lissé) ; touche agrandie dentée avec une corde qui vibre. Glisser sur les touches = toujours un glissando
Critère de validation : sur un iPhone sans aucun accessoire, on peut choisir un instrument, jouer une mélodie et des pads, et enregistrer une boucle.

### Priorité 1 — Mapping des touches
- [x] Permettre à l'utilisateur d'assigner chaque touche, pad, knob et fader à une fonction (Édition › Clavier MIDI…, bouton « Apprendre » ; validé sur Mac avec le MiniLab le 28/10/2026). Raccourcis d'instrument : une commande donne un instrument choisi à la boucle sélectionnée
- [x] Compatibilité avec n'importe quel clavier MIDI : tous les claviers sont écoutés, profil « Générique » d'office (testé en simulation ; à tester avec un vrai autre clavier)
- [x] Profil prêt à l'emploi pour le MiniLab 3 (« MiniLab 3 (d'origine) », choisi d'office)
- [x] Sauvegarde et chargement de plusieurs configurations (profils perso gardés dans l'app, un profil par clavier), export / import en fichier
- [x] Séparation claire pads (drums) / touches (mélodie) : une commande assignée ne joue jamais de note

### Priorité 2 — Sampleur (import et enregistrement audio)
- [x] Enregistrer la voix ou un son depuis le micro (Édition › Sampleur…, validé sur Mac et iPhone le 28/10/2026)
- [x] Importer un fichier audio (WAV, MP3, M4A…) (fait ; pas encore testé avec un vrai fichier)
- [x] Réglage de la note d'origine du son (détectée d'office, bouton « Détecter »)
- [x] Découpe (début / fin) du son (silences retirés d'office)
- [x] Le son dure tant que la touche est enfoncée (case « Tenir », cochée d'office : le milieu se répète en fondu)
- [x] Jouer le son sur tout le clavier (changement de hauteur ; loin de la note d'origine, la voix sonne « robot », d'où l'étirement temporel prévu plus tard)
- [x] Étirement temporel (« Garder la durée », coché d'office) : grains de 120 ms superposés ; naturel à ±5 notes, plus « voix de canard » au-delà (limite connue)
- [x] Autorisation micro iOS/macOS avec un texte explicatif clair (demandée seulement au clic sur « Enregistrer »)
- [x] Les sons perso utilisés sont joints au fichier .boucles sauvegardé, et ajoutés à l'appareil qui l'ouvre

### Priorité 3 — Assistant guide
- [x] Version 1 : guide pas à pas intégré (Aide › Guide…), validé le 28/10/2026 : 8 chapitres (premiers pas, jeu au doigt, boucles, réglages, 8 actions et arpège, sampleur, autre clavier MIDI, sessions) ; « Premiers pas » s'ouvre tout seul à la 1re ouverture
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
- [x] Origine de tous les sons de l'app vérifiée le 28/10/2026 : voir registre-origine-des-sons.md et le dossier licences-sons/ (tout en CC0 ou domaine public, ou créé par le code). Noms de marques retirés des noms affichés. Reste à surveiller : la preuve du piano à queue
- [x] Conditions d'utilisation rédigées le 28/10/2026 (logiciel/legal/conditions.html, aussi dans Aide › Conditions d'utilisation). Adresse et SIRET complétés ; faire relire si besoin
- [x] Politique de confidentialité rédigée le 28/10/2026 (logiciel/legal/confidentialite.html, aussi dans Aide › Confidentialité). Adresse et SIRET complétés. En ligne le 28/10/2026 : https://reveria-consulting.fr/astrellia/confidentialite/ (et /astrellia/conditions/), non indexées (adresse publique pour App Store Connect)
- [x] Nom vérifié le 28/10/2026 :
  - INPI (marques en vigueur en France) : aucune marque REVLOOP
  - États-Unis (USPTO) : REVLOOP déposée par Ubersmith en classe 42 (logiciel de facturation en ligne), pas en musique
  - App Store : « RevLoop AI » existe déjà (Eberg Solutions, outil pour commerçants) ; plusieurs sociétés « RevLoop » dans le logiciel (facturation, avis clients, Salesforce)
  - Domaines : revloop.com et revloop.app pris ; revloop.fr, revloopmusic.com, revloopmusic.fr, revloop-app.com libres
  - Réseaux : YouTube @revloop pris, @revloopmusic libre ; Instagram et TikTok non vérifiables automatiquement
  - Décision du 28/10/2026 : chercher un nom plus distinctif. Noms vérifiés le même jour :
    - Ondeloop : aucune marque INPI, aucun usage trouvé sur le web, ondeloop.com et ondeloop.fr libres
    - Tisseloop : aucune marque INPI, aucun usage trouvé sur le web, tisseloop.com et tisseloop.fr libres
    - Écartés : Looperia (groupe de musique et album existants), Spiraloop (marque Yokohama), Loopora et Bouclia (.com et .fr pris)
    - 2e tour (noms sans « loop », plus atypiques), vérifiés le 28/10/2026 :
      - Poulpo (pieuvre : 8 bras = 8 pads, joue de tout à la fois) : marques INPI seulement en classes 16 (livres) et 35/42 (marketing, sites web), rien en 9 ni 41 ; aucune app « Poulpo » trouvée ; poulpomusic.com et .fr libres (poulpo.com pris)
      - Zootrope (appareil du XIXe s. qui fait tourner des images en boucle) : seule marque INPI expirée (2002, classes 9, 16, 41) ; poulpo.com et zootrope.com pris
      - Écartés : Gigogne (marque « Les Imagiers Gigognes » en classes 9 et 41), Bourdon (app d'accordeur), Millefeuille, Rémanence (apps), Ressac (groupes de musique), Grillon, Nodalia, Ostina, Stratia, Ritournelle, Ostinelle
    - 3e tour, vérifié le 28/10/2026 :
      - Ménure (l'oiseau-lyre, qui imite et répète tous les sons qu'il entend) : aucune marque INPI, aucune app ; seul usage trouvé : un album « L'Enfant et le Ménure » ; menure.com et .fr pris, menureapp.com et .fr libres
      - Phalène (papillon de nuit attiré par la lumière) : 8 marques INPI, toutes expirées ; aucune app ; phalene.com et .fr pris
      - Écartés : Noctule (jeu sur l'App Store), Manivelle (21 marques, dont « Manivell » en classe 9)
    - 4e tour (souhait : court, percutant, international, évoquant la nuit et le rêve), vérifié le 28/10/2026 :
      - Moonfold (la lune + « fold », les couches qu'on replie l'une sur l'autre) : aucune marque INPI ni USPTO, aucun usage trouvé sur le web ; moonfold.fr libre (.com et .app pris)
      - Écartés : les noms de 4-5 lettres ont presque tous déjà une app (Nocta, Somni, Nyxo, Oniro, Lumo, Luno, Nyvo, Glimr, Morfi, Yume, Zorya…) ; Dusko et Lunz (déjà utilisés en musique) ; Nightloom (marque américaine gênante) ; Moonloom et Starloom (déjà utilisés)
    - Nom préféré de l'utilisateur : Astrelle (petite étoile). Vérifié le 28/10/2026 :
      - France (INPI) : pas de marque « Astrelle » exacte, mais des marques très proches en classe 9 (logiciels, électronique) : ASTRELL (Metronic, enregistrée, classes 9, 20, 38), ASTREL (classe 9), ASTRELIS (demande publiée, classe 9) ; Astrelis en classe 41. Risque d'opposition réel en classe 9
      - États-Unis : 4 marques ASTRELLE, en bijoux, vêtements, bougies et art (pas en logiciel ni musique)
      - Web : une app d'astrologie « Astrelle » existe (astrelleapp.com, astrelle.ai) ; marques de mode et de bijoux
      - Domaines : astrelle.com/.fr/.app pris ; astrellemusic.com et .fr libres, astrelleapp.fr libre
    - Variante choisie par l'utilisateur : Astrellia. Vérifiée le 28/10/2026 :
      - France (INPI) : une seule marque ASTRELLIA, expirée (classe 16) ; restent des marques proches (ASTRELL, ASTREL, ASTRELIS en classe 9), mais Astrellia s'en distingue davantage qu'Astrelle (4 syllabes)
      - États-Unis : aucune marque ASTRELLIA
      - Web : bijouteries (Astrellia Diamonds, Astrellia Atelier), une police de caractères, des personnages de jeux ; aucune app ni projet musical
      - Domaines : astrellia.fr libre, astrelliamusic.com et .fr libres (astrellia.com et .app pris)
      - Conseillé avant dépôt : recherche de similarité INPI (environ 40 €) à cause des marques proches en classe 9
    - **Décision du 28/10/2026 : Astrellia.** Renommage fait dans l'app (Mac, iPhone, textes, pages légales) ; pages légales déplacées vers reveria-consulting.fr/astrellia/. Pas de nom de domaine ni de site dédié (choix de l'utilisateur)
    - Reste : vérifier Instagram et TikTok à la main ; recherche de similarité INPI (environ 40 €) puis dépôt à l'INPI (classes 9 et 41)
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
- [x] App jouable sans clavier MIDI (priorité 0, validée sur iPhone 11 le 28/10/2026)
- [x] Testée sur un vrai appareil, sans plantage (iPhone 11, 28/10/2026)
- [x] Texte d'autorisation du micro clair, demande faite au bon moment (au clic sur « Enregistrer »)
- [x] Politique de confidentialité en ligne (https://reveria-consulting.fr/astrellia/confidentialite/) et dans l'app (Aide › Confidentialité). Reste : coller l'adresse dans App Store Connect
- [x] Preuve d'origine de tous les sons (registre-origine-des-sons.md, licences-sons/)
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
