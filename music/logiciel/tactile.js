// =============================================================================
//  RevLoop — jouer au toucher : les pads de l'écran
// =============================================================================
// Sans clavier MIDI, l'écran devient l'instrument. Toucher (ou cliquer) un pad de
// l'écran fait exactement ce que fait le pad du MiniLab : on passe par les mêmes
// fonctions (appuyerPad et relacherPad, moteur.js), donc mêmes états (prêt, rec,
// lecture, arrêt), même appui long pour réenregistrer, mêmes actions des pads 5-8.
//
// Les pads sont redessinés quand leur état change (interface.js) : le pad touché
// peut donc être remplacé pendant qu'on le tient. On suit chaque doigt par son
// numéro (pointerId) et on écoute le relâchement sur toute la page, pas sur le pad.
// Chaque doigt a son propre numéro : on peut tenir plusieurs pads à la fois.

const VELOCITE_ECRAN = 100;          // force de frappe d'un pad touché à l'écran
const doigtsSurPads = new Map();     // pointerId → numéro du pad tenu (0 à 7)

const zonePads = document.getElementById('pads');

// Le pad est-il tenu à l'écran ? (interface.js le dessine alors enfoncé)
const padEnfonce = pad => [...doigtsSurPads.values()].includes(pad);

zonePads.addEventListener('pointerdown', e => {
  if (!audio || e.button !== 0) return;              // pas encore démarré, ou clic droit
  if (e.target.closest('.instrument')) return;       // le nom de l'instrument ouvre la liste (menus.js)
  const tuile = e.target.closest('.pad');
  if (!tuile) return;
  e.preventDefault();                                // ni sélection de texte, ni loupe sur iPhone
  const numero = Number(tuile.dataset.pad);
  if (padEnfonce(numero)) return;                    // déjà tenu par un autre doigt
  doigtsSurPads.set(e.pointerId, numero);
  appuyerPad(numero, VELOCITE_ECRAN);
});

function leverDoigt(e) {
  const numero = doigtsSurPads.get(e.pointerId);
  if (numero === undefined) return;
  doigtsSurPads.delete(e.pointerId);
  relacherPad(numero);
  afficherActions();                                 // le pad remonte tout de suite
}
addEventListener('pointerup', leverDoigt);
addEventListener('pointercancel', leverDoigt);

// La fenêtre perd la main en plein appui (autre application, appel…) : rien ne doit
// rester enfoncé, sinon un effet tenu ou un appui long continuerait tout seul.
addEventListener('blur', () => {
  for (const pointerId of [...doigtsSurPads.keys()]) leverDoigt({ pointerId });
});

// Un appui long ne doit pas ouvrir le menu du navigateur (il sert à réenregistrer)
zonePads.addEventListener('contextmenu', e => e.preventDefault());
