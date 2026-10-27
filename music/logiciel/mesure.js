// =============================================================================
//  RevLoop — la jauge de mesure : où en est-on dans la boucle de référence ?
// =============================================================================
// La « mesure », c'est la durée de la 1re boucle enregistrée (la référence).
// La jauge la découpe en 4 quarts pour donner des repères visuels, et chaque
// boucle en lecture a aussi sa propre fine barre d'avancement.
// L'animation tourne en continu (environ 60 fois par seconde, au rythme de l'écran).

const QUARTS = 4;
let phasePrecedente = 0;
let quartPrecedent = -1;

// Reste d'une division toujours positif (le « modulo » des musiciens : on tourne en rond)
const modulo = (x, m) => ((x % m) + m) % m;

function animerMesure() {
  requestAnimationFrame(animerMesure);
  if (!audio) return;

  // Le son sort des enceintes un tout petit peu après avoir été calculé :
  // on retire ce délai pour que l'image tombe pile avec ce qu'on entend.
  const t = audio.currentTime - (audio.outputLatency || 0);
  const piste = document.getElementById('mesure-piste');
  const remplissage = document.getElementById('mesure-remplissage');
  const info = document.getElementById('mesure-info');
  const enCours = toutesLesBoucles().find(({ b }) => b.etat === 'enregistrement');
  document.getElementById('mesure-rec').hidden = !enCours;

  if (reference === 0) {
    // Pas encore de mesure : soit on attend, soit on enregistre la toute 1re boucle
    piste.classList.toggle('attente', !!enCours);
    remplissage.style.width = '0%';
    marquerQuart(-1);
    info.textContent = enCours
      ? 'Enregistrement de la mesure de référence… ' + (t - enCours.b.debut).toFixed(1) + ' s'
      : 'La 1re boucle enregistrée fixera la mesure';
  } else if (!toutesLesBoucles().some(({ b }) => b.etat === 'lecture')) {
    // Toutes les boucles sont à l'arrêt : la jauge se met en pause.
    // Le calcul continue en coulisse, pour qu'elle reprenne bien calée
    // dès qu'une boucle est relancée (les boucles reprennent « en place »).
    piste.classList.remove('attente');
    remplissage.style.width = '0%';
    marquerQuart(-1);
    info.textContent = 'En pause — ' + reference.toFixed(2) + ' s par mesure';
    phasePrecedente = 0;
  } else {
    piste.classList.remove('attente');
    const phase = modulo(t - origineReference, reference) / reference;   // de 0 (début) à 1 (fin)
    remplissage.style.width = (phase * 100).toFixed(2) + '%';
    const quart = Math.floor(phase * QUARTS);
    marquerQuart(quart);
    if (quart !== quartPrecedent) pulserFond(quart === 0);   // le fond respire à chaque temps (fond.js)
    quartPrecedent = quart;
    info.textContent = (phase * reference).toFixed(1) + ' / ' + reference.toFixed(2) + ' s';

    // Un petit éclair à chaque nouveau tour : c'est le « temps 1 »
    if (phase < phasePrecedente) {
      piste.classList.add('eclair');
      setTimeout(() => piste.classList.remove('eclair'), 160);
    }
    phasePrecedente = phase;
  }

  // Les fines barres sous chaque boucle de la famille affichée
  familles[familleActive].boucles.forEach((b, i) => {
    const barre = document.getElementById('avance-' + i);
    if (!barre) return;
    barre.style.width = b.etat === 'lecture'
      ? (modulo(t - b.debut, b.duree) / b.duree * 100).toFixed(2) + '%'
      : '0%';
  });
}

function marquerQuart(actif) {
  document.querySelectorAll('#mesure-piste .quart').forEach((q, i) => q.classList.toggle('actif', i === actif));
}

requestAnimationFrame(animerMesure);
