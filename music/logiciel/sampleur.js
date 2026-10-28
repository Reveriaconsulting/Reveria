// =============================================================================
//  RevLoop — le sampleur : vos propres sons, joués au clavier
// =============================================================================
// Édition › Sampleur… : on enregistre un son au micro (la voix, un objet…) ou on importe un
// fichier (WAV, MP3…). Le son devient un instrument de la catégorie « Mes sons », proposé dans
// toutes les familles : on le joue sur tout le clavier, plus aigu ou plus grave selon la touche.
//
//   début / fin     : on garde seulement le morceau utile (les silences sont retirés d'office)
//   note d'origine  : la touche où le son est joué tel quel ; « Détecter » la trouve toute seule
//   boucle          : le son tient tant que la touche est enfoncée : le début est joué une fois,
//                     puis la partie du milieu se répète, raccordée en fondu (sans « clic » ni à-coup)
//
// Les sons sont gardés sur l'appareil (IndexedDB) ; une session .boucles ne contient que leur
// nom : ouverte sur un autre appareil, la boucle reprend l'instrument de sa famille.

const DUREE_MAXI_ENREGISTREMENT = 20;  // secondes
const SEUIL_SILENCE = 0.02;            // en dessous, l'échantillon est considéré comme du silence

let sonEdite = null;                   // l'id du son affiché dans Édition › Sampleur…
let enregistrement = null;             // { flux, source, capteur, morceaux, debut } pendant l'enregistrement
let voixEcoute = null;

// --- Le rangement sur l'appareil (IndexedDB) ----------------------------------------
// Un son : { id, nom, taux, donnees (Float32Array mono), racine, debut, fin, boucle } (debut / fin en secondes)
let baseSons = null;
function ouvrirBase() {
  if (!baseSons) baseSons = new Promise((ok, echec) => {
    const demande = indexedDB.open('revloop-sons', 1);
    demande.onupgradeneeded = () => demande.result.createObjectStore('sons', { keyPath: 'id' });
    demande.onsuccess = () => ok(demande.result);
    demande.onerror = () => echec(demande.error);
  });
  return baseSons;
}

async function operationBase(mode, action) {
  const base = await ouvrirBase();
  return new Promise((ok, echec) => {
    const transaction = base.transaction('sons', mode);
    const demande = action(transaction.objectStore('sons'));
    transaction.oncomplete = () => ok(demande && demande.result);
    transaction.onerror = () => echec(transaction.error);
  });
}

const rangerSon = son => operationBase('readwrite', magasin => magasin.put({
  id: son.id, nom: son.nom, taux: son.taux, donnees: son.donnees, racine: son.racine, debut: son.debut, fin: son.fin, boucle: son.boucle,
}));
const oublierSon = id => operationBase('readwrite', magasin => magasin.delete(id));

// Les réglages changent souvent (curseurs) : on range le son une demi-seconde après le dernier changement
const minuteursRangement = {};
function rangerPlusTard(son) {
  clearTimeout(minuteursRangement[son.id]);
  minuteursRangement[son.id] = setTimeout(() => rangerSon(son).catch(e => console.warn(e)), 500);
}

// --- Un son devient un instrument ---------------------------------------------------
function inscrireSon(son) {
  son.tampon = audio.createBuffer(1, son.donnees.length, son.taux);
  son.tampon.copyToChannel(son.donnees, 0);
  const info = sonsPerso.find(i => i.id === son.id);
  if (info) info.nom = son.nom;
  else sonsPerso.push({ id: son.id, nom: son.nom, categorie: 'Mes sons', son });
  RANGEMENT[son.id] = 'RBNM';          // proposé dans les quatre familles
  instruments[son.id] = (note, vel, quand, sortie, attaque) => voixDuSon(son, note, vel, quand, sortie, attaque);
}

// Le son « tenu » d'un son en boucle, fabriqué une fois (et refait si début, fin ou boucle changent) :
// le morceau gardé jusqu'à 85 %, dont la fin est fondue avec ce qui précède le point de reprise (35 %).
// Arrivée au bout, la lecture repart au point de reprise : le raccord est inaudible.
function tamponTenu(son) {
  if (son.tenu) return son.tenu;
  const a = Math.round(son.debut * son.taux), b = Math.round(son.fin * son.taux);
  const reprise = a + Math.round((b - a) * 0.35), bout = a + Math.round((b - a) * 0.85);
  const fondu = Math.min(Math.round(son.taux * 0.08), Math.floor((bout - reprise) / 3));
  const donnees = son.donnees.slice(a, bout);
  for (let k = 0; k < fondu; k++) {
    const t = k / fondu;               // fondu à puissance constante : le volume ne creuse pas au raccord
    const i = donnees.length - fondu + k;
    donnees[i] = donnees[i] * Math.cos(t * Math.PI / 2) + son.donnees[reprise - fondu + k] * Math.sin(t * Math.PI / 2);
  }
  const tampon = audio.createBuffer(1, donnees.length, son.taux);
  tampon.copyToChannel(donnees, 0);
  son.tenu = { tampon, reprise: (reprise - a) / son.taux, bout: donnees.length / son.taux };
  return son.tenu;
}

// Une note jouée avec un son perso : lu plus vite ou plus lentement selon l'écart à la note d'origine
function voixDuSon(son, note, vel, quand, sortie, attaque) {
  const volume = audio.createGain();
  volume.gain.value = 0;
  volume.connect(sortie);
  const lecteur = audio.createBufferSource();
  lecteur.playbackRate.value = Math.pow(2, (note - son.racine) / 12);
  if (son.boucle) {
    const tenu = tamponTenu(son);
    lecteur.buffer = tenu.tampon;
    lecteur.loop = true;
    lecteur.loopStart = tenu.reprise;
    lecteur.loopEnd = tenu.bout;
    lecteur.start(quand, 0);
  } else {
    lecteur.buffer = son.tampon;
    lecteur.start(quand, son.debut);
  }
  lecteur.connect(volume);
  volume.gain.setValueAtTime(0, quand);
  volume.gain.linearRampToValueAtTime(vel / 127 * 0.9, quand + Math.max(0.005, attaque));
  const voix = { volume, sources: [lecteur], relache: 0.08 };
  if (!son.boucle) {                   // sans boucle, le son s'arrête à la fin du morceau gardé
    voix.fin = quand + (son.fin - son.debut) / lecteur.playbackRate.value;
    lecteur.stop(voix.fin);
  }
  return voix;
}

// Au démarrage (appelé par demarrer, moteur.js) : les sons rangés redeviennent des instruments
async function chargerSonsPerso() {
  try {
    const sons = await operationBase('readonly', magasin => magasin.getAll());
    for (const son of sons || []) inscrireSon(son);
  } catch (e) {
    console.warn('Sons perso illisibles :', e);
  }
}

// --- Fabriquer un son : micro ou fichier ---------------------------------------------
// Le silence du début et de la fin est retiré d'office (on peut le rajouter avec les curseurs)
function bornesUtiles(donnees, taux) {
  let debut = 0, fin = donnees.length - 1;
  while (debut < fin && Math.abs(donnees[debut]) < SEUIL_SILENCE) debut++;
  while (fin > debut && Math.abs(donnees[fin]) < SEUIL_SILENCE) fin--;
  const marge = Math.round(taux * 0.01);
  return [Math.max(0, debut - marge) / taux, Math.min(donnees.length, fin + marge) / taux];
}

// La hauteur du son, par autocorrélation (la période qui se répète le mieux, entre 60 et 1200 Hz).
// Renvoie le numéro de note MIDI le plus proche, ou null si le son n'a pas de hauteur nette.
function detecterNote(son) {
  const depart = Math.round((son.debut + Math.min(0.05, (son.fin - son.debut) / 4)) * son.taux);
  const n = Math.min(Math.round(son.taux * 0.4), son.donnees.length - depart);
  const d = son.donnees.subarray(depart, depart + n);
  const mini = Math.floor(son.taux / 1200), maxi = Math.floor(son.taux / 60);
  const scores = [];
  let meilleur = 0;
  for (let decalage = mini; decalage <= maxi && decalage < n / 2; decalage++) {
    let s = 0, e1 = 0, e2 = 0;
    for (let i = 0; i + decalage < n; i++) { s += d[i] * d[i + decalage]; e1 += d[i] * d[i]; e2 += d[i + decalage] * d[i + decalage]; }
    scores[decalage] = s / (Math.sqrt(e1 * e2) || 1);
    meilleur = Math.max(meilleur, scores[decalage]);
  }
  if (meilleur < 0.6) return null;
  // la plus courte période presque aussi bonne que la meilleure (sinon on tombe une octave trop bas)
  const periode = scores.findIndex((r, k) => r !== undefined && r >= meilleur * 0.9 && r >= (scores[k - 1] ?? -1) && r >= (scores[k + 1] ?? -1));
  return Math.round(69 + 12 * Math.log2(son.taux / periode / 440));
}

async function creerSon(donnees, taux, nom) {
  const [debut, fin] = bornesUtiles(donnees, taux);
  // boucle par défaut : comme les autres instruments, le son tient tant que la touche est enfoncée
  const son = { id: 'mon-son-' + Date.now(), nom, taux, donnees, debut, fin, boucle: true, racine: 60 };
  son.racine = detecterNote(son) ?? 60;
  inscrireSon(son);
  sonEdite = son.id;
  try {
    await rangerSon(son);
  } catch (e) {
    informer('Le son est utilisable, mais n’a pas pu être gardé sur l’appareil : ' + e.message);
  }
  afficherSampleur();
}

const nomLibre = base => {
  let k = 1;
  while (sonsPerso.some(i => i.nom === base + ' ' + k)) k++;
  return base + ' ' + k;
};

// Un son à plusieurs canaux (stéréo) est ramené à un seul
function enMono(tampon) {
  const mono = new Float32Array(tampon.length);
  for (let c = 0; c < tampon.numberOfChannels; c++) {
    const canal = tampon.getChannelData(c);
    for (let i = 0; i < mono.length; i++) mono[i] += canal[i] / tampon.numberOfChannels;
  }
  return mono;
}

async function importerFichier(fichier) {
  try {
    const tampon = await audio.decodeAudioData(await fichier.arrayBuffer());
    await creerSon(enMono(tampon), tampon.sampleRate, fichier.name.replace(/\.[^.]+$/, '').slice(0, 40));
  } catch (e) {
    montrerErreurSampleur('Ce fichier n’a pas pu être lu comme un son (formats courants : WAV, MP3, M4A).');
  }
}

// Le micro est demandé seulement au moment où l'on clique sur « Enregistrer »
async function commencerEnregistrement() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    montrerErreurSampleur('Le micro n’est pas disponible ici. Vous pouvez importer un fichier son à la place.');
    return;
  }
  let flux;
  try {
    flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch (e) {
    montrerErreurSampleur('Le micro a été refusé. Pour l’autoriser : Réglages › RevLoop › Micro (iPhone), ou Réglages Système › Confidentialité › Micro (Mac).');
    return;
  }
  // On capte les échantillons bruts, sans compression : le son est gardé tel qu'il est entré
  const source = audio.createMediaStreamSource(flux);
  const capteur = audio.createScriptProcessor(4096, 1, 1);
  const muet = audio.createGain();
  muet.gain.value = 0;                 // le capteur doit être relié à la sortie pour tourner, sans s'entendre
  enregistrement = { flux, source, capteur, muet, morceaux: [], debut: audio.currentTime };
  capteur.onaudioprocess = e => {
    if (!enregistrement) return;
    enregistrement.morceaux.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    const duree = audio.currentTime - enregistrement.debut;
    const compteur = document.getElementById('compteur-rec');
    if (compteur) compteur.textContent = duree.toFixed(1).replace('.', ',') + ' s';
    if (duree >= DUREE_MAXI_ENREGISTREMENT) arreterEnregistrement();
  };
  source.connect(capteur);
  capteur.connect(muet);
  muet.connect(audio.destination);
  afficherSampleur();
}

async function arreterEnregistrement() {
  const r = enregistrement;
  if (!r) return;
  enregistrement = null;
  r.source.disconnect();
  r.capteur.disconnect();
  r.muet.disconnect();
  r.flux.getTracks().forEach(piste => piste.stop());
  const total = r.morceaux.reduce((n, m) => n + m.length, 0);
  const donnees = new Float32Array(total);
  let position = 0;
  for (const m of r.morceaux) { donnees.set(m, position); position += m.length; }
  if (!donnees.some(v => Math.abs(v) >= SEUIL_SILENCE)) {
    montrerErreurSampleur('Rien n’a été entendu : l’enregistrement est vide. Vérifiez le micro et recommencez.');
    return;
  }
  await creerSon(donnees, audio.sampleRate, nomLibre('Mon son'));
}

async function supprimerSon(id) {
  const i = sonsPerso.findIndex(s => s.id === id);
  if (i >= 0) sonsPerso.splice(i, 1);
  delete instruments[id];
  delete RANGEMENT[id];
  sonEdite = sonsPerso.length ? sonsPerso[0].id : null;
  try { await oublierSon(id); } catch (e) { console.warn(e); }
  afficher();                          // une boucle qui l'utilisait reprend l'instrument de sa famille
  afficherSampleur();
}

function ecouter(son) {
  if (voixEcoute) relacherVoix(voixEcoute, audio.currentTime, true);
  voixEcoute = voixDuSon(son, son.racine, 110, audio.currentTime, sortieGenerale, 0);
  if (son.boucle) setTimeout(() => relacherVoix(voixEcoute, audio.currentTime), 2000);   // une boucle s'écoute 2 s
}

// --- La page « Sampleur » (menu Édition) ----------------------------------------------
let erreurSampleur = '';
function montrerErreurSampleur(texte) {
  erreurSampleur = texte;
  afficherSampleur();
}

function ouvrirSampleur() {
  if (!audio) { informer('Cliquez d’abord sur « Démarrer ».'); return; }
  if (!sonEdite && sonsPerso.length) sonEdite = sonsPerso[0].id;
  erreurSampleur = '';
  montrerDialogue('Sampleur — mes sons', '<div id="sampleur"></div>', [{ libelle: 'Fermer' }]);
  afficherSampleur();
}

const echapperSampleur = texte => String(texte).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function afficherSampleur() {
  const zone = document.getElementById('sampleur');
  if (!zone) return;
  const info = sonsPerso.find(i => i.id === sonEdite);
  const son = info && info.son;

  let html = '<div class="ligne-reglage-pad">' + (enregistrement
    ? '<span class="rec">● Enregistrement… <b id="compteur-rec">0,0 s</b></span><button id="sampleur-stop">■ Arrêter</button>'
    : '<button id="sampleur-rec">● Enregistrer au micro</button><button id="sampleur-import">Importer un fichier…</button>') + '</div>';
  if (erreurSampleur) html += '<p class="erreur">' + echapperSampleur(erreurSampleur) + '</p>';

  html += '<h3>Mes sons</h3>' + (sonsPerso.length
    ? '<div class="grille-instruments">' + sonsPerso.map(i => '<button data-son="' + i.id + '" class="' + (i.id === sonEdite ? 'actuel' : '') + '">' +
        echapperSampleur(i.nom) + '</button>').join('') + '</div>'
    : '<p class="note">Aucun son pour l’instant. Enregistrez votre voix ou un objet, ou importez un fichier.</p>');

  if (son) {
    const duree = son.donnees.length / son.taux;
    const notes = Array.from({ length: 61 }, (_, k) => 36 + k)
      .map(n => '<option value="' + n + '"' + (n === son.racine ? ' selected' : '') + '>' + nomNote(n) + '</option>').join('');
    html += '<h3>Réglages</h3>' +
      '<label>Nom <input id="son-nom" value="' + echapperSampleur(son.nom) + '"></label>' +
      '<canvas id="son-onde" height="90"></canvas>' +
      '<label>Début : <b id="val-debut"></b><input type="range" id="son-debut" min="0" max="' + duree + '" step="0.005" value="' + son.debut + '"></label>' +
      '<label>Fin : <b id="val-fin"></b><input type="range" id="son-fin" min="0" max="' + duree + '" step="0.005" value="' + son.fin + '"></label>' +
      '<div class="ligne-reglage-pad"><span>Note d’origine</span><select id="son-racine">' + notes + '</select>' +
      '<button id="son-detecter">Détecter</button></div>' +
      '<label class="case"><input type="checkbox" id="son-boucle"' + (son.boucle ? ' checked' : '') + '> ' +
      'Tenir : le son dure tant que la touche est enfoncée (décochez pour un son joué une seule fois, comme une percussion)</label>' +
      '<div class="ligne-reglage-pad"><button id="son-ecouter">▶ Écouter</button>' +
      '<button id="son-utiliser">Utiliser pour la boucle sélectionnée</button>' +
      '<button id="son-supprimer">Supprimer ce son</button></div>' +
      '<p class="note">Ce son est aussi dans la liste des instruments de chaque pad, catégorie « Mes sons ».</p>';
  }
  zone.innerHTML = html;

  const sur = (id, f) => { const e = document.getElementById(id); if (e) e.onclick = f; };
  sur('sampleur-rec', () => { erreurSampleur = ''; commencerEnregistrement(); });
  sur('sampleur-stop', arreterEnregistrement);
  sur('sampleur-import', () => {
    const champ = document.createElement('input');
    champ.type = 'file';
    champ.accept = 'audio/*,.wav,.mp3,.m4a,.aif,.aiff';
    champ.onchange = () => { erreurSampleur = ''; if (champ.files[0]) importerFichier(champ.files[0]); };
    champ.click();
  });
  zone.querySelectorAll('[data-son]').forEach(b => b.onclick = () => { sonEdite = b.dataset.son; afficherSampleur(); });
  if (!son) return;

  document.getElementById('son-nom').onchange = e => {
    son.nom = e.target.value.trim().slice(0, 40) || son.nom;
    info.nom = son.nom;
    rangerPlusTard(son);
    afficher();
    afficherSampleur();
  };
  const debut = document.getElementById('son-debut'), fin = document.getElementById('son-fin');
  const majBornes = () => {
    son.debut = Math.min(Number(debut.value), son.fin - 0.02);
    son.fin = Math.max(Number(fin.value), son.debut + 0.02);
    debut.value = son.debut;
    fin.value = son.fin;
    document.getElementById('val-debut').textContent = son.debut.toFixed(2).replace('.', ',') + ' s';
    document.getElementById('val-fin').textContent = son.fin.toFixed(2).replace('.', ',') + ' s';
    son.tenu = null;                   // le son tenu sera refait avec les nouvelles bornes
    dessinerOnde(son);
    rangerPlusTard(son);
  };
  debut.oninput = majBornes;
  fin.oninput = majBornes;
  majBornes();
  document.getElementById('son-racine').onchange = e => { son.racine = Number(e.target.value); rangerPlusTard(son); };
  sur('son-detecter', () => {
    const note = detecterNote(son);
    if (note === null) { montrerErreurSampleur('Pas de note nette dans ce son (bruit, percussion…) : choisissez-la à l’oreille.'); return; }
    son.racine = Math.max(36, Math.min(96, note));
    erreurSampleur = '';
    rangerPlusTard(son);
    afficherSampleur();
  });
  document.getElementById('son-boucle').onchange = e => { son.boucle = e.target.checked; son.tenu = null; rangerPlusTard(son); };
  sur('son-ecouter', () => ecouter(son));
  sur('son-utiliser', () => { choisirInstrument(son.id); informer('« ' + son.nom + ' » joue maintenant sur la boucle ' + boucleSelectionnee().numero + '.'); });
  let confirmation = false;
  sur('son-supprimer', e => {
    if (!confirmation) { confirmation = true; e.target.textContent = 'Confirmer la suppression'; return; }
    supprimerSon(son.id);
  });
}

// La forme du son, avec la partie gardée (entre début et fin) en couleur
function dessinerOnde(son) {
  const toile = document.getElementById('son-onde');
  if (!toile) return;
  const largeur = toile.width = toile.clientWidth * (window.devicePixelRatio || 1);
  const hauteur = toile.height = 90 * (window.devicePixelRatio || 1);
  const g = toile.getContext('2d');
  const total = son.donnees.length, parColonne = Math.max(1, Math.floor(total / largeur));
  const debut = son.debut * son.taux, fin = son.fin * son.taux;
  for (let x = 0; x < largeur; x++) {
    let mini = 1, maxi = -1;
    const i0 = Math.floor(x * total / largeur);
    for (let i = i0; i < i0 + parColonne && i < total; i++) { mini = Math.min(mini, son.donnees[i]); maxi = Math.max(maxi, son.donnees[i]); }
    g.fillStyle = i0 >= debut && i0 <= fin ? COULEURS_ECRAN[familleActive] : 'rgba(143, 195, 245, 0.25)';
    g.fillRect(x, (1 - maxi) / 2 * hauteur, 1, Math.max(1, (maxi - mini) / 2 * hauteur));
  }
}

// Fermer la fenêtre pendant un enregistrement l'arrête (le son est gardé)
dialogue.addEventListener('close', () => { if (enregistrement) arreterEnregistrement(); });
