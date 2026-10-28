// =============================================================================
//  RevLoop — la barre de menus : Fichier, Édition, Affichage, Aide
// =============================================================================
// Pour l'instant, les menus sont dessinés dans la page. Avec Electron, ces mêmes
// actions seront branchées sur la vraie barre de menus du Mac et de Windows.

let fichierActuel = null;   // le fichier .boucles ouvert ou sauvegardé (s'il y en a un)
let nomFichier = 'Sans titre';

const TYPE_FICHIER = {
  description: 'Session RevLoop',
  accept: { 'application/json': ['.boucles'] },
};

// --- Description des menus ------------------------------------------------
// Chaque élément : un libellé, un raccourci affiché, et l'action à lancer.
// « actif » peut être une fonction : l'élément est grisé quand elle renvoie false.
const MENUS = [
  { titre: 'Fichier', elements: [
    { libelle: 'Nouvelle session', action: nouvelleSession },
    { libelle: 'Ouvrir…', raccourci: '⌘O', action: ouvrir },
    '-',
    { libelle: 'Sauvegarder', raccourci: '⌘S', action: sauvegarderFichier },
    { libelle: 'Sauvegarder sous…', raccourci: '⇧⌘S', action: sauvegarderSous },
    '-',
    { libelle: 'Options…', action: ouvrirOptions },
    '-',
    { libelle: 'Quitter', action: quitter },
  ]},
  { titre: 'Édition', elements: [
    { libelle: 'Effacer la boucle sélectionnée', action: effacerSelection,
      actif: () => boucleSelectionnee().etat !== 'vide' },
    { libelle: 'Effacer toute la famille', action: effacerFamille },
    '-',
    { libelle: 'Réglages des pads…', action: ouvrirReglagesPads },
    { libelle: 'Arpégiateur…', action: ouvrirReglagesArpege },
  ]},
  { titre: 'Affichage', elements: [
    { libelle: 'Plein écran', raccourci: '⌃⌘F', action: basculerPleinEcran },
    { libelle: 'Clavier à l’écran', action: () => montrerClavier(!clavierVisible()), coche: () => clavierVisible() },
    '-',
    { libelle: 'Texte petit', action: () => changerTaille(0.85), coche: () => options.tailleTexte === 0.85 },
    { libelle: 'Texte normal', action: () => changerTaille(1), coche: () => options.tailleTexte === 1 },
    { libelle: 'Texte grand', action: () => changerTaille(1.25), coche: () => options.tailleTexte === 1.25 },
  ]},
  { titre: 'Aide', elements: [
    { libelle: 'Commandes du MiniLab', action: aideMiniLab },
    { libelle: 'À propos de RevLoop', action: aPropos },
  ]},
];

// --- Construction de la barre ---------------------------------------------
const barre = document.getElementById('barre-menus');
let menuOuvert = null;

function construireBarre() {
  barre.innerHTML = '';
  MENUS.forEach(menu => {
    const titre = document.createElement('div');
    titre.className = 'titre-menu';
    titre.textContent = menu.titre;

    const liste = document.createElement('div');
    liste.className = 'liste-menu';
    titre.appendChild(liste);

    // Clic sur le titre : ouvre ou ferme le menu
    titre.addEventListener('mousedown', e => {
      if (e.target !== titre) return;
      menuOuvert === titre ? fermerMenus() : ouvrirMenu(titre, menu, liste);
    });
    // Quand un menu est déjà ouvert, survoler un autre titre l'ouvre (comme sur Mac)
    titre.addEventListener('mouseenter', () => {
      if (menuOuvert && menuOuvert !== titre) ouvrirMenu(titre, menu, liste);
    });
    barre.appendChild(titre);
  });

  // Bouton « Sauvegarder », tout à droite : le même effet que Fichier › Sauvegarder (⌘S)
  const bouton = document.createElement('button');
  bouton.id = 'bouton-sauver';
  bouton.textContent = '💾 Sauvegarder';
  bouton.title = 'Sauvegarder (⌘S)';
  bouton.addEventListener('click', async () => {
    await demarrer();
    sauvegarderFichier();
  });
  barre.appendChild(bouton);
}

function ouvrirMenu(titre, menu, liste) {
  fermerMenus();
  liste.innerHTML = '';
  menu.elements.forEach(el => {
    if (el === '-') {
      liste.appendChild(Object.assign(document.createElement('hr')));
      return;
    }
    const ligne = document.createElement('div');
    const actif = el.action && (!el.actif || el.actif());
    ligne.className = 'element-menu' + (actif ? '' : ' grise');
    const coche = el.coche && el.coche() ? '✓ ' : '';
    ligne.innerHTML = '<span>' + coche + el.libelle + '</span><span class="raccourci">' + (el.raccourci || '') + '</span>';
    if (actif) {
      ligne.addEventListener('click', async () => {
        fermerMenus();
        await demarrer();          // un clic dans un menu suffit à autoriser le son
        el.action();
      });
    }
    liste.appendChild(ligne);
  });
  titre.classList.add('ouvert');
  menuOuvert = titre;
}

function fermerMenus() {
  if (menuOuvert) menuOuvert.classList.remove('ouvert');
  menuOuvert = null;
}

// Un clic ailleurs dans la page ferme le menu
document.addEventListener('mousedown', e => {
  if (menuOuvert && !barre.contains(e.target)) fermerMenus();
});

// --- Raccourcis clavier ---------------------------------------------------
document.addEventListener('keydown', async e => {
  if (!(e.metaKey || e.ctrlKey)) return;
  const touche = e.key.toLowerCase();
  if (touche === 's') {
    e.preventDefault();
    await demarrer();
    e.shiftKey ? sauvegarderSous() : sauvegarderFichier();
  } else if (touche === 'o') {
    e.preventDefault();
    await demarrer();
    ouvrir();
  } else if (touche === 'f' && e.ctrlKey && e.metaKey) {
    e.preventDefault();
    basculerPleinEcran();
  }
});

// --- Fenêtres de dialogue -------------------------------------------------
const dialogue = document.getElementById('dialogue');

function montrerDialogue(titre, contenuHtml, boutons = [{ libelle: 'Fermer' }]) {
  dialogue.innerHTML = '<h2>' + titre + '</h2><div class="contenu">' + contenuHtml + '</div><div class="boutons"></div>';
  const zone = dialogue.querySelector('.boutons');
  boutons.forEach(b => {
    const bouton = document.createElement('button');
    bouton.textContent = b.libelle;
    bouton.onclick = () => {
      if (b.action) b.action();
      dialogue.close();
    };
    zone.appendChild(bouton);
  });
  dialogue.showModal();
}

function informer(texte) {
  document.getElementById('etat').textContent = texte;
}

function changerNom(nom) {
  nomFichier = nom.replace(/\.boucles$/, '');
  document.title = 'RevLoop — ' + nomFichier;
  document.getElementById('nom-session').textContent = nomFichier;
}

// --- Fichier ---------------------------------------------------------------
function nouvelleSession() {
  montrerDialogue('Nouvelle session',
    '<p>Toutes les boucles et tous les réglages en cours seront effacés.</p>' +
    '<p>Pensez à <b>Sauvegarder</b> avant si vous voulez garder ce morceau.</p>',
    [
      { libelle: 'Annuler' },
      { libelle: 'Effacer et recommencer', action: () => {
        clearTimeout(minuteurSauvegarde);
        try { localStorage.removeItem(CLE_SAUVEGARDE); } catch (e) {}
        location.reload();
      }},
    ]);
}

// Ouvre un fichier .boucles choisi par l'utilisateur
async function ouvrir() {
  try {
    let texte, nom;
    if (window.showOpenFilePicker) {        // Chrome : vraie fenêtre « Ouvrir » du Mac
      const [poignee] = await showOpenFilePicker({ types: [TYPE_FICHIER] });
      const fichier = await poignee.getFile();
      texte = await fichier.text();
      nom = fichier.name;
      fichierActuel = poignee;
    } else {                                 // autre navigateur : sélecteur classique
      const fichier = await choisirFichierClassique();
      if (!fichier) return;
      texte = await fichier.text();
      nom = fichier.name;
      fichierActuel = null;
    }
    const nombre = appliquerSession(JSON.parse(texte));
    changerNom(nom);
    informer('« ' + nomFichier + ' » ouvert : ' + nombre + ' boucle(s), à l’arrêt — frappez leur pad pour les relancer.');
  } catch (e) {
    if (e.name === 'AbortError') return;     // l'utilisateur a cliqué sur Annuler
    montrerDialogue('Impossible d’ouvrir ce fichier', '<p>' + e.message + '</p>');
  }
}

function choisirFichierClassique() {
  return new Promise(resolve => {
    const champ = document.createElement('input');
    champ.type = 'file';
    champ.accept = '.boucles,.json';
    champ.onchange = () => resolve(champ.files[0]);
    champ.click();
  });
}

// Sauvegarder : réécrit le fichier ouvert, ou demande où l'enregistrer la 1re fois
async function sauvegarderFichier() {
  if (!fichierActuel) return sauvegarderSous();
  try {
    await ecrire(fichierActuel);
  } catch (e) {
    sauvegardeImpossible(e);
  }
}

async function sauvegarderSous() {
  try {
    if (window.showSaveFilePicker) {        // Chrome : vraie fenêtre « Enregistrer » du Mac
      const poignee = await showSaveFilePicker({
        suggestedName: nomFichier + '.boucles',
        types: [TYPE_FICHIER],
      });
      fichierActuel = poignee;
      changerNom(poignee.name);
      await ecrire(poignee);
    } else {                                 // autre navigateur : téléchargement
      telecharger();
    }
  } catch (e) {
    sauvegardeImpossible(e);
  }
}

function telecharger() {
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([JSON.stringify(construireSession())], { type: 'application/json' }));
  lien.download = nomFichier + '.boucles';
  lien.click();
  // sur iPhone, l'application propose « Enregistrer dans Fichiers » : c'est vous qui choisissez où
  informer(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.midi
    ? 'Choisissez où enregistrer la session.' : 'Session enregistrée dans votre dossier Téléchargements.');
}

// Plan de secours : si l'écriture est refusée (droits du système, application…), on ne perd
// rien : la session part dans le dossier Téléchargements.
function sauvegardeImpossible(e) {
  if (e.name === 'AbortError') return;       // l'utilisateur a cliqué sur Annuler
  if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
    fichierActuel = null;
    telecharger();
    return;
  }
  montrerDialogue('Impossible de sauvegarder', '<p>' + e.message + '</p>');
}

async function ecrire(poignee) {
  const flux = await poignee.createWritable();
  await flux.write(JSON.stringify(construireSession(), null, 1));
  await flux.close();
  informer('Sauvegardé dans « ' + poignee.name + ' ».');
}

function ouvrirOptions() {
  montrerDialogue('Options',
    '<label>Durée de l’appui long pour réenregistrer un pad : <b id="val-appui">' + options.appuiLong + ' s</b>' +
    '<input type="range" id="opt-appui" min="1" max="5" step="0.5" value="' + options.appuiLong + '"></label>' +
    '<label>Volume général : <b id="val-volume">' + options.volumeGeneral + ' %</b>' +
    '<input type="range" id="opt-volume" min="0" max="100" value="' + options.volumeGeneral + '"></label>');
  document.getElementById('opt-appui').oninput = e => {
    options.appuiLong = Number(e.target.value);
    sauvegarderOptions();
    document.getElementById('val-appui').textContent = options.appuiLong + ' s';
  };
  document.getElementById('opt-volume').oninput = e => {
    reglerVolumeGeneral(Number(e.target.value));
    document.getElementById('val-volume').textContent = options.volumeGeneral + ' %';
  };
}

// Chrome interdit à une page de fermer son propre onglet : on sauvegarde,
// puis on explique comment fermer. Dans l'application Electron, Quitter fermera vraiment.
function quitter() {
  sauvegarder();
  window.close();
  setTimeout(() => montrerDialogue('Quitter',
    '<p>Votre session est sauvegardée automatiquement.</p>' +
    '<p>Chrome ne permet pas à une page de se fermer elle-même : fermez l’onglet avec <b>⌘W</b>.</p>' +
    '<p>Dans la future application Mac/Windows, ce menu fermera directement le logiciel.</p>'), 200);
}

// --- Édition ---------------------------------------------------------------
function effacerSelection() {
  const b = boucleSelectionnee();
  const f = familles[familleActive];
  montrerDialogue('Effacer la boucle',
    '<p>Effacer la boucle <b>' + f.nom + ' — pad ' + b.numero + '</b> et ses réglages d’effets ?</p>',
    [{ libelle: 'Annuler' }, { libelle: 'Effacer', action: () => effacerBoucle(b, true) }]);
}

function effacerFamille() {
  const f = familles[familleActive];
  montrerDialogue('Effacer toute la famille',
    '<p>Effacer les 4 boucles de la famille <b>' + f.nom + '</b> ?</p>',
    [{ libelle: 'Annuler' }, { libelle: 'Tout effacer', action: () => f.boucles.forEach(b => effacerBoucle(b, true)) }]);
}

// --- Choix de l'instrument d'une boucle -------------------------------------
// Un clic sur le bouton 🎹 d'une boucle la sélectionne et ouvre la liste,
// rangée par catégorie. L'instrument actuel est coché.
function ouvrirChoixInstrument(numero) {
  selectionner(numero);
  const f = familles[familleActive];
  const actuel = instrumentDe(f, boucleSelectionnee());
  const sons = sonsDeLaFamille(f);       // seulement les sons qui ont leur place dans cette famille
  const categories = [...new Set(sons.map(i => i.categorie))];
  const html = categories.map(c =>
    '<h3>' + c + '</h3><div class="grille-instruments">' +
    sons.filter(i => i.categorie === c).map(i =>
      '<button class="' + (i.id === actuel ? 'actuel' : '') + '" ' +
      'onclick="choisirInstrument(\'' + i.id + '\'); dialogue.close()">' +
      (i.id === actuel ? '✓ ' : '') + i.nom + (i.id === f.instrument ? ' ★' : '') + '</button>'
    ).join('') + '</div>'
  ).join('') +
  '<p class="note">★ = le son de base de la famille ' + f.nom + '. Astuce : Shift + bouton central du MiniLab fait défiler cette liste.</p>';
  montrerDialogue('Instrument — ' + f.nom + ', pad ' + (numero + 1), html, [{ libelle: 'Annuler' }]);
}

// --- Affichage -------------------------------------------------------------
function basculerPleinEcran() {
  document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
}

function changerTaille(facteur) {
  options.tailleTexte = facteur;
  sauvegarderOptions();
  document.documentElement.style.setProperty('--echelle', facteur);   // tout l'écran suit (tailles en rem)
}

// --- Aide ------------------------------------------------------------------
function aideMiniLab() {
  montrerDialogue('Commandes du MiniLab 3',
    '<table>' +
    '<tr><td>Touches</td><td>Jouer et enregistrer (son de la famille active)</td></tr>' +
    '<tr><td>Bouton central (tourner)</td><td>Changer de famille (ou cliquer sur sa carte à l’écran)</td></tr>' +
    '<tr><td>Pads 1 à 4</td><td>Boucles de la famille : frapper = sélectionner + enregistrer, couper, relancer</td></tr>' +
    '<tr><td>Clic sur une boucle</td><td>La sélectionner sans changer son état</td></tr>' +
    '<tr><td>Bouton 🎹 d’une boucle</td><td>Choisir son instrument dans la liste</td></tr>' +
    '<tr><td>Shift + bouton central (tourner)</td><td>Changer l’instrument de la boucle sélectionnée</td></tr>' +
    '<tr><td>Shift + clic du bouton central</td><td>Sélectionner la boucle suivante (pad 1 → 2 → 3 → 4)</td></tr>' +
    '<tr><td>Potards</td><td>Agissent sur la boucle sélectionnée uniquement (cadre orange)</td></tr>' +
    '<tr><td>Pad tenu ' + options.appuiLong + ' s</td><td>Effacer la boucle et la réenregistrer</td></tr>' +
    '<tr><td>Pads 5 à 8</td><td>Actions de la famille (Édition › Réglages des pads)</td></tr>' +
    '<tr><td>Clic du bouton central</td><td>Mode 8 actions : les 8 pads deviennent des actions (re-clic pour revenir)</td></tr>' +
    '<tr><td>Arpège</td><td>Action de pad (pad 4 en mode 8 actions) : tenez un accord, il est joué en rythme. Touches tenues + bouton central tourné = vitesse. Réglages : Édition › Arpégiateur</td></tr>' +
    '<tr><td>À éviter</td><td>Shift + pad 1 (arpégiateur du clavier, pas calé sur les boucles) et Shift + pad 3 (change le mode du clavier)</td></tr>' +
    '<tr><td>Faders 1 à 4</td><td>Volume de chaque famille</td></tr>' +
    '<tr><td>Bande tactile gauche</td><td>Vibrato : plie la hauteur des notes jouées (±2 demi-tons), revient au relâchement. Enregistré dans la boucle avec les notes</td></tr>' +
    '<tr><td>Bande tactile droite</td><td>Volume de la boucle sélectionnée</td></tr>' +
    '<tr><td>Potards 1 à 4 (haut)</td><td>Filtre · Réverb · Chorus · Delay</td></tr>' +
    '<tr><td>Potards 5 à 8 (bas)</td><td>Saturation · Grain · Attaque · Mouvement</td></tr>' +
    '<tr><td>Rythme</td><td>Do = grosse caisse, Ré = caisse claire, Mi / Fa = charleston</td></tr>' +
    '</table>');
}

function aPropos() {
  montrerDialogue('À propos',
    '<p><b>RevLoop</b> : un looper simple, piloté par l’Arturia MiniLab 3.</p>' +
    '<p>Construit pas à pas, pour apprendre.</p>');
}

// --- Au chargement de la page ------------------------------------------------
construireBarre();
changerNom(nomFichier);
document.documentElement.style.setProperty('--echelle', options.tailleTexte);
