// =============================================================================
//  RevLoop — l'application Mac / Windows (Electron)
// =============================================================================
// Electron emballe la page web du dossier « logiciel » dans une vraie application :
// une icône, une fenêtre, un menu Mac, un vrai « Quitter », et plus besoin de Chrome
// ni du petit serveur. Le logiciel lui-même ne change pas : c'est le même code.
//
// Les fichiers sont servis par une adresse interne « app://boucles/… » (au lieu de
// http://localhost:8765) : le logiciel peut ainsi charger ses sons comme sur le web.

const { app, BrowserWindow, Menu, protocol, net, session, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// Où se trouve le logiciel : dans l'application une fois assemblée, sinon à côté de ce dossier
const LOGICIEL = app.isPackaged
  ? path.join(process.resourcesPath, 'logiciel')
  : path.join(__dirname, '..', 'logiciel');

// L'adresse interne doit se comporter comme un vrai site (fetch, stockage, son)
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

function creerFenetre() {
  const fenetre = new BrowserWindow({
    width: 1440, height: 900, minWidth: 800, minHeight: 500,
    backgroundColor: '#060a12',        // le bleu nuit du logiciel, pas d'éclair blanc à l'ouverture
    title: 'RevLoop',
    show: false,
    webPreferences: {
      // Les boucles sont cadencées par des minuteurs : ils ne doivent jamais ralentir,
      // même quand la fenêtre est cachée ou réduite (sinon les boucles se décalent).
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  fenetre.once('ready-to-show', () => fenetre.show());
  fenetre.loadURL('app://boucles/index.html');
  // Un lien vers un site externe s'ouvre dans le navigateur, pas dans l'application
  fenetre.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function menuMac() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'RevLoop',
      submenu: [
        { role: 'about', label: 'À propos de RevLoop' },
        { type: 'separator' },
        { role: 'hide', label: 'Masquer RevLoop' },
        { role: 'hideOthers', label: 'Masquer les autres' },
        { role: 'unhide', label: 'Tout afficher' },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter RevLoop' },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' },
        { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'togglefullscreen', label: 'Plein écran' },
        { type: 'separator' },
        { role: 'reload', label: 'Recharger' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
      ],
    },
    { role: 'windowMenu', label: 'Fenêtre' },
  ]));
}

app.setAboutPanelOptions({ applicationName: 'RevLoop', applicationVersion: app.getVersion(), copyright: 'Reveria Consulting' });

app.whenReady().then(() => {
  // app://boucles/sons/piano/60.ogg → le fichier logiciel/sons/piano/60.ogg
  // (on ignore le « ?v=… » que le logiciel ajoute pour éviter les vieilles versions en mémoire)
  protocol.handle('app', requete => {
    const chemin = decodeURIComponent(new URL(requete.url).pathname);
    const fichier = path.normalize(path.join(LOGICIEL, chemin));
    if (!fichier.startsWith(LOGICIEL)) return new Response('Interdit', { status: 403 });
    return net.fetch(pathToFileURL(fichier).toString());
  });

  // Le MiniLab : le MIDI et les messages spéciaux (SysEx) pour les couleurs des pads et l'écran.
  // fileSystem : Fichier › Sauvegarder écrit le fichier .boucles choisi dans la fenêtre « Enregistrer ».
  // media : le micro du sampleur (Édition › Sampleur…), demandé seulement au clic sur « Enregistrer ».
  const autorises = new Set(['midi', 'midiSysex', 'fileSystem', 'media']);
  session.defaultSession.setPermissionRequestHandler((_, permission, repondre) => repondre(autorises.has(permission)));
  session.defaultSession.setPermissionCheckHandler((_, permission) => autorises.has(permission));

  // Plan de secours de Fichier › Sauvegarder : la session va droit dans Téléchargements
  session.defaultSession.on('will-download', (_, element) => {
    element.setSavePath(path.join(app.getPath('downloads'), element.getFilename()));
  });

  menuMac();
  creerFenetre();
});

// Une seule fenêtre : la fermer quitte l'application (même sur Mac)
app.on('window-all-closed', () => app.quit());
