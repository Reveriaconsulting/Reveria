// =============================================================================
//  RevLoop — les sons fabriqués en code : synthwave, ambient, arcade, batterie 80s
// =============================================================================
// Aucun fichier son ici : tout est calculé en direct avec des oscillateurs,
// comme sur les synthés des années 80. Ces sons sont donc 100 % libres de droits.
//
// Chaque instrument reçoit (note, vélocité, instant, sortie, attaque) et renvoie
// une « voix » { volume, sources, relache } — comme ceux de moteur.js.
// « attaque » (potard 7) peut seulement rallonger l'attaque naturelle du son.

// --- Petites briques communes -----------------------------------------------------

// Un oscillateur réglé sur une note, avec un léger désaccord (en centièmes de demi-ton)
function osc(forme, note, quand, sortie, desaccord = 0) {
  const o = audio.createOscillator();
  if (forme instanceof PeriodicWave) o.setPeriodicWave(forme); else o.type = forme;
  o.frequency.value = frequence(note);
  o.detune.value = desaccord;
  o.connect(sortie);
  o.start(quand);
  return o;
}

// Un filtre passe-bas, éventuellement avec une « enveloppe » : il s'ouvre de debut à pic
// pendant montee secondes, puis se referme vers fin en descente secondes
function filtrePasseBas(sortie, quand, { debut, pic = debut, fin = pic, montee = 0.01, descente = 0.3, resonance = 1 }) {
  const f = audio.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = resonance;
  f.frequency.setValueAtTime(debut, quand);
  if (pic !== debut) f.frequency.exponentialRampToValueAtTime(pic, quand + montee);
  if (fin !== pic) f.frequency.exponentialRampToValueAtTime(fin, quand + montee + descente);
  f.connect(sortie);
  return f;
}

// Un volume qui monte, puis redescend vers un niveau de maintien (comme un vrai synthé)
function enveloppeADS(quand, niveau, attaque, declin, maintien, sortie) {
  const v = audio.createGain();
  v.gain.value = 0;
  v.gain.setValueAtTime(0, quand);
  v.gain.linearRampToValueAtTime(niveau, quand + attaque);
  v.gain.setTargetAtTime(niveau * maintien, quand + attaque, declin / 3);
  v.connect(sortie);
  return v;
}

// Synthèse FM (celle du Yamaha DX7) : un oscillateur « modulateur » fait vibrer très vite
// la fréquence d'un oscillateur « porteur ». Plus l'indice est fort, plus le son est brillant.
// L'indice qui retombe après l'attaque donne le côté « cristallin » des pianos électriques 80s.
function pairFM(note, quand, sortie, { rapport, indice, indiceFin, chute }) {
  const f = frequence(note);
  const porteur = osc('sine', note, quand, sortie);
  const modulateur = audio.createOscillator();
  modulateur.frequency.value = f * rapport;
  const profondeur = audio.createGain();
  profondeur.gain.setValueAtTime(f * indice, quand);
  profondeur.gain.setTargetAtTime(f * indiceFin, quand, chute);
  modulateur.connect(profondeur).connect(porteur.frequency);
  modulateur.start(quand);
  return [porteur, modulateur];
}

// Ondes « pulse » des consoles 8 bits (NES, Game Boy) : un carré plus ou moins étroit
const ondesPulse = {};
function ondePulse(rapportCyclique) {
  if (!ondesPulse[rapportCyclique]) {
    const n = 64, reel = new Float32Array(n), imaginaire = new Float32Array(n);
    for (let k = 1; k < n; k++) reel[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * rapportCyclique);
    ondesPulse[rapportCyclique] = audio.createPeriodicWave(reel, imaginaire);
  }
  return ondesPulse[rapportCyclique];
}

// Un coup de « souffle » filtré (pour les percussions)
function souffle(quand, sortie, { type = 'highpass', frequence: f = 1000, duree }) {
  const s = audio.createBufferSource();
  s.buffer = bruit;
  const filtre = audio.createBiquadFilter();
  filtre.type = type;
  filtre.frequency.value = f;
  s.connect(filtre).connect(sortie);
  s.start(quand);
  s.stop(quand + duree);
  return s;
}

// --- Les instruments --------------------------------------------------------------
const instrumentsSynthes = {

  // ===== Synthwave =====

  // Nappe « Juno » : 3 dents de scie désaccordées + une octave grave, filtre qui s'ouvre doucement
  'juno-pad'(note, vel, quand, sortie, attaque) {
    const volume = enveloppeADS(quand, vel / 127 * 0.12, Math.max(0.25, attaque), 1.5, 0.8, sortie);
    const filtre = filtrePasseBas(volume, quand, { debut: 600, pic: 2600, fin: 1800, montee: 0.6, descente: 2 });
    const sources = [-11, 0, 9].map(d => osc('sawtooth', note, quand, filtre, d));
    sources.push(osc('square', note - 12, quand, filtre, 4));
    return { volume, sources, relache: 1.2 };
  },

  // Piano électrique FM, le son « cristallin » des ballades 80s (style DX7)
  'piano-fm-80s'(note, vel, quand, sortie, attaque) {
    const volume = enveloppeADS(quand, vel / 127 * 0.32, Math.max(0.003, attaque), 2.5, 0.25, sortie);
    const corps = pairFM(note, quand, volume, { rapport: 1, indice: 1.8 * vel / 127, indiceFin: 0.3, chute: 0.6 });
    const tintement = audio.createGain();
    tintement.gain.value = 0.25;
    tintement.connect(volume);
    const clochette = pairFM(note + 24, quand, tintement, { rapport: 3.5, indice: 2, indiceFin: 0, chute: 0.08 });
    return { volume, sources: [...corps, ...clochette], relache: 0.6 };
  },

  // Cuivres synthé 80s : deux dents de scie, filtre qui « souffle » à l'attaque
  'cuivres-80s'(note, vel, quand, sortie, attaque) {
    const volume = enveloppeADS(quand, vel / 127 * 0.22, Math.max(0.05, attaque), 0.6, 0.8, sortie);
    const filtre = filtrePasseBas(volume, quand, { debut: 300, pic: 900 + vel * 25, fin: 1400, montee: 0.12, descente: 0.5, resonance: 2 });
    return { volume, sources: [osc('sawtooth', note, quand, filtre, -7), osc('sawtooth', note, quand, filtre, 7)], relache: 0.25 };
  },

  // Lead doux : dent de scie + carré, léger vibrato
  'lead-doux'(note, vel, quand, sortie, attaque) {
    const volume = enveloppeADS(quand, vel / 127 * 0.18, Math.max(0.03, attaque), 0.4, 0.85, sortie);
    const filtre = filtrePasseBas(volume, quand, { debut: 2800, resonance: 1.5 });
    const a = osc('sawtooth', note, quand, filtre, -5);
    const b = osc('square', note, quand, filtre, 5);
    const vibrato = audio.createOscillator();
    vibrato.frequency.value = 5.5;
    const profondeur = audio.createGain();
    profondeur.gain.setValueAtTime(0, quand);
    profondeur.gain.linearRampToValueAtTime(12, quand + 0.6);   // le vibrato arrive après l'attaque
    vibrato.connect(profondeur);
    profondeur.connect(a.detune);
    profondeur.connect(b.detune);
    vibrato.start(quand);
    return { volume, sources: [a, b, vibrato], relache: 0.3 };
  },

  // Cloches FM : rapport non entier = son métallique, longue résonance
  'cloches-fm'(note, vel, quand, sortie, attaque) {
    const volume = enveloppeADS(quand, vel / 127 * 0.25, Math.max(0.002, attaque), 4, 0.05, sortie);
    return { volume, sources: pairFM(note, quand, volume, { rapport: 3.5, indice: 3, indiceFin: 0.2, chute: 1.2 }), relache: 2 };
  },

  // Basse analogique 80s : carré + scie une octave plus bas, filtre « pluck »
  'basse-80s'(note, vel, quand, sortie, attaque) {
    const volume = enveloppeADS(quand, vel / 127 * 0.28, Math.max(0.004, attaque), 0.5, 0.6, sortie);
    const filtre = filtrePasseBas(volume, quand, { debut: 200 + vel * 20, fin: 250, descente: 0.35, resonance: 5 });
    return { volume, sources: [osc('sawtooth', note - 12, quand, filtre), osc('square', note - 12, quand, filtre, 6)], relache: 0.1 };
  },

  // ===== Ambient =====

  // Nappe rêveuse : sinus et triangles très légèrement désaccordés, fondu lent
  'nappe-reve'(note, vel, quand, sortie, attaque) {
    const volume = enveloppeADS(quand, vel / 127 * 0.16, Math.max(1.2, attaque), 3, 0.9, sortie);
    const sources = [osc('sine', note, quand, volume, -4), osc('triangle', note, quand, volume, 4), osc('sine', note + 12, quand, volume, 7)];
    return { volume, sources, relache: 3 };
  },

  // Nappe de verre : FM très douce, scintillante
  'nappe-verre'(note, vel, quand, sortie, attaque) {
    const volume = enveloppeADS(quand, vel / 127 * 0.14, Math.max(0.8, attaque), 3, 0.85, sortie);
    const a = pairFM(note, quand, volume, { rapport: 2, indice: 0.8, indiceFin: 0.5, chute: 3 });
    const b = pairFM(note + 12, quand, volume, { rapport: 3, indice: 0.4, indiceFin: 0.2, chute: 3 });
    return { volume, sources: [...a, ...b], relache: 2.5 };
  },

  // Nappe sombre : scies filtrées très bas, pour les ambiances profondes
  'nappe-sombre'(note, vel, quand, sortie, attaque) {
    const volume = enveloppeADS(quand, vel / 127 * 0.2, Math.max(1.5, attaque), 3, 0.9, sortie);
    const filtre = filtrePasseBas(volume, quand, { debut: 250, pic: 700, fin: 450, montee: 2, descente: 4, resonance: 3 });
    return { volume, sources: [osc('sawtooth', note - 12, quand, filtre, -9), osc('sawtooth', note - 12, quand, filtre, 9)], relache: 3 };
  },

  // ===== Arcade (consoles 8 bits) =====

  'chip-carre'(note, vel, quand, sortie, attaque) {
    const volume = enveloppeADS(quand, vel / 127 * 0.16, Math.max(0.002, attaque), 0.3, 0.7, sortie);
    return { volume, sources: [osc(ondePulse(0.5), note, quand, volume)], relache: 0.03 };
  },
  'chip-pulse'(note, vel, quand, sortie, attaque) {
    const volume = enveloppeADS(quand, vel / 127 * 0.3, Math.max(0.002, attaque), 0.3, 0.7, sortie);
    return { volume, sources: [osc(ondePulse(0.125), note, quand, volume)], relache: 0.03 };
  },
  'chip-basse'(note, vel, quand, sortie, attaque) {
    const volume = enveloppeADS(quand, vel / 127 * 0.35, Math.max(0.002, attaque), 0.2, 0.9, sortie);
    return { volume, sources: [osc('triangle', note - 12, quand, volume)], relache: 0.02 };
  },

  // Percussions 8 bits : le grave fait « boum », l'aigu fait « tss »
  'chip-batterie'(note, vel, quand, sortie) {
    const volume = audio.createGain();
    volume.gain.value = 0;
    volume.connect(sortie);
    const grave = note % 12 < 2;
    const duree = grave ? 0.18 : note % 12 < 4 ? 0.12 : 0.04;
    const sources = [souffle(quand, volume, { type: grave ? 'lowpass' : 'highpass', frequence: grave ? 400 : note % 12 < 4 ? 1500 : 6000, duree })];
    volume.gain.setValueAtTime(vel / 127 * (grave ? 3.5 : 0.7), quand);
    volume.gain.exponentialRampToValueAtTime(0.001, quand + duree);
    return { volume, sources, percussif: true, fin: quand + duree };
  },

  // ===== Boîte à rythmes 80s =====
  // Do = grosse caisse 808 · Do# = rimshot · Ré = caisse claire · Ré# = clap · Mi = charleston fermé
  // Fa = charleston ouvert · Fa#, Sol, Sol# = toms · La = crash · La# = cowbell · Si = clap
  'batterie-80s'(note, vel, quand, sortie) {
    const volume = audio.createGain();
    volume.gain.value = 0;
    volume.connect(sortie);
    const sources = [];
    let duree;
    const sorte = ['grosse', 'rim', 'claire', 'clap', 'charley', 'ouvert', 'tom', 'tom', 'tom', 'crash', 'cowbell', 'clap'][note % 12];
    // Chaque percussion a son propre niveau, pour qu'elles sonnent à peu près aussi fort (sans saturer)
    const dosage = { grosse: 1.1, rim: 1, claire: 0.6, clap: 1.8, charley: 1, ouvert: 0.8, tom: 1.1, crash: 0.7, cowbell: 0.55 }[sorte];
    const niveau = vel / 127 * 0.8 * dosage;
    if (sorte === 'grosse' || sorte === 'tom') {
      // Une onde sinus qui plonge : la grosse caisse 808, ou un tom électronique
      const hauteur = sorte === 'grosse' ? 55 : [0, 0, 0, 0, 0, 0, 90, 120, 160][note % 12];
      duree = sorte === 'grosse' ? 0.9 : 0.5;
      const o = audio.createOscillator();
      o.frequency.setValueAtTime(hauteur * 2.5, quand);
      o.frequency.exponentialRampToValueAtTime(hauteur, quand + 0.08);
      o.connect(volume);
      o.start(quand);
      o.stop(quand + duree);
      sources.push(o);
    } else if (sorte === 'claire' || sorte === 'rim') {
      // Un « ton » + du souffle : la caisse claire 80s (la réverb de la boucle fait le reste)
      duree = sorte === 'claire' ? 0.3 : 0.08;
      const o = audio.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(sorte === 'claire' ? 190 : 420, quand);
      o.connect(volume);
      o.start(quand);
      o.stop(quand + duree);
      sources.push(o);
      if (sorte === 'claire') sources.push(souffle(quand, volume, { frequence: 1800, duree }));
    } else if (sorte === 'clap') {
      // Trois petits coups rapprochés, puis une traîne
      duree = 0.35;
      for (const decalage of [0, 0.012, 0.024]) sources.push(souffle(quand + decalage, volume, { type: 'bandpass', frequence: 1200, duree: 0.02 }));
      sources.push(souffle(quand + 0.036, volume, { type: 'bandpass', frequence: 1200, duree: 0.3 }));
    } else if (sorte === 'cowbell') {
      duree = 0.4;
      for (const f of [540, 800]) {
        const o = audio.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        o.connect(volume);
        o.start(quand);
        o.stop(quand + duree);
        sources.push(o);
      }
    } else {
      // Charleston et cymbale : du souffle très aigu, plus ou moins long
      duree = { charley: 0.06, ouvert: 0.45, crash: 1.6 }[sorte];
      sources.push(souffle(quand, volume, { frequence: sorte === 'crash' ? 5000 : 8000, duree }));
    }
    volume.gain.setValueAtTime(niveau, quand);
    volume.gain.exponentialRampToValueAtTime(0.001, quand + duree);
    return { volume, sources, percussif: true, fin: quand + duree };
  },
};

Object.assign(instruments, instrumentsSynthes);

// Ajout à la liste des instruments (menu à l'écran et Shift + bouton central)
SONS_DE_SYNTHESE.push(
  { id: 'juno-pad', nom: 'Nappe analogique 80s', categorie: 'Synthwave' },
  { id: 'piano-fm-80s', nom: 'Piano électrique FM', categorie: 'Synthwave' },
  { id: 'cuivres-80s', nom: 'Cuivres synthé 80s', categorie: 'Synthwave' },
  { id: 'lead-doux', nom: 'Lead doux', categorie: 'Synthwave' },
  { id: 'cloches-fm', nom: 'Cloches FM', categorie: 'Synthwave' },
  { id: 'basse-80s', nom: 'Basse analogique 80s', categorie: 'Synthwave' },
  { id: 'nappe-reve', nom: 'Nappe rêveuse', categorie: 'Ambient' },
  { id: 'nappe-verre', nom: 'Nappe de verre', categorie: 'Ambient' },
  { id: 'nappe-sombre', nom: 'Nappe sombre', categorie: 'Ambient' },
  { id: 'chip-carre', nom: 'Carré 8 bits', categorie: 'Arcade' },
  { id: 'chip-pulse', nom: 'Pulse 8 bits', categorie: 'Arcade' },
  { id: 'chip-basse', nom: 'Basse triangle 8 bits', categorie: 'Arcade' },
  { id: 'chip-batterie', nom: 'Percussions 8 bits', categorie: 'Arcade' },
  { id: 'batterie-80s', nom: 'Boîte à rythmes 80s', categorie: 'Batteries' },
);
