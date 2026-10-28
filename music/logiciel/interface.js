// =============================================================================
//  Astrellia — l'écran : une copie du MiniLab
// =============================================================================
// L'écran montre ce qui se passe (comme un tableau de bord) et permet quelques choix au clic :
// la famille, la boucle sélectionnée, l'instrument d'une boucle. Sans clavier MIDI, on joue
// aussi sur ses pads, potards et faders, et sur le clavier à l'écran (tactile.js).
//
//   en-tête  : titre + les 4 familles en onglets de couleur
//   mesure   : la jauge (voir mesure.js)
//   pads     : les 8 pads, rangés comme sur le clavier (boucles à gauche, actions à droite)
//   potards  : les 8 potards ronds de la boucle sélectionnée
//   faders   : le volume des 4 familles, plus celui de la boucle sélectionnée

const COULEURS_ECRAN = ['#f97316', '#3b82f6', '#a855f7', '#14b8a6'];   // Rythme, Basse, Nappes, Mélodie
const ETIQUETTES_ETATS = {
  vide: 'Vide', pret: 'Prêt', enregistrement: 'Rec', lecture: 'Lecture', arret: 'Arrêt',
};
let dernierPads = '';

// Le nom de l'instrument d'une boucle, avec « chargement… » le temps que ses sons arrivent
function nomInstrument(f, b) {
  const id = instrumentDe(f, b);
  const enAttente = !instruments[id] && !tampons[id];
  return infoInstrument(id).nom + (enAttente ? ' (chargement…)' : '');
}

// Tout ce qui change quand on agit : familles, pads, potards, faders
function afficher() {
  planifierSauvegarde();           // chaque changement visible est aussi sauvegardé
  afficherFamilles();
  afficherActions();
  afficherReglages();
  afficherFaders();
}

// --- Les familles : 4 onglets de couleur --------------------------------------
function afficherFamilles() {
  document.getElementById('familles').innerHTML = familles.map((f, i) => {
    const enLecture = f.boucles.filter(b => b.etat === 'lecture').length;
    return '<button class="onglet' + (i === familleActive ? ' actif' : '') + '" style="--c:' + COULEURS_ECRAN[i] + '" ' +
      'onclick="choisirFamille(' + i + ')">' + f.nom +
      (enLecture ? '<span class="pastille">' + enLecture + '</span>' : '') + '</button>';
  }).join('');
}

// --- Les 8 pads ------------------------------------------------------------------
// (le nom « afficherActions » est gardé : minilab.js l'appelle 20 fois par seconde ;
//  on ne redessine que si quelque chose a changé)
function afficherActions() {
  if (!audio) return;
  const f = familles[familleActive];
  const couleur = COULEURS_ECRAN[familleActive];
  const html = [0, 1, 2, 3, 4, 5, 6, 7].map(pad => {
    const numeroAction = actionDuPad(pad);
    if (numeroAction === null) return tuileBoucle(f, pad);
    const action = actionsDeLaFamille()[numeroAction];
    const genre = action && action.type !== 'rien' && action.type !== 'jouer' ? CATALOGUE_ACTIONS[action.type].sorte : '';
    const decalage = boucleSelectionnee().transpo / 12;
    const sorte = !action || action.type === 'rien' ? '' : action.type === 'jouer' ? 'note' :
      genre === 'maintien' ? 'tenir' :
      genre === 'compteur' ? 'octave ' + (decalage > 0 ? '+' : '') + decalage : 'bascule';
    return '<div class="pad action' + (actionActive(action, pad) ? ' active' : '') + '" style="--c:' + couleur + '">' +
      '<span class="num">' + numeroPad(pad) + '</span>' +
      '<span class="nom">' + libelleAction(action).replace(' (tenir)', '') + '</span>' +
      '<span class="sorte">' + sorte + '</span></div>';
  }).join('');
  const zone = document.getElementById('pads');
  zone.classList.toggle('mode-huit', modeHuitActions);
  document.getElementById('badge-mode').hidden = !modeHuitActions;
  document.getElementById('bouton-huit').textContent = modeHuitActions ? '← Boucles' : '8 actions';
  if (html === dernierPads) return;
  dernierPads = html;
  zone.innerHTML = html;
}

const numeroPad = pad => 'PAD ' + String(pad + 1).padStart(2, '0');

function tuileBoucle(f, pad) {
  const b = f.boucles[pad];
  const selection = pad === f.selection ? ' selection' : '';
  // la durée jouée, en secondes (la 1re boucle est la plus longue possible)
  const duree = b.duree && (b.etat === 'lecture' || b.etat === 'arret')
    ? '<span class="duree">' + b.duree.toFixed(1).replace('.', ',') + ' s</span>' : '';
  return '<div class="pad boucle etat-' + b.etat + selection + '" style="--c:' + COULEURS_ECRAN[familleActive] + '" onclick="selectionner(' + pad + ')">' +
    '<span class="num">' + numeroPad(pad) + '</span>' +
    // au doigt, l'appui long du MiniLab ne se devine pas : un bouton pour effacer la boucle (tactile.js)
    (b.etat !== 'vide' ? '<button class="effacer" title="Effacer la boucle" onclick="event.stopPropagation(); effacerPad(' + pad + ')">✕</button>' : '') +
    '<span class="etat">' + ETIQUETTES_ETATS[b.etat] + '</span>' + duree +
    '<button class="instrument" onclick="event.stopPropagation(); ouvrirChoixInstrument(' + pad + ')">' +
    nomInstrument(f, b) + '</button>' +
    '<span class="avance"><span id="avance-' + pad + '"></span></span></div>';   // animée par mesure.js
}

// Nom et valeur lisible d'un réglage (pour l'écran du MiniLab)
const NOMS_REGLAGES = {
  filtre: 'Filtre', reverb: 'Réverb', chorus: 'Chorus', delay: 'Delay',
  saturation: 'Saturation', grain: 'Grain', attaque: 'Attaque', mouvement: 'Mouvement',
};
function texteReglage(b, nom) {
  const v = b.reglages[nom];
  if (nom === 'filtre') return Math.round(80 * Math.pow(12000 / 80, v / 127)) + ' Hz';
  if (nom === 'attaque') return attaqueDe(b).toFixed(2) + ' s';
  return Math.round(v / 127 * 100) + ' %';
}

// --- Les 8 potards ronds ---------------------------------------------------------
// Un arc de 270° se remplit avec la valeur, et l'aiguille du capuchon la montre, comme un vrai bouton.
function arc(valeur) {
  const r = 26, centre = 32, debut = 135, fin = debut + 270 * valeur / 127;
  const point = a => [centre + r * Math.cos(a * Math.PI / 180), centre + r * Math.sin(a * Math.PI / 180)];
  const [x1, y1] = point(debut), [x2, y2] = point(fin);
  const grand = fin - debut > 180 ? 1 : 0;
  const fond = 'M' + point(135).join(' ') + ' A' + r + ' ' + r + ' 0 1 1 ' + point(405).join(' ');
  const plein = valeur > 0 ? 'M' + x1 + ' ' + y1 + ' A' + r + ' ' + r + ' 0 ' + grand + ' 1 ' + x2 + ' ' + y2 : '';
  const [ax, ay] = [centre + 16 * Math.cos(fin * Math.PI / 180), centre + 16 * Math.sin(fin * Math.PI / 180)];
  return '<svg viewBox="0 0 64 64"><path class="fond" d="' + fond + '"/>' +
    (plein ? '<path class="plein" d="' + plein + '"/>' : '') +
    '<circle class="capuchon" cx="32" cy="32" r="19"/>' +
    '<line class="aiguille" x1="' + (centre + 6 * Math.cos(fin * Math.PI / 180)) + '" y1="' + (centre + 6 * Math.sin(fin * Math.PI / 180)) +
    '" x2="' + ax + '" y2="' + ay + '"/></svg>';
}

function afficherReglages() {
  if (!audio) return;
  const f = familles[familleActive];
  const b = boucleSelectionnee();
  const r = b.reglages;
  const pc = v => Math.round(v / 127 * 100) + ' %';
  const potards = [
    ['Filtre', Math.round(80 * Math.pow(12000 / 80, r.filtre / 127)) + ' Hz', r.filtre],
    ['Réverb', pc(r.reverb), r.reverb],
    ['Chorus', pc(r.chorus), r.chorus],
    ['Delay', pc(r.delay), r.delay],
    ['Saturation', pc(r.saturation), r.saturation],
    ['Grain', pc(r.grain), r.grain],
    ['Attaque', attaqueDe(b).toFixed(2) + ' s', r.attaque],
    ['Mouvement', pc(r.mouvement), r.mouvement],
  ];
  afficherEcran(f, b);
  document.getElementById('potards').style.setProperty('--c', COULEURS_ECRAN[familleActive]);
  document.getElementById('potards').innerHTML = potards.map(([nom, texte, v], i) =>
    '<div class="potard"><div class="cadran">' + arc(v) + '<span class="n">' + (i + 1) + '</span></div>' +
    '<span class="nom">' + nom + '</span><span class="valeur">' + texte + '</span></div>'
  ).join('');
}

// --- L'écran : ce que le MiniLab afficherait ---------------------------------------
function afficherEcran(f, b) {
  document.getElementById('ecran').style.setProperty('--c', COULEURS_ECRAN[familleActive]);   // couleur des flèches ‹ ›
  document.getElementById('ecran').innerHTML =
    '<span class="famille" style="color:' + COULEURS_ECRAN[familleActive] + '">' + f.nom + '</span>' +
    // ‹ › : au doigt, choisir la boucle à régler sans la frapper (tactile.js)
    '<span class="ligne">Pad <button class="choix-pad" onclick="choisirBoucle(-1)" title="Boucle précédente">‹</button><b>' + b.numero +
    '</b><button class="choix-pad" onclick="choisirBoucle(1)" title="Boucle suivante">›</button> · ' + ETIQUETTES_ETATS[b.etat] + '</span>' +
    '<span class="instru">' + nomInstrument(f, b) + '</span>' +
    (modeHuitActions ? '<span class="mode">Mode 8 actions</span>' : '');
}

// --- Les faders (4 familles, à droite) et la bande tactile (volume de la boucle, à gauche) ---
function afficherFaders() {
  if (!audio) return;
  const b = boucleSelectionnee();
  document.getElementById('faders').innerHTML = familles.map((f, i) =>
    '<div class="fader" title="' + f.nom + ' (fader ' + (i + 1) + ')"><div class="rail"><div class="niveau" style="height:' +
    Math.round(f.volume / 127 * 100) + '%;background:' + COULEURS_ECRAN[i] + '"></div></div><span>' + (i + 1) + '</span></div>'
  ).join('');
  document.getElementById('bande').innerHTML =
    '<div class="niveau" style="height:' + Math.round(b.reglages.volume / 127 * 100) + '%"></div>';
}
