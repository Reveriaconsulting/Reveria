// =============================================================================
//  RevLoop — les couleurs des pads du MiniLab 3
// =============================================================================
// Le MiniLab accepte un message spécial (SysEx) qui donne une couleur à un pad :
//   F0 00 20 6B 7F 42  02 MM 16  ID  R G B  F7
//   (en-tête Arturia)  (couleur, pour le mode MM)  (pad)  (rouge, vert, bleu de 0 à 127)
// Les pads 1 à 8 portent les numéros ID 4 à 11.
// MM dépend du mode du clavier : 00 = Utilisateur, 01 = Arturia, 02 = DAW.
// Le mode peut changer (Shift + pad 3) : on envoie donc la couleur aux trois.
//
// Ce que montrent les pads :
//   pads 1-4 = les boucles de la famille affichée
//     éteint                         → vide
//     blanc clignotant               → prêt (attend la 1re note)
//     rouge                          → enregistrement
//     couleur de la famille, pleine  → lecture (éclair blanc au début de chaque mesure)
//     couleur de la famille, faible  → à l'arrêt
//   pads 5-8 = les actions : couleur de la famille affichée (repère quand on tourne
//              le bouton central), blanc vif quand l'action est active
// Les couleurs des familles sont celles de l'écran (COULEURS_ECRAN, interface.js) :
// le clavier et l'écran montrent toujours la même chose.

let sortieMiniLab = null;            // la sortie MIDI vers le MiniLab (si Chrome autorise le SysEx)
const derniereCouleur = {};          // pour ne pas renvoyer une couleur déjà affichée
let clignote = false;
let eclairJusqua = 0;                // fin de l'éclair blanc du début de mesure

// Une couleur par famille : Rythme, Basse, Nappes, Mélodie. Le MiniLab compte de 0 à 127
// (l'écran de 0 à 255) : on divise par deux la couleur de l'écran.
const COULEURS_FAMILLES = COULEURS_ECRAN.map(hex => [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) >> 1));
const BLANC = [127, 127, 127];
const ETEINT = [0, 0, 0];
const GRIS_ARTURIA = [25, 25, 25];   // la couleur d'origine des pads, rendue en quittant

const attenuer = ([r, g, b], f) => [Math.round(r * f), Math.round(g * f), Math.round(b * f)];

function colorerPad(numero, [r, g, b]) {
  if (!sortieMiniLab) return;
  const cle = r + ',' + g + ',' + b;
  if (derniereCouleur[numero] === cle) return;
  derniereCouleur[numero] = cle;
  for (const mode of [0x00, 0x01, 0x02]) {
    sortieMiniLab.send([0xF0, 0x00, 0x20, 0x6B, 0x7F, 0x42, 0x02, mode, 0x16, 0x04 + numero, r, g, b, 0xF7]);
  }
}

function couleurBoucle(f, b) {
  const famille = COULEURS_FAMILLES[familles.indexOf(f)];
  if (b.etat === 'pret') return clignote ? BLANC : ETEINT;
  if (b.etat === 'enregistrement') return [127, 0, 0];
  if (b.etat === 'lecture') return audio && audio.currentTime < eclairJusqua ? BLANC : famille;
  if (b.etat === 'arret') return attenuer(famille, 0.25);
  return ETEINT;
}

// Pad d'action : couleur de la famille, ou blanc vif quand l'action est active
// (bascule allumée, ou pad tenu)
// En mode 8 actions, les pads d'action sont plus lumineux, pour bien voir qu'on a changé de mode.
function couleurAction(pad) {
  const action = actionsDeLaFamille()[actionDuPad(pad)];
  if (!action || action.type === 'rien') return ETEINT;
  if (actionActive(action, pad)) return BLANC;
  return attenuer(COULEURS_FAMILLES[familleActive], modeHuitActions ? 1 : 0.6);
}

// Un éclair blanc sur les 8 pads quand on entre ou sort du mode 8 actions
let eclairModeJusqua = 0;
function signalerChangementDeMode() {
  eclairModeJusqua = audio.currentTime + 0.25;
}

function mettreAJourPads() {
  if (!sortieMiniLab) return;
  const f = familles[familleActive];
  const eclair = audio.currentTime < eclairModeJusqua;
  for (let pad = 0; pad < 8; pad++) {
    if (eclair) colorerPad(pad, [127, 127, 127]);
    else colorerPad(pad, actionDuPad(pad) === null ? couleurBoucle(f, f.boucles[pad]) : couleurAction(pad));
  }
}

// Après une frappe, le MiniLab allume lui-même le pad : on oublie la couleur
// mémorisée pour la renvoyer à coup sûr.
function oublierCouleurPad(numero) {
  delete derniereCouleur[numero];
}

// Toutes les 50 ms : clignotement du « prêt » et éclair au début de chaque mesure
let phasePads = 0;
let tours = 0;
setInterval(() => {
  if (!audio) return;
  // Toutes les 2 s, on renvoie toutes les couleurs : si le clavier a changé de mode
  // entre-temps, il retrouve ainsi les bonnes couleurs.
  if (++tours % 40 === 1) {
    for (const n in derniereCouleur) delete derniereCouleur[n];
    dernierEcran = '';                 // l'écran aussi est réécrit (le clavier peut l'avoir effacé)
    initialiserModeDaw();
  }
  clignote = Math.floor(audio.currentTime * 3) % 2 === 0;
  if (reference > 0) {
    const phase = modulo(audio.currentTime - (audio.outputLatency || 0) - origineReference, reference) / reference;
    if (phase < phasePads) eclairJusqua = audio.currentTime + 0.12;
    phasePads = phase;
  }
  mettreAJourPads();
  mettreAJourEcranMiniLab();
  afficherActions();      // le bandeau des pads à l'écran suit les mêmes couleurs (redessiné seulement s'il change)
}, 50);

// --- L'écran du MiniLab ------------------------------------------------------------
// Message SysEx (testé sur le clavier le 2026-10-26) :
//   F0 00 20 6B 7F 42  04 MM 60  01 <ligne 1> 00  02 <ligne 2> 00  F7
// Comme pour les couleurs, on l'envoie aux 3 modes (MM = 00, 01, 02).
// L'écran n'affiche que des caractères simples : on retire les accents (é → e, × → x…).
//
// En temps normal :      ligne 1 = famille, pad et état    ligne 2 = instrument
// Quand on bouge un réglage, pendant 1,5 s : son nom et sa valeur (« Reverb » / « 63 % »)
const NOMS_COURTS_ETATS = { vide: 'vide', pret: 'pret', enregistrement: 'REC', lecture: 'lect.', arret: 'arret' };
let dernierEcran = '';
let messageTemporaire = null;          // { ligne1, ligne2, jusqua }

// En mode DAW, l'écran affiche « DAW » tant qu'un logiciel ne s'est pas annoncé avec ce
// message d'initialisation (vérifié le 2026-10-26). On l'envoie au démarrage puis toutes
// les 2 s, au cas où le clavier changerait de mode en cours de route.
function initialiserModeDaw() {
  if (sortieMiniLab) sortieMiniLab.send([0xF0, 0x00, 0x20, 0x6B, 0x7F, 0x42, 0x02, 0x02, 0x40, 0x6A, 0x21, 0xF7]);
}

function texteSimple(texte) {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/×/g, 'x').replace(/[−–—]/g, '-').replace(/½/g, '1/2').replace(/¼/g, '1/4')
    .replace(/[^\x20-\x7E]/g, '').slice(0, 20);
}

function ecrireSurMiniLab(ligne1, ligne2) {
  if (!sortieMiniLab) return;
  const cle = ligne1 + '|' + ligne2;
  if (cle === dernierEcran) return;
  dernierEcran = cle;
  const octets = t => Array.from(texteSimple(t)).map(c => c.charCodeAt(0));
  for (const mode of [0x00, 0x01, 0x02]) {
    sortieMiniLab.send([0xF0, 0x00, 0x20, 0x6B, 0x7F, 0x42, 0x04, mode, 0x60,
      0x01, ...octets(ligne1), 0x00, 0x02, ...octets(ligne2), 0x00, 0xF7]);
  }
}

// Affiche un message pendant 1,5 s (appelé quand on tourne un potard, bouge un fader…)
function annoncerSurMiniLab(ligne1, ligne2) {
  messageTemporaire = { ligne1, ligne2, jusqua: performance.now() + 1500 };
  mettreAJourEcranMiniLab();
}

function mettreAJourEcranMiniLab() {
  if (!audio) return;
  if (messageTemporaire && performance.now() < messageTemporaire.jusqua) {
    ecrireSurMiniLab(messageTemporaire.ligne1, messageTemporaire.ligne2);
    return;
  }
  messageTemporaire = null;
  const f = familles[familleActive];
  const b = boucleSelectionnee();
  ecrireSurMiniLab(
    f.nom + ' P' + b.numero + ' ' + (modeHuitActions ? '8 actions' : NOMS_COURTS_ETATS[b.etat]),
    infoInstrument(instrumentDe(f, b)).nom);
}

// En quittant la page, on rend aux pads leur couleur d'origine
window.addEventListener('beforeunload', () => {
  for (let i = 0; i < 8; i++) colorerPad(i, GRIS_ARTURIA);
});
