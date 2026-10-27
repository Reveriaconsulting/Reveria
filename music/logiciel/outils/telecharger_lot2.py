"""Lot 2 : les instruments réels (guitares, basses, pianos, orchestre, vents, batteries).
Tous en CC0 (domaine public, aucun auteur à citer). Ajoute ou remplace ces instruments
dans logiciel/sons/instruments.json sans toucher aux autres.

Usage : python3 -I telecharger_lot2.py <dossier sons> <dossier temporaire>

Pour chaque note, un seul enregistrement est gardé (la vélocité du milieu), raccourci
et compressé en AAC (.m4a) avec ffmpeg. Les archives sont effacées dès qu'elles sont traitées.
"""
import json, os, re, shutil, subprocess, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

SONS, TEMP = sys.argv[1], sys.argv[2]
os.makedirs(TEMP, exist_ok=True)
NOTES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(nom, do_central=4):
    """'A#4' → 70 (Do4 = 60, convention SFZ). VSCO utilise Do3 = 60 : do_central=3."""
    if str(nom).lstrip('-').isdigit():
        return int(nom)
    m = re.fullmatch(r'([A-Ga-g])([#b]?)(-?\d)', nom)
    n = NOTES[m.group(1).upper()] + {'#': 1, 'b': -1, '': 0}[m.group(2)]
    return n + (int(m.group(3)) + 5 - do_central) * 12


def lire(url):
    req = urllib.request.Request(urllib.parse.quote(url, safe=':/?=&%+'), headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as r:
        return r.read()


def telecharger(url, chemin):
    if not os.path.exists(chemin):
        with open(chemin, 'wb') as f:
            f.write(lire(url))
    return chemin


def convertir(entree, sortie, duree_maxi):
    """Raccourcit (avec un fondu de fin) et compresse en AAC."""
    os.makedirs(os.path.dirname(sortie), exist_ok=True)
    fondu = f'afade=t=out:st={duree_maxi - 0.4}:d=0.4'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', entree, '-t', str(duree_maxi), '-af', fondu,
                    '-c:a', 'aac', '-b:a', '160k', sortie], check=True)


def crete(chemin):
    """Niveau le plus fort du fichier, en dB (0 = maximum)."""
    r = subprocess.run(['ffmpeg', '-v', 'info', '-i', chemin, '-af', 'volumedetect', '-f', 'null', '-'],
                       capture_output=True, text=True)
    m = re.search(r'max_volume: (-?[\d.]+) dB', r.stderr)
    return float(m.group(1)) if m else 0.0


def instrument(ident, nom, categorie, regions, kit=False, relache=None):
    """Même gain pour toutes les notes d'un instrument : son enregistrement le plus fort arrive à −3 dB."""
    gain = -3 - max(crete(os.path.join(SONS, r['fichier'])) for r in regions)
    for r in regions:
        r['volume'] = round(gain, 1)
    entree = {'id': ident, 'nom': nom, 'categorie': categorie, 'regions': sorted(regions, key=lambda r: r['cle'])}
    if kit:
        entree['kit'] = True
    if relache:
        entree['relache'] = relache            # durée naturelle de l'extinction, en secondes
    print(f'{nom:28s} {len(regions):3d} sons, gain {gain:+.1f} dB', flush=True)
    return entree


# --- 1. FreePats : archives .7z au format SFZ + FLAC ----------------------------------
def lire_sfz(chemin):
    """Les régions d'un fichier SFZ : les réglages de <global>/<group> s'appliquent aux <region> suivantes."""
    texte = re.sub(r'//[^\n]*', '', open(chemin, encoding='utf-8', errors='replace').read())
    regions, niveaux, actuel = [], {'global': {}, 'master': {}, 'group': {}, 'control': {}}, None
    for balise, corps in re.findall(r'<(\w+)>([^<]*)', texte):
        reglages = dict(re.findall(r'(\w+)=(.*?)(?=\s+\w+=|\s*$)', corps.strip(), flags=re.S))
        if balise == 'region':
            r = {**niveaux['control'], **niveaux['global'], **niveaux['master'], **niveaux['group'], **reglages}
            regions.append(r)
        else:
            niveaux[balise] = reglages
            if balise == 'global':
                niveaux['master'] = niveaux['group'] = {}
            if balise == 'master':
                niveaux['group'] = {}
    return regions


def freepats(ident, nom, categorie, url, choisir_sfz=None, duree=8, correction=0, prises=0):
    """prises = 0 : un seul son par note (force moyenne).
    prises > 0 : on garde toutes les forces de frappe, et jusqu'à « prises » enregistrements
    différents de la même note, que le logiciel fait alterner (le jeu sonne moins mécanique)."""
    dossier = os.path.join(TEMP, ident)
    os.makedirs(dossier, exist_ok=True)
    if not any(f.lower().endswith('.sfz') for _, _, fs in os.walk(dossier) for f in fs):   # pas déjà décompressée
        archive = telecharger(url, os.path.join(dossier, 'archive.7z'))
        # check=False : certains fichiers annexes (bruits de frappe) utilisent une compression que
        # bsdtar ne lit pas ; on garde tout le reste et on saute les notes dont le son manque.
        subprocess.run(['bsdtar', '-xf', archive, '-C', dossier])
        os.remove(archive)
    sfzs = sorted(os.path.join(r, f) for r, _, fs in os.walk(dossier) for f in fs if f.lower().endswith('.sfz'))
    sfz = next((s for s in sfzs if choisir_sfz and re.search(choisir_sfz, os.path.basename(s), re.I)), sfzs[0])
    regions, vues, relache = [], {}, None
    for r in lire_sfz(sfz):
        if r.get('trigger') == 'release' or 'sample' not in r:
            continue
        vel = (int(r.get('lovel', 0)), int(r.get('hivel', 127)))
        if not prises and not (vel[0] <= 96 <= vel[1]):
            continue
        cle = midi(r.get('pitch_keycenter', r.get('key', '60')))
        groupe = (cle, vel) if prises else cle
        if vues.get(groupe, 0) >= max(prises, 1):
            continue
        vues[groupe] = vues.get(groupe, 0) + 1
        relache = relache or (float(r['ampeg_release']) if 'ampeg_release' in r else None)
        source = os.path.join(os.path.dirname(sfz), r.get('default_path', ''), r['sample'].replace('\\', '/'))
        if re.search(r'(chuck|tap)\.\w+$', source, re.I):     # bruits de frappe, pas des notes
            continue
        if not os.path.exists(source):
            print('   son manquant, ignoré :', os.path.basename(source), flush=True)
            continue
        regions.append((cle + correction, source, float(r.get('tune', 0)), vel if prises else None, vues[groupe]))
    sortie = []
    for cle, source, accord, vel, prise in regions:
        fichier = f'{ident}/{cle}-{vel[0]}-{prise}.m4a' if vel else f'{ident}/{cle}.m4a'
        try:
            convertir(source, os.path.join(SONS, fichier), duree)
        except subprocess.CalledProcessError:
            print('   son illisible, ignoré :', os.path.basename(source), flush=True)
            continue
        region = {'fichier': fichier, 'cle': cle, 'debut': 0, 'accord': -accord}
        if vel:
            region['vel'] = list(vel)
        sortie.append(region)
    shutil.rmtree(dossier)
    return instrument(ident, nom, categorie, sortie, relache=relache if prises else None)


FP = 'https://freepats.zenvoid.org/'
GH = 'https://github.com/freepats/'
FREEPATS = [
    ('guitare-classique', 'Guitare classique', 'Guitares', FP + 'Guitar/SpanishClassicalGuitar/SpanishClassicalGuitar-SFZ+FLAC-20190618.7z', None),
    ('ukulele', 'Ukulélé', 'Guitares', GH + 'ukulele1/releases/download/2026-08-11/Ukulele-SFZ+FLAC-20260811.7z', None),
    ('basse-doigts', 'Basse électrique (doigts)', 'Basses', GH + 'electric-bass-YR/releases/download/2019-09-30/FingerBassYR-SFZ+FLAC-20190930.7z', None),
    ('basse-mediator', 'Basse électrique (médiator)', 'Basses', GH + 'electric-bass-YR/releases/download/2019-09-30/PickedBassYR-SFZ+FLAC-20190930.7z', None),
    ('basse-lately', 'Basse « Lately » TX81Z', 'Synthwave', GH + 'lately-bass/releases/download/2024-04-09/LatelyBass-SFZ+FLAC-20240409.7z', None),
    ('basse-dx7', 'Basse DX7', 'Synthwave', GH + 'synth-bass-2/releases/download/2021-04-05/SynthBass2-SFZ+FLAC-20210405.7z', None),
    ('piano-droit', 'Piano droit', 'Claviers', FP + 'Piano/UprightPianoKW/UprightPianoKW-small-SFZ+FLAC-20190703.7z', None),
]

# --- 2. VSCO-2 CE et VCSL : fichiers WAV, un par note ------------------------------------
def arbre(depot, branche):
    return json.loads(lire(f'https://api.github.com/repos/{depot}/git/trees/{branche}?recursive=1'))['tree']


def par_notes(ident, nom, categorie, depot, branche, chemins, prefixe, filtre=None, do_central=4, duree=8):
    groupes = {}
    for x in chemins:
        p = x['path']
        if x['type'] != 'blob' or not p.startswith(prefixe) or not p.lower().endswith('.wav'):
            continue
        if filtre and not re.search(filtre, p):
            continue
        m = re.search(r'_([A-G]#?-?\d)(?=[_.])', os.path.basename(p))
        if m:
            groupes.setdefault(m.group(1), []).append(p)
    def traiter(item):
        note, variantes = item
        variantes.sort()
        p = variantes[len(variantes) // 2]                 # la vélocité du milieu
        cle = midi(note, do_central)
        fichier = f'{ident}/{cle}.m4a'
        if not os.path.exists(os.path.join(SONS, fichier)):
            wav = telecharger(f'https://raw.githubusercontent.com/{depot}/{branche}/' + p, os.path.join(TEMP, f'{ident}-{cle}.wav'))
            convertir(wav, os.path.join(SONS, fichier), duree)
            os.remove(wav)
        return {'fichier': fichier, 'cle': cle, 'debut': 0}
    with ThreadPoolExecutor(6) as ex:
        regions = list(ex.map(traiter, groupes.items()))
    return instrument(ident, nom, categorie, regions)


VSCO = [   # (id, nom, catégorie, dossier)
    ('violon-solo', 'Violon solo', 'Cordes', 'Strings/Solo Violin/Arco Vib/'),
    ('altos', 'Altos', 'Cordes', 'Strings/Viola Section/susvib/'),
    ('violons-pizz', 'Violons pizzicato', 'Cordes', 'Strings/Violin Section/Pizz/'),
    ('violons-tremolo', 'Violons trémolo', 'Cordes', 'Strings/Violin Section/Trem/'),
    ('hautbois', 'Hautbois', 'Vents', 'Woodwinds/Oboe/Vib/'),
    ('basson', 'Basson', 'Vents', 'Woodwinds/Bassoon/vib/'),
    ('piccolo', 'Piccolo', 'Vents', 'Woodwinds/Piccolo/Sus/'),
    ('trombone', 'Trombone', 'Cuivres', 'Brass/Tenor Trombone/vib/'),
    ('tuba', 'Tuba', 'Cuivres', 'Brass/Tuba/sus/'),
    ('trompette-bouchee', 'Trompette bouchée', 'Cuivres', 'Brass/Trumpet/straightM-sus/'),
]
VCSL_NOTES = [   # (id, nom, catégorie, dossier, filtre, durée gardée)
    ('piano-steinway', 'Piano Steinway B', 'Claviers', 'Chordophones/Zithers/Grand Piano, Steinway B/', r'NoSus_Close_.*_vl3_rr1', 10),
    ('harmonica', 'Harmonica', 'Vents', 'Aerophones/Free Aerophones/Harmonica-Hohner-Special20-C/', r'Normal_(?!rel)', 6),
    ('flute-a-bec', 'Flûte à bec', 'Vents', 'Aerophones/Edge-blown Aerophones/Baroque Alto Recorder/', r'(Sus|Vib)', 6),
]

# --- 3. Batteries : un son par note de la gamme (Do = grosse caisse…), comme la boîte à rythmes 80s
# (classe de note 0 à 11, dossier VCSL, fichier, décalage de hauteur en demi-tons)
M, I = 'Membranophones/Struck Membranophones/', 'Idiophones/Struck Idiophones/'
KITS = {
    ('batterie-acoustique', 'Batterie acoustique'): [
        (0, M + 'Bass Drum 1', 'BDrumNew_hit_v5_rr1_Sum.wav', 0),     # Do : grosse caisse
        (1, M + 'Snare Drum, Modern 1', 'Snare2_stick_v1_rr1_Mid.wav', 0),   # Do# : coup de bord
        (2, M + 'Snare Drum, Modern 1', 'Snare2_HitSN_v6_rr1_Mid.wav', 0),   # Ré : caisse claire
        (3, I + 'Claps', 'Clap_rr1.wav', 0),                              # Ré# : claps
        (4, I + 'Hi-Hat Cymbal', 'HiHat_HitC_v3_rr1_Mid.wav', 0),         # Mi : charleston fermé
        (5, I + 'Hi-Hat Cymbal', 'HiHat_HitO_rr1_Mid.wav', 0),            # Fa : charleston ouvert
        (6, M + 'Tom 2/Stick', 'TomL_HitS_v3_rr1_Mid.wav', 0),                  # Fa# : tom grave
        (7, M + 'Tom 1/Stick', 'TomH_HitS_v3_rr1_Mid.wav', -3),                 # Sol : tom médium
        (8, M + 'Tom 1/Stick', 'TomH_HitS_v3_rr1_Mid.wav', 0),                  # Sol# : tom aigu
        (9, I + 'Suspended Cymbal 1', 'susCymb1_hit_f1.wav', 0),          # La : cymbale
        (10, I + 'Cowbells', 'Cowbell1_Hit_v3_rr1_Mid.wav', 0),           # La# : cloche
        (11, I + 'Tambourine 1', 'Tamb1_Hit_v2_rr1_Mid.wav', 0),          # Si : tambourin
    ],
    ('percussions', 'Percussions du monde'): [
        (0, I + 'Cajon', 'Cajon_hit1_f_rr1.wav', 0),
        (1, M + 'Bongos', 'BongoH_Hit1_v2_rr1_Mid.wav', 0),
        (2, I + 'Cajon', 'Cajon_hit2_f_rr1.wav', 0),
        (3, I + 'Cajon', 'Cajon_hit3_f_rr1.wav', 0),
        (4, I + 'Shaker, Small', 'Mid_ShakerDouble_Down_rr1.wav', 0),
        (5, I + 'Tambourine 1', 'Tamb1_Shake_rr1_Mid.wav', 0),
        (6, M + 'Conga', 'Tumba_HitN_v2_rr1_Sum.wav', 0),
        (7, M + 'Conga', 'Conga_HitN_v2_rr1_Sum.wav', 0),
        (8, M + 'Conga', 'Quinto_HitN_v2_rr1_Sum.wav', 0),
        (9, M + 'Bongos', 'BongoL_Hit1_v2_rr1_Mid.wav', 0),
        (10, I + 'Cowbells', 'Cowbell2_Normal_v2_rr1_Mid.wav', 0),
        (11, I + 'Claves', 'Claves1_Hit_v2_rr1_Mid.wav', 0),
    ],
}


def kit(ident, nom, sons):
    regions = []
    for classe, dossier, fichier_vcsl, hauteur in sons:
        fichier = f'{ident}/{classe}.m4a'
        wav = telecharger('https://raw.githubusercontent.com/sgossner/VCSL/master/' + dossier + '/' + fichier_vcsl,
                          os.path.join(TEMP, f'{ident}-{classe}.wav'))
        convertir(wav, os.path.join(SONS, fichier), 5 if classe == 9 else 3)
        os.remove(wav)
        regions.append({'fichier': fichier, 'cle': classe, 'debut': 0, 'hauteur': hauteur})
    return instrument(ident, nom, 'Batteries', regions, kit=True)


# --- C'est parti ------------------------------------------------------------------------
# (le lot 3 importe ce fichier pour réutiliser ses outils : on ne lance le lot 2 que s'il est appelé directement)
def principal():
    # Chaque instrument terminé est noté dans le dossier temporaire : si le script s'arrête,
    # on le relance et il reprend là où il en était, sans tout retélécharger.
    nouveaux = []
    def une_fois(ident, fabriquer):
        note = os.path.join(TEMP, f'fait-{ident}.json')
        if os.path.exists(note):
            nouveaux.append(json.load(open(note)))
            return
        entree = fabriquer()
        json.dump(entree, open(note, 'w'))
        nouveaux.append(entree)

    # Guitares électriques (clean, jazz, saturée) retirées le 2026-10-26 : jouées au clavier, elles ne
    # sonnaient pas comme une guitare, même en banque complète et avec un ampli simulé.
    NATUREL = {}   # id → {'prises': n, 'duree': s} pour garder plusieurs forces et prises d'une banque
    for args in FREEPATS:
        une_fois(args[0], lambda: freepats(*args, **NATUREL.get(args[0], {})))
    vsco = arbre('sgossner/VSCO-2-CE', 'master')
    for ident, nom, categorie, prefixe in VSCO:
        une_fois(ident, lambda: par_notes(ident, nom, categorie, 'sgossner/VSCO-2-CE', 'master', vsco, prefixe, do_central=3))
    vcsl = arbre('sgossner/VCSL', 'master')
    for ident, nom, categorie, prefixe, filtre, duree in VCSL_NOTES:
        une_fois(ident, lambda: par_notes(ident, nom, categorie, 'sgossner/VCSL', 'master', vcsl, prefixe, filtre, duree=duree))
    for (ident, nom), sons in KITS.items():
        une_fois(ident, lambda: kit(ident, nom, sons))

    # Hauteurs vérifiées par analyse de fréquence (verifier_hauteur.py) : ces enregistrements
    # sonnent une octave plus haut ou plus bas que leur numéro de note.
    CORRECTIONS = {'violon-solo': -12, 'basse-dx7': -12, 'basse-lately': -12, 'harmonica': +12, 'flute-a-bec': +12}
    for inst in nouveaux:
        for r in inst['regions']:
            r['cle'] += CORRECTIONS.get(inst['id'], 0)

    chemin = os.path.join(SONS, 'instruments.json')
    catalogue = [i for i in json.load(open(chemin)) if i['id'] not in {n['id'] for n in nouveaux}]
    with open(chemin, 'w') as f:
        json.dump(catalogue + nouveaux, f, ensure_ascii=False, indent=1)
    print('Catalogue écrit :', len(catalogue + nouveaux), 'instruments')


if __name__ == '__main__':
    principal()
