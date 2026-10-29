// =============================================================================
//  Astrellia — le moteur : sons, boucles, effets, MiniLab et sauvegarde
// =============================================================================

let audio;               // le moteur de son de Chrome (Web Audio)
let sortieGenerale;      // le volume général, juste avant les enceintes (menu Options)
let bruit;               // un enregistrement de « souffle » pour fabriquer les percussions
let salle;               // la « signature » d'une grande salle, partagée par toutes les réverbs
let tempsDelay = 0.375;  // écart entre deux répétitions du delay, calé sur la référence
const notesEnCours = {}; // les notes jouées en direct, rangées par numéro

// Numéros mesurés sur votre MiniLab 3
const POTARDS = {                    // potard → réglage
  86: 'filtre', 87: 'reverb', 89: 'chorus', 90: 'delay',             // potards 1 à 4
  110: 'saturation', 111: 'grain', 116: 'attaque', 117: 'mouvement', // potards 5 à 8
  // les mêmes potards dans l'autre mode du clavier (Shift + pad 3), mesurés le 2026-10-26
  74: 'filtre', 71: 'reverb', 76: 'chorus', 77: 'delay',
  93: 'saturation', 18: 'grain', 19: 'attaque', 16: 'mouvement',
};
// Le bouton central, mesuré le 2026-10-26 (un message par cran, 65 = droite, 62 = gauche) :
const BOUTON_CENTRAL = 28;           // tourner            → changer de famille
const CLIC_BOUTON_CENTRAL = 118;     // cliquer            → mode 8 actions
const BOUTON_CENTRAL_SHIFT = 29;     // Shift + tourner    → changer l'instrument de la boucle
const CLIC_BOUTON_CENTRAL_SHIFT = 119; // Shift + cliquer  → sélectionner la boucle suivante
const BANDE_DROITE = 1;              // bande tactile droite : garde la position touchée (0 à 127)
const SHIFT = 27;                    // touche Shift : 127 quand on l'appuie, 0 quand on la lâche
// Un autre mode du clavier (atteint par Shift + pad 3, mesuré le 2026-10-26) utilise d'autres
// numéros : Shift = 9, bouton central = 112 ou 114 (que Shift soit tenu ou non), clic = 113 ou 115
// (115 mesuré le 2026-10-26).
// Le logiciel les comprend aussi, et regarde lui-même si Shift est tenu.
const SHIFT_AUTRE_MODE = 9;
const ROTATION_AUTRE_MODE = [112, 114];
const CLICS_AUTRE_MODE = [113, 115];
let shiftEnfonce = false;
const FADERS = [14, 15, 30, 31];     // faders 1 à 4
const FADERS_AUTRE_MODE = [82, 83, 85, 17];   // les mêmes dans l'autre mode (82 et 83 mesurés le 2026-10-26)
const PAD_1 = 36;                    // pads 2, 3, 4 = 37, 38, 39
const CANAL_PADS = 9;                // les pads envoient sur le canal 10 (compté 9 en informatique)
const minuteursPads = {};            // un minuteur par pad tenu enfoncé
const derniereValeurPotard = {};     // dernière valeur envoyée par chaque potard

let reference = 0;       // durée de la 1re boucle enregistrée : elle sert de mesure aux autres
let origineReference = 0; // instant où cette 1re boucle a commencé : le « temps 1 » de chaque mesure
let familleActive = 0;   // la famille choisie avec le bouton central ou un clic

// Les préférences du menu Options, gardées à part de la session
const options = { appuiLong: 3, volumeGeneral: 100, tailleTexte: 1 };
// (clés gardées à l'ancien nom « Boucles Live » : ainsi, les réglages déjà enregistrés ne sont pas perdus)
const CLE_OPTIONS = 'boucles-live-options';
try { Object.assign(options, JSON.parse(localStorage.getItem(CLE_OPTIONS)) || {}); } catch (e) {}

function sauvegarderOptions() {
  try { localStorage.setItem(CLE_OPTIONS, JSON.stringify(options)); } catch (e) {}
}

// --- Les instruments, fabriqués en code -----------------------------------
// Chaque instrument reçoit (note, vélocité, instant, sortie, attaque) et renvoie une « voix »,
// c'est-à-dire la liste de ses oscillateurs et son réglage de volume.
// « attaque » (potard 7, en secondes) peut seulement rallonger l'attaque naturelle de l'instrument.

// Un oscillateur simple, éventuellement adouci par un petit filtre
function oscillateur(forme, note, quand, sortie, adoucir) {
  const osc = audio.createOscillator();
  osc.type = forme;
  osc.frequency.value = frequence(note);
  if (adoucir) {
    const f = audio.createBiquadFilter();
    f.frequency.value = adoucir;
    osc.connect(f).connect(sortie);
  } else {
    osc.connect(sortie);
  }
  osc.start(quand);
  return osc;
}

// Un volume qui monte en « attaque » secondes jusqu'au niveau voulu
function enveloppe(quand, niveau, attaque, sortie) {
  const volume = audio.createGain();
  volume.gain.value = 0;                 // silencieux jusqu'à son départ
  volume.gain.setValueAtTime(0, quand);
  volume.gain.linearRampToValueAtTime(niveau, quand + attaque);
  volume.connect(sortie);
  return volume;
}

const instruments = {
  // Mélodie : le lead synthwave en dents de scie
  melodie(note, vel, quand, sortie, attaque) {
    const volume = enveloppe(quand, vel / 127 * 0.3, Math.max(0.01, attaque), sortie);
    return { volume, sources: [oscillateur('sawtooth', note, quand, volume)], relache: 0.05 };
  },
  // Basse « synthwave » : deux couches, une octave plus bas
  //  - un corps rond (onde sinus) qui donne le poids ;
  //  - une dent de scie dont le filtre se referme vite après l'attaque :
  //    c'est le « pop » qui rend la basse audible, même sur de petites enceintes.
  basse(note, vel, quand, sortie, attaque) {
    const volume = enveloppe(quand, vel / 127 * 0.45, Math.max(0.004, attaque), sortie);
    const corps = oscillateur('sine', note - 12, quand, volume);

    const grain = audio.createGain();
    grain.gain.value = 0.6;
    grain.connect(volume);
    const filtreBasse = audio.createBiquadFilter();
    filtreBasse.type = 'lowpass';
    filtreBasse.Q.value = 6;
    filtreBasse.frequency.setValueAtTime(300 + vel * 15, quand);           // s'ouvre selon la force de frappe
    filtreBasse.frequency.exponentialRampToValueAtTime(180, quand + 0.25); // puis se referme
    filtreBasse.connect(grain);
    const scie = audio.createOscillator();
    scie.type = 'sawtooth';
    scie.frequency.value = frequence(note - 12);
    scie.connect(filtreBasse);
    scie.start(quand);

    return { volume, sources: [corps, scie], relache: 0.08 };
  },
  // Nappes : deux dents de scie légèrement désaccordées, attaque et relâche lentes
  nappes(note, vel, quand, sortie, attaque) {
    const volume = enveloppe(quand, vel / 127 * 0.18, Math.max(0.4, attaque), sortie);
    const a = oscillateur('sawtooth', note, quand, volume, 1800);
    const b = oscillateur('sawtooth', note, quand, volume, 1800);
    a.detune.value = -8;
    b.detune.value = +8;
    return { volume, sources: [a, b], relache: 0.6 };
  },
  // Rythme : chaque touche joue une percussion selon sa position dans l'octave
  // Do = grosse caisse, Ré = caisse claire, Mi = charleston fermé, Fa = charleston ouvert
  // (une percussion n'a pas d'attaque réglable : elle frappe toujours d'un coup)
  rythme(note, vel, quand, sortie) {
    const sorte = ['grosse', 'grosse', 'claire', 'claire', 'charley', 'ouvert'][note % 12] || 'charley';
    const niveau = vel / 127 * 0.8;
    const volume = audio.createGain();
    volume.gain.value = 0;                 // silencieux jusqu'à son départ
    volume.connect(sortie);
    const sources = [];
    let duree;
    if (sorte === 'grosse') {               // une onde sinus qui plonge vers le grave
      duree = 0.4;
      const osc = audio.createOscillator();
      osc.frequency.setValueAtTime(150, quand);
      osc.frequency.exponentialRampToValueAtTime(40, quand + 0.15);
      osc.connect(volume);
      osc.start(quand);
      sources.push(osc);
    } else {                                 // du souffle filtré : caisse claire ou charleston
      duree = { claire: 0.18, charley: 0.05, ouvert: 0.3 }[sorte];
      const souffle = audio.createBufferSource();
      souffle.buffer = bruit;
      const f = audio.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = sorte === 'claire' ? 1200 : 7000;
      souffle.connect(f).connect(volume);
      souffle.start(quand);
      sources.push(souffle);
    }
    volume.gain.setValueAtTime(niveau, quand);
    volume.gain.exponentialRampToValueAtTime(0.001, quand + duree);
    sources.forEach(s => s.stop(quand + duree));
    return { volume, sources, percussif: true, fin: quand + duree };
  },
};

// --- Les vrais instruments (échantillons enregistrés) ----------------------
// Le catalogue sons/instruments.json décrit chaque instrument : pour quelques notes
// enregistrées (« cle »), un fichier son. Pour jouer une autre note, on prend
// l'enregistrement le plus proche et on le lit un peu plus vite ou plus lentement.
// Les sons d'un instrument ne sont chargés que la première fois qu'on le choisit.
const SONS_DE_SYNTHESE = [
  { id: 'rythme', nom: 'Batterie synthé', categorie: 'Synthèse' },
  { id: 'basse', nom: 'Basse synthwave', categorie: 'Synthèse' },
  { id: 'nappes', nom: 'Nappe synthé', categorie: 'Synthèse' },
  { id: 'melodie', nom: 'Lead synthwave', categorie: 'Synthèse' },
];
let catalogueSons = [];                 // rempli au démarrage depuis sons/instruments.json
const tampons = {};                     // id → { fichier: son décodé }, une fois chargé
const prochainePrise = {};              // pour alterner les enregistrements d'une même note
const chargements = {};                 // id → chargement en cours (pour ne pas le lancer deux fois)

const sonsPerso = [];                   // vos sons enregistrés ou importés (sampleur.js), catégorie « Mes sons »
const tousLesInstruments = () => [...SONS_DE_SYNTHESE, ...catalogueSons, ...sonsPerso];
const infoInstrument = id => tousLesInstruments().find(i => i.id === id) || SONS_DE_SYNTHESE[0];

async function chargerCatalogue() {
  try {
    // ?v=… : sans cela, Chrome peut resservir une ancienne liste (sons retirés ou ajoutés depuis)
    catalogueSons = await (await fetch('sons/instruments.json?v=' + Date.now())).json();
  } catch (e) {
    console.warn('Catalogue de sons introuvable :', e);
  }
}

function chargerInstrument(id) {
  const inst = catalogueSons.find(i => i.id === id);
  if (!inst || chargements[id]) return chargements[id];
  chargements[id] = Promise.all(inst.regions.map(async r => {
    const octets = await (await fetch('sons/' + r.fichier)).arrayBuffer();
    return [r.fichier, await audio.decodeAudioData(octets)];
  })).then(paires => {
    tampons[id] = Object.fromEntries(paires);
    afficher();                         // retire la mention « chargement… »
  });
  afficher();
  return chargements[id];
}

function choisirRegion(inst, note, vel) {
  const forces = inst.regions.filter(r => !r.vel || (r.vel[0] <= vel && vel <= r.vel[1]));
  const candidates = forces.length ? forces : inst.regions;
  const cle = candidates.reduce((a, b) => Math.abs(b.cle - note) < Math.abs(a.cle - note) ? b : a).cle;
  const prises = candidates.filter(r => r.cle === cle);
  const n = prochainePrise[inst.id + cle] = ((prochainePrise[inst.id + cle] || 0) + 1) % prises.length;
  return prises[n];
}

// --- Guitares : le grattage (voir gratter et jouer) ---------------------------------
// Les guitares électriques ont été retirées le 2026-10-26 : jouées au clavier, elles ne sonnaient
// pas comme une guitare, même avec un ampli et un haut-parleur simulés.
const GUITARES = new Set(['guitare-classique', 'ukulele']);

// Joue une note avec un vrai instrument
function jouerEchantillon(id, note, vel, quand, sortie, attaque) {
  const inst = catalogueSons.find(i => i.id === id);
  const percussion = inst.categorie === 'Percussions mélodiques' || inst.kit;
  const volume = audio.createGain();
  volume.gain.value = 0;
  volume.connect(sortie);
  const voix = { volume, sources: [], relache: inst.relache || (percussion ? 1.2 : 0.3) };
  if (!tampons[id]) {                   // pas encore chargé : silence, le temps du chargement
    chargerInstrument(id);
    return voix;
  }
  // Une batterie (« kit ») a un son par note de la gamme, quelle que soit l'octave :
  // Do = grosse caisse, Ré = caisse claire… Ce son est joué tel quel, sans changer de hauteur.
  // Pour un autre instrument, on prend l'enregistrement le plus proche de la note demandée,
  // dans la bonne force de frappe (doux / fort) s'il y en a plusieurs ; quand une note revient,
  // on alterne entre ses différentes prises, comme un vrai musicien qui ne joue jamais deux fois pareil.
  const r = inst.kit ? inst.regions.find(x => x.cle === note % 12) : choisirRegion(inst, note, vel);
  if (!r) return voix;
  const lecteur = audio.createBufferSource();
  lecteur.buffer = tampons[id][r.fichier];
  lecteur.playbackRate.value = inst.kit
    ? Math.pow(2, (r.hauteur || 0) / 12)
    : Math.pow(2, (note - r.cle - (r.accord || 0) / 100) / 12);
  lecteur.connect(volume);
  lecteur.start(quand, r.debut || 0);
  const niveau = vel / 127 * Math.pow(10, (r.volume || 0) / 20) * 0.8;
  volume.gain.setValueAtTime(0, quand);
  volume.gain.linearRampToValueAtTime(niveau, quand + Math.max(0.005, attaque));
  voix.sources.push(lecteur);
  if (inst.kit) {                       // une frappe de batterie sonne jusqu'au bout
    voix.percussif = true;
    voix.fin = quand + lecteur.buffer.duration / lecteur.playbackRate.value;
  }
  return voix;
}

// --- Les familles et leurs boucles ----------------------------------------
// Réglages d'une boucle neuve : son propre, sans effet
const REGLAGES_NEUFS = {
  filtre: 127, reverb: 0, chorus: 0, delay: 0,          // rangée du haut : l'espace
  saturation: 0, grain: 0, attaque: 0, mouvement: 0,    // rangée du bas : le caractère
  volume: 100,                                          // bande tactile droite
};

function nouvelleBoucle(numero) {
  return {
    numero,
    etat: 'vide',     // vide, pret, enregistrement, lecture ou arret
    debut: 0,         // instant de la 1re note : le « zéro » de cette boucle, pour toujours
    enAttente: {},    // notes appuyées pendant l'enregistrement, pas encore relâchées
    notes: [],        // notes enregistrées : { quand, duree, note, velocite }
    courbes: [],      // vibrato enregistré (bande de gauche) : { quand, cents }
    duree: 0,         // durée de la boucle en secondes (arrondie sur la référence)
    programmeJusqua: 0, // jusqu'à quel instant ses notes sont déjà préparées
    voixPrevues: [],  // sons déjà programmés, pour pouvoir les couper
    reglages: { ...REGLAGES_NEUFS },   // les potards de CETTE boucle
    instrument: null, // null = le son de synthèse de sa famille
    transpo: 0,       // actions des pads : +12 / −12 demi-tons (octave)
    vitesse: 1,       // actions des pads : 2 = la boucle joue deux fois plus vite
    muet: false,      // actions des pads : la boucle tourne sans son
  };
}

// --- Quels sons dans quelle famille (audit du 2026-10-26) --------------------------
// R = Rythme, B = Basse, N = Nappes et accords, M = Mélodie.
// Rythme : seulement les batteries et percussions. Basse : les sons graves qui tiennent une ligne.
// Nappes : les sons qui tiennent des accords. Mélodie : les sons solistes.
// Un son polyvalent (piano, guitare…) peut être dans deux familles.
const RANGEMENT = {
  // Batteries et percussions
  'rythme': 'R', 'batterie-80s': 'R', 'chip-batterie': 'R', 'batterie-acoustique': 'R', 'percussions': 'R',
  // Basses
  'basse': 'B', 'basse-80s': 'B', 'chip-basse': 'B', 'basse-lately': 'B', 'basse-dx7': 'B',
  'basse-doigts': 'B', 'basse-mediator': 'B', 'contrebasse': 'B', 'tuba': 'B',
  // Nappes et sons d'accords
  'nappes': 'N', 'juno-pad': 'N', 'nappe-reve': 'N', 'nappe-verre': 'N', 'nappe-sombre': 'N',
  'cuivres-80s': 'N', 'orgue': 'N', 'altos': 'N', 'violons-tremolo': 'N', 'violoncelles': 'NB',
  'violons': 'NM', 'cor': 'NM', 'basson': 'BM', 'trombone': 'BM',
  // Claviers et cordes pincées : accords et mélodie
  'piano': 'NM', 'piano-droit': 'NM', 'piano-steinway': 'NM', 'piano-fm': 'NM', 'piano-fm-80s': 'NM',
  'clavecin': 'NM', 'clavisynth': 'NM', 'harpe': 'NM', 'vibraphone': 'NM',
  'guitare-classique': 'NM', 'ukulele': 'NM',
  // Solistes
  'melodie': 'M', 'lead-doux': 'M', 'chip-carre': 'M', 'chip-pulse': 'M', 'cloches-fm': 'M',
  'flute': 'M', 'clarinette': 'M', 'saxophone': 'M', 'ocarina': 'M', 'hautbois': 'M', 'piccolo': 'M',
  'harmonica': 'M', 'flute-a-bec': 'M', 'trompette': 'M', 'trompette-bouchee': 'M',
  'violon-solo': 'M', 'violons-pizz': 'M', 'marimba': 'M', 'glockenspiel': 'M', 'kalimba': 'M', 'cloches': 'M',
  // Lot 3 (sons synthé FreePats)
  'batterie-electronique': 'R', 'basse-synthe-1': 'B', 'lead-basse': 'BM',
  'nappe-choeur': 'N', 'nappe-sweep': 'N', 'nappe-new-age': 'N', 'nappe-archet': 'N',
  'cordes-synthe-1': 'N', 'cordes-synthe-2': 'N', 'ambiance-film': 'N', 'ambiance-scifi': 'N', 'ambiance-gobelins': 'N',
  'cuivres-synthe-1': 'NM', 'cuivres-synthe-2': 'NM', 'piano-dx7': 'NM', 'cristal': 'NM',
  'lead-carre': 'M', 'lead-calliope': 'M', 'lead-quintes': 'M',
};
// Les sons proposés pour une famille (liste à l'écran et Shift + bouton central).
// Un son pas encore rangé va dans Nappes et Mélodie.
const sonsDeLaFamille = f => tousLesInstruments().filter(i =>
  (RANGEMENT[i.id] || 'NM').includes('RBNM'[familles.indexOf(f)]));

// L'instrument d'une boucle : le sien s'il en a choisi un, sinon celui de sa famille
// (un instrument qui n'existe plus, comme les guitares électriques retirées, est remplacé par celui de la famille)
const existe = id => !!instruments[id] || catalogueSons.some(i => i.id === id);
const instrumentDe = (f, b) => (b.instrument && existe(b.instrument) ? b.instrument : f.instrument);

// Change l'instrument de la boucle sélectionnée (liste à l'écran ou Shift + bouton central)
function choisirInstrument(id) {
  const b = boucleSelectionnee();
  b.instrument = id === familles[familleActive].instrument ? null : id;
  chargerInstrument(id);
  afficher();
}

// Shift + bouton central : instrument suivant ou précédent dans la liste complète
function defilerInstrument(sens) {
  const liste = sonsDeLaFamille(familles[familleActive]);
  const actuel = liste.findIndex(i => i.id === instrumentDe(familles[familleActive], boucleSelectionnee()));
  choisirInstrument(liste[(actuel + sens + liste.length) % liste.length].id);
}

const familles = [
  { nom: 'Rythme',  instrument: 'rythme'  },
  { nom: 'Basse',   instrument: 'basse'   },
  { nom: 'Nappes',  instrument: 'nappes'  },
  { nom: 'Mélodie', instrument: 'melodie' },
].map(f => ({ ...f, volume: 100, selection: 0, boucles: [1, 2, 3, 4].map(nouvelleBoucle) }));

const toutesLesBoucles = () => familles.flatMap(f => f.boucles.map(b => ({ f, b })));
const estEnregistree = b => b.etat === 'lecture' || b.etat === 'arret';

// La boucle sélectionnée de la famille active : c'est elle que les potards modifient,
// et c'est à travers ses effets que l'on entend ce qu'on joue en direct.
const boucleSelectionnee = () => familles[familleActive].boucles[familles[familleActive].selection];

// --- Sauvegarde -----------------------------------------------------------
// Deux niveaux :
//  - automatique, dans la mémoire de Chrome (le « localStorage »), 0,5 s après
//    chaque changement : c'est le filet de sécurité ;
//  - dans un fichier .boucles, avec le menu Fichier (voir menus.js).
const CLE_SAUVEGARDE = 'boucles-live-session';
let minuteurSauvegarde;

function planifierSauvegarde() {
  clearTimeout(minuteurSauvegarde);
  minuteurSauvegarde = setTimeout(sauvegarder, 500);
}

// Rassemble tout l'état du morceau dans un objet simple, prêt à être écrit.
// L'horloge du son repart de zéro à chaque ouverture : on garde donc seulement
// l'écart entre les « zéros » des boucles, ce qui suffit à les réaligner.
function construireSession() {
  const enregistrees = toutesLesBoucles().filter(({ b }) => estEnregistree(b));
  const origine = Math.min(...enregistrees.map(({ b }) => b.debut));
  return {
    version: 2,
    reference,
    decalageReference: enregistrees.length ? origineReference - origine : 0,
    familleActive,
    familles: familles.map(f => ({
      volume: f.volume,
      selection: f.selection,
      arp: !!f.arp,
      boucles: f.boucles.map(b => ({
        reglages: b.reglages,
        instrument: b.instrument,
        transpo: b.transpo,
        vitesse: b.vitesse,
        muet: b.muet,
        enregistrement: estEnregistree(b)
          ? { notes: b.notes, courbes: b.courbes, duree: b.duree, decalage: b.debut - origine }
          : null,
      })),
    })),
  };
}

function sauvegarder() {
  try {
    localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(construireSession()));
  } catch (e) {
    console.warn('Sauvegarde impossible :', e);
  }
}

function lireSessionAuto() {
  try {
    return JSON.parse(localStorage.getItem(CLE_SAUVEGARDE));
  } catch (e) {
    return null;
  }
}

// Les sessions de la version 1 avaient un seul jeu de potards pour tout le son :
// on le recopie sur chaque boucle.
function convertirVersion1(session) {
  return {
    version: 2,
    reference: session.reference,
    familleActive: session.familleActive,
    familles: session.familles.map(sf => ({
      volume: sf.volume,
      selection: 0,
      boucles: sf.boucles.map(sb => ({ reglages: { ...session.reglages }, enregistrement: sb })),
    })),
  };
}

// Remplace le morceau en cours par une session (sauvegarde auto ou fichier).
// Les boucles reviennent à l'arrêt : une frappe sur leur pad les relance,
// alignées entre elles. Renvoie le nombre de boucles chargées.
function appliquerSession(session) {
  if (session && session.version === 1) session = convertirVersion1(session);
  if (!session || session.version !== 2) throw new Error('Ce fichier n’est pas une session Astrellia.');
  importerSonsDeSession(session.sons);   // les sons perso joints au fichier (sampleur.js), avant les boucles qui s'en servent

  reference = session.reference;
  familleActive = session.familleActive;
  if (reference) calerDelay();

  const base = audio.currentTime;
  origineReference = base + (session.decalageReference || 0);
  let nombre = 0;
  session.familles.forEach((sf, i) => {
    const f = familles[i];
    reglerVolume(f, sf.volume);
    f.selection = sf.selection;
    f.arp = !!sf.arp;
    sf.boucles.forEach((sb, j) => {
      const b = f.boucles[j];
      if (b.etat === 'lecture') couper(b, audio.currentTime);
      Object.assign(b, nouvelleBoucle(b.numero), {
        reglages: { ...REGLAGES_NEUFS, ...sb.reglages },
        instrument: sb.instrument || null,
        transpo: sb.transpo || 0,
        vitesse: sb.vitesse || 1,
        muet: !!sb.muet,
      });
      for (const nom in b.reglages) appliquerReglage(b, nom);
      if (b.instrument) chargerInstrument(b.instrument);   // pour qu'il soit prêt à la relance
      const e = sb.enregistrement;
      if (!e) return;
      b.notes = e.notes;
      b.courbes = e.courbes || [];
      b.duree = e.duree;
      b.debut = base + e.decalage;
      b.etat = 'arret';
      nombre++;
    });
  });
  afficher();
  return nombre;
}

// --- Outils ---------------------------------------------------------------
// Convertit un numéro de note MIDI (60 = Do central) en fréquence (Hz)
function frequence(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// --- Les effets ----------------------------------------------------------
// Chaque boucle a sa propre « tranche », comme une piste de table de mixage :
//
//   notes → filtre → saturation → grain → chorus → mouvement → (son direct) → fader de la famille → volume général
//                                                           ↘ envoi réverb → réverb de la famille ↗
//                                                           ↘ envoi delay  → delay de la boucle  ↗
//
// La réverb est partagée par les 4 boucles d'une famille (c'est l'effet le plus
// gourmand) ; chaque boucle choisit seulement combien elle lui envoie.
// L'attaque (potard 7) n'est pas dans la tranche : elle change la façon dont chaque note démarre.
function creerTranche(f, b) {
  b.entree = audio.createBiquadFilter();       // le filtre (potard 1) sert aussi d'entrée
  b.entree.type = 'lowpass';
  b.entree.Q.value = 4;                         // un peu de résonance, typique des synthés 80s
  b.saturation = audio.createWaveShaper();
  b.saturation.oversample = '4x';
  b.grain = audio.createWaveShaper();           // le grain « console 8 bits » (potard 6)
  b.entree.connect(b.saturation).connect(b.grain);

  // Chorus (potard 3) : une copie du son, très légèrement retardée, dont le retard
  // ondule lentement. Mélangée au son d'origine, elle l'élargit et le fait « onduler ».
  b.apresChorus = audio.createGain();
  b.grain.connect(b.apresChorus);               // le son d'origine
  b.chorusRetard = audio.createDelay(0.05);
  b.chorusRetard.delayTime.value = 0.015;
  b.chorusNiveau = audio.createGain();
  b.grain.connect(b.chorusRetard).connect(b.chorusNiveau).connect(b.apresChorus);
  b.lfoChorus = audio.createOscillator();       // un oscillateur très lent qui fait onduler le retard
  b.lfoChorus.frequency.value = 0.7;
  const profondeurChorus = audio.createGain();
  profondeurChorus.gain.value = 0.004;
  b.lfoChorus.connect(profondeurChorus).connect(b.chorusRetard.delayTime);
  b.lfoChorus.start();

  // Mouvement (potard 8) : le volume pulse lentement, au rythme des boucles
  b.mouvement = audio.createGain();
  b.apresChorus.connect(b.mouvement);
  b.lfoMouvement = audio.createOscillator();
  b.lfoMouvement.frequency.value = 1 / (tempsDelay * 4);
  b.profondeurMouvement = audio.createGain();
  b.lfoMouvement.connect(b.profondeurMouvement).connect(b.mouvement.gain);
  b.lfoMouvement.start();

  // Volume de la boucle (bande tactile droite) : placé avant les envois,
  // pour que la réverb et le delay suivent aussi ce volume
  b.volumeBoucle = audio.createGain();
  b.mouvement.connect(b.volumeBoucle);

  b.volumeBoucle.connect(f.sortie);             // le son direct

  b.envoiReverb = audio.createGain();
  b.volumeBoucle.connect(b.envoiReverb).connect(f.reverb);

  b.delay = audio.createDelay(4);
  b.delay.delayTime.value = tempsDelay;
  b.retour = audio.createGain();
  b.envoiDelay = audio.createGain();
  b.volumeBoucle.connect(b.envoiDelay).connect(b.delay);
  b.delay.connect(b.retour).connect(b.delay);
  b.delay.connect(f.sortie);

  for (const nom in b.reglages) appliquerReglage(b, nom);
}

// Applique un réglage de potard (0 à 127) à la tranche d'une boucle
function appliquerReglage(b, nom) {
  const v = b.reglages[nom];
  const t = audio.currentTime;
  if (nom === 'filtre') {
    // 0 → 127 devient 80 Hz (très sombre) → 12 000 Hz (très clair), en courbe exponentielle
    b.entree.frequency.setTargetAtTime(80 * Math.pow(12000 / 80, v / 127), t, 0.02);
  } else if (nom === 'reverb') {
    b.envoiReverb.gain.setTargetAtTime(v / 127, t, 0.02);
  } else if (nom === 'delay') {                   // plus on tourne, plus il y a de répétitions
    b.envoiDelay.gain.setTargetAtTime(v / 127 * 0.7, t, 0.02);
    b.retour.gain.setTargetAtTime(v / 127 * 0.6, t, 0.02);
  } else if (nom === 'saturation') {              // une courbe qui écrase les crêtes du son
    const force = 0.01 + v / 127 * 12;
    const courbe = new Float32Array(1024);
    for (let i = 0; i < courbe.length; i++) {
      const x = i / (courbe.length - 1) * 2 - 1;
      courbe[i] = Math.tanh(force * x) / Math.tanh(force);
    }
    b.saturation.curve = courbe;
  } else if (nom === 'grain') {                   // moins de « marches » = son plus pixelisé
    if (v === 0) {
      b.grain.curve = null;                       // aucune modification du son
    } else {
      const marches = Math.pow(2, 12 - v / 127 * 10);   // de 4096 marches à 4 marches
      const courbe = new Float32Array(4096);
      for (let i = 0; i < courbe.length; i++) {
        const x = i / (courbe.length - 1) * 2 - 1;
        courbe[i] = Math.round(x * marches) / marches;
      }
      b.grain.curve = courbe;
    }
  } else if (nom === 'chorus') {
    b.chorusNiveau.gain.setTargetAtTime(v / 127 * 0.8, t, 0.02);
  } else if (nom === 'mouvement') {               // le volume oscille autour de son niveau
    const profondeur = v / 127 * 0.9;
    b.mouvement.gain.setTargetAtTime(1 - profondeur / 2, t, 0.02);
    b.profondeurMouvement.gain.setTargetAtTime(profondeur / 2, t, 0.02);
  } else if (nom === 'volume') {                  // au carré, comme les faders, pour suivre l'oreille
    b.volumeBoucle.gain.setTargetAtTime(b.muet ? 0 : Math.pow(v / 127, 2), t, 0.02);
  }
  // 'attaque' n'a rien à régler ici : elle est lue à chaque nouvelle note (voir creerVoix)
}

// Les potards du MiniLab tournent sans fin, mais envoient une valeur de 0 à 127
// qui reste mémorisée DANS le clavier. Si on appliquait cette valeur telle quelle,
// changer de boucle ferait « sauter » le réglage. On utilise donc seulement
// le mouvement : +3 sur le potard = +3 sur le réglage de la boucle sélectionnée.
// En butée (0 ou 127), le clavier répète la même valeur : on la compte comme ±1.
function tournerPotard(cc, valeur) {
  const avant = derniereValeurPotard[cc];
  derniereValeurPotard[cc] = valeur;
  let mouvement = avant === undefined ? 0 : valeur - avant;
  if (mouvement === 0 && valeur === 127) mouvement = 1;
  if (mouvement === 0 && valeur === 0) mouvement = -1;

  changerReglage(POTARDS[cc], mouvement);
}

// Change un réglage de la boucle sélectionnée d'un certain nombre de crans (potard du
// MiniLab, ou potard à l'écran tourné à la souris / au doigt)
function changerReglage(nom, mouvement) {
  const b = boucleSelectionnee();
  b.reglages[nom] = Math.max(0, Math.min(127, b.reglages[nom] + mouvement));
  appliquerReglage(b, nom);
  annoncerSurMiniLab(NOMS_REGLAGES[nom] + ' P' + b.numero, texteReglage(b, nom));   // écran du clavier
  afficher();
}

// Bande tactile droite : volume de la boucle sélectionnée.
// Contrairement aux potards, on prend directement la position du doigt :
// on touche en haut pour fort, en bas pour doux.
function toucherBandeVolume(valeur) {
  const b = boucleSelectionnee();
  b.reglages.volume = valeur;
  appliquerReglage(b, 'volume');
  annoncerSurMiniLab('Volume pad ' + b.numero, Math.round(valeur / 127 * 100) + ' %');
  afficher();
}

// Le temps entre deux répétitions est calé sur la boucle de référence
// (une fraction de sa durée proche de 0,45 s), pour que les échos tombent en rythme.
function calerDelay() {
  tempsDelay = reference;
  while (tempsDelay > 0.6) tempsDelay /= 2;
  for (const { b } of toutesLesBoucles()) {
    if (!b.delay) continue;
    b.delay.delayTime.setTargetAtTime(tempsDelay, audio.currentTime, 0.05);
    b.lfoMouvement.frequency.setTargetAtTime(1 / (tempsDelay * 4), audio.currentTime, 0.05);
  }
}

// Volume général (menu Options), de 0 à 100 %
function reglerVolumeGeneral(pourcent) {
  options.volumeGeneral = pourcent;
  sauvegarderOptions();
  if (sortieGenerale) sortieGenerale.gain.setTargetAtTime(Math.pow(pourcent / 100, 2), audio.currentTime, 0.02);
}

// Fader : 0 → 127 devient un volume de 0 à 1 (au carré, pour suivre l'oreille)
function reglerVolume(f, valeur) {
  f.volume = valeur;
  f.sortie.gain.setTargetAtTime(Math.pow(valeur / 127, 2), audio.currentTime, 0.02);
  afficher();
}

// Potard 7 : 0 → 127 devient une attaque de 0 à 2 secondes (au carré, pour plus
// de finesse sur les attaques courtes)
const attaqueDe = b => Math.pow(b.reglages.attaque / 127, 2) * 2;

// Une note passe toujours par la tranche (les effets) d'une boucle précise,
// avec l'instrument de cette boucle : un son de synthèse ou un vrai instrument
function creerVoix(f, b, note, velocite, quand) {
  const id = instrumentDe(f, b);
  return instruments[id]
    ? instruments[id](note, velocite, quand, b.entree, attaqueDe(b))
    : jouerEchantillon(id, note, velocite, quand, b.entree, attaqueDe(b));
}

// Arrête une voix en douceur (pour éviter un « clic »).
// Une percussion s'éteint toute seule : on ne la coupe que si on coupe la boucle.
// Un oscillateur ne peut recevoir qu'un seul ordre d'arrêt : si la voix
// en a déjà un, on baisse seulement son volume.
function relacherVoix(voix, quand, couper) {
  if (voix.percussif && !couper) return;
  // « cancelAndHold » fige le volume là où il en est : si la note est relâchée
  // en pleine attaque lente, elle redescend de ce niveau au lieu de couper net.
  const g = voix.volume.gain;
  g.cancelAndHoldAtTime ? g.cancelAndHoldAtTime(quand) : g.cancelScheduledValues(quand);
  voix.volume.gain.setTargetAtTime(0, quand, couper ? 0.03 : (voix.relache || 0.05) / 3);
  if (voix.fin === undefined) {
    voix.fin = quand + (voix.relache || 0.05) * 4;
    voix.sources.forEach(s => s.stop(voix.fin));
  }
}

// --- Jeu en direct ---------------------------------------------------
// On joue avec l'instrument de la famille active, à travers les effets
// de sa boucle sélectionnée : on entend donc tout de suite le son qu'aura la boucle.
// Octave ± (actions des pads) décale aussi ce qu'on joue au clavier : on entend la note
// une octave plus haut ou plus bas. La note enregistrée reste celle de la touche, et la
// boucle lui rajoute son octave à la relecture : on réentend donc exactement ce qu'on a joué.
// Grattage : sur une guitare, les touches d'un accord (appuyées à moins de 60 ms d'écart) partent
// l'une après l'autre, à 18 ms d'intervalle, avec une petite variation de force et de moment.
let dernierCoup = -1, rangDansLAccord = 0;
function gratter(id, velocite) {
  if (!GUITARES.has(id)) return { decalage: 0, velocite };
  const t = audio.currentTime;
  rangDansLAccord = t - dernierCoup < 0.06 ? rangDansLAccord + 1 : 0;
  dernierCoup = t;
  return {
    decalage: rangDansLAccord * 0.018 + Math.random() * 0.006,
    velocite: Math.max(1, Math.min(127, velocite + Math.round((Math.random() - 0.5) * 12))),
  };
}

function jouer(note, velocite) {
  if (arpegeIntercepte(note, velocite, true)) return;   // arpège actif : c'est lui qui jouera (arpege.js)
  const f = familles[familleActive];
  const b = boucleSelectionnee();
  const coup = gratter(instrumentDe(f, b), velocite);
  velocite = coup.velocite;
  notesEnCours[note] = creerVoix(f, b, note + b.transpo, velocite, audio.currentTime + coup.decalage);
  suivreVoixEnDirect(notesEnCours[note]);
  for (const { b } of toutesLesBoucles()) {
    if (b.etat === 'pret') {             // la 1re note lance l'enregistrement
      b.etat = 'enregistrement';
      b.debut = audio.currentTime;
      commencerCourbe(b);
      afficher();
    }
    if (b.etat === 'enregistrement') {
      b.enAttente[note] = { quand: audio.currentTime + coup.decalage - b.debut, velocite };   // la boucle rejoue le grattage
    }
  }
}

function arreter(note) {
  if (!notesEnCours[note] && arpegeIntercepte(note, 0, false)) return;
  const voix = notesEnCours[note];
  if (voix) relacherVoix(voix, audio.currentTime);
  delete notesEnCours[note];
  for (const { b } of toutesLesBoucles()) {
    if (b.etat === 'enregistrement') noterFin(b, note, audio.currentTime - b.debut);
  }
}

// --- Vibrato : la bande tactile de gauche plie la hauteur des notes jouées ---------
// Le MiniLab envoie un « pitch bend » : 8192 au repos (doigt levé), de 0 à 16383 en glissant.
// On décale de ±½ demi-ton (50 centièmes, comme le vibrato au doigt de tactile.js : l'ondulation
// d'une corde) toutes les notes jouées en direct, arpège compris.
// Pendant un enregistrement, le geste est gardé dans la boucle et rejoué avec ses notes.
const COURBURE_MAXI = 50;            // en centièmes de demi-ton
let courbure = 0;
const voixEnDirect = new Set();

function suivreVoixEnDirect(voix) {
  voixEnDirect.add(voix);
  if (voixEnDirect.size > 64) voixEnDirect.delete(voixEnDirect.values().next().value);   // on oublie la plus ancienne
  for (const s of voix.sources) if (s.detune) s.detune.value = courbure;   // une note jouée pendant le vibrato part déjà pliée
}

function plierNotes(valeur) {
  courbure = (valeur - 8192) / 8192 * COURBURE_MAXI;
  const t = audio.currentTime;
  for (const { b } of toutesLesBoucles()) {          // une boucle qui enregistre garde le geste
    if (b.etat === 'enregistrement') b.courbes.push({ quand: Math.max(0, t - b.debut), cents: courbure });
  }
  for (const voix of voixEnDirect) {
    if (voix.fin !== undefined && voix.fin < t) { voixEnDirect.delete(voix); continue; }   // note éteinte
    for (const s of voix.sources) if (s.detune) s.detune.setTargetAtTime(courbure, t, 0.005);
  }
}

// Au début d'un enregistrement, si la bande est déjà pliée, la boucle part de cette hauteur
function commencerCourbe(b) {
  b.courbes = courbure ? [{ quand: 0, cents: courbure }] : [];
}

// Relecture : la hauteur d'une boucle à un instant de son tour (0 si aucun geste).
// Avant le 1er geste du tour, on garde la valeur de la fin du tour précédent.
function courbureA(b, position) {
  let cents = b.courbes.length ? b.courbes[b.courbes.length - 1].cents : 0;
  for (const c of b.courbes) {
    if (c.quand > position) break;
    cents = c.cents;
  }
  return cents;
}

// Programme le vibrato enregistré sur une note de la boucle, du début à la fin de son son.
// depart = début de la répétition en cours, longueur = durée d'une répétition (vitesse comprise).
function rejouerCourbe(b, voix, quand, fin, depart, longueur) {
  if (!b.courbes.length) return;
  const params = voix.sources.map(s => s.detune).filter(Boolean);
  const debutValeur = courbureA(b, (quand - depart) * b.vitesse);
  for (const p of params) p.setValueAtTime(debutValeur, quand);
  for (let k = 0; depart + k * longueur < fin; k++) {    // la note peut déborder sur la répétition suivante
    for (const c of b.courbes) {
      const instant = depart + k * longueur + c.quand / b.vitesse;
      if (instant <= quand || instant > fin) continue;
      for (const p of params) p.setTargetAtTime(c.cents, instant, 0.005);
    }
  }
}

// Une note enregistrée est complète quand on connaît son début et sa fin
function noterFin(b, note, fin) {
  const debut = b.enAttente[note];
  if (!debut) return;
  // une note jouée juste avant le « 1 » (début négatif) est placée sur le « 1 », en gardant la durée tenue
  b.notes.push({ quand: Math.max(0, debut.quand), duree: Math.max(0.05, fin - debut.quand), note, velocite: debut.velocite });
  delete b.enAttente[note];
}

// --- Les boucles ---------------------------------------------------------
// Calcule le début du tour de boucle en cours, à partir du « zéro » de la boucle.
// Ainsi, une boucle relancée reprend toujours en place, alignée sur les autres.
function tourEnCours(b, maintenant) {
  return b.debut + Math.floor((maintenant - b.debut) / b.duree) * b.duree;
}

// --- Des mesures entières (règle de l'utilisateur, 2026-10-29) ----------------------
// La 1re boucle fixe la mesure. Chaque boucle suivante commence à sa 1re note et dure un nombre entier de
// mesures : celui le plus proche de ce qui a été joué (1, 2, 3…, jusqu'à MESURES_MAXI, où elle s'arrête
// seule). Arrêtée un peu avant la fin d'une mesure, le reste est un silence ; un peu après, les notes en trop
// reviennent au début. Comme toutes les durées sont des multiples de la mesure, les boucles restent en rythme.
// Si aucune autre boucle ne joue (rien enregistré, ou tout à l'arrêt, par ex. après la reprise d'une session),
// la boucle repart de zéro : elle dure exactement ce qui a été joué et fixe une nouvelle mesure.
const MESURES_MAXI = 8;

function mesureImposee(b) {
  return reference > 0 && toutesLesBoucles().some(({ b: autre }) => autre !== b && autre.etat === 'lecture');
}
// (Remplace la règle du 2026-10-26, « durée exacte, sans arrondi », qui laissait les boucles se décaler.)

function terminerEnregistrement(b, maintenant) {
  const brute = maintenant - b.debut;
  const premiere = !mesureImposee(b);
  if (premiere) {                           // elle devient la référence
    reference = brute;
    origineReference = b.debut;
    calerDelay();
  }
  b.duree = premiere ? brute : reference * Math.min(MESURES_MAXI, Math.max(1, Math.round(brute / reference)));
  for (const note in b.enAttente) noterFin(b, Number(note), b.duree);
  // Par sécurité, une note qui dépasserait la fin est ramenée au début (comme sur une pédale loop).
  for (const n of b.notes) {
    if (n.quand >= b.duree) n.quand = n.quand % b.duree;
    n.duree = Math.min(n.duree, b.duree);
  }
  b.notes.sort((x, y) => x.quand - y.quand);
  for (const c of b.courbes) if (c.quand >= b.duree) c.quand = c.quand % b.duree;
  b.courbes.sort((x, y) => x.quand - y.quand);
  b.etat = 'lecture';
  b.programmeJusqua = maintenant;
}

function couper(b, maintenant) {
  b.etat = 'arret';
  b.voixPrevues.forEach(v => relacherVoix(v, maintenant, true));
  b.voixPrevues = [];
}

// Sélectionne une boucle de la famille active, sans changer son état
// (clic sur sa ligne à l'écran, ou frappe sur son pad)
function selectionner(numero) {
  familles[familleActive].selection = numero;
  afficher();
}

// Chaque frappe sur un pad sélectionne sa boucle et la fait passer à l'état suivant.
function frapperPad(b) {
  const maintenant = audio.currentTime;
  familles[familleActive].selection = b.numero - 1;
  if (b.etat === 'vide') {
    // Une seule boucle peut attendre ou enregistrer à la fois, toutes familles confondues
    for (const { b: autre } of toutesLesBoucles()) {
      if (autre.etat === 'pret') autre.etat = 'vide';
      if (autre.etat === 'enregistrement') terminerEnregistrement(autre, maintenant);
    }
    b.etat = 'pret';               // on attend la 1re note pour démarrer
    b.notes = [];
    b.courbes = [];
    b.enAttente = {};
  } else if (b.etat === 'pret') {
    b.etat = 'vide';               // aucune note jouée : on annule
  } else if (b.etat === 'enregistrement') {
    terminerEnregistrement(b, maintenant);
  } else if (b.etat === 'lecture') {
    couper(b, maintenant);
  } else if (b.etat === 'arret') {
    b.etat = 'lecture';
    b.programmeJusqua = maintenant;               // reprend en place (calée sur son « zéro »)
  }
  afficher();
}

// Efface les notes d'une boucle. Ses réglages d'effets ne sont remis à zéro
// que si on le demande (menu Édition) : un réenregistrement par appui long les garde.
// Si plus aucune boucle n'existe, la référence est oubliée.
function effacerBoucle(b, aussiLesReglages) {
  if (b.etat === 'lecture') couper(b, audio.currentTime);
  Object.assign(b, {
    etat: 'vide', notes: [], courbes: [], enAttente: {}, duree: 0, voixPrevues: [],
  });
  if (aussiLesReglages) {
    Object.assign(b, { instrument: null, transpo: 0, vitesse: 1, muet: false });
    b.reglages = { ...REGLAGES_NEUFS };
    for (const nom in b.reglages) appliquerReglage(b, nom);
  }
  if (toutesLesBoucles().every(({ b: autre }) => autre.etat === 'vide')) reference = origineReference = 0;
  afficher();
}

// Appui long : la boucle est effacée et le pad repasse en « Prêt ».
// La frappe du début a déjà eu son effet normal (couper, relancer…) : peu importe,
// puisque la boucle est remplacée. La référence ne change pas, pour garder
// les autres boucles en place, sauf si c'était la seule boucle enregistrée.
function reecrire(b) {
  if (b.etat === 'vide' || b.etat === 'pret') return;
  effacerBoucle(b, false);
  frapperPad(b);                   // vide → prêt, comme une première frappe
}

// Change de famille : bouton central ou clic sur sa carte
function choisirFamille(i) {
  familleActive = i;
  afficher();
}

// Bouton central : un cran à droite = famille suivante, un cran à gauche = précédente
function tournerBoutonCentral(valeur) {
  const sens = valeur > 64 ? 1 : -1;
  if (arpegeActif() && touchesTenues.size) return changerVitesseArpege(sens);  // voir arpege.js
  choisirFamille((familleActive + sens + familles.length) % familles.length);
}

// Shift + bouton central (le MiniLab envoie alors le n° 29) : un cran = un instrument
function tournerAvecShift(valeur) {
  defilerInstrument(valeur > 64 ? 1 : -1);
}

// Shift + clic du bouton central : la boucle suivante de la famille devient la boucle
// sélectionnée (pad 1 → 2 → 3 → 4 → 1), sans la lancer ni la couper.
function selectionnerBoucleSuivante() {
  selectionner((familles[familleActive].selection + 1) % 4);
}

// L'affichage (familles, pads, potards…) est dans interface.js

// Le « programmateur » : toutes les 25 ms, il prépare les notes qui doivent sonner
// dans les 0,1 s à venir, à l'instant exact. C'est ce qui garde les boucles en rythme.
// Comme il ne prépare que 0,1 s d'avance, un changement (octave, instrument, vitesse…)
// s'entend presque aussitôt, sans attendre la fin de la boucle.
const AVANCE = 0.1;

// Une boucle qui enregistre s'arrête toute seule quand elle atteint la durée de la 1re boucle,
// et se met aussitôt à tourner.
function arretAutomatique(maintenant) {
  for (const { b } of toutesLesBoucles()) {
    if (b.etat === 'enregistrement' && mesureImposee(b) && maintenant - b.debut >= reference * MESURES_MAXI) {
      terminerEnregistrement(b, b.debut + reference * MESURES_MAXI);
      annoncerSurMiniLab('Boucle P' + b.numero, 'duree maxi');
      afficher();
    }
  }
}

function programmateur() {
  const maintenant = audio.currentTime;
  const jusqua = maintenant + AVANCE;
  arretAutomatique(maintenant);
  for (const { f, b } of toutesLesBoucles()) {
    if (b.etat !== 'lecture' || b.duree <= 0) continue;
    const depuis = Math.max(b.programmeJusqua, maintenant - 0.01);   // ce qui n'est pas encore préparé
    // Les tours de boucle qui touchent la fenêtre [depuis, jusqua[
    for (let tour = tourEnCours(b, depuis); tour < jusqua; tour += b.duree) {
      // Vitesse ×2 : la boucle est jouée deux fois dans le même tour, en moitié moins de temps
      // (elle reste donc calée sur les autres). Octave : chaque note est décalée de b.transpo.
      for (let repetition = 0; repetition < b.vitesse; repetition++) {
        const departRepetition = tour + repetition * b.duree / b.vitesse;
        for (const n of b.notes) {
          const quand = departRepetition + n.quand / b.vitesse;
          if (quand < depuis || quand >= jusqua) continue;   // hors de la fenêtre : déjà fait, ou plus tard
          const voix = creerVoix(f, b, n.note + b.transpo, n.velocite, quand);
          relacherVoix(voix, quand + n.duree / b.vitesse);
          rejouerCourbe(b, voix, quand, voix.fin ?? quand + n.duree / b.vitesse + 1, departRepetition, b.duree / b.vitesse);
          b.voixPrevues.push(voix);
        }
      }
    }
    b.programmeJusqua = jusqua;
    // On oublie les voix déjà terminées
    b.voixPrevues = b.voixPrevues.filter(v => v.fin > maintenant);
  }
}

// --- Les pads (ceux du MiniLab et ceux de l'écran passent par ici) ----------
// Le rôle d'un pad (action ou boucle) peut changer pendant qu'on le tient : en mode 8 actions,
// le pad d'une boucle qui enregistre redevient une action dès qu'on arrête l'enregistrement.
// On retient donc son rôle à l'appui, pour que le relâchement fasse la suite logique.
const padEnAction = {};

function appuyerPad(numero, velocite) {
  padEnAction[numero] = actionDuPad(numero) !== null;
  if (padEnAction[numero]) {             // pad d'action (5-8, ou tous en mode 8 actions)
    appuyerAction(numero, velocite);
    return;
  }
  const b = familles[familleActive].boucles[numero];
  const aEffacer = b.etat === 'lecture' || b.etat === 'arret' || b.etat === 'enregistrement';
  frapperPad(b);
  if (aEffacer) minuteursPads[numero] = setTimeout(() => reecrire(b), options.appuiLong * 1000);
}

function relacherPad(numero) {
  if (padEnAction[numero]) relacherAction(numero);
  else clearTimeout(minuteursPads[numero]);   // relâché avant la fin de l'appui long
  delete padEnAction[numero];
}

// Une touche jouée ou relâchée : MiniLab, autre clavier MIDI (mapping.js) ou clavier à l'écran
let notesJouees = 0;                     // compteur pour le guide de démarrage (guide.js)
function jouerTouche(note, velocite) {
  notesJouees++;
  jouer(note, velocite);
  allumerTouche(note, true);             // la touche du clavier à l'écran s'allume aussi (tactile.js)
  document.getElementById('note').textContent = 'Note ' + note;
  ondeFond(COULEURS_ECRAN[familleActive]);   // une onde dans le fond d'écran (fond.js)
}

function relacherTouche(note) {
  arreter(note);
  allumerTouche(note, false);
}

// --- Messages du MiniLab (et des gestes à l'écran, qui imitent les mêmes messages : tactile.js) ---
// Un autre clavier, ou un MiniLab réglé sur un autre profil, passe par mapping.js ;
// le profil d'origine du MiniLab 3 est traité ici.
function recevoir(message) {
  if (message.target && traiterSelonProfil(message)) return;
  const [statut, data1, data2] = message.data;
  const type = statut & 0xF0;            // le type de message (note, potard…)
  const canal = statut & 0x0F;           // le canal (pads = 9)

  if (canal === CANAL_PADS) {            // un pad
    const numero = data1 - PAD_1;        // 0 pour le pad 1, 1 pour le pad 2…
    if (numero < 0 || numero >= 8) return;
    oublierCouleurPad(numero);           // le MiniLab vient d'allumer ce pad lui-même : on le recolore
    if (type === 0x90 && data2 > 0) appuyerPad(numero, data2);
    else if (type === 0x80 || type === 0x90) relacherPad(numero);
    return;                              // les pads ne jouent pas de note
  }
  if (type === 0xE0) {                   // bande tactile de gauche : vibrato
    plierNotes((data2 << 7) | data1);
  } else if (type === 0x90 && data2 > 0) {      // touche appuyée
    jouerTouche(data1, data2);
  } else if (type === 0x80 || (type === 0x90 && data2 === 0)) { // touche relâchée
    relacherTouche(data1);
  } else if (type === 0xB0) {            // un potard, un fader ou le bouton central
    if (POTARDS[data1]) tournerPotard(data1, data2);
    else if (data1 === BANDE_DROITE) toucherBandeVolume(data2);
    else if (data1 === SHIFT || data1 === SHIFT_AUTRE_MODE) shiftEnfonce = data2 > 0;
    else if (ROTATION_AUTRE_MODE.includes(data1)) {          // autre mode du clavier : un seul numéro
      if (data2 !== 64) shiftEnfonce ? tournerAvecShift(data2) : tournerBoutonCentral(data2);   // 64 = « repos »
    }
    else if (CLICS_AUTRE_MODE.includes(data1) && data2 > 0) shiftEnfonce ? selectionnerBoucleSuivante() : basculerHuitActions();
    else if (data1 === CLIC_BOUTON_CENTRAL && data2 > 0) basculerHuitActions();
    else if (data1 === BOUTON_CENTRAL) tournerBoutonCentral(data2);
    else if (data1 === BOUTON_CENTRAL_SHIFT) tournerAvecShift(data2);
    else if (data1 === CLIC_BOUTON_CENTRAL_SHIFT && data2 > 0) selectionnerBoucleSuivante();
    else if (FADERS.includes(data1) || FADERS_AUTRE_MODE.includes(data1)) {
      const f = familles[FADERS.includes(data1) ? FADERS.indexOf(data1) : FADERS_AUTRE_MODE.indexOf(data1)];
      reglerVolume(f, data2);
      annoncerSurMiniLab('Volume ' + f.nom, Math.round(data2 / 127 * 100) + ' %');
    }
  }
}

// --- Démarrage ------------------------------------------------------------
// Chrome n'autorise le son qu'après un clic : on démarre au bouton « Démarrer »
// ou au premier clic dans un menu. Démarrer deux fois ne fait rien de plus.
async function demarrer() {
  if (audio) return;
  audio = new AudioContext();
  sortieGenerale = audio.createGain();
  sortieGenerale.connect(audio.destination);
  reglerVolumeGeneral(options.volumeGeneral);

  // 1 seconde de souffle aléatoire, réutilisée par toutes les percussions
  bruit = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
  const echantillons = bruit.getChannelData(0);
  for (let i = 0; i < echantillons.length; i++) echantillons[i] = Math.random() * 2 - 1;

  // La « signature » d'une grande salle : 3 s de souffle qui s'éteint
  const longueur = audio.sampleRate * 3;
  salle = audio.createBuffer(2, longueur, audio.sampleRate);
  for (let canal = 0; canal < 2; canal++) {
    const d = salle.getChannelData(canal);
    for (let i = 0; i < longueur; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / longueur, 3);
  }

  // Chaque famille a sa sortie (son fader) et sa réverb ; chaque boucle a sa tranche d'effets
  for (const f of familles) {
    f.sortie = audio.createGain();
    f.sortie.connect(sortieGenerale);
    f.reverb = audio.createConvolver();
    f.reverb.buffer = salle;
    f.reverb.connect(f.sortie);
    reglerVolume(f, f.volume);
    for (const b of f.boucles) creerTranche(f, b);
  }

  await chargerCatalogue();      // la liste des vrais instruments (les sons eux-mêmes viendront à la demande)
  await chargerSonsPerso();      // vos sons enregistrés ou importés (sampleur.js), avant de restaurer la session

  let restaurees = 0;
  const auto = lireSessionAuto();
  if (auto) {
    try { restaurees = appliquerSession(auto); } catch (e) { console.warn(e); }
  }
  afficher();
  setInterval(programmateur, 25);
  // iPhone : le système coupe le son quand on passe à une autre app (ou un appel, l'écran verrouillé) ;
  // dès qu'il le met en pause, on le relance si l'application est à l'écran
  audio.onstatechange = () => { majAlerteSon(); if (audio.state !== 'running' && !document.hidden) setTimeout(reprendreSon, 300); };
  document.getElementById('demarrer').hidden = true;

  const etat = document.getElementById('etat');
  const infoSession = restaurees
    ? ' Session restaurée : ' + restaurees + ' boucle(s), à l’arrêt — frappez leur pad pour les relancer.'
    : '';
  try {
    // On demande aussi le droit d'envoyer des messages spéciaux (SysEx) pour colorer les pads.
    // Si Chrome le refuse, le logiciel marche quand même, sans les couleurs.
    let midi;
    try {
      midi = await navigator.requestMIDIAccess({ sysex: true });
    } catch (e) {
      midi = await navigator.requestMIDIAccess();
    }
    accesMIDI = midi;
    midi.onstatechange = () => brancherClaviers('');
    brancherClaviers(infoSession);
  } catch (e) {
    etat.textContent = 'Accès MIDI refusé : ' + e.message.replace(/\.$/, '') + '. Jouez sur le clavier à l’écran.' + infoSession;
  }
}

// Retour dans l'application : le son est relancé (à l'écran revenu, à la fenêtre retrouvée, au premier toucher).
// Appelé aussi par l'app iPhone quand elle redevient active (RevLoopApp.swift).
// Les boucles reprennent en place : le programmateur ne rattrape pas les notes manquées.
// Sur iPhone, un son « interrompu » ne repart parfois qu'après une mise en pause franche : on essaie les deux.
// iOS n'accepte de relancer le son qu'au cours d'un vrai toucher (touchend, click) : on les écoute aussi.
function reprendreSon() {
  if (!audio || audio.state === 'running' || audio.state === 'closed') return;
  audio.resume().catch(() => {}).finally(() => {
    if (audio.state !== 'running') audio.suspend().then(() => audio.resume()).catch(() => {}).finally(majAlerteSon);
    majAlerteSon();
  });
}

// Le bandeau « Son en pause » : visible tant que le son ne joue pas (l'état entre parenthèses aide à comprendre une panne)
function majAlerteSon() {
  const alerte = document.getElementById('alerte-son');
  const enPause = audio && audio.state !== 'running' && !document.hidden;
  alerte.hidden = !enPause;
  if (enPause) alerte.textContent = 'Son en pause : touchez l’écran pour le relancer (' + audio.state + ')';
}

// Bug connu de WebKit sur iPhone : après une interruption, le son peut se dire « running » alors que sa sortie
// vers le haut-parleur reste coupée. Au retour dans l'app, on force donc une pause puis une reprise, même s'il se dit actif.
function relancerSortieSon() {
  if (!audio || audio.state === 'closed') return;
  audio.suspend().catch(() => {}).finally(() => audio.resume().catch(() => {}).finally(majAlerteSon));
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) relancerSortieSon(); majAlerteSon(); });
window.addEventListener('pageshow', reprendreSon);
window.addEventListener('focus', reprendreSon);
for (const geste of ['pointerdown', 'touchend', 'click']) document.addEventListener(geste, reprendreSon, true);

// Branche les claviers MIDI : au démarrage, puis chaque fois qu'un clavier est branché ou débranché.
// Sans clavier, on joue à l'écran ; dès qu'un clavier arrive, il prend le relais (tactile.js).
let accesMIDI = null;
function brancherClaviers(infoSession) {
  const branche = p => p.state !== 'disconnected';
  const noms = [];
  for (const entree of accesMIDI.inputs.values()) {
    if (branche(entree) && portAEcouter(entree)) {        // tous les claviers (mapping.js)
      entree.onmidimessage = recevoir;
      noms.push(entree.name + ' (' + profilDuPort(entree.name).nom + ')');
    }
  }
  if (accesMIDI.sysexEnabled) {
    // Le port principal du MiniLab (« Minilab3 MIDI » sur Mac ; le nom peut varier un peu sur iPhone)
    const sorties = [...accesMIDI.outputs.values()].filter(branche);
    sortieMiniLab = sorties.find(s => s.name.includes('Minilab3 MIDI'))
      || sorties.find(s => /minilab/i.test(s.name) && /midi/i.test(s.name) && !/din|mcu/i.test(s.name))
      || null;
  }
  modeTactile(noms.length === 0);
  if (document.getElementById('mapping')) afficherMapping();   // Édition › Clavier MIDI… ouvert : la liste des claviers suit
  document.getElementById('etat').textContent = noms.length
    ? 'Connecté à : ' + noms.join(', ') + '. Jouez une touche !' + infoSession
    : 'Jouez sur le clavier et les pads de l’écran, ou branchez un clavier MIDI.' + infoSession;
}

document.getElementById('demarrer').onclick = demarrer;
