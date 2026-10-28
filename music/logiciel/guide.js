// =============================================================================
//  Astrellia — le guide : toutes les fonctions, chapitre par chapitre
// =============================================================================
// Aide › Guide… propose des chapitres (premiers pas, jeu au doigt, boucles, réglages…).
// Pendant un chapitre, une bulle dit quoi faire, une étape à la fois, et un anneau entoure
// l'endroit où agir. Une étape « à faire » passe toute seule dès que l'action est faite ;
// une étape qui explique seulement a un bouton « Suivant ».
// Le chapitre « Premiers pas » s'ouvre tout seul à la toute première ouverture d’Astrellia.
// Dans une fenêtre (Sampleur, Clavier MIDI…), la bulle se range en haut de la fenêtre et la
// cible est soulignée en jaune (une fenêtre passe toujours au-dessus du reste de la page).
// Avec un MiniLab 3 branché (profil d'origine), la bulle montre un petit schéma du clavier où la
// commande à utiliser est allumée (« minilab » dans l'étape : la liste des commandes à allumer).

let guide = null;                      // { chapitre, etapes, etape, memo } pendant un chapitre

const el = id => document.getElementById(id);
const boucleChoisie = () => boucleSelectionnee();
const toucherOuFrapper = () => modeTactileActif ? 'Touchez' : 'Frappez';

// L'étape « Démarrer », ajoutée en tête de chapitre tant que le son n'est pas allumé
const ETAPE_DEMARRER = {
  cible: () => el('demarrer'),
  texte: () => 'Touchez <b>▶ Démarrer</b> pour allumer le son.',
  faite: () => !!audio,
};

const CHAPITRES = [
  { titre: 'Premiers pas', resume: 'Première note, première boucle, deux boucles ensemble', etapes: [
    {
      cible: () => modeTactileActif ? el('touches') : null,
      texte: () => modeTactileActif
        ? 'Jouez quelques notes sur le clavier, en bas. Plusieurs doigts à la fois font un accord.'
        : 'Jouez quelques notes sur votre clavier MIDI.',
      debut: m => { m.notes = notesJouees; },
      faite: m => notesJouees - m.notes >= 4,
      minilab: () => ['touches'],
    },
    {
      cible: m => el('pads').children[m.pad],
      minilab: m => ['pad' + (m.pad + 1)],
      texte: m => toucherOuFrapper() + ' le <b>pad ' + (m.pad + 1) + '</b> : il passe en « Prêt » et attend votre première note pour enregistrer une boucle.',
      debut: m => {
        m.famille = familleActive;
        const vide = familles[familleActive].boucles.findIndex(b => b.etat === 'vide');
        m.pad = vide < 0 ? 0 : vide;
      },
      faite: m => ['pret', 'enregistrement', 'lecture'].includes(familles[m.famille].boucles[m.pad].etat),
    },
    {
      cible: () => modeTactileActif ? el('touches') : null,
      texte: m => 'Jouez une petite mélodie : l’enregistrement démarre à la première note. Quand vous avez fini, ' +
        toucherOuFrapper().toLowerCase() + ' de nouveau le <b>pad ' + (m.pad + 1) + '</b>.',
      faite: m => familles[m.famille].boucles[m.pad].etat === 'lecture',
      minilab: m => ['touches', 'pad' + (m.pad + 1)],
    },
    {
      cible: () => el('familles'),
      texte: () => 'Bravo, votre boucle tourne ! Pour en ajouter une par-dessus, choisissez une autre famille ' +
        '(par exemple <b>Rythme</b>), puis enregistrez un pad de la même façon.',
      faite: m => toutesLesBoucles().some(({ b }) => b.etat === 'lecture' && b !== familles[m.famille].boucles[m.pad]),
    },
    { cible: () => null, texte: () => 'Deux boucles qui tournent ensemble : vous savez l’essentiel ! La suite dans les autres chapitres du guide.' },
  ] },

  { titre: 'Jouer au doigt', resume: 'Accords, glissando, force, octaves, vibrato', etapes: [
    {
      cible: () => el('touches'),
      texte: () => 'Posez deux ou trois doigts en même temps sur des touches : c’est un accord.',
      faite: () => Object.keys(notesEnCours).length >= 2,
    },
    { cible: () => el('touches'), texte: () => 'La force dépend de l’endroit touché : <b>bas de la touche = fort</b>, haut = doux.' },
    {
      cible: () => el('touches'),
      texte: () => '<b>Glissando</b> : posez un doigt et faites-le glisser sur plusieurs touches, sans le lever.',
      debut: m => { m.notes = notesJouees; },
      faite: m => notesJouees - m.notes >= 5,
    },
    {
      cible: () => el('octaves'),
      texte: () => 'Touchez <b>Oct +</b> ou <b>Oct −</b> : le clavier monte ou descend d’une octave.',
      debut: m => { m.octave = decalageOctave; },
      faite: m => decalageOctave !== m.octave,
    },
    {
      cible: () => el('bande-vibrato'),
      texte: () => '<b>Vibrato</b> : tenez une note d’un doigt, et d’un 2e doigt posé sur la bande <b>Vibrato</b>, balancez de haut en bas.',
      faite: () => !!vibrato && Math.abs(vibrato.lisse) > 0.3,
    },
    { cible: () => el('bande-vibrato'), texte: () => 'La note ondule comme une corde. En levant le doigt de la bande, elle revient juste.' },
  ] },

  { titre: 'Les boucles', resume: 'Choisir, changer d’instrument, couper, effacer', etapes: [
    {
      cible: () => el('ecran'),
      texte: () => modeTactileActif
        ? 'Les flèches <b>‹ ›</b> à côté de « Pad » choisissent la boucle à régler, sans la lancer ni la couper. Essayez.'
        : 'Shift + clic du bouton central choisit la boucle à régler, sans la lancer ni la couper. Essayez.',
      minilab: () => ['shift', 'centre'],
      debut: m => { m.selection = familles[familleActive].selection; },
      faite: m => familles[familleActive].selection !== m.selection,
    },
    {
      cible: () => el('pads').children[familles[familleActive].selection]?.querySelector('.instrument'),
      texte: () => modeTactileActif
        ? 'Touchez le <b>nom de l’instrument</b> de la boucle (cadre jaune), puis choisissez-en un autre dans la liste.'
        : 'Tenez <b>Shift</b> et tournez le bouton central : l’instrument de la boucle change (ou cliquez son nom à l’écran).',
      minilab: () => ['shift', 'centre'],
      debut: m => { m.instrument = instrumentDe(familles[familleActive], boucleChoisie()); },
      faite: m => instrumentDe(familles[familleActive], boucleChoisie()) !== m.instrument,
    },
    { cible: () => el('pads'), minilab: () => ['pad1', 'pad2', 'pad3', 'pad4'], texte: () => 'Une boucle qui tourne : ' + toucherOuFrapper().toLowerCase() + ' son pad pour la <b>couper</b>, encore une fois pour la <b>relancer</b>, calée sur les autres.' },
    { cible: () => el('pads'), texte: () => 'Le bouton <b>✕</b> d’un pad efface sa boucle (ou annule l’enregistrement). Tenir un pad ' + options.appuiLong + ' s l’efface et réenregistre tout de suite.' },
    { cible: () => el('mesure'), texte: () => 'La <b>première boucle</b> fixe la mesure : les suivantes se calent dessus. La jauge montre où en est la mesure.' },
  ] },

  { titre: 'Les réglages', resume: 'Potards, volumes des familles, volume d’une boucle', etapes: [
    {
      cible: () => el('potards'),
      texte: () => 'Les 8 <b>potards</b> règlent la boucle sélectionnée (filtre, réverb, chorus…). ' +
        (modeTactileActif ? 'Glissez-en un vers le haut ou le bas.' : 'Tournez-en un.'),
      minilab: () => [1, 2, 3, 4, 5, 6, 7, 8].map(i => 'potard' + i),
      debut: m => { m.reglages = JSON.stringify(boucleChoisie().reglages); },
      faite: m => JSON.stringify(boucleChoisie().reglages) !== m.reglages,
    },
    {
      cible: () => el('faders'),
      texte: () => 'Les 4 <b>faders</b> règlent le volume de chaque famille. ' +
        (modeTactileActif ? 'Posez le doigt sur l’un d’eux à la hauteur voulue.' : 'Montez ou descendez-en un.'),
      minilab: () => ['fader1', 'fader2', 'fader3', 'fader4'],
      debut: m => { m.volumes = familles.map(f => f.volume).join(); },
      faite: m => familles.map(f => f.volume).join() !== m.volumes,
    },
    {
      cible: () => el('bande'),
      texte: () => modeTactileActif
        ? 'La bande verte, à gauche, règle le volume de la seule boucle sélectionnée.'
        : 'La bande tactile de droite du MiniLab règle le volume de la seule boucle sélectionnée.',
      minilab: () => ['bandeD'],
      debut: m => { m.volume = boucleChoisie().reglages.volume; },
      faite: m => boucleChoisie().reglages.volume !== m.volume,
    },
    { cible: () => el('barre-menus'), texte: () => 'Le volume général est dans <b>Fichier › Options</b>.' },
  ] },

  { titre: '8 actions et arpège', resume: 'Les pads d’action, l’arpégiateur', etapes: [
    { cible: () => el('pads'), minilab: () => ['pad5', 'pad6', 'pad7', 'pad8'], texte: () => 'Les pads 5 à 8 sont des <b>actions</b> de la famille : octave, vitesse, écho, notes…' },
    {
      cible: () => modeTactileActif ? el('bouton-huit') : null,
      texte: () => modeTactileActif ? 'Touchez <b>8 actions</b> : les 8 pads deviennent des actions.' : 'Cliquez le bouton central : les 8 pads deviennent des actions.',
      faite: () => modeHuitActions,
      minilab: () => ['centre'],
    },
    { cible: () => el('pads'), texte: () => 'En mode 8 actions, Basse, Nappes et Mélodie ont un pad <b>Arpège</b> : tenez un accord, il est joué note par note, en rythme.' },
    {
      cible: () => modeTactileActif ? el('bouton-huit') : null,
      texte: () => modeTactileActif ? 'Touchez <b>← Boucles</b> pour revenir.' : 'Cliquez de nouveau le bouton central pour revenir.',
      faite: () => !modeHuitActions,
      minilab: () => ['centre'],
    },
    { cible: () => el('barre-menus'), texte: () => 'Choisir l’action de chaque pad : <b>Édition › Réglages des pads</b>. Régler l’arpège : <b>Édition › Arpégiateur</b>.' },
  ] },

  { titre: 'Le sampleur', resume: 'Enregistrer votre voix, la jouer au clavier', etapes: [
    {
      cible: () => el('barre-menus'),
      texte: () => 'Ouvrez <b>Édition › Sampleur (mes sons)…</b>',
      faite: () => !!el('sampleur'),
    },
    { cible: () => el('sampleur-rec') || el('sampleur-stop'), texte: () => '<b>● Enregistrer au micro</b> : dites ou jouez un son, puis <b>■ Arrêter</b>. Ou <b>Importer un fichier</b> (WAV, MP3…).' },
    { cible: () => el('son-racine'), texte: () => 'La <b>note d’origine</b> est la touche où le son est joué tel quel ; elle est détectée toute seule. Loin d’elle, le son devient plus aigu ou plus grave.' },
    { cible: () => el('son-boucle'), texte: () => '<b>Tenir</b> : le son dure tant que la touche est enfoncée. Décochez pour un son joué une seule fois (percussion).' },
    { cible: () => el('son-utiliser'), texte: () => '<b>Utiliser pour la boucle sélectionnée</b>, ou choisissez le son dans la liste des instruments d’un pad, catégorie « Mes sons ».' },
  ] },

  { titre: 'Un autre clavier MIDI', resume: 'Profils et apprentissage des commandes', etapes: [
    { cible: () => null, texte: () => 'Astrellia fonctionne avec n’importe quel clavier MIDI. Le MiniLab 3 est reconnu tout seul ; un autre clavier prend le profil « Générique ».' },
    {
      cible: () => el('barre-menus'),
      texte: () => 'Ouvrez <b>Édition › Clavier MIDI…</b>',
      faite: () => !!el('mapping'),
    },
    { cible: () => el('profil-nouveau'), texte: () => '<b>Nouveau (copie)</b> crée votre propre profil, à partir de celui affiché.' },
    { cible: () => document.querySelector('[data-apprendre]'), texte: () => '<b>Apprendre</b> à côté d’une fonction, puis bougez la commande sur votre clavier : elle est retenue. Une commande assignée ne joue plus de note.' },
    { cible: () => document.querySelector('select[data-port]') || el('profil-edite'), texte: () => 'Sous « Claviers branchés », choisissez le profil que suit chaque clavier.' },
  ] },

  { titre: 'Sauvegarder ses sessions', resume: 'Garder et rouvrir ses boucles', etapes: [
    { cible: () => el('bouton-sauver'), texte: () => '<b>Sauvegarder</b> garde toutes vos boucles dans un fichier .boucles (sur iPhone : « Enregistrer dans Fichiers »).' },
    { cible: () => el('barre-menus'), texte: () => '<b>Fichier › Ouvrir</b> rouvre une session ; <b>Fichier › Nouvelle session</b> repart de zéro. Vos boucles sont aussi gardées d’une ouverture à l’autre.' },
    { cible: () => null, texte: () => 'Les sons du sampleur restent sur l’appareil : ouverte sur un autre appareil, une boucle qui les utilise reprend l’instrument de sa famille.' },
  ] },
];

// --- Le schéma du MiniLab 3 ---------------------------------------------------------
// Vu de dessus, simplifié : bandes tactiles, écran et bouton central, Shift, 8 potards, 4 faders,
// 8 pads, 25 touches. Les commandes de la liste « allumees » brillent en jaune.
function miniLabBranche() {
  return !modeTactileActif && clavierBranches().some(p => profilDuPort(p.name).integre);
}

function schemaMiniLab(allumees) {
  const on = nom => allumees.includes(nom) ? ' class="allume"' : '';
  let svg = '<svg class="schema-minilab" viewBox="0 0 300 124" aria-label="Schéma du MiniLab 3">' +
    '<rect x="1" y="1" width="298" height="122" rx="8" class="corps"/>' +
    '<rect x="8" y="10" width="7" height="50" rx="3"' + on('bandeG') + '/><rect x="19" y="10" width="7" height="50" rx="3"' + on('bandeD') + '/>' +
    '<rect x="34" y="10" width="38" height="20" rx="2" class="ecran"/>' +
    '<circle cx="86" cy="20" r="9"' + on('centre') + '/>' +
    '<rect x="34" y="36" width="22" height="10" rx="2"' + on('shift') + '/><text x="45" y="43.5">Shift</text>';
  for (let i = 0; i < 8; i++) svg += '<circle cx="' + (112 + (i % 4) * 18) + '" cy="' + (i < 4 ? 15 : 35) + '" r="6"' + on('potard' + (i + 1)) + '/>';
  for (let i = 0; i < 4; i++) svg += '<rect x="' + (196 + i * 22) + '" y="8" width="10" height="44" rx="2"' + on('fader' + (i + 1)) + '/>';
  for (let i = 0; i < 8; i++) svg += '<rect x="' + (34 + i * 33) + '" y="56" width="28" height="14" rx="3"' + on('pad' + (i + 1)) + '/>';
  svg += '<g' + on('touches') + '>';
  for (let i = 0; i < 15; i++) svg += '<rect x="' + (8 + i * 19) + '" y="78" width="18" height="40" rx="1" class="blanche"/>';
  for (let i = 0; i < 14; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) svg += '<rect x="' + (20 + i * 19) + '" y="78" width="12" height="24" rx="1" class="noire"/>';
  return svg + '</g></svg>';
}

// --- Le choix du chapitre (Aide › Guide…) -------------------------------------------
function ouvrirGuide() {
  const vus = options.chapitresVus || [];
  montrerDialogue('Guide',
    '<p class="note">Choisissez un chapitre : une bulle vous guide pas à pas, directement dans Astrellia.</p>' +
    '<div class="chapitres-guide">' + CHAPITRES.map((c, i) =>
      '<button data-chapitre="' + i + '"><b>' + (vus.includes(i) ? '✓ ' : '') + (i + 1) + '. ' + c.titre + '</b><span>' + c.resume + '</span></button>').join('') +
    '</div>', [{ libelle: 'Fermer' }]);
  dialogue.querySelectorAll('[data-chapitre]').forEach(b => b.onclick = () => {
    dialogue.close();
    lancerGuide(Number(b.dataset.chapitre));
  });
}

// --- Un chapitre en cours --------------------------------------------------------------
function lancerGuide(chapitre = 0) {
  arreterGuide();
  const etapes = (audio ? [] : [ETAPE_DEMARRER]).concat(CHAPITRES[chapitre].etapes);
  guide = { chapitre, etapes, etape: -1, memo: {} };
  document.body.insertAdjacentHTML('beforeend',
    '<div id="anneau-guide" hidden></div>' +
    '<div id="bulle-guide" role="dialog" aria-live="polite"><span class="etape"></span><p></p>' +
    '<div class="boutons-guide"><button id="guide-quitter">Quitter</button><button id="guide-suivant">Suivant</button>' +
    '<button id="guide-chapitres">Autres chapitres</button><button id="guide-fin">Terminer</button></div></div>');
  // la bulle et l'anneau sont gardés ici : une fenêtre qui se redessine peut les détacher de la page
  guide.bulle = el('bulle-guide');
  guide.anneau = el('anneau-guide');
  el('guide-quitter').onclick = () => finirGuide(false);
  el('guide-suivant').onclick = etapeSuivante;
  el('guide-chapitres').onclick = () => { finirGuide(true); ouvrirGuide(); };
  el('guide-fin').onclick = () => finirGuide(true);
  etapeSuivante();
  guide.minuteur = setInterval(suivreGuide, 200);
}

const etapeActuelle = () => guide.etapes[guide.etape];
const derniere = () => guide.etape === guide.etapes.length - 1;

// On passe les étapes « à faire » déjà faites (son déjà allumé, par exemple)
function etapeSuivante() {
  do {
    guide.etape++;
    const etape = etapeActuelle();
    if (etape.debut) etape.debut(guide.memo);
    if (!etape.faite || !etape.faite(guide.memo)) break;
  } while (!derniere());
  const etape = etapeActuelle();
  const bulle = guide.bulle;
  bulle.querySelector('.etape').textContent = CHAPITRES[guide.chapitre].titre + ' · ' + (guide.etape + 1) + ' / ' + guide.etapes.length;
  bulle.querySelector('p').innerHTML = etape.texte(guide.memo) +
    (etape.minilab && miniLabBranche() ? schemaMiniLab(etape.minilab(guide.memo)) : '');
  const bouton = nom => bulle.querySelector('#guide-' + nom);
  bouton('suivant').hidden = !!etape.faite || derniere();
  bouton('quitter').hidden = derniere();
  bouton('chapitres').hidden = bouton('fin').hidden = !derniere();
  placerGuide();
}

function suivreGuide() {
  if (!guide) return;
  const etape = etapeActuelle();
  if (etape.faite && !derniere() && etape.faite(guide.memo)) etapeSuivante();
  else placerGuide();                  // la cible a pu bouger (fenêtre, pads redessinés…)
}

// L'anneau entoure la cible ; la bulle se place juste au-dessus ou en dessous, sans sortir de l'écran.
// Dans une fenêtre ouverte, la bulle se range en haut de la fenêtre et la cible est soulignée.
function placerGuide() {
  const bulle = guide.bulle, anneau = guide.anneau;
  if (!anneau.isConnected) document.body.appendChild(anneau);
  document.querySelectorAll('.cible-guide').forEach(e => e.classList.remove('cible-guide'));
  const cible = etapeActuelle().cible(guide.memo);
  if (dialogue.open) {
    if (bulle.parentElement !== dialogue) dialogue.prepend(bulle);
    bulle.classList.add('dans-fenetre');
    bulle.style.left = bulle.style.top = '';
    anneau.hidden = true;
    if (cible && dialogue.contains(cible)) cible.classList.add('cible-guide');
    return;
  }
  if (bulle.parentElement !== document.body) document.body.appendChild(bulle);
  bulle.classList.remove('dans-fenetre');
  const cadre = cible && !cible.hidden && cible.getBoundingClientRect();
  const largeurBulle = bulle.offsetWidth, hauteurBulle = bulle.offsetHeight;
  if (!cadre || !cadre.width) {
    anneau.hidden = true;
    bulle.style.left = (innerWidth - largeurBulle) / 2 + 'px';
    bulle.style.top = (innerHeight - hauteurBulle) / 2 + 'px';
    return;
  }
  anneau.hidden = false;
  Object.assign(anneau.style, { left: cadre.left - 6 + 'px', top: cadre.top - 6 + 'px', width: cadre.width + 12 + 'px', height: cadre.height + 12 + 'px' });
  const enDessous = cadre.bottom + 14 + hauteurBulle < innerHeight;
  const auDessus = cadre.top - 14 - hauteurBulle > 0;
  const top = enDessous ? cadre.bottom + 14 : auDessus ? cadre.top - 14 - hauteurBulle : (innerHeight - hauteurBulle) / 2;
  if (!enDessous && !auDessus && cadre.left > largeurBulle + 20) {          // ni dessus ni dessous : à côté
    bulle.style.left = cadre.left - largeurBulle - 14 + 'px';
  } else {
    bulle.style.left = Math.max(8, Math.min(innerWidth - largeurBulle - 8, cadre.left + cadre.width / 2 - largeurBulle / 2)) + 'px';
  }
  bulle.style.top = Math.max(8, top) + 'px';
}

function arreterGuide() {
  if (!guide) return;
  clearInterval(guide.minuteur);
  guide.bulle.remove();
  guide.anneau.remove();
  guide = null;
  document.querySelectorAll('.cible-guide').forEach(e => e.classList.remove('cible-guide'));
}

// Un chapitre terminé est coché dans la liste ; le guide ne s'ouvre plus tout seul après le 1er
function finirGuide(termine) {
  if (guide && termine) {
    options.chapitresVus = [...new Set([...(options.chapitresVus || []), guide.chapitre])];
  }
  arreterGuide();
  options.guideVu = true;
  sauvegarderOptions();
}

window.addEventListener('resize', () => guide && placerGuide());
if (!options.guideVu) lancerGuide(0);  // première ouverture d’Astrellia
