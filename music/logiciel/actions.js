// =============================================================================
//  Astrellia — les actions des pads 5 à 8
// =============================================================================
// Chaque famille a 8 actions. Les pads 5 à 8 donnent les actions 1 à 4.
// Un clic sur le bouton central passe en « mode 8 actions » : les pads 1 à 4
// donnent alors les actions 5 à 8 (les boucles ne sont plus sur les pads),
// jusqu'au clic suivant.
//
// Les actions agissent sur la boucle sélectionnée (cadre orange). Trois sortes :
//   - jouer   : joue une note avec l'instrument de la boucle (et l'enregistre si on enregistre)
//   - bascule : un appui active, un autre appui désactive (octave, vitesse, muet)
//   - maintien: l'effet dure tant que le pad est enfoncé (coupure, réverb, delay, filtre)

const OCTAVES_MAXI = 3;              // Octave + / − : de −3 à +3 octaves

const CATALOGUE_ACTIONS = {
  'jouer':        { nom: 'Jouer une note', sorte: 'jouer' },
  'octave-haut':  { nom: 'Octave +', sorte: 'compteur' },   // chaque appui : une octave de plus (jusqu'à +3)
  'octave-bas':   { nom: 'Octave −', sorte: 'compteur' },   // chaque appui : une octave de moins (jusqu'à −3)
  'vitesse':      { nom: 'Vitesse ×2', sorte: 'bascule' },
  'muet':         { nom: 'Muet', sorte: 'bascule' },
  'arpege':       { nom: 'Arpège', sorte: 'bascule' },   // voir arpege.js
  'coupure':      { nom: 'Coupure (tenir)', sorte: 'maintien' },
  'reverb-max':   { nom: 'Grosse réverb (tenir)', sorte: 'maintien' },
  'delay-max':    { nom: 'Écho lancé (tenir)', sorte: 'maintien' },
  'filtre-ferme': { nom: 'Filtre fermé (tenir)', sorte: 'maintien' },
  'rien':         { nom: '— rien —', sorte: 'rien' },
};

const NOMS_NOTES = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
// Notation française : le Do du milieu du clavier (note 60) s'appelle Do3
const nomNote = n => NOMS_NOTES[n % 12] + (Math.floor(n / 12) - 2);

const a = (type, note) => note === undefined ? { type } : { type, note };
// Octave − est toujours placé AVANT Octave + (à gauche), comme sur un clavier
const ACTIONS_PAR_DEFAUT = [
  // Rythme : les 4 premiers pads jouent la batterie (Do, Ré, Mi, Fa)
  [a('jouer', 48), a('jouer', 50), a('jouer', 52), a('jouer', 53),
   a('coupure'), a('reverb-max'), a('delay-max'), a('vitesse')],
  // Basse
  [a('octave-bas'), a('octave-haut'), a('coupure'), a('delay-max'),
   a('muet'), a('filtre-ferme'), a('vitesse'), a('arpege')],
  // Nappes
  [a('reverb-max'), a('filtre-ferme'), a('octave-bas'), a('octave-haut'),
   a('coupure'), a('delay-max'), a('muet'), a('arpege')],
  // Mélodie
  [a('octave-bas'), a('octave-haut'), a('vitesse'), a('delay-max'),
   a('reverb-max'), a('filtre-ferme'), a('coupure'), a('arpege')],
];

// Les actions choisies sont des préférences : elles sont gardées avec les options
if (!options.actionsPads) options.actionsPads = JSON.parse(JSON.stringify(ACTIONS_PAR_DEFAUT));

// Mise à jour des réglages déjà enregistrés : Octave − passe avant Octave +
if ((options.versionActions || 1) < 2) {
  const anciens = [null,
    ['octave-haut', 'octave-bas', 'coupure', 'delay-max', 'muet', 'filtre-ferme', 'vitesse', 'reverb-max'],
    ['reverb-max', 'filtre-ferme', 'coupure', 'octave-haut', 'octave-bas', 'delay-max', 'muet', 'vitesse'],
    ['octave-haut', 'octave-bas', 'vitesse', 'delay-max', 'reverb-max', 'filtre-ferme', 'coupure', 'muet']];
  options.actionsPads.forEach((liste, i) => {
    if (anciens[i] && liste.map(x => x.type).join() === anciens[i].join()) {
      options.actionsPads[i] = JSON.parse(JSON.stringify(ACTIONS_PAR_DEFAUT[i]));   // pré-réglage inchangé : on prend le nouveau
      return;
    }
    const haut = liste.findIndex(x => x.type === 'octave-haut');
    const bas = liste.findIndex(x => x.type === 'octave-bas');
    if (haut >= 0 && bas > haut) [liste[haut], liste[bas]] = [liste[bas], liste[haut]];   // réglage personnel : on échange
  });
  options.versionActions = 2;
  sauvegarderOptions();
}

// Mise à jour suivante : l'Arpège arrive sur le pad 4 du mode 8 actions (Basse, Nappes, Mélodie),
// seulement si ce pad avait encore son réglage d'origine
if (options.versionActions < 3) {
  const avant = [null, 'reverb-max', 'vitesse', 'muet'];
  options.actionsPads.forEach((liste, i) => {
    if (avant[i] && liste[7] && liste[7].type === avant[i]) liste[7] = { type: 'arpege' };
  });
  options.versionActions = 3;
  sauvegarderOptions();
}

let modeHuitActions = false;          // bascule par un clic sur le bouton central
const actionsTenues = {};             // pad → ce qu'il faut défaire quand on le relâche

const actionsDeLaFamille = () => options.actionsPads[familleActive];

function libelleAction(action) {
  if (!action) return '— rien —';
  return action.type === 'jouer' ? 'Jouer ' + nomNote(action.note) : CATALOGUE_ACTIONS[action.type].nom;
}

// Quel numéro d'action (0 à 7) correspond à un pad (0 à 7) ? null si le pad est une boucle.
function actionDuPad(pad) {
  if (pad >= 4) return pad - 4;                 // pads 5-8 → actions 1-4
  if (!modeHuitActions) return null;            // pads 1-4 → les 4 boucles
  // Mode 8 actions : pads 1-4 → actions 5-8, SAUF le pad d'une boucle prête ou en enregistrement,
  // qui reste un pad de boucle pour pouvoir arrêter l'enregistrement (choix A, 2026-10-26).
  const etat = familles[familleActive].boucles[pad].etat;
  return etat === 'pret' || etat === 'enregistrement' ? null : pad + 4;
}

// Une action « bascule » est-elle active sur la boucle sélectionnée ? (pour les couleurs)
function actionActive(action, pad) {
  const b = boucleSelectionnee();
  if (actionsTenues[pad]) return true;
  if (!action) return false;
  if (action.type === 'octave-haut') return b.transpo > 0;    // allumé tant que la boucle est décalée vers le haut
  if (action.type === 'octave-bas') return b.transpo < 0;
  if (action.type === 'vitesse') return b.vitesse === 2;
  if (action.type === 'muet') return b.muet;
  if (action.type === 'arpege') return arpegeActif();
  return false;
}

function appuyerAction(pad, velocite) {
  const action = actionsDeLaFamille()[actionDuPad(pad)];
  if (!action || action.type === 'rien') return;
  const b = boucleSelectionnee();
  const t = audio.currentTime;
  switch (action.type) {
    case 'jouer':
      jouer(action.note, velocite);
      actionsTenues[pad] = () => arreter(action.note);
      break;
    case 'octave-haut':
      b.transpo = Math.min(OCTAVES_MAXI * 12, b.transpo + 12);
      break;
    case 'octave-bas':
      b.transpo = Math.max(-OCTAVES_MAXI * 12, b.transpo - 12);
      break;
    case 'vitesse':
      b.vitesse = b.vitesse === 2 ? 1 : 2;
      break;
    case 'arpege':
      basculerArpege();
      break;
    case 'muet':
      b.muet = !b.muet;
      appliquerReglage(b, 'volume');
      break;
    case 'coupure':
      b.volumeBoucle.gain.setTargetAtTime(0, t, 0.01);
      actionsTenues[pad] = () => appliquerReglage(b, 'volume');
      break;
    case 'reverb-max':
      b.envoiReverb.gain.setTargetAtTime(1, t, 0.05);
      actionsTenues[pad] = () => appliquerReglage(b, 'reverb');
      break;
    case 'delay-max':
      b.envoiDelay.gain.setTargetAtTime(0.8, t, 0.02);
      b.retour.gain.setTargetAtTime(0.75, t, 0.02);
      actionsTenues[pad] = () => appliquerReglage(b, 'delay');
      break;
    case 'filtre-ferme':
      b.entree.frequency.setTargetAtTime(250, t, 0.08);
      actionsTenues[pad] = () => appliquerReglage(b, 'filtre');
      break;
  }
  // L'écran du MiniLab rappelle l'action (sauf pour les notes jouées, trop fréquentes)
  if (action.type !== 'jouer') {
    const sorte = CATALOGUE_ACTIONS[action.type].sorte;
    const octaves = b.transpo / 12;
    annoncerSurMiniLab(libelleAction(action).replace(' (tenir)', ''),
      sorte === 'compteur' ? 'Octave ' + (octaves > 0 ? '+' : '') + octaves :
      sorte === 'maintien' ? '(tenir le pad)' : actionActive(action, pad) ? 'active' : 'desactive');
  }
  afficher();
}

function relacherAction(pad) {
  const defaire = actionsTenues[pad];
  delete actionsTenues[pad];
  if (defaire) defaire();
  afficher();
}

// Clic sur le bouton central : passe du mode « 4 boucles + 4 actions » au mode « 8 actions »
function basculerHuitActions() {
  modeHuitActions = !modeHuitActions;
  for (const pad in actionsTenues) relacherAction(pad);   // rien ne doit rester bloqué
  signalerChangementDeMode();                              // éclair blanc sur les pads (minilab.js)
  document.body.classList.toggle('mode-huit', modeHuitActions);   // les boucles s'estompent à l'écran
  annoncerSurMiniLab(modeHuitActions ? 'Mode 8 actions' : 'Mode boucles',
    modeHuitActions ? 'pads 1-8 = actions' : 'pads 1-4 = boucles');
  afficher();
}

// --- Page « Réglages des pads » (menu Édition) ------------------------------
function ouvrirReglagesPads() {
  const i = familleActive;
  const optionsActions = Object.entries(CATALOGUE_ACTIONS)
    .map(([type, c]) => '<option value="' + type + '">' + c.nom + '</option>').join('');
  const optionsNotes = Array.from({ length: 49 }, (_, k) => 36 + k)
    .map(n => '<option value="' + n + '">' + nomNote(n) + '</option>').join('');
  const lignes = options.actionsPads[i].map((action, k) =>
    '<div class="ligne-reglage-pad"><span>Action ' + (k + 1) + ' — pad ' + (k < 4 ? k + 5 : (k - 3) + ' (mode 8)') + '</span>' +
    '<select id="type-' + k + '">' + optionsActions + '</select>' +
    '<select id="note-' + k + '">' + optionsNotes + '</select></div>'
  ).join('');
  montrerDialogue('Réglages des pads — ' + familles[i].nom,
    '<p>Choisissez l’action de chaque pad pour la famille <b>' + familles[i].nom + '</b>. ' +
    'Les actions 5 à 8 s’obtiennent en mode 8 actions : bouton « 8 actions » à l’écran, ou clic du bouton central du MiniLab.</p>' + lignes,
    [
      { libelle: 'Valeurs par défaut', action: () => {
        options.actionsPads[i] = JSON.parse(JSON.stringify(ACTIONS_PAR_DEFAUT[i]));
        sauvegarderOptions();
        afficher();
      }},
      { libelle: 'Fermer' },
    ]);
  options.actionsPads[i].forEach((action, k) => {
    const type = document.getElementById('type-' + k);
    const note = document.getElementById('note-' + k);
    type.value = action.type;
    note.value = action.note || 48;
    note.hidden = action.type !== 'jouer';
    const enregistrer = () => {
      note.hidden = type.value !== 'jouer';
      options.actionsPads[i][k] = type.value === 'jouer' ? { type: 'jouer', note: Number(note.value) } : { type: type.value };
      sauvegarderOptions();
      afficher();
    };
    type.onchange = enregistrer;
    note.onchange = enregistrer;
  });
}
