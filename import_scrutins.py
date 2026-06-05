"""
import_scrutins.py
Importe les scrutins AN 17e + votes nominatifs dans parlement.db.
Télécharge Scrutins.json.zip si nécessaire.
Usage : python3 import_scrutins.py
"""

import json
import glob
import os
import sqlite3
import zipfile
import urllib.request

# ─── Chemins ──────────────────────────────────────────────────────────────────
DB_PATH      = "/mnt/user-data/outputs/parlement.db"
ZIP_PATH     = "/tmp/scrutins_an.zip"
EXTRACT_DIR  = "/tmp/scrutins_an"
SCRUTINS_URL = "http://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip"

# ─── Téléchargement ───────────────────────────────────────────────────────────
if not os.path.exists(f"{EXTRACT_DIR}/json"):
    if not os.path.exists(ZIP_PATH):
        print("Téléchargement Scrutins.json.zip...", flush=True)
        urllib.request.urlretrieve(SCRUTINS_URL, ZIP_PATH)
        print(f"  ✓ {os.path.getsize(ZIP_PATH)//1024//1024} MB")
    print("Extraction...", flush=True)
    with zipfile.ZipFile(ZIP_PATH) as z:
        z.extractall(EXTRACT_DIR)
    print(f"  ✓ {len(os.listdir(EXTRACT_DIR + '/json'))} fichiers")

# ─── Connexion DB ─────────────────────────────────────────────────────────────
con = sqlite3.connect(DB_PATH)
con.execute("PRAGMA journal_mode=WAL")
con.execute("PRAGMA synchronous=NORMAL")
cur = con.cursor()

# ─── Schéma ───────────────────────────────────────────────────────────────────
cur.executescript("""
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS scrutins;

CREATE TABLE scrutins (
    uid                 TEXT PRIMARY KEY,
    chambre             TEXT NOT NULL DEFAULT 'AN',
    numero              INTEGER,
    legislature         INTEGER,
    date                TEXT,
    titre               TEXT,
    type_vote_code      TEXT,
    type_vote_libelle   TEXT,
    sort                TEXT,    -- 'adopté' | 'rejeté'
    pour                INTEGER,
    contre              INTEGER,
    abstentions         INTEGER,
    non_votants         INTEGER,
    votants             INTEGER,
    suffrages           INTEGER
);

CREATE TABLE votes (
    scrutin_uid         TEXT NOT NULL,
    acteur_uid          TEXT NOT NULL,
    position            TEXT NOT NULL,  -- 'pour' | 'contre' | 'abstention' | 'nonVotant'
    par_delegation      INTEGER DEFAULT 0,
    PRIMARY KEY (scrutin_uid, acteur_uid),
    FOREIGN KEY (scrutin_uid) REFERENCES scrutins(uid)
);

CREATE INDEX idx_votes_acteur   ON votes(acteur_uid);
CREATE INDEX idx_votes_scrutin  ON votes(scrutin_uid);
CREATE INDEX idx_votes_position ON votes(position);
CREATE INDEX idx_scrutins_date  ON scrutins(date);
CREATE INDEX idx_scrutins_sort  ON scrutins(sort);
""")
con.commit()

# ─── Parsing ──────────────────────────────────────────────────────────────────
def extract_votants(dn_section):
    """Extrait la liste d'acteurRef depuis un bloc decompteNominatif[section]."""
    if not dn_section:
        return []
    votant = dn_section.get("votant", [])
    if isinstance(votant, dict):
        votant = [votant]
    return votant or []

POSITION_MAP = {
    "pours":                  "pour",
    "contres":                "contre",
    "abstentions":            "abstention",
    "nonVotants":             "nonVotant",
    "nonVotantsVolontaires":  "nonVotantVolontaire",
}

print("Import des scrutins AN...", flush=True)

scrutins_batch = []
votes_batch    = []
BATCH_SIZE     = 500

files = sorted(glob.glob(f"{EXTRACT_DIR}/json/*.json"))
total = len(files)

for i, fpath in enumerate(files, 1):
    try:
        raw = json.load(open(fpath))["scrutin"]
    except Exception as e:
        print(f"  ⚠ {fpath}: {e}")
        continue

    uid   = raw.get("uid")
    synth = raw.get("syntheseVote") or {}
    dec   = synth.get("decompte") or {}
    tv    = raw.get("typeVote") or {}
    sort  = (raw.get("sort") or {}).get("code")

    scrutins_batch.append((
        uid,
        "AN",
        int(raw.get("numero") or 0),
        int(raw.get("legislature") or 17),
        raw.get("dateScrutin"),
        raw.get("titre"),
        tv.get("codeTypeVote"),
        tv.get("libelleTypeVote"),
        sort,
        int(dec.get("pour") or 0),
        int(dec.get("contre") or 0),
        int(dec.get("abstentions") or 0),
        int(dec.get("nonVotants") or 0),
        int(synth.get("nombreVotants") or 0),
        int(synth.get("suffragesExprimes") or 0),
    ))

    # Votes nominatifs
    gpes = ((raw.get("ventilationVotes") or {})
            .get("organe") or {})
    groupes = (gpes.get("groupes") or {}).get("groupe", [])
    if isinstance(groupes, dict):
        groupes = [groupes]

    for g in groupes:
        dn = (g.get("vote") or {}).get("decompteNominatif") or {}
        for key, position in POSITION_MAP.items():
            for v in extract_votants(dn.get(key)):
                acteur = v.get("acteurRef")
                if acteur and uid:
                    votes_batch.append((
                        uid,
                        acteur,
                        position,
                        1 if v.get("parDelegation") == "true" else 0,
                    ))

    # Flush par batch
    if len(scrutins_batch) >= BATCH_SIZE:
        cur.executemany(
            "INSERT OR IGNORE INTO scrutins VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            scrutins_batch
        )
        cur.executemany(
            "INSERT OR IGNORE INTO votes VALUES (?,?,?,?)",
            votes_batch
        )
        con.commit()
        scrutins_batch.clear()
        votes_batch.clear()

    if i % 1000 == 0:
        pct = i / total * 100
        print(f"  {i}/{total} ({pct:.0f}%)...", flush=True)

# Dernier batch
if scrutins_batch:
    cur.executemany("INSERT OR IGNORE INTO scrutins VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", scrutins_batch)
if votes_batch:
    cur.executemany("INSERT OR IGNORE INTO votes VALUES (?,?,?,?)", votes_batch)
con.commit()

# ─── Résumé ───────────────────────────────────────────────────────────────────
n_scrutins = con.execute("SELECT COUNT(*) FROM scrutins").fetchone()[0]
n_votes    = con.execute("SELECT COUNT(*) FROM votes").fetchone()[0]
print()
print(f"✓ {n_scrutins:,} scrutins importés")
print(f"✓ {n_votes:,} votes nominatifs importés")

# Stats rapides
for row in con.execute("SELECT sort, COUNT(*) FROM scrutins GROUP BY sort ORDER BY 2 DESC"):
    print(f"  {row[0]}: {row[1]}")

con.execute("ANALYZE")
con.close()
print("Terminé.")
