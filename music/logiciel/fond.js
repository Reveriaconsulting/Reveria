// =============================================================================
//  RevLoop — le fond d'écran : les nœuds de Reveria
// =============================================================================
// Des sphères bleues et grises, comme celles du logo Reveria, dérivent lentement
// derrière l'interface et se relient par des courbes quand elles se rapprochent.
// Le fond respire avec la musique : un petit élan à chaque quart de mesure
// (mesure.js) et une onde de la couleur de la famille à chaque touche jouée (moteur.js).

const COULEURS_NOEUDS = [            // les dégradés du logo : reflet, milieu, ombre
  ['#8FC3F5', '#4A8FD1', '#2A5F94'],   // bleu vif
  ['#7AB3E8', '#3B7DBF', '#255C8E'],   // bleu moyen
  ['#9CCBF7', '#4F8FCB', '#2E6699'],   // bleu clair
  ['#9BAEC2', '#6B8199', '#4A5C70'],   // gris
];
const MOYEU = ['#48576A', '#23303F', '#131C26'];   // le gros nœud sombre du centre du logo

const toile = document.createElement('canvas');
toile.id = 'fond-noeuds';
document.body.prepend(toile);
const pinceau = toile.getContext('2d');
const mouvementReduit = matchMedia('(prefers-reduced-motion: reduce)').matches;

let noeuds = [];
let ondes = [];
let elan = 0;                        // 0 = calme, 1 = juste après un temps fort
let largeur = 0, hauteur = 0, echelle = 1;

function creerNoeuds() {
  echelle = window.devicePixelRatio || 1;
  largeur = innerWidth; hauteur = innerHeight;
  toile.width = largeur * echelle; toile.height = hauteur * echelle;
  pinceau.setTransform(echelle, 0, 0, echelle, 0, 0);
  const taille = Math.min(largeur, hauteur) / 900;          // les nœuds suivent la taille de l'écran
  const nombre = Math.max(14, Math.min(46, Math.round(largeur * hauteur / 36000)));
  noeuds = Array.from({ length: nombre }, (_, i) => {
    const moyeu = i % 9 === 0;
    return {
      x: Math.random() * largeur, y: Math.random() * hauteur,
      vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
      r: (moyeu ? 15 + Math.random() * 7 : 4 + Math.random() * 9) * Math.max(0.75, taille * 1.5),
      couleurs: moyeu ? MOYEU : COULEURS_NOEUDS[i % COULEURS_NOEUDS.length],
      phase: Math.random() * Math.PI * 2,
    };
  });
}

// Une sphère au dégradé du logo, avec son petit reflet
function dessinerNoeud(n, lueur) {
  const [clair, milieu, ombre] = n.couleurs;
  const r = n.r * (1 + 0.12 * lueur);
  if (lueur > 0.02) {                        // halo quand la musique pousse
    const halo = pinceau.createRadialGradient(n.x, n.y, r * 0.5, n.x, n.y, r * 3.2);
    halo.addColorStop(0, 'rgba(79,143,203,' + (0.35 * lueur) + ')');
    halo.addColorStop(1, 'rgba(79,143,203,0)');
    pinceau.fillStyle = halo;
    pinceau.beginPath(); pinceau.arc(n.x, n.y, r * 3.2, 0, Math.PI * 2); pinceau.fill();
  }
  const g = pinceau.createRadialGradient(n.x - r * 0.3, n.y - r * 0.4, r * 0.1, n.x, n.y, r);
  g.addColorStop(0, clair); g.addColorStop(0.45, milieu); g.addColorStop(1, ombre);
  pinceau.fillStyle = g;
  pinceau.beginPath(); pinceau.arc(n.x, n.y, r, 0, Math.PI * 2); pinceau.fill();
  pinceau.fillStyle = 'rgba(255,255,255,0.22)';
  pinceau.beginPath(); pinceau.arc(n.x - r * 0.32, n.y - r * 0.36, r * 0.26, 0, Math.PI * 2); pinceau.fill();
}

function dessinerFond() {
  requestAnimationFrame(dessinerFond);
  pinceau.clearRect(0, 0, largeur, hauteur);
  elan *= 0.94;
  const distanceMax = Math.min(300, Math.max(160, largeur / 5));

  // Les liens : des courbes douces, comme la chaîne du logo (une sur trois en pointillés)
  pinceau.lineCap = 'round';
  for (let i = 0; i < noeuds.length; i++) {
    for (let j = i + 1; j < noeuds.length; j++) {
      const a = noeuds[i], b = noeuds[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > distanceMax) continue;
      const force = 1 - d / distanceMax;
      pinceau.strokeStyle = 'rgba(59,125,191,' + (force * (0.4 + 0.45 * elan)) + ')';
      pinceau.lineWidth = 0.6 + force * 2.2;
      pinceau.setLineDash((i + j) % 3 === 0 ? [4, 6] : []);
      const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.18, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.18;
      pinceau.beginPath(); pinceau.moveTo(a.x, a.y); pinceau.quadraticCurveTo(mx, my, b.x, b.y); pinceau.stroke();
    }
  }
  pinceau.setLineDash([]);

  // Les ondes des touches jouées
  ondes = ondes.filter(o => o.age < 1);
  for (const o of ondes) {
    o.age += 0.018;
    pinceau.strokeStyle = o.couleur + Math.round((1 - o.age) * 140).toString(16).padStart(2, '0');
    pinceau.lineWidth = 2.5 * (1 - o.age) + 0.5;
    pinceau.beginPath(); pinceau.arc(o.x, o.y, 10 + o.age * 180, 0, Math.PI * 2); pinceau.stroke();
  }

  // Les nœuds dérivent et rebondissent doucement sur les bords
  for (const n of noeuds) {
    if (!mouvementReduit) {
      n.x += n.vx * (1 + 3 * elan); n.y += n.vy * (1 + 3 * elan);
      if (n.x < -20 || n.x > largeur + 20) n.vx *= -1;
      if (n.y < -20 || n.y > hauteur + 20) n.vy *= -1;
      n.phase += 0.01;
    }
    dessinerNoeud(n, Math.max(elan, 0.15 + 0.15 * Math.sin(n.phase)) - 0.15);
  }
}

// Un temps fort (appelé par mesure.js à chaque quart de mesure)
function pulserFond(fort) {
  elan = Math.max(elan, fort ? 1 : 0.45);
}

// Une touche jouée : une onde part d'un nœud au hasard, à la couleur de la famille
function ondeFond(couleur) {
  if (!noeuds.length) return;
  const n = noeuds[Math.floor(Math.random() * noeuds.length)];
  ondes.push({ x: n.x, y: n.y, couleur, age: 0 });
  if (ondes.length > 12) ondes.shift();
  elan = Math.max(elan, 0.3);
}

addEventListener('resize', creerNoeuds);
creerNoeuds();
requestAnimationFrame(dessinerFond);
