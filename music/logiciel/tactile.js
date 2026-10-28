// =============================================================================
//  RevLoop — jouer au doigt : clavier, pads, potards et faders à l'écran
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
//   force    : plus le doigt est bas sur la touche, plus la note est forte
//              (comme sur un piano, où l'on frappe fort près du bord)
//   pads     : frapper = le pad du MiniLab (appui long = réenregistrer, comme sur le clavier) ;
//              le bouton ✕ d'un pad efface sa boucle, ou annule l'enregistrement en cours
//   potards  : glisser vers le haut ou le bas
//   faders   : poser le doigt à la hauteur voulue (bande de gauche = volume de la boucle)

const NOTE_BASSE = 48;                 // la touche la plus grave du clavier, sans décalage
const NB_TOUCHES = 25;
const NOIRES = [1, 3, 6, 8, 10];       // les touches noires dans l'octave (Do# Ré# Fa# Sol# La#)
const ORDRE_POTARDS = ['filtre', 'reverb', 'chorus', 'delay', 'saturation', 'grain', 'attaque', 'mouvement'];
const VELOCITE_PADS = 100;

let modeTactileActif = true;           // aucun clavier MIDI : on joue à l'écran
let decalageOctave = 0;                // −3 à +3, boutons Octave − / +
const doigtsSurTouches = new Map();    // doigt (pointerId) → note jouée
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
  });
  // Glisser : on passe d'une touche à la suivante (glissando)
  zone.addEventListener('pointermove', e => {
    if (!doigtsSurTouches.has(e.pointerId)) return;
    const t = toucheSous(e);
    if (!t || t.note === doigtsSurTouches.get(e.pointerId)) return;
    lacherNote(e.pointerId);
    doigtsSurTouches.set(e.pointerId, t.note);
    recevoir({ data: [0x90, t.note, t.velocite] });
  });
  for (const fin of ['pointerup', 'pointercancel']) zone.addEventListener(fin, e => lacherNote(e.pointerId));
  document.getElementById('octave-moins').onclick = () => changerOctave(-1);
  document.getElementById('octave-plus').onclick = () => changerOctave(1);
  dessinerClavier();
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
