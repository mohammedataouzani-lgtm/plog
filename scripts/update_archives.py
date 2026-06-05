"""
scripts/update_archives.py
Met à jour les archives (anciens élus AN + Sénat) dans Turso.
Exécuté hebdomadairement (le lundi) via GitHub Actions.
"""

import sys
import os
import csv
import urllib.request
import json

sys.path.insert(0, os.path.dirname(__file__))
from turso_client import TursoClient

HIST_API = "https://www.data.gouv.fr/api/1/datasets/60f2ffc8284ff5e8c1ed0655/"
SENAT_GEN = "https://data.senat.fr/data/senateurs/ODSEN_GENERAL.csv"
SENAT_ELU = "https://data.senat.fr/data/senateurs/ODSEN_ELUSEN.csv"

def get_hist_url():
    with urllib.request.urlopen(HIST_API) as r:
        return json.load(r)["resources"][0]["url"]

def read_senat_csv(path):
    with open(path, encoding="latin-1") as f:
        lines = [l for l in f if not l.startswith("%") and l.strip()]
    return list(csv.DictReader(lines))

def clean_date(d):
    if not d: return None
    return str(d).strip().split(" ")[0] or None

def main():
    import tempfile
    db = TursoClient()

    with tempfile.TemporaryDirectory() as tmp:
        # Anciens AN depuis CSV historique
        hist_url = get_hist_url()
        hist_csv = f"{tmp}/hist.csv"
        print(f"  ↓ Historique AN...", flush=True)
        urllib.request.urlretrieve(hist_url, hist_csv)

        archives_an = []
        with open(hist_csv, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row.get("active") == "1":
                    continue  # actif → pas dans les archives
                archives_an.append({
                    "uid":                   row.get("id"),
                    "chambre":               "AN",
                    "civilite":              row.get("civ") or None,
                    "prenom":                row.get("prenom") or None,
                    "nom":                   row.get("nom") or None,
                    "date_naissance":        row.get("naissance") or None,
                    "date_deces":            None,
                    "profession":            row.get("job") or None,
                    "groupe":                row.get("groupe") or None,
                    "groupe_abrev":          row.get("groupeAbrev") or None,
                    "departement":           row.get("departementNom") or None,
                    "num_departement":       row.get("departementCode") or None,
                    "num_circo":             row.get("circo") or None,
                    "derniere_legislature":  row.get("legislatureLast") or None,
                    "date_prise_fonction":   row.get("datePriseFonction") or None,
                    "nombre_mandats":        int(row["nombreMandats"]) if row.get("nombreMandats","").strip() else None,
                    "mail":                  row.get("mail") or None,
                    "twitter":               row.get("twitter") or None,
                    "website":               row.get("website") or None,
                    "score_participation":   float(row["scoreParticipation"]) if row.get("scoreParticipation","").strip() else None,
                    "circonscription":       None,
                    "raison_fin":            None,
                })

        # Anciens Sénat
        senat_gen_path = f"{tmp}/senat_gen.csv"
        senat_elu_path = f"{tmp}/senat_elu.csv"
        print(f"  ↓ Sénat...", flush=True)
        urllib.request.urlretrieve(SENAT_GEN, senat_gen_path)
        urllib.request.urlretrieve(SENAT_ELU, senat_elu_path)

        gen_rows = read_senat_csv(senat_gen_path)
        elu_rows = read_senat_csv(senat_elu_path)

        from collections import defaultdict
        mandats_s = defaultdict(list)
        for r in elu_rows:
            mandats_s[r["Matricule"]].append(r)

        archives_senat = []
        for row in gen_rows:
            if row.get("État","").strip() == "ACTIF":
                continue
            mat = row.get("Matricule","").strip()
            last = max(mandats_s.get(mat,[{}]), key=lambda m: m.get("Date de fin de mandat","") or "")
            archives_senat.append({
                "uid":               mat,
                "chambre":           "Senat",
                "civilite":          row.get("Qualité","").strip() or None,
                "prenom":            row.get("Prénom usuel","").strip() or None,
                "nom":               row.get("Nom usuel","").strip() or None,
                "date_naissance":    clean_date(row.get("Date naissance")),
                "date_deces":        clean_date(row.get("Date de décès")) or None,
                "profession":        row.get("Description de la profession","").strip() or None,
                "groupe":            row.get("Groupe politique","").strip() or None,
                "groupe_abrev":      None,
                "departement":       None,
                "num_departement":   None,
                "num_circo":         None,
                "derniere_legislature": None,
                "date_prise_fonction": None,
                "nombre_mandats":    None,
                "mail":              None,
                "twitter":           None,
                "website":           None,
                "score_participation": None,
                "circonscription":   row.get("Circonscription","").strip() or None,
                "raison_fin":        last.get("Motif fin de mandat","").strip() or None,
            })

    archives = archives_an + archives_senat
    print(f"  Sync {len(archives)} archives → Turso...", flush=True)
    db.execute("DELETE FROM archives")
    db.batch_insert("archives", archives)
    print(f"  ✓ Archives : {len(archives_an)} AN + {len(archives_senat)} Sénat")

if __name__ == "__main__":
    main()
