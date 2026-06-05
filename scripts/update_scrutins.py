"""
scripts/update_scrutins.py
Mise à jour INCRÉMENTALE des scrutins AN.
Télécharge uniquement les scrutins plus récents que le dernier en base.
"""

import sys
import os
import json
import glob
import zipfile
import urllib.request
import tempfile
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from turso_client import TursoClient

SCRUTINS_URL = "http://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip"

POSITION_MAP = {
    "pours":                 "pour",
    "contres":               "contre",
    "abstentions":           "abstention",
    "nonVotants":            "nonVotant",
    "nonVotantsVolontaires": "nonVotantVolontaire",
}

def extract_votants(section):
    if not section: return []
    v = section.get("votant", [])
    return [v] if isinstance(v, dict) else (v or [])

def parse_scrutin(raw):
    synth = raw.get("syntheseVote") or {}
    dec   = synth.get("decompte") or {}
    tv    = raw.get("typeVote") or {}
    return {
        "uid":               raw.get("uid"),
        "chambre":           "AN",
        "numero":            int(raw.get("numero") or 0),
        "legislature":       int(raw.get("legislature") or 17),
        "date":              raw.get("dateScrutin"),
        "titre":             raw.get("titre"),
        "type_vote_code":    tv.get("codeTypeVote"),
        "type_vote_libelle": tv.get("libelleTypeVote"),
        "sort":              (raw.get("sort") or {}).get("code"),
        "pour":              int(dec.get("pour") or 0),
        "contre":            int(dec.get("contre") or 0),
        "abstentions":       int(dec.get("abstentions") or 0),
        "non_votants":       int(dec.get("nonVotants") or 0),
        "votants":           int(synth.get("nombreVotants") or 0),
        "suffrages":         int(synth.get("suffragesExprimes") or 0),
    }

def parse_votes(raw):
    uid = raw.get("uid")
    votes = []
    gpes = ((raw.get("ventilationVotes") or {}).get("organe") or {})
    groupes = (gpes.get("groupes") or {}).get("groupe", [])
    if isinstance(groupes, dict): groupes = [groupes]
    for g in groupes:
        dn = (g.get("vote") or {}).get("decompteNominatif") or {}
        for key, position in POSITION_MAP.items():
            for v in extract_votants(dn.get(key)):
                acteur = v.get("acteurRef")
                if acteur and uid:
                    votes.append({
                        "scrutin_uid":    uid,
                        "acteur_uid":     acteur,
                        "position":       position,
                        "par_delegation": 1 if v.get("parDelegation") == "true" else 0,
                    })
    return votes

def main():
    db = TursoClient()

    # Dernier scrutin en base
    rows = db.execute("SELECT MAX(numero) as max_num FROM scrutins WHERE chambre = 'AN'")
    last_num = int(rows[0]["max_num"] or 0) if rows else 0
    print(f"  Dernier scrutin en base : #{last_num}", flush=True)

    with tempfile.TemporaryDirectory() as tmp:
        zip_path = f"{tmp}/scrutins.zip"
        print(f"  ↓ Scrutins AN...", flush=True)
        urllib.request.urlretrieve(SCRUTINS_URL, zip_path)

        with zipfile.ZipFile(zip_path) as z:
            z.extractall(tmp)

        json_files = sorted(glob.glob(f"{tmp}/json/*.json"))
        print(f"  {len(json_files)} scrutins au total, {last_num} déjà en base", flush=True)

        new_scrutins = []
        new_votes    = []

        for fpath in json_files:
            try:
                raw = json.load(open(fpath))["scrutin"]
            except Exception:
                continue

            num = int(raw.get("numero") or 0)
            if num <= last_num:
                continue  # déjà en base

            new_scrutins.append(parse_scrutin(raw))
            new_votes.extend(parse_votes(raw))

    if not new_scrutins:
        print("  ✓ Aucun nouveau scrutin.")
        return

    print(f"  {len(new_scrutins)} nouveaux scrutins, {len(new_votes)} votes → Turso...", flush=True)
    db.batch_insert("scrutins", new_scrutins)
    db.batch_insert("votes", new_votes)
    print(f"  ✓ Scrutins #{last_num + 1} → #{last_num + len(new_scrutins)} importés")

if __name__ == "__main__":
    main()
