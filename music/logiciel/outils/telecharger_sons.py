"""Télécharge les instruments libres (CC0 / domaine public) et écrit logiciel/sons/instruments.json.

Usage : python3 -I telecharger_sons.py <dossier sons> <dossier temporaire WAV>
"""
import json, os, re, subprocess, sys, urllib.parse, urllib.request, wave
from concurrent.futures import ThreadPoolExecutor

SONS, TEMP = sys.argv[1], sys.argv[2]
os.makedirs(SONS, exist_ok=True)
os.makedirs(TEMP, exist_ok=True)

NOTES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

def midi(nom, do_central=4):
    """'A#4' → 70 avec la convention Do4 = 60 (SFZ). Les fichiers Splendid et VSCO
    utilisent Do3 = 60 : on passe alors do_central=3 (vérifié par la tessiture réelle)."""
    m = re.fullmatch(r'([A-G])([#b]?)(-?\d)', nom)
    n = NOTES[m.group(1)] + {'#': 1, 'b': -1, '': 0}[m.group(2)]
    return n + (int(m.group(3)) + 5 - do_central) * 12

def lire(url):
    with urllib.request.urlopen(urllib.parse.quote(url, safe=':/?=&%')) as r:
        return r.read()

def telecharger(urls, chemin):
    """Télécharge la 1re adresse qui répond (certains manifestes répètent un dossier dans le chemin)."""
    if os.path.exists(chemin):
        return chemin
    for url in ([urls] if isinstance(urls, str) else urls):
        try:
            donnees = lire(url)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                continue
            raise
        with open(chemin, 'wb') as f:
            f.write(donnees)
        return chemin
    raise SystemExit(f'Introuvable : {urls}')

catalogue = []

# --- 1. Instruments au format « websfz » de danigb/samples (déjà en .ogg) ---------
WEBSFZ = [
    ('clavecin', 'Clavecin', 'Claviers', 'https://danigb.github.io/samples/vcsl/Zithers/harpsichord-french.websfz.json'),
    ('orgue', 'Orgue d’église', 'Claviers', 'https://danigb.github.io/samples/vcsl/Edge-blown Aerophones/pipe-organ-quiet.websfz.json'),
    ('piano-fm', 'Piano FM 80s', 'Synthwave', 'https://danigb.github.io/samples/vcsl/TX81Z/tx81z-fm-piano.websfz.json'),
    ('clavisynth', 'Clavisynth 80s', 'Synthwave', 'https://danigb.github.io/samples/vcsl/TX81Z/tx81z-clavisynth.websfz.json'),
    ('saxophone', 'Saxophone ténor', 'Vents', 'https://danigb.github.io/samples/vcsl/Reed Aerophones/tenor-saxophone-vibrato.websfz.json'),
    ('ocarina', 'Ocarina', 'Vents', 'https://danigb.github.io/samples/vcsl/Edge-blown Aerophones/ocarina-typical-sus.websfz.json'),
    ('contrebasse', 'Contrebasse (pizz.)', 'Cordes', 'https://danigb.github.io/samples/dsmolken/double-bass/dsmolkenrubnerbasspizz.websfz.json'),
    ('harpe', 'Harpe', 'Cordes', 'https://danigb.github.io/samples/vcsl/Composite Chordophones/concert-harp.websfz.json'),
    ('vibraphone', 'Vibraphone', 'Percussions mélodiques', 'https://danigb.github.io/samples/vcsl/Struck Idiophones/vibraphone-soft-mallets.websfz.json'),
    ('marimba', 'Marimba', 'Percussions mélodiques', 'https://danigb.github.io/samples/vcsl/Struck Idiophones/marimba.websfz.json'),
    ('glockenspiel', 'Glockenspiel', 'Percussions mélodiques', 'https://danigb.github.io/samples/vcsl/Struck Idiophones/glockenspiel.websfz.json'),
    ('kalimba', 'Kalimba', 'Percussions mélodiques', 'https://danigb.github.io/samples/vcsl/Plucked Idiophones/kalimba-tanzania.websfz.json'),
    ('cloches', 'Cloches tubulaires', 'Percussions mélodiques', 'https://danigb.github.io/samples/vcsl/Struck Idiophones/tubular-bells-2.websfz.json'),
]

def plage_velocite(r):
    lo = r.get('lovel', r.get('xfin_lovel', 0))
    hi = r.get('hivel', r.get('xfout_hivel', 127))
    return lo, hi

def instrument_websfz(ident, nom, categorie, url):
    d = json.loads(lire(url))
    licence = d['meta'].get('license', '')
    if 'Creative Commons 0' not in licence and 'Zero' not in licence:
        raise SystemExit(f'Licence refusée pour {nom} : {licence}')
    base = d['meta']['baseUrl']
    fmt = 'ogg'
    regions = []
    for g in d.get('groups', []):
        for r in g.get('regions', []):
            r = {**d.get('global', {}), **{k: v for k, v in g.items() if k != 'regions'}, **r}
            if r.get('trigger') == 'release' or 'sample' not in r:
                continue
            lo, hi = plage_velocite(r)
            if not (lo <= 96 <= hi):          # une seule couche de vélocité, la « moyenne-forte »
                continue
            cle = r.get('pitch_keycenter', r.get('key'))
            if cle is None:
                continue
            # la note centrale peut être un numéro (60) ou un nom (« C4 », Do4 = 60 en SFZ)
            cle = int(cle) if str(cle).lstrip('-').isdigit() else midi(str(cle)[0].upper() + str(cle)[1:])
            regions.append((r['sample'], cle, float(r.get('volume', 0)), int(r.get('offset', 0)) / 44100, float(r.get('tune', 0))))
    # une seule région par note centrale (la première trouvée)
    vues, gardees = set(), []
    for s, cle, vol, off, accord in sorted(regions, key=lambda x: x[1]):
        if cle in vues:
            continue
        vues.add(cle)
        gardees.append((s, cle, vol, off, accord))
    dossier = os.path.join(SONS, ident)
    os.makedirs(dossier, exist_ok=True)
    parent = base.rstrip('/').rsplit('/', 1)[0] + '/'
    taches = []
    sortie = []
    for s, cle, vol, off, accord in gardees:
        fichier = f'{ident}/{cle}.{fmt}'
        taches.append(([base + s + '.' + fmt, parent + s + '.' + fmt], os.path.join(SONS, fichier)))
        sortie.append({'fichier': fichier, 'cle': cle, 'volume': vol, 'debut': round(off, 4), 'accord': accord})
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(lambda t: telecharger(*t), taches))
    return {'id': ident, 'nom': nom, 'categorie': categorie, 'regions': sortie}

for args in WEBSFZ:
    inst = instrument_websfz(*args)
    print(f"{inst['nom']:22s} {len(inst['regions']):3d} échantillons", flush=True)
    catalogue.append(inst)

# --- 2. Piano à queue Splendid (domaine public), couche « Mf » ----------------------
arbre = json.loads(lire('https://api.github.com/repos/danigb/samples/git/trees/main?recursive=1'))['tree']
regions = []
os.makedirs(os.path.join(SONS, 'piano'), exist_ok=True)
taches = []
for x in arbre:
    m = re.fullmatch(r'audio/splendid-grand-piano/Mf-(.+)\.ogg', x['path'])
    if m:
        cle = midi(m.group(1), do_central=3)
        fichier = f'piano/{cle}.ogg'
        taches.append(('https://danigb.github.io/samples/splendid-grand-piano/Mf-' + m.group(1) + '.ogg', os.path.join(SONS, fichier)))
        regions.append({'fichier': fichier, 'cle': cle, 'volume': 0, 'debut': 0})
with ThreadPoolExecutor(8) as ex:
    list(ex.map(lambda t: telecharger(*t), taches))
regions.sort(key=lambda r: r['cle'])
catalogue.insert(0, {'id': 'piano', 'nom': 'Piano à queue', 'categorie': 'Claviers', 'regions': regions})
print(f"{'Piano à queue':22s} {len(regions):3d} échantillons", flush=True)

# --- 3. Orchestre VSCO-2 CE (CC0) : WAV → AAC (.m4a) avec l'outil afconvert du Mac ---
VSCO = [
    ('flute', 'Flûte', 'Vents', 'Woodwinds/Flute/susvib/'),
    ('clarinette', 'Clarinette', 'Vents', 'Woodwinds/Clarinet/susLong/'),
    ('violons', 'Violons', 'Cordes', 'Strings/Violin Section/susVib/'),
    ('violoncelles', 'Violoncelles', 'Cordes', 'Strings/Cello Section/susvib/'),
    ('trompette', 'Trompette', 'Cuivres', 'Brass/Trumpet/sus/'),
    ('cor', 'Cor', 'Cuivres', 'Brass/F Horn/sus/'),
]
arbre = json.loads(lire('https://api.github.com/repos/sgossner/VSCO-2-CE/git/trees/master?recursive=1'))['tree']
for ident, nom, categorie, prefixe in VSCO:
    fichiers = {}
    for x in arbre:
        p = x['path']
        if x['type'] != 'blob' or not p.startswith(prefixe) or not p.lower().endswith('.wav'):
            continue
        base = os.path.basename(p)
        m = re.search(r'_([A-G]#?-?\d)(?:_v(\d))?', base)
        if not m:
            continue
        note, vel = m.group(1), int(m.group(2) or 1)
        fichiers.setdefault(note, []).append((vel, p))
    os.makedirs(os.path.join(SONS, ident), exist_ok=True)
    regions = []
    def traiter(item):
        note, variantes = item
        variantes.sort()
        vel, p = variantes[len(variantes) // 2]          # la vélocité du milieu
        cle = midi(note, do_central=3)
        m4a = os.path.join(SONS, ident, f'{cle}.m4a')
        if not os.path.exists(m4a):                      # déjà converti : rien à retélécharger
            wav = os.path.join(TEMP, f'{ident}-{cle}.wav')
            telecharger('https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/' + p, wav)
            subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '160000', wav, m4a], check=True)
            os.remove(wav)
        return {'fichier': f'{ident}/{cle}.m4a', 'cle': cle, 'volume': 0, 'debut': 0}
    with ThreadPoolExecutor(6) as ex:
        regions = list(ex.map(traiter, fichiers.items()))
    regions.sort(key=lambda r: r['cle'])
    catalogue.append({'id': ident, 'nom': nom, 'categorie': categorie, 'regions': regions})
    print(f"{nom:22s} {len(regions):3d} échantillons", flush=True)

# --- 4. Corrections vérifiées à l'oreille… et à l'analyse de fréquence (hauteur.py) ---
# Certains échantillons sonnent une octave plus haut ou plus bas que leur numéro.
CORRECTIONS = {'piano-fm': -12, 'clavisynth': +12, 'glockenspiel': +12}
for inst in catalogue:
    decalage = CORRECTIONS.get(inst['id'], 0)
    for r in inst['regions']:
        r['cle'] += decalage
    if inst['id'] == 'contrebasse':      # au-dessus de Sol4, ce sont des bruitages, pas des notes
        inst['regions'] = [r for r in inst['regions'] if r['cle'] <= 67]

with open(os.path.join(SONS, 'instruments.json'), 'w') as f:
    json.dump(catalogue, f, ensure_ascii=False, indent=1)
print('Catalogue écrit :', len(catalogue), 'instruments')
