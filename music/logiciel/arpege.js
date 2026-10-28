// =============================================================================
//  Astrellia — l'arpégiateur, calé sur les boucles
// =============================================================================
// Quand l'arpège est activé sur une famille (action de pad « Arpège »), les touches
// tenues ne sonnent plus directement : l'arpégiateur les rejoue une par une, en rythme.
// Le rythme est calé sur la 1re boucle (la « mesure ») : les arpèges tombent donc
// toujours juste par rapport à ce qui tourne. S'il n'y a pas encore de boucle, il
// prend une mesure de 2 secondes.
//
// Réglages (Édition › Arpégiateur) : le sens, la vitesse (notes par mesure), l'étendue.

const SENS_ARPEGE = {
  montant: 'Montant', descendant: 'Descendant', allerRetour: 'Aller-retour', hasard: 'Au hasard',
};
if (!options.arpege) options.arpege = { sens: 'montant', parMesure: 16, octaves: 1 };

const touchesTenues = new Map();   // note → vélocité : les touches que l'arpège doit jouer
let pasArpege = 0;                 // numéro de la prochaine note de l'arpège
let prochainPas = 0;               // instant de la prochaine note

const arpegeActif = () => !!familles[familleActive].arp;

// Appelé par jouer() et arreter() (moteur.js) : si l'arpège est actif,
// la touche est gardée pour l'arpège au lieu de sonner tout de suite.
function arpegeIntercepte(note, velocite, appuyee) {
  if (!arpegeActif()) return false;
  if (appuyee) touchesTenues.set(note, velocite);
  else touchesTenues.delete(note);
  return true;
}

// La suite de notes à jouer, d'après les touches tenues et les réglages
function suiteArpege() {
  const base = [...touchesTenues.keys()].sort((a, b) => a - b);
  const suite = [];
  for (let o = 0; o < options.arpege.octaves; o++) for (const n of base) suite.push(n + 12 * o);
  if (options.arpege.sens === 'descendant') suite.reverse();
  if (options.arpege.sens === 'allerRetour' && suite.length > 2) suite.push(...suite.slice(1, -1).reverse());
  return suite;
}

// Durée d'une note de l'arpège : la mesure divisée en parMesure
const dureePas = () => (reference || 2) / options.arpege.parMesure;

// Toutes les 10 ms : prépare les notes de l'arpège des 0,1 s à venir, sur la grille de la mesure
function horlogeArpege() {
  if (!audio) return;
  const maintenant = audio.currentTime;
  const pas = dureePas();
  const origine = reference ? origineReference : 0;
  if (prochainPas < maintenant - pas) {
    // (re)calage sur la grille : la prochaine case de la mesure
    prochainPas = origine + Math.ceil((maintenant - origine) / pas) * pas;
  }
  while (prochainPas < maintenant + AVANCE) {
    const suite = suiteArpege();
    if (arpegeActif() && suite.length) {
      const note = options.arpege.sens === 'hasard'
        ? suite[Math.floor(Math.random() * suite.length)]
        : suite[pasArpege % suite.length];
      jouerNoteArpege(note, touchesTenues.get(note) || moyenneVelocites(), prochainPas, pas * 0.8);
      pasArpege++;
    } else {
      pasArpege = 0;                 // plus de touche tenue : l'arpège repartira du début
    }
    prochainPas += pas;
  }
}

function moyenneVelocites() {
  const v = [...touchesTenues.values()];
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 100;
}

// Joue une note de l'arpège avec l'instrument et les effets de la boucle sélectionnée,
// et l'enregistre si une boucle est en train d'enregistrer (ou prête à le faire)
function jouerNoteArpege(note, velocite, quand, duree) {
  const f = familles[familleActive];
  const b = boucleSelectionnee();
  const voix = creerVoix(f, b, note + b.transpo, velocite, quand);
  suivreVoixEnDirect(voix);          // le vibrato de la bande de gauche la plie aussi (moteur.js)
  relacherVoix(voix, quand + duree);
  for (const { b: boucle } of toutesLesBoucles()) {
    if (boucle.etat === 'pret') {          // la 1re note de l'arpège lance l'enregistrement
      boucle.etat = 'enregistrement';
      boucle.debut = quand;
      commencerCourbe(boucle);
      afficher();
    }
    if (boucle.etat === 'enregistrement') {
      boucle.notes.push({ quand: quand - boucle.debut, duree, note, velocite });
    }
  }
}

// Action de pad « Arpège » : allume ou éteint l'arpège de la famille affichée
function basculerArpege() {
  for (const n in notesEnCours) arreter(Number(n));   // pas de note bloquée en changeant de mode
  touchesTenues.clear();
  const f = familles[familleActive];
  f.arp = !f.arp;
  pasArpege = 0;
}

// Bouton central tourné pendant qu'on tient des touches, arpège actif : un cran = vitesse suivante.
// 6, 12, 24 et 48 notes par mesure donnent des triolets ; au-delà de 32, c'est un roulement.
const VITESSES_ARPEGE = [4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128];
function changerVitesseArpege(sens) {
  const actuelle = VITESSES_ARPEGE.indexOf(options.arpege.parMesure);
  const i = Math.max(0, Math.min(VITESSES_ARPEGE.length - 1, (actuelle < 0 ? 4 : actuelle) + sens));
  options.arpege.parMesure = VITESSES_ARPEGE[i];
  // la note suivante se recale sur la nouvelle grille, pour rester juste avec les boucles
  const pas = dureePas();
  const origine = reference ? origineReference : 0;
  prochainPas = origine + Math.ceil((prochainPas - origine - 1e-6) / pas) * pas;
  sauvegarderOptions();
  annoncerSurMiniLab('Arpege', VITESSES_ARPEGE[i] + ' par mesure');
}

// --- Page « Arpégiateur » (menu Édition) -----------------------------------------
function ouvrirReglagesArpege() {
  const choix = (id, valeurs, actuelle) => '<select id="' + id + '">' +
    Object.entries(valeurs).map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(actuelle) ? ' selected' : '') + '>' + t + '</option>').join('') +
    '</select>';
  montrerDialogue('Arpégiateur',
    '<p>L’arpège se met en marche avec l’action de pad <b>« Arpège »</b> (pad 4 en mode 8 actions pour Basse, Nappes et Mélodie). ' +
    'Tenez un accord : il est joué note par note, calé sur vos boucles. Une seule touche tenue est répétée en rythme. ' +
    '<b>Pour changer la vitesse en jouant :</b> avec le MiniLab, gardez les touches enfoncées et tournez le bouton central ; ' +
    'au doigt, choisissez-la ci-dessous.</p>' +
    '<label>Sens ' + choix('arp-sens', SENS_ARPEGE, options.arpege.sens) + '</label>' +
    '<label>Vitesse ' + choix('arp-vitesse', { 4: 'Lente (4 notes par mesure)', 6: '6 (triolets)', 8: 'Moyenne (8)', 12: '12 (triolets)', 16: 'Rapide (16)', 24: '24 (triolets)', 32: 'Très rapide (32)', 48: '48 (triolets)', 64: 'Roulement (64)', 96: 'Roulement (96)', 128: 'Roulement très serré (128)' }, options.arpege.parMesure) + '</label>' +
    '<label>Étendue ' + choix('arp-octaves', { 1: '1 octave', 2: '2 octaves', 3: '3 octaves' }, options.arpege.octaves) + '</label>');
  const enregistrer = () => {
    options.arpege = {
      sens: document.getElementById('arp-sens').value,
      parMesure: Number(document.getElementById('arp-vitesse').value),
      octaves: Number(document.getElementById('arp-octaves').value),
    };
    sauvegarderOptions();
  };
  for (const id of ['arp-sens', 'arp-vitesse', 'arp-octaves']) document.getElementById(id).onchange = enregistrer;
}

setInterval(horlogeArpege, 10);
