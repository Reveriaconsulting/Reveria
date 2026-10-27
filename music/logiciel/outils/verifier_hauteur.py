"""Estime la note réelle d'un fichier son (autocorrélation) pour vérifier les numéros de notes.
Usage : python3 -I hauteur.py <dossier sons> <temp> id:cle [id:cle ...]"""
import aifc, math, os, struct, subprocess, sys

SONS, TEMP = sys.argv[1], sys.argv[2]
os.makedirs(TEMP, exist_ok=True)

def frequence(chemin):
    wav = os.path.join(TEMP, 'test.aif')
    subprocess.run(['afconvert', '-f', 'AIFF', '-d', 'BEI16@22050', '-c', '1', chemin, wav], check=True)
    w = aifc.open(wav)
    n = w.getnframes()
    w.setpos(min(n // 4, 11025))                # un peu après l'attaque
    brut = w.readframes(4096)
    x = struct.unpack('>%dh' % (len(brut) // 2), brut)
    sr = w.getframerate()
    # Autocorrélation normalisée, puis le PREMIER pic proche du maximum :
    # évite de prendre deux périodes pour une (erreur d'une octave vers le grave).
    lags = range(int(sr / 2000), int(sr / 25))
    corr = {}
    for d in lags:
        a = x[:len(x) - d]
        b = x[d:]
        num = sum(p * q for p, q in zip(a[::2], b[::2]))
        den = math.sqrt(sum(p * p for p in a[::2]) * sum(q * q for q in b[::2])) or 1
        corr[d] = num / den
    maxi = max(corr.values())
    for d in lags:
        if corr[d] >= 0.9 * maxi and corr[d] >= corr.get(d - 1, -1) and corr[d] >= corr.get(d + 1, -1):
            return sr / d

for arg in sys.argv[3:]:
    ident, cle = arg.split(':')
    fichier = next(f for f in os.listdir(os.path.join(SONS, ident)) if f.startswith(cle + '.'))
    f = frequence(os.path.join(SONS, ident, fichier))
    note = 69 + 12 * math.log2(f / 440)
    print(f'{ident:12s} cle {cle:>3s} → {f:7.1f} Hz ≈ note {note:5.1f}  (écart {note - int(cle):+.1f})')
