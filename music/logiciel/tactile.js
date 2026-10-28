// =============================================================================
//  Astrellia — jouer au doigt : clavier, pads, potards et faders à l'écran
// =============================================================================
// Sans clavier MIDI, tout se joue sur l'écran. Chaque geste fabrique le même message
// que le MiniLab et passe par recevoir() (moteur.js) : le son, l'enregistrement des
// boucles et l'écran réagissent exactement comme avec le clavier.
// Dès qu'un clavier MIDI est branché, il prend le relais (brancherClaviers, moteur.js) :
// le clavier à l'écran se range (Affichage › Clavier à l'écran pour le rappeler)
// et un clic sur un pad de boucle redevient une simple sélection.
//
//   clavier  : 2 octaves (25 touches, comme le MiniLab), Octave − / +, plusieurs doigts
//              à la fois (accords), on peut glisser d'une touche à l'autre
//   glissando: un doigt qui glisse sur le clavier passe d'une touche à l'autre
//   vibrato  : la bande « Vibrato », à gauche du clavier (comme la bande tactile du MiniLab) :
//              on tient une note d'un doigt, et d'un 2e doigt posé sur la bande, on balance de haut
//              en bas : la note ondule comme une corde (±½ demi-ton, doux et lissé). Pendant ce temps,
//              la touche tenue apparaît en grand (×3,5) au-dessus du clavier, bordée de dents, avec une
//              corde qui vibre d'autant plus que le doigt bouge ; elle suit la note si l'on glisse.
//   force    : plus le doigt est bas sur la touche, plus la note est forte
//              (comme sur un piano, où l'on frappe fort près du bord)
//   pads     : frapper = le pad du MiniLab (appui long = réenregistrer, comme sur le clavier) ;
//              le bouton ✕ d'un pad efface sa boucle, ou annule l'enregistrement en cours
//   potards  : glisser vers le haut ou le bas
//   faders   : poser le doigt à la hauteur voulue (bande de gauche = volume de la boucle)
//   à la place du bouton central : le bouton « 8 actions » (en-tête) et les flèches ‹ › de l'écran,
//              qui choisissent la boucle réglée par les potards sans la frapper

const NOTE_BASSE = 48;                 // la touche la plus grave du clavier, sans décalage
const NB_TOUCHES = 25;
const NOIRES = [1, 3, 6, 8, 10];       // les touches noires dans l'octave (Do# Ré# Fa# Sol# La#)
const ORDRE_POTARDS = ['filtre', 'reverb', 'chorus', 'delay', 'saturation', 'grain', 'attaque', 'mouvement'];
const VELOCITE_PADS = 100;
const VIBRATO_MAXI = 50;               // centièmes de demi-ton : l'ondulation d'une corde, pas un « bend »
const ZONE_MORTE_VIBRATO = 4;          // px : un léger tremblement du doigt ne fait pas onduler la note
const AMPLEUR_VIBRATO = 30;            // px : écart du doigt (sur la bande) pour l'ondulation maximale
const LISSAGE_VIBRATO = 0.35;          // à chaque image (60 par seconde), la note fait 35 % du chemin vers le doigt

let modeTactileActif = true;           // aucun clavier MIDI : on joue à l'écran
let decalageOctave = 0;                // −3 à +3, boutons Octave − / +
const doigtsSurTouches = new Map();    // doigt (pointerId) → note jouée
let vibrato = null;                     // le doigt posé sur la bande Vibrato : { doigt, y, cible, lisse, jeton, touche, loupe… }
const doigtsSurPads = new Map();       // doigt → numéro du pad
const doigtsSurPotards = new Map();    // doigt → { nom, y, reste }
const doigtsSurFaders = new Map();     // doigt → { famille (ou -1 pour la bande), rail() }

// La zone garde le doigt même s'il en sort (sans effet si le navigateur ne connaît pas ce doigt)
function capturer(zone, e) {
  try { zone.setPointerCapture(e.pointerId); } catch (erreur) {}
}

// --- Le clavier ----------------------------------------------------------------
// (les noms des notes, « Do3 » = 60, viennent de actions.js)
function dessinerClavier() {
  const base = NOTE_BASSE + 12 * decalageOctave;
  let blanches = 0;
  let html = '';
  for (let i = 0; i < NB_TOUCHES; i++) {
    const note = base + i;
    if (NOIRES.includes(note % 12)) {
      // une noire est posée à cheval sur la limite entre deux blanches
      html += '<div class="touche noire" data-note="' + note + '" style="left:' + (blanches / 15 * 100) + '%"></div>';
    } else {
      html += '<div class="touche blanche" data-note="' + note + '">' +
        (note % 12 === 0 ? '<span>' + nomNote(note) + '</span>' : '') + '</div>';
      blanches++;
    }
  }
  document.getElementById('touches').innerHTML = html;
  document.getElementById('octave-nom').textContent = nomNote(base) + ' – ' + nomNote(base + NB_TOUCHES - 1);
  document.getElementById('octave-moins').disabled = decalageOctave <= -3;
  document.getElementById('octave-plus').disabled = decalageOctave >= 3;
  for (const note of Object.keys(notesEnCours)) allumerTouche(Number(note), true);
}

function changerOctave(sens) {
  decalageOctave = Math.max(-3, Math.min(3, decalageOctave + sens));
  dessinerClavier();
}

// Une touche s'allume quand elle joue, au doigt comme au clavier MIDI (appelé par recevoir)
function allumerTouche(note, allumee) {
  const touche = document.querySelector('#touches [data-note="' + note + '"]');
  if (!touche) return;
  touche.classList.toggle('enfoncee', allumee);
  touche.style.setProperty('--c', COULEURS_ECRAN[familleActive]);   // la couleur de la famille qui joue
}

// La touche sous le doigt, et la force selon la hauteur du doigt sur la touche
function toucheSous(e) {
  const element = document.elementFromPoint(e.clientX, e.clientY);
  const touche = element && element.closest('#touches .touche');
  if (!touche) return null;
  const cadre = touche.getBoundingClientRect();
  const hauteur = Math.max(0, Math.min(1, (e.clientY - cadre.top) / cadre.height));
  return { note: Number(touche.dataset.note), velocite: Math.round(70 + hauteur * 57) };
}

function lacherNote(doigt) {
  const note = doigtsSurTouches.get(doigt);
  doigtsSurTouches.delete(doigt);
  if (note === undefined || [...doigtsSurTouches.values()].includes(note)) return;   // un autre doigt la tient encore
  recevoir({ data: [0x80, note, 0] });
}

// La grande touche du vibrato : un contour denté et une corde, dessinés en SVG
// (viewBox étirée sur la loupe ; les traits gardent leur épaisseur grâce à non-scaling-stroke)
function contourDente() {
  const points = [];
  const dent = (x, y) => points.push(x.toFixed(1) + ',' + y.toFixed(1));
  for (let x = 4; x <= 96; x += 6) { dent(x, 4); dent(x + 3, 0); }          // haut
  for (let y = 4; y <= 136; y += 6) { dent(96, y); dent(100, y + 3); }      // droite
  for (let x = 96; x >= 4; x -= 6) { dent(x, 136); dent(x - 3, 140); }      // bas
  for (let y = 136; y >= 4; y -= 6) { dent(4, y); dent(0, y - 3); }         // gauche
  return points.join(' ');
}

function ouvrirLoupeVibrato(geste, touche, note) {
  const zone = document.getElementById('touches');
  const cadreZone = zone.getBoundingClientRect(), cadre = touche.getBoundingClientRect();
  const largeur = cadreZone.width / 15 * 3.5;
  const centre = cadre.left + cadre.width / 2 - cadreZone.left;
  const loupe = document.createElement('div');
  loupe.className = 'loupe-vibrato' + (touche.classList.contains('noire') ? ' noire' : '');
  loupe.style.cssText = 'width:' + largeur + 'px;left:' + Math.max(0, Math.min(cadreZone.width - largeur, centre - largeur / 2)) + 'px;' +
    '--c:' + COULEURS_ECRAN[familleActive];
  loupe.innerHTML = '<svg viewBox="0 0 100 140" preserveAspectRatio="none">' +
    '<polygon class="dents" points="' + contourDente() + '" vector-effect="non-scaling-stroke"/>' +
    '<path class="corde" vector-effect="non-scaling-stroke"/></svg>' +
    '<span>' + nomNote(note) + '</span>';
  zone.appendChild(loupe);
  touche.classList.add('vibrato');
  Object.assign(geste, { touche, loupe, corde: loupe.querySelector('.corde') });
}

function fermerLoupeVibrato(geste) {
  if (!geste.loupe) return;
  geste.touche.classList.remove('vibrato');
  geste.loupe.remove();
  geste.touche = geste.loupe = geste.corde = null;
}

// La grande touche montre la dernière note tenue au doigt ; si l'on glisse vers une autre note,
// elle la suit ; si l'on lâche la note, elle disparaît (le vibrato continue sur les notes suivantes)
function placerLoupeVibrato() {
  if (!vibrato) return;
  const notes = [...doigtsSurTouches.values()];
  const note = notes[notes.length - 1];
  const touche = note === undefined ? null : document.querySelector('#touches [data-note="' + note + '"]');
  if (vibrato.touche === touche) return;
  fermerLoupeVibrato(vibrato);
  if (touche) ouvrirLoupeVibrato(vibrato, touche, note);
}

// La corde vibre en onde stationnaire (fixée aux deux bouts) : son amplitude suit le mouvement
// du doigt (l'énergie retombe doucement quand il s'arrête) et elle se tend du côté du pli
function dessinerCorde(geste, mouvement) {
  geste.energie = Math.max(geste.energie * 0.93, Math.min(1, Math.abs(mouvement) * 25 + Math.abs(geste.lisse) * 0.4));
  geste.phase += 0.9;
  if (!geste.corde) return;
  const amplitude = (1 + geste.energie * 14) * Math.sin(geste.phase), decalage = geste.lisse * 8;
  let d = 'M8,' + (90 + decalage).toFixed(1);
  for (let x = 12; x <= 92; x += 4) {
    const y = 90 + decalage * Math.sin(Math.PI * (x - 8) / 84) + amplitude * Math.sin(Math.PI * (x - 8) / 84);
    d += ' L' + x + ',' + y.toFixed(1);
  }
  geste.corde.setAttribute('d', d);
}

// Le décalage du doigt (de −1 à 1) devient un « pitch bend », le même message que la bande du
// MiniLab, mais limité à ±VIBRATO_MAXI (la bande couvre ±COURBURE_MAXI, moteur.js)
function plierAuDoigt(decalage) {
  const cents = Math.max(-1, Math.min(1, decalage)) * VIBRATO_MAXI;
  const valeur = Math.round(8192 + cents / COURBURE_MAXI * 8191);
  recevoir({ data: [0xE0, valeur & 0x7F, valeur >> 7] });
}

// Tant que le doigt est sur la bande, la note rejoint le doigt en douceur, comme l'inertie d'une corde
function suivreVibrato(geste, jeton) {
  if (geste.jeton !== jeton) return;   // doigt levé : on s'arrête
  const ecart = geste.cible - geste.lisse;
  if (Math.abs(ecart) > 0.002) {
    geste.lisse += ecart * LISSAGE_VIBRATO;
    plierAuDoigt(geste.lisse);
  }
  dessinerCorde(geste, ecart * LISSAGE_VIBRATO);
  requestAnimationFrame(() => suivreVibrato(geste, jeton));
}

// La bande Vibrato : le doigt se pose n'importe où ; c'est son déplacement vers le haut ou le bas
// (au-delà d'une petite zone morte) qui fait onduler la note. En le levant, la note revient juste.
function preparerBandeVibrato() {
  const bande = document.getElementById('bande-vibrato');
  bande.addEventListener('pointerdown', e => {
    if (!audio || vibrato) return;
    e.preventDefault();
    capturer(bande, e);
    const jeton = {};
    vibrato = { doigt: e.pointerId, y: e.clientY, cible: 0, lisse: 0, jeton, phase: 0, energie: 0 };
    bande.classList.add('active');
    placerLoupeVibrato();
    suivreVibrato(vibrato, jeton);
  });
  bande.addEventListener('pointermove', e => {
    if (!vibrato || vibrato.doigt !== e.pointerId) return;
    const ecart = vibrato.y - e.clientY;                 // vers le haut = plus aigu
    vibrato.cible = Math.sign(ecart) * Math.max(0, Math.abs(ecart) - ZONE_MORTE_VIBRATO) / AMPLEUR_VIBRATO;
  });
  for (const fin of ['pointerup', 'pointercancel']) bande.addEventListener(fin, e => {
    if (!vibrato || vibrato.doigt !== e.pointerId) return;
    fermerLoupeVibrato(vibrato);
    vibrato = null;
    bande.classList.remove('active');
    plierAuDoigt(0);
  });
}

function preparerClavier() {
  const zone = document.getElementById('touches');
  zone.addEventListener('pointerdown', e => {
    if (!audio) return;
    const t = toucheSous(e);
    if (!t) return;
    e.preventDefault();
    capturer(zone, e);                         // le doigt peut glisser hors de la touche
    doigtsSurTouches.set(e.pointerId, t.note);
    recevoir({ data: [0x90, t.note, t.velocite] });
    placerLoupeVibrato();
  });
  // Glisser : on passe d'une touche à la suivante (glissando)
  zone.addEventListener('pointermove', e => {
    if (!doigtsSurTouches.has(e.pointerId)) return;
    const t = toucheSous(e);
    if (!t || t.note === doigtsSurTouches.get(e.pointerId)) return;
    lacherNote(e.pointerId);
    doigtsSurTouches.set(e.pointerId, t.note);
    recevoir({ data: [0x90, t.note, t.velocite] });
    placerLoupeVibrato();
  });
  for (const fin of ['pointerup', 'pointercancel']) zone.addEventListener(fin, e => { lacherNote(e.pointerId); placerLoupeVibrato(); });
  document.getElementById('octave-moins').onclick = () => changerOctave(-1);
  document.getElementById('octave-plus').onclick = () => changerOctave(1);
  dessinerClavier();
  preparerBandeVibrato();
}

// --- Les pads ------------------------------------------------------------------
// Les pads sont redessinés à chaque changement d'état : on écoute donc leur conteneur.
function preparerPads() {
  const zone = document.getElementById('pads');
  zone.addEventListener('pointerdown', e => {
    if (!audio || !modeTactileActif || e.target.closest('.instrument, .effacer')) return;
    const pad = e.target.closest('.pad');
    if (!pad) return;
    const numero = [...zone.children].indexOf(pad);
    capturer(zone, e);
    doigtsSurPads.set(e.pointerId, numero);
    recevoir({ data: [0x90 | CANAL_PADS, PAD_1 + numero, VELOCITE_PADS] });
  });
  for (const fin of ['pointerup', 'pointercancel']) {
    zone.addEventListener(fin, e => {
      if (!doigtsSurPads.has(e.pointerId)) return;
      recevoir({ data: [0x80 | CANAL_PADS, PAD_1 + doigtsSurPads.get(e.pointerId), 0] });
      doigtsSurPads.delete(e.pointerId);
    });
  }
}

// Le bouton ✕ d'un pad : la boucle redevient vide (son instrument et ses réglages sont gardés)
function effacerPad(numero) {
  effacerBoucle(familles[familleActive].boucles[numero], false);
}

// Flèches ‹ › de l'écran : la boucle précédente ou suivante devient la boucle sélectionnée
function choisirBoucle(sens) {
  selectionner((familles[familleActive].selection + sens + 4) % 4);
}

// --- Les potards : glisser vers le haut pour monter, 3 pixels par cran ------------
function preparerPotards() {
  const zone = document.getElementById('potards');
  zone.addEventListener('pointerdown', e => {
    const potard = e.target.closest('.potard');
    if (!audio || !potard) return;
    e.preventDefault();
    capturer(zone, e);
    doigtsSurPotards.set(e.pointerId, { nom: ORDRE_POTARDS[[...zone.children].indexOf(potard)], y: e.clientY });
  });
  zone.addEventListener('pointermove', e => {
    const d = doigtsSurPotards.get(e.pointerId);
    if (!d) return;
    const crans = Math.trunc((d.y - e.clientY) / 3);
    if (!crans) return;
    d.y -= crans * 3;
    changerReglage(d.nom, crans);
  });
  for (const fin of ['pointerup', 'pointercancel']) zone.addEventListener(fin, e => doigtsSurPotards.delete(e.pointerId));
}

// --- Les faders (volume des familles) et la bande (volume de la boucle) ----------
function preparerFaders() {
  const valeur = (rail, e) => {
    const cadre = rail.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(1, (cadre.bottom - e.clientY) / cadre.height)) * 127);
  };
  const regler = (d, e) => {
    const v = valeur(d.rail(), e);
    if (d.famille < 0) { toucherBandeVolume(v); return; }
    const f = familles[d.famille];
    reglerVolume(f, v);
    annoncerSurMiniLab('Volume ' + f.nom, Math.round(v / 127 * 100) + ' %');
  };
  const ecouter = (zone, trouver) => {
    zone.addEventListener('pointerdown', e => {
      const d = audio && trouver(e);
      if (!d) return;
      e.preventDefault();
      capturer(zone, e);
      doigtsSurFaders.set(e.pointerId, d);
      regler(d, e);
    });
    zone.addEventListener('pointermove', e => {
      const d = doigtsSurFaders.get(e.pointerId);
      if (d) regler(d, e);
    });
    for (const fin of ['pointerup', 'pointercancel']) zone.addEventListener(fin, e => doigtsSurFaders.delete(e.pointerId));
  };
  const faders = document.getElementById('faders');
  ecouter(faders, e => {
    const fader = e.target.closest('.fader');
    if (!fader) return null;
    const numero = [...faders.children].indexOf(fader);
    // les faders sont redessinés pendant le geste : on retrouve le rail à chaque mouvement
    return { famille: numero, rail: () => faders.children[numero].querySelector('.rail') };
  });
  const bande = document.getElementById('bande');
  ecouter(bande, () => ({ famille: -1, rail: () => bande }));
}

// --- Tactile ou clavier MIDI ------------------------------------------------------
// Appelé par brancherClaviers (moteur.js) au démarrage et à chaque clavier branché ou débranché.
function modeTactile(actif) {
  modeTactileActif = actif;
  document.body.classList.toggle('tactile', actif);
  montrerClavier(actif);
}

function montrerClavier(visible) {
  document.getElementById('clavier').hidden = !visible;
  document.body.classList.toggle('avec-clavier', visible);
}

const clavierVisible = () => !document.getElementById('clavier').hidden;

// Pas de menu contextuel (clic droit, appui long) sur l'instrument : il gênerait le jeu
document.getElementById('app').addEventListener('contextmenu', e => e.preventDefault());

// Sur iPhone, un appui long affiche la loupe d'iOS, même sans texte à sélectionner. On bloque
// donc le geste du doigt lui-même, sauf sur les boutons, menus et fenêtres, qui ont besoin de leur clic.
// (Les gestes de jeu passent par les « pointer events », qui continuent d'arriver.)
document.addEventListener('touchstart', e => {
  const cible = e.target.closest ? e.target : e.target.parentElement;
  if (cible.closest('button, input, select, a, dialog, #barre-menus')) return;
  if (!modeTactileActif && cible.closest('.pad')) return;   // avec un clavier MIDI, un clic sur un pad le sélectionne
  e.preventDefault();
}, { passive: false });

preparerClavier();
preparerPads();
preparerPotards();
preparerFaders();
modeTactile(true);
