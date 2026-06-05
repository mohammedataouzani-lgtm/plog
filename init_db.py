"""
init_db.py
Crée parlement.db à partir des 3 collections JSON.
Usage : python3 init_db.py
"""

import sqlite3
import json
import os
import sys

JSON_DIR = "/mnt/user-data/outputs"
DB_PATH  = "/mnt/user-data/outputs/parlement.db"

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
    print(f"DB existante supprimée.")

con = sqlite3.connect(DB_PATH)
cur = con.cursor()
cur.executescript("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")

# ─── SCHÉMA ────────────────────────────────────────────────────────────────────

cur.executescript("""
-- ── Députés AN 17e (actifs + mandat interrompu) ──────────────────────────────
CREATE TABLE deputes (
    uid                TEXT PRIMARY KEY,
    chambre            TEXT NOT NULL DEFAULT 'AN',
    legislature        INTEGER NOT NULL DEFAULT 17,
    civilite           TEXT,
    prenom             TEXT,
    nom                TEXT,
    date_naissance     TEXT,
    date_deces         TEXT,
    profession         TEXT,
    groupe_libelle     TEXT,
    groupe_abrev       TEXT,
    commission         TEXT,
    departement        TEXT,
    num_departement    TEXT,
    num_circo          TEXT,
    region             TEXT,
    date_debut_mandat  TEXT,
    date_fin_mandat    TEXT,
    statut             TEXT NOT NULL DEFAULT 'actif',   -- 'actif' | 'mandat_termine'
    raison_fin         TEXT,                            -- causeFin si mandat_termine
    site_web           TEXT,
    hatvp              TEXT,
    updated_at         TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_deputes_nom        ON deputes(nom COLLATE NOCASE);
CREATE INDEX idx_deputes_statut     ON deputes(statut);
CREATE INDEX idx_deputes_groupe     ON deputes(groupe_abrev);
CREATE INDEX idx_deputes_dept       ON deputes(num_departement);

-- ── Sénateurs actifs ──────────────────────────────────────────────────────────
CREATE TABLE senateurs (
    uid                TEXT PRIMARY KEY,
    chambre            TEXT NOT NULL DEFAULT 'Senat',
    civilite           TEXT,
    prenom             TEXT,
    nom                TEXT,
    date_naissance     TEXT,
    date_deces         TEXT,
    groupe             TEXT,
    commission         TEXT,
    circonscription    TEXT,
    fonction_bureau    TEXT,
    email              TEXT,
    profession         TEXT,
    date_debut_mandat  TEXT,
    date_fin_mandat    TEXT,
    statut             TEXT NOT NULL DEFAULT 'actif',
    updated_at         TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_senateurs_nom    ON senateurs(nom COLLATE NOCASE);
CREATE INDEX idx_senateurs_groupe ON senateurs(groupe);
CREATE INDEX idx_senateurs_circo  ON senateurs(circonscription);

-- ── Archives (tous les anciens — AN + Sénat) ──────────────────────────────────
CREATE TABLE archives (
    uid                      TEXT,
    chambre                  TEXT NOT NULL,   -- 'AN' | 'Senat'
    civilite                 TEXT,
    prenom                   TEXT,
    nom                      TEXT,
    date_naissance           TEXT,
    date_deces               TEXT,
    profession               TEXT,
    -- AN spécifique
    groupe                   TEXT,
    groupe_abrev             TEXT,
    departement              TEXT,
    num_departement          TEXT,
    num_circo                TEXT,
    derniere_legislature     TEXT,
    date_prise_fonction      TEXT,
    nombre_mandats           INTEGER,
    mail                     TEXT,
    twitter                  TEXT,
    website                  TEXT,
    score_participation      REAL,
    -- Sénat spécifique
    circonscription          TEXT,
    -- Commun
    raison_fin               TEXT,
    PRIMARY KEY (uid, chambre)
);

CREATE INDEX idx_archives_nom     ON archives(nom COLLATE NOCASE);
CREATE INDEX idx_archives_chambre ON archives(chambre);
CREATE INDEX idx_archives_groupe  ON archives(groupe);
CREATE INDEX idx_archives_dept    ON archives(num_departement);
""")

# ─── IMPORT DÉPUTÉS ────────────────────────────────────────────────────────────
print("Import dépulés...", flush=True)
with open(f"{JSON_DIR}/deputes.json", encoding="utf-8") as f:
    deputes = json.load(f)

cur.executemany("""
    INSERT INTO deputes (
        uid, chambre, legislature, civilite, prenom, nom,
        date_naissance, date_deces, profession,
        groupe_libelle, groupe_abrev, commission,
        departement, num_departement, num_circo, region,
        date_debut_mandat, date_fin_mandat,
        statut, raison_fin, site_web, hatvp
    ) VALUES (
        :uid, :chambre, :legislature, :civilite, :prenom, :nom,
        :dateNaissance, :dateDeces, :profession,
        :groupe_libelle, :groupe_abrev, :commission,
        :departement, :numDepartement, :numCirco, :region,
        :dateDebutMandat, :dateFinMandat,
        :statut, :raisonFin, :siteWeb, :hatvp
    )
""", [
    {**d,
     "groupe_libelle": (d.get("groupe") or {}).get("libelle"),
     "groupe_abrev":   (d.get("groupe") or {}).get("abrev")}
    for d in deputes
])
print(f"  ✓ {len(deputes)} dépulés insérés")

# ─── IMPORT SÉNATEURS ──────────────────────────────────────────────────────────
print("Import sénateurs...", flush=True)
with open(f"{JSON_DIR}/senateurs.json", encoding="utf-8") as f:
    senateurs = json.load(f)

cur.executemany("""
    INSERT INTO senateurs (
        uid, chambre, civilite, prenom, nom,
        date_naissance, date_deces, groupe, commission,
        circonscription, fonction_bureau, email, profession,
        date_debut_mandat, date_fin_mandat, statut
    ) VALUES (
        :uid, :chambre, :civilite, :prenom, :nom,
        :dateNaissance, :dateDeces, :groupe, :commission,
        :circonscription, :fonctionBureau, :email, :profession,
        :dateDebutMandat, :dateFinMandat, :statut
    )
""", senateurs)
print(f"  ✓ {len(senateurs)} sénateurs insérés")

# ─── IMPORT ARCHIVES ───────────────────────────────────────────────────────────
print("Import archives...", flush=True)
with open(f"{JSON_DIR}/archives.json", encoding="utf-8") as f:
    archives = json.load(f)

cur.executemany("""
    INSERT INTO archives (
        uid, chambre, civilite, prenom, nom,
        date_naissance, date_deces, profession,
        groupe, groupe_abrev,
        departement, num_departement, num_circo,
        derniere_legislature, date_prise_fonction,
        nombre_mandats, mail, twitter, website,
        score_participation, circonscription, raison_fin
    ) VALUES (
        :uid, :chambre, :civilite, :prenom, :nom,
        :date_naissance, :date_deces, :profession,
        :groupe, :groupe_abrev,
        :departement, :num_departement, :num_circo,
        :derniere_legislature, :date_prise_fonction,
        :nombre_mandats, :mail, :twitter, :website,
        :score_participation, :circonscription, :raison_fin
    )
""", [
    {
        "uid":                   a.get("uid"),
        "chambre":               a.get("chambre"),
        "civilite":              a.get("civilite"),
        "prenom":                a.get("prenom"),
        "nom":                   a.get("nom"),
        "date_naissance":        a.get("dateNaissance"),
        "date_deces":            a.get("dateDeces"),
        "profession":            a.get("profession"),
        "groupe":                a.get("groupe"),
        "groupe_abrev":          a.get("groupeAbrev"),
        "departement":           a.get("departement"),
        "num_departement":       a.get("numDepartement"),
        "num_circo":             a.get("numCirco"),
        "derniere_legislature":  a.get("derniereLegislature"),
        "date_prise_fonction":   a.get("datePriseFonction"),
        "nombre_mandats":        a.get("nombreMandats"),
        "mail":                  a.get("mail"),
        "twitter":               a.get("twitter"),
        "website":               a.get("website"),
        "score_participation":   a.get("scoreParticipation"),
        "circonscription":       a.get("circonscription"),
        "raison_fin":            a.get("raisonFin"),
    }
    for a in archives
])
print(f"  ✓ {len(archives)} archives insérées")

# ─── FINALISATION ──────────────────────────────────────────────────────────────
cur.execute("ANALYZE")
con.commit()
con.execute("VACUUM")
con.close()

size_kb = os.path.getsize(DB_PATH) // 1024
print(f"\n✓ parlement.db créée ({size_kb} KB)")

# Vérification rapide
con2 = sqlite3.connect(DB_PATH)
for table in ("deputes", "senateurs", "archives"):
    n = con2.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    print(f"  {table:12s} : {n}")
con2.close()
