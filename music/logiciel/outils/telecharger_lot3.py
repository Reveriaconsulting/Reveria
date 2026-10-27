"""Lot 3 : les sons synthé de FreePats (nappes, leads, cordes et cuivres synthé, ambiances,
piano DX7, basse synthé, batterie électronique). Tous en CC0 (aucun auteur à citer).
Ajoute ou remplace ces instruments dans logiciel/sons/instruments.json sans toucher aux autres.

Usage : python3 -I telecharger_lot3.py <dossier sons> <dossier temporaire>

Réutilise les outils du lot 2 (lecture SFZ, conversion AAC, réglage du volume, reprise après arrêt).
"""
import importlib.util, json, os, shutil, sys

_spec = importlib.util.spec_from_file_location('lot2', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'telecharger_lot2.py'))
lot2 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(lot2)
SONS, TEMP = lot2.SONS, lot2.TEMP

GH = 'https://github.com/freepats/'
# (id, nom, catégorie, archive, durée gardée en secondes : plus longue pour les nappes qui tiennent)
SYNTHES = [
    ('nappe-choeur', 'Nappe chœur', 'Synthwave', GH + 'synth-pad-choir/releases/download/2020-05-16/SynthPadChoir-SFZ+FLAC-20200516.7z', 12),
    ('nappe-sweep', 'Nappe balayée', 'Synthwave', GH + 'sweep-pad/releases/download/2019-08-13/SweepPad-SFZ+FLAC-20190813.7z', 12),
    ('nappe-new-age', 'Nappe New Age', 'Ambient', GH + 'new-age/releases/download/2019-07-30/NewAge-SFZ+FLAC-20190730.7z', 12),
    ('nappe-archet', 'Nappe à l’archet', 'Ambient', GH + 'synth-pad-bowed/releases/download/2019-07-19/SynthPadBowed-SFZ+FLAC-20190719.7z', 12),
    ('cordes-synthe-1', 'Cordes synthé 1', 'Synthwave', GH + 'synth-strings-1/releases/download/2020-05-28/SynthStrings1-SFZ+FLAC-20200528.7z', 10),
    ('cordes-synthe-2', 'Cordes synthé 2', 'Synthwave', GH + 'synth-strings-2/releases/download/2020-05-28/SynthStrings2-SFZ+FLAC-20200528.7z', 10),
    ('cuivres-synthe-1', 'Cuivres synthé 1', 'Synthwave', GH + 'synth-brass-1/releases/download/2021-04-26/SynthBrass1-SFZ+FLAC-20210426.7z', 8),
    ('cuivres-synthe-2', 'Cuivres synthé 2', 'Synthwave', GH + 'synth-brass-2/releases/download/2024-06-10/SynthBrass2-SFZ+FLAC-20240610.7z', 8),
    ('ambiance-film', 'Ambiance bande originale', 'Ambient', GH + 'synth-soundtrack/releases/download/20200521/SynthSoundtrack-SFZ+FLAC-20200521.7z', 12),
    ('ambiance-scifi', 'Ambiance science-fiction', 'Ambient', GH + 'synth-scifi/releases/download/2020-05-17/SynthSciFi-SFZ+FLAC-20200517.7z', 12),
    ('ambiance-gobelins', 'Ambiance « gobelins »', 'Ambient', GH + 'synth-goblins/releases/download/2020-06-12/SynthGoblins-SFZ+FLAC-20200612.7z', 12),
    ('lead-carre', 'Lead carré', 'Synthwave', GH + 'synth-square/releases/download/2020-05-12/SynthSquare-SFZ+FLAC-20200512.7z', 8),
    ('lead-calliope', 'Lead calliope', 'Synthwave', GH + 'synth-calliope/releases/download/2020-05-12/SynthCalliope-SFZ+FLAC-20200512.7z', 8),
    ('lead-quintes', 'Lead en quintes', 'Synthwave', GH + 'synth-fifths/releases/download/2020-05-19/SynthFifths-SFZ+FLAC-20200519.7z', 8),
    ('lead-basse', 'Lead basse + lead', 'Synthwave', GH + 'synth-bass-lead/releases/download/2020-05-22/SynthBassLead-SFZ+FLAC-20200522.7z', 8),
    ('cristal', 'Cristal', 'Ambient', GH + 'synth-crystal/releases/download/2019-08-12/SynthCrystal-SFZ+FLAC-20190812.7z', 8),
    ('piano-dx7', 'Piano DX7 « E. Piano 1 »', 'Synthwave', GH + 'fm-piano1/releases/download/2019-09-16/FM-Piano1-SFZ+FLAC-20190916.7z', 8),
    ('basse-synthe-1', 'Basse synthé 1', 'Synthwave', GH + 'synth-bass-1/releases/download/2019-07-23/SynthBass1-SFZ+FLAC-20190723.7z', 6),
]

# La batterie électronique : un son par note de la gamme, comme les autres batteries
BATTERIE = ('batterie-electronique', 'Batterie électronique',
            'https://freepats.zenvoid.org/Percussion/SynthesizerPercussion/SynthesizerPercussion-SFZ-20220718.7z', [
                (0, 'Kick04.wav'),             # Do : grosse caisse
                (1, 'Claves01.wav'),           # Do# : claves
                (2, 'Snare09.wav'),            # Ré : caisse claire
                (3, 'Clap01.wav'),             # Ré# : claps
                (4, 'ClosedHiHat01-01.wav'),   # Mi : charleston fermé
                (5, 'OpenHiHat02-01.wav'),     # Fa : charleston ouvert
                (6, 'LowTom02-01.wav'),        # Fa# : tom grave
                (7, 'MidTom02-01.wav'),        # Sol : tom médium
                (8, 'HighTom02-01.wav'),       # Sol# : tom aigu
                (9, 'Cymbal01-01.wav'),        # La : cymbale
                (10, 'Shaker04.wav'),          # La# : shaker
                (11, 'Snare14.wav'),           # Si : 2e caisse claire
            ])


def batterie(ident, nom, url, sons):
    dossier = os.path.join(TEMP, ident)
    os.makedirs(dossier, exist_ok=True)
    if not any(f.endswith('.wav') for _, _, fs in os.walk(dossier) for f in fs):
        archive = lot2.telecharger(url, os.path.join(dossier, 'archive.7z'))
        lot2.subprocess.run(['bsdtar', '-xf', archive, '-C', dossier])
        os.remove(archive)
    fichiers = {f: os.path.join(r, f) for r, _, fs in os.walk(dossier) for f in fs}
    regions = []
    for classe, nom_fichier in sons:
        fichier = f'{ident}/{classe}.m4a'
        lot2.convertir(fichiers[nom_fichier], os.path.join(SONS, fichier), 5 if classe == 9 else 3)
        regions.append({'fichier': fichier, 'cle': classe, 'debut': 0, 'hauteur': 0})
    shutil.rmtree(dossier)
    return lot2.instrument(ident, nom, 'Batteries', regions, kit=True)


nouveaux = []
def une_fois(ident, fabriquer):
    note = os.path.join(TEMP, f'fait-{ident}.json')
    if os.path.exists(note):
        nouveaux.append(json.load(open(note)))
        return
    entree = fabriquer()
    json.dump(entree, open(note, 'w'))
    nouveaux.append(entree)

for ident, nom, categorie, url, duree in SYNTHES:
    une_fois(ident, lambda: lot2.freepats(ident, nom, categorie, url, duree=duree))
une_fois(BATTERIE[0], lambda: batterie(*BATTERIE))

# Volumes égalisés (mesurés sur un accord de 4 notes pendant 3 s, comparés aux altos du lot 2 ≈ 0,15) :
# les sons tenus sortaient 1,5 à 3,5 fois plus fort. Valeurs en dB, ajoutées au gain de chaque instrument.
NIVEAUX = {'nappe-choeur': -4.7, 'nappe-sweep': -5.0, 'nappe-new-age': -1.8, 'nappe-archet': -3.7, 'cordes-synthe-1': -4.9, 'cordes-synthe-2': -3.6, 'cuivres-synthe-1': -7.1, 'cuivres-synthe-2': -5.2, 'ambiance-film': -3.1, 'ambiance-scifi': -4.2, 'ambiance-gobelins': -4.7, 'lead-carre': -7.3, 'lead-calliope': -10.0, 'lead-quintes': -4.0, 'lead-basse': -6.1, 'cristal': -10.7, 'piano-dx7': -2.7, 'basse-synthe-1': -1.3, 'batterie-electronique': -4.0}
for inst in nouveaux:
    for r in inst['regions']:
        r['volume'] = round(r['volume'] + NIVEAUX.get(inst['id'], 0), 1)

chemin = os.path.join(SONS, 'instruments.json')
catalogue = [i for i in json.load(open(chemin)) if i['id'] not in {n['id'] for n in nouveaux}]
with open(chemin, 'w') as f:
    json.dump(catalogue + nouveaux, f, ensure_ascii=False, indent=1)
print('Catalogue écrit :', len(catalogue + nouveaux), 'instruments')
