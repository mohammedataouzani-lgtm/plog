"""
scripts/update_elus.py
Met à jour les tables deputes et senateurs dans Turso.
Sources :
  - AMO50 (AN acteurs + mandats) → data.assemblee-nationale.fr
  - deputes-historique.csv → data.gouv.fr
  - ODSEN_GENERAL.csv + ODSEN_ELUSEN.csv → data.senat.fr
"""

import sys
import os
import json
import csv
import glob
import zipfile
import urllib.request
import tempfile
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from turso_client import TursoClient

# ─── URLs sources ─────────────────────────────────────────────────────────────

URLS = {
    "amo50":     "http://data.assemblee-nationale.fr/static/openData/repository/17/amo/acteurs_mandats_organes_divises/AMO50_acteurs_mandats_organes_divises.json.zip",
    "hist_an":   "https://www.data.gouv.fr/api/1/datasets/60f2ffc8284ff5e8c1ed0655/",
    "senat_gen": "https://data.senat.fr/data/senateurs/ODSEN_GENERAL.csv",
    "senat_elu": "https://data.senat.fr/data/senateurs/ODSEN_ELUSEN.csv",
}

def download(url, dest):
    print(f"  ↓ {url[:60]}...", flush=True)
    urllib.request.urlretrieve(url, dest)

def get_hist_url():
    with urllib.request.urlopen(URLS["hist_an"]) as r:
        d = json.load(r)
    return d["resources"][0]["url"]

def read_senat_csv(path):
    with open(path, encoding="latin-1") as f:
        lines = [l for l in f if not l.startswith("%") and l.strip()]
    return list(csv.DictReader(lines))

def clean_date(d):
    if not d: return None
    return str(d).strip().split(" ")[0] or None

# ─── Parse AN ─────────────────────────────────────────────────────────────────

def parse_deputes(amo50_dir, hist_csv_path):
    print("  Parsing dépulés...", flush=True)

    # Index historique pour les groupes
    groupe_map = {}
    with open(hist_csv_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("active") == "1":
                groupe_map[row["id"]] = {
                    "groupe_libelle": row.get("groupe"),
                    "groupe_abrev":   row.get("groupeAbrev"),
                }

    # Mandats indexés
    mandats_by_acteur = defaultdict(list)
    for mf in glob.glob(f"{amo50_dir}/mandat/*.json"):
        try:
            m = json.load(open(mf))["mandat"]
            mandats_by_acteur[m["acteurRef"]].append(m)
        except Exception:
            pass

    # Organes en cache
    organe_cache = {}
    def get_organe(ref):
        if not ref: return {}
        if ref not in organe_cache:
            p = f"{amo50_dir}/organe/{ref}.json"
            organe_cache[ref] = json.load(open(p)).get("organe", {}) if os.path.exists(p) else {}
        return organe_cache[ref]

    deputes = []
    for af in sorted(glob.glob(f"{amo50_dir}/acteur/*.json")):
        try:
            data = json.load(open(af))["acteur"]
        except Exception:
            continue

        uid = data["uid"]["#text"] if isinstance(data["uid"], dict) else data["uid"]
        ec = data.get("etatCivil", {})
        ident = ec.get("ident", {})
        nais = ec.get("infoNaissance", {})

        mandat_17 = next((m for m in mandats_by_acteur.get(uid, [])
                         if m.get("typeOrgane") == "ASSEMBLEE" and str(m.get("legislature","")) == "17"), None)
        if not mandat_17: continue

        # Groupe depuis historique CSV (plus fiable)
        g = groupe_map.get(uid, {})
        if not g.get("groupe_abrev"):
            for m in mandats_by_acteur.get(uid, []):
                if m.get("typeOrgane") == "GP" and str(m.get("legislature","")) == "17" and not m.get("dateFin"):
                    ref = (m.get("organes") or {}).get("organeRef")
                    org = get_organe(ref)
                    g = {"groupe_libelle": org.get("libelle"), "groupe_abrev": org.get("libelleAbrev") or org.get("libelleAbrege")}
                    break

        # Commission
        commission = None
        for m in mandats_by_acteur.get(uid, []):
            if m.get("typeOrgane") == "COMPER" and str(m.get("legislature","")) == "17" and not m.get("dateFin"):
                ref = (m.get("organes") or {}).get("organeRef")
                commission = get_organe(ref).get("libelle")
                break

        mandature = mandat_17.get("mandature") or {}
        cause_fin = mandature.get("causeFin")
        election = mandat_17.get("election", {}) or {}
        lieu = election.get("lieu", {}) or {}

        adresses = data.get("adresses", {}) or {}
        adresse_list = adresses.get("adresse", [])
        if isinstance(adresse_list, dict): adresse_list = [adresse_list]
        site_web = next((a.get("valElec") for a in adresse_list
                        if isinstance(a, dict) and a.get("@xsi:type") == "AdresseSiteWeb_Type"), None)

        statut = "actif" if not cause_fin else "mandat_termine"

        deputes.append({
            "uid":               uid,
            "chambre":           "AN",
            "legislature":       17,
            "civilite":          ident.get("civ"),
            "prenom":            ident.get("prenom"),
            "nom":               ident.get("nom"),
            "date_naissance":    clean_date(nais.get("dateNais")),
            "date_deces":        clean_date(ec.get("dateDeces")),
            "profession":        (data.get("profession") or {}).get("libelleCourant"),
            "groupe_libelle":    g.get("groupe_libelle"),
            "groupe_abrev":      g.get("groupe_abrev"),
            "commission":        commission,
            "departement":       lieu.get("departement"),
            "num_departement":   lieu.get("numDepartement"),
            "num_circo":         lieu.get("numCirco"),
            "region":            lieu.get("region"),
            "date_debut_mandat": clean_date(mandat_17.get("dateDebut")),
            "date_fin_mandat":   clean_date(mandat_17.get("dateFin")),
            "statut":            statut,
            "raison_fin":        cause_fin if statut == "mandat_termine" else None,
            "site_web":          site_web,
            "hatvp":             data.get("uri_hatvp"),
        })

    return deputes

# ─── Parse Sénat ──────────────────────────────────────────────────────────────

def parse_senateurs(general_path, elusen_path):
    print("  Parsing sénateurs...", flush=True)

    gen_rows = read_senat_csv(general_path)
    elu_rows = read_senat_csv(elusen_path)

    mandats = defaultdict(list)
    for r in elu_rows:
        mandats[r["Matricule"]].append(r)

    senateurs = []
    for row in gen_rows:
        if row.get("État", "").strip() != "ACTIF":
            continue
        mat = row.get("Matricule", "").strip()
        mandat = next((m for m in mandats.get(mat, []) if m.get("Motif fin de mandat","").strip() == "En Cours"), None)

        senateurs.append({
            "uid":               mat,
            "chambre":           "Senat",
            "civilite":          row.get("Qualité","").strip() or None,
            "prenom":            row.get("Prénom usuel","").strip() or None,
            "nom":               row.get("Nom usuel","").strip() or None,
            "date_naissance":    clean_date(row.get("Date naissance")),
            "date_deces":        clean_date(row.get("Date de décès")) or None,
            "groupe":            row.get("Groupe politique","").strip() or None,
            "commission":        row.get("Commission permanente","").strip() or None,
            "circonscription":   row.get("Circonscription","").strip() or None,
            "fonction_bureau":   row.get("Fonction au Bureau du Sénat","").strip() or None,
            "email":             row.get("Courrier électronique","").strip() or None,
            "profession":        row.get("Description de la profession","").strip() or None,
            "date_debut_mandat": clean_date(mandat.get("Date de début de mandat")) if mandat else None,
            "date_fin_mandat":   clean_date(mandat.get("Date de fin de mandat")) if mandat else None,
            "statut":            "actif",
        })

    return senateurs

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    db = TursoClient()

    with tempfile.TemporaryDirectory() as tmp:
        # Télécharger AMO50
        amo50_zip = f"{tmp}/amo50.zip"
        amo50_dir = f"{tmp}/amo50"
        download(URLS["amo50"], amo50_zip)
        with zipfile.ZipFile(amo50_zip) as z:
            z.extractall(amo50_dir)

        # Télécharger historique AN
        hist_url = get_hist_url()
        hist_csv = f"{tmp}/hist.csv"
        download(hist_url, hist_csv)

        # Télécharger Sénat
        senat_gen = f"{tmp}/senat_gen.csv"
        senat_elu = f"{tmp}/senat_elu.csv"
        download(URLS["senat_gen"], senat_gen)
        download(URLS["senat_elu"], senat_elu)

        # Parser
        deputes  = parse_deputes(amo50_dir, hist_csv)
        senateurs = parse_senateurs(senat_gen, senat_elu)

    # Upsert dans Turso
    print(f"  Sync {len(deputes)} dépulés → Turso...", flush=True)
    db.execute("DELETE FROM deputes")
    db.batch_insert("deputes", deputes)

    print(f"  Sync {len(senateurs)} sénateurs → Turso...", flush=True)
    db.execute("DELETE FROM senateurs")
    db.batch_insert("senateurs", senateurs)

    print(f"  ✓ Élus mis à jour : {len(deputes)} députés, {len(senateurs)} sénateurs")

if __name__ == "__main__":
    main()
