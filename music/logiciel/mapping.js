// =============================================================================
//  RevLoop — le mapping : n'importe quel clavier MIDI
// =============================================================================
// Chaque clavier branché suit un « profil » : la liste de ses commandes (touche, pad, potard,
// fader, molette…) et de la fonction que chacune déclenche dans RevLoop.
//   MiniLab 3      : le profil d'origine, réglé à la main dans moteur.js (ses deux modes, Shift…).
//                    Il est choisi d'office pour un MiniLab.
//   Générique      : pour un clavier inconnu. Les touches jouent, les pads de batterie habituels
//                    (canal 10, notes 36 à 43) commandent les boucles, la molette de hauteur fait le vibrato.
//   profils perso  : créés dans Édition › Clavier MIDI…, en « apprenant » chaque commande :
//                    on clique sur Apprendre, puis on bouge la commande sur le clavier.
// Une commande assignée à une fonction ne joue jamais de note : pads et touches ne se chevauchent pas.
// Toutes les touches non assignées jouent des notes.
//
// Une commande : { t: 'note' | 'cc' | 'bend', c: canal (0 à 15, ou −1 = tous), n: numéro }
// Les profils perso sont gardés avec les préférences (options.profils), ainsi que le profil
// choisi pour chaque clavier (options.profilParPort, rangé par nom de clavier).

const FONCTIONS_MAPPING = [
  { groupe: 'Pads', liste: [1, 2, 3, 4, 5, 6, 7, 8].map(i => ['pad' + i, 'Pad ' + i]) },
  { groupe: 'Potards (boucle sélectionnée)', liste: ORDRE_POTARDS.map((nom, i) => ['potard' + (i + 1), 'Potard ' + (i + 1) + ' · ' + NOMS_REGLAGES[nom]]) },
  { groupe: 'Volumes', liste: familles.map((f, i) => ['fader' + (i + 1), 'Volume ' + f.nom])
      .concat([['volumeBoucle', 'Volume de la boucle sélectionnée']]) },
  { groupe: 'Jeu', liste: [['vibrato', 'Vibrato (molette de hauteur)']] },
  { groupe: 'Navigation', liste: [
      ['famille', 'Changer de famille (bouton rotatif)'],
      ['familleSuivante', 'Famille suivante (bouton)'],
      ['instrument', 'Changer d’instrument (bouton rotatif)'],
      ['boucleSuivante', 'Boucle suivante (bouton)'],
      ['huitActions', 'Mode 8 actions (bouton)'],
  ] },
];

const PROFIL_GENERIQUE = { id: 'generique', nom: 'Générique (tout clavier)', fige: true, controles: [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ fonction: 'pad' + (i + 1), t: 'note', c: 9, n: 36 + i })),
  { fonction: 'vibrato', t: 'bend', c: -1, n: 0 },
] };

// Le MiniLab 3 (mode Arturia) traduit en table : c'est le point de départ d'un profil perso
// créé à partir du MiniLab (les numéros sont ceux de moteur.js)
const PROFIL_MINILAB = { id: 'minilab', nom: 'MiniLab 3 (d’origine)', fige: true, integre: true, controles: [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ fonction: 'pad' + (i + 1), t: 'note', c: CANAL_PADS, n: PAD_1 + i })),
  ...[86, 87, 89, 90, 110, 111, 116, 117].map((n, i) => ({ fonction: 'potard' + (i + 1), t: 'cc', c: -1, n })),
  ...FADERS.map((n, i) => ({ fonction: 'fader' + (i + 1), t: 'cc', c: -1, n })),
  { fonction: 'volumeBoucle', t: 'cc', c: -1, n: BANDE_DROITE },
  { fonction: 'vibrato', t: 'bend', c: -1, n: 0 },
  { fonction: 'famille', t: 'cc', c: -1, n: BOUTON_CENTRAL },
  { fonction: 'huitActions', t: 'cc', c: -1, n: CLIC_BOUTON_CENTRAL },
  { fonction: 'instrument', t: 'cc', c: -1, n: BOUTON_CENTRAL_SHIFT },
  { fonction: 'boucleSuivante', t: 'cc', c: -1, n: CLIC_BOUTON_CENTRAL_SHIFT },
] };

if (!options.profils) options.profils = [];
if (!options.profilParPort) options.profilParPort = {};

const tousLesProfils = () => [PROFIL_MINILAB, PROFIL_GENERIQUE, ...options.profils];
const estMiniLab = nom => /minilab/i.test(nom);

// Les ports à écouter : tous les claviers, sauf les ports secondaires du MiniLab (DIN, MCU…) et
// les ports virtuels du système (IAC du Mac, sessions réseau), qui doubleraient les notes
// ou feraient croire qu'un clavier est branché
function portAEcouter(port) {
  if (/\b(iac|session|network|réseau)\b/i.test(port.name)) return false;
  return !estMiniLab(port.name) || (/midi/i.test(port.name) && !/din|mcu/i.test(port.name));
}

function profilDuPort(nom) {
  const id = options.profilParPort[nom] || (estMiniLab(nom) ? 'minilab' : 'generique');
  return tousLesProfils().find(p => p.id === id) || PROFIL_GENERIQUE;
}

// --- Les messages d'un clavier -----------------------------------------------------
function commandeDe([statut, d1]) {
  const type = statut & 0xF0, c = statut & 0x0F;
  if (type === 0x90 || type === 0x80) return { t: 'note', c, n: d1 };
  if (type === 0xB0) return { t: 'cc', c, n: d1 };
  if (type === 0xE0) return { t: 'bend', c, n: 0 };
  return null;
}

const memeCommande = (a, b) => a.t === b.t && a.n === b.n && (a.c === -1 || b.c === -1 || a.c === b.c);

// Appelé par recevoir (moteur.js) pour un message venu d'un vrai clavier. Renvoie true si le
// message est traité ici ; false s'il revient au profil d'origine du MiniLab (moteur.js).
function traiterSelonProfil(message) {
  const data = message.data;
  const commande = commandeDe(data);
  if (!commande) return false;
  if (apprentissage) {
    // on apprend sur un geste franc : touche appuyée, potard tourné, molette poussée (pas un relâchement)
    const type = data[0] & 0xF0;
    if ((type === 0x90 && data[2] > 0) || type === 0xB0 ||
        (type === 0xE0 && Math.abs(((data[2] << 7) | data[1]) - 8192) > 1000)) apprendre(commande);
    return true;                         // pendant l'apprentissage, le clavier ne joue pas
  }
  const profil = profilDuPort(message.target.name);
  if (profil.integre) return false;
  const controle = profil.controles.find(k => memeCommande(k, commande));
  if (controle) executer(controle.fonction, data, commande);
  else if (commande.t === 'note') {
    if ((data[0] & 0xF0) === 0x90 && data[2] > 0) jouerTouche(data[1], data[2]);
    else relacherTouche(data[1]);
  }
  return true;
}

// Un bouton rotatif peut envoyer une position (0 à 127) ou un sens (65 = droite, 63 = gauche) :
// on compare à la valeur précédente, et à défaut, on regarde de quel côté de 64 on est
const dernieresValeurs = {};
function sensDe(cle, valeur) {
  const avant = dernieresValeurs[cle];
  dernieresValeurs[cle] = valeur;
  if (avant === undefined || avant === valeur) return valeur >= 64 ? 1 : -1;
  return valeur > avant ? 1 : -1;
}

function executer(fonction, data, commande) {
  const valeur = commande.t === 'bend' ? (data[2] << 7) | data[1] : data[2];
  const v = commande.t === 'bend' ? valeur >> 7 : valeur;     // ramené de 0 à 127
  const appui = commande.t === 'note' ? (data[0] & 0xF0) === 0x90 && v > 0 : v > 0;
  const cle = commande.t + commande.c + '-' + commande.n;
  const numero = Number(fonction.replace(/\D/g, '')) - 1;
  if (fonction.startsWith('pad')) {
    appui ? appuyerPad(numero, commande.t === 'note' ? v : 100) : relacherPad(numero);
  } else if (fonction.startsWith('potard')) {
    // comme les potards du MiniLab : on suit le mouvement, pas la position (chaque boucle a ses réglages)
    const avant = dernieresValeurs[cle];
    dernieresValeurs[cle] = v;
    let mouvement = avant === undefined ? 0 : v - avant;
    if (!mouvement && v === 127) mouvement = 1;
    if (!mouvement && v === 0) mouvement = -1;
    if (mouvement) changerReglage(ORDRE_POTARDS[numero], mouvement);
  } else if (fonction.startsWith('fader')) {
    reglerVolume(familles[numero], v);
    annoncerSurMiniLab('Volume ' + familles[numero].nom, Math.round(v / 127 * 100) + ' %');
  } else if (fonction === 'volumeBoucle') {
    toucherBandeVolume(v);
  } else if (fonction === 'vibrato') {
    plierNotes(commande.t === 'bend' ? valeur : Math.min(16383, v * 129));
  } else if (fonction === 'famille') {
    tournerBoutonCentral(sensDe(cle, v) > 0 ? 65 : 63);
  } else if (fonction === 'instrument') {
    tournerAvecShift(sensDe(cle, v) > 0 ? 65 : 63);
  } else if (appui && fonction === 'familleSuivante') {
    choisirFamille((familleActive + 1) % familles.length);
  } else if (appui && fonction === 'boucleSuivante') {
    selectionnerBoucleSuivante();
  } else if (appui && fonction === 'huitActions') {
    basculerHuitActions();
  }
}

// --- La page « Clavier MIDI » (menu Édition) ----------------------------------------
let apprentissage = null;              // { fonction } : on attend que l'utilisateur bouge une commande
let profilEditeId = null;
let suppressionDemandee = false;       // « Supprimer » demande une confirmation (2e clic)

const echapper = texte => String(texte).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const profilEdite = () => tousLesProfils().find(p => p.id === profilEditeId) || PROFIL_GENERIQUE;

function clavierBranches() {
  return accesMIDI ? [...accesMIDI.inputs.values()].filter(p => p.state !== 'disconnected' && portAEcouter(p)) : [];
}

function texteCommande(k) {
  const canal = k.c === -1 ? '' : ', canal ' + (k.c + 1);
  if (k.t === 'note') return 'Note ' + nomNote(k.n) + ' (' + k.n + canal + ')';
  if (k.t === 'cc') return 'Commande CC ' + k.n + canal;
  return 'Molette de hauteur' + canal;
}

function ouvrirMapping() {
  const branches = clavierBranches();
  if (!profilEditeId) profilEditeId = branches.length ? profilDuPort(branches[0].name).id : 'generique';
  montrerDialogue('Clavier MIDI', '<div id="mapping"></div>', [{ libelle: 'Fermer' }]);
  afficherMapping();
}

function afficherMapping() {
  const zone = document.getElementById('mapping');
  if (!zone) return;
  const profil = profilEdite();
  const choixProfils = actuel => tousLesProfils().map(p =>
    '<option value="' + p.id + '"' + (p.id === actuel ? ' selected' : '') + '>' + echapper(p.nom) + '</option>').join('');
  const branches = clavierBranches();

  let html = '<h3>Claviers branchés</h3>' + (branches.length
    ? branches.map(p => '<div class="ligne-reglage-pad"><span>' + echapper(p.name) + '</span>' +
        '<select data-port="' + encodeURIComponent(p.name) + '">' + choixProfils(profilDuPort(p.name).id) + '</select></div>').join('')
    : '<p class="note">Aucun clavier MIDI branché. Vous pouvez quand même préparer un profil ; ' +
      'pour apprendre les commandes, branchez le clavier.</p>');

  html += '<h3>Profil</h3><div class="ligne-reglage-pad">' +
    '<select id="profil-edite">' + choixProfils(profil.id) + '</select>' +
    '<button id="profil-nouveau">Nouveau (copie)</button>' +
    (profil.fige ? '' : '<button id="profil-supprimer">' + (suppressionDemandee ? 'Confirmer la suppression' : 'Supprimer') + '</button>') +
    '</div>' +
    (profil.fige ? '' : '<label>Nom <input id="profil-nom" value="' + echapper(profil.nom) + '"></label>');
  if (profil.integre) {
    html += '<p class="note">Le profil d’origine du MiniLab 3 gère aussi ses deux modes et la touche Shift. ' +
      'Pour le modifier, créez une copie avec « Nouveau (copie) » : la table ci-dessous en sera le point de départ.</p>';
  } else if (profil.fige) {
    html += '<p class="note">Profil de base, non modifiable. Pour l’adapter à votre clavier, créez une copie avec « Nouveau (copie) ».</p>';
  }

  html += FONCTIONS_MAPPING.map(({ groupe, liste }) => '<h3>' + groupe + '</h3><table class="table-mapping">' +
    liste.map(([fonction, libelle]) => {
      const k = profil.controles.find(x => x.fonction === fonction);
      const enAttente = apprentissage && apprentissage.fonction === fonction;
      return '<tr' + (enAttente ? ' class="attente"' : '') + '><td>' + libelle + '</td><td>' +
        (enAttente ? 'Bougez la commande sur votre clavier…' : k ? texteCommande(k) : '<span class="vide">—</span>') + '</td><td>' +
        (profil.fige ? '' : '<button data-apprendre="' + fonction + '">' + (enAttente ? 'Annuler' : 'Apprendre') + '</button>' +
          (k ? ' <button data-effacer="' + fonction + '" title="Retirer cette commande">✕</button>' : '')) +
        '</td></tr>';
    }).join('') + '</table>').join('');
  html += '<p class="note">Les touches non assignées jouent des notes. Une commande ne sert qu’à une seule fonction : ' +
    'l’apprendre pour une fonction la retire des autres.</p>';
  zone.innerHTML = html;

  zone.querySelectorAll('select[data-port]').forEach(choix => choix.onchange = () => {
    options.profilParPort[decodeURIComponent(choix.dataset.port)] = choix.value;
    sauvegarderOptions();
    brancherClaviers('');                // la ligne d'état affiche le nouveau profil
  });
  document.getElementById('profil-edite').onchange = e => {
    profilEditeId = e.target.value;
    apprentissage = null;
    suppressionDemandee = false;
    afficherMapping();
  };
  document.getElementById('profil-nouveau').onclick = () => {
    const copie = { id: 'p' + Date.now(), nom: 'Mon clavier ' + (options.profils.length + 1),
      controles: JSON.parse(JSON.stringify(profil.controles)) };
    options.profils.push(copie);
    sauvegarderOptions();
    profilEditeId = copie.id;
    apprentissage = null;
    afficherMapping();
  };
  const supprimer = document.getElementById('profil-supprimer');
  if (supprimer) supprimer.onclick = () => {
    if (!suppressionDemandee) { suppressionDemandee = true; afficherMapping(); return; }
    options.profils = options.profils.filter(p => p.id !== profil.id);
    for (const port in options.profilParPort) if (options.profilParPort[port] === profil.id) delete options.profilParPort[port];
    sauvegarderOptions();
    suppressionDemandee = false;
    profilEditeId = 'generique';
    apprentissage = null;
    afficherMapping();
    if (accesMIDI) brancherClaviers('');
  };
  const nom = document.getElementById('profil-nom');
  if (nom) nom.onchange = () => {
    profil.nom = nom.value.trim() || profil.nom;
    sauvegarderOptions();
    afficherMapping();
  };
  zone.querySelectorAll('[data-apprendre]').forEach(b => b.onclick = () => {
    const fonction = b.dataset.apprendre;
    apprentissage = apprentissage && apprentissage.fonction === fonction ? null : { fonction };
    afficherMapping();
  });
  zone.querySelectorAll('[data-effacer]').forEach(b => b.onclick = () => {
    profil.controles = profil.controles.filter(k => k.fonction !== b.dataset.effacer);
    sauvegarderOptions();
    afficherMapping();
  });
}

// La commande bougée devient celle de la fonction attendue, et quitte toute autre fonction
function apprendre(commande) {
  const profil = profilEdite();
  const fonction = apprentissage.fonction;
  apprentissage = null;
  if (profil.fige) return;
  profil.controles = profil.controles.filter(k => k.fonction !== fonction && !memeCommande(k, commande));
  profil.controles.push({ fonction, ...commande });
  sauvegarderOptions();
  afficherMapping();
}

// Fermer la fenêtre (bouton ou touche Échap) arrête l'apprentissage
dialogue.addEventListener('close', () => { apprentissage = null; suppressionDemandee = false; });
