"""
scripts/update_activite.py
Calcule et synchronise l'activité des députés :
  - nb_presences_commission  : présences aux réunions de commission
  - nb_questions_ecrites     : questions écrites déposées
  - nb_questions_orales      : questions orales déposées
  - nb_amendements           : amendements déposés ou signés
  - nb_amendements_adoptes   : dont adoptés

Sources AN open data (17e législature) :
  Agenda.json.zip, Questions_ecrites.json.zip,
  Questions_orales_sans_debat.json.zip, Amendements.json.zip
"""

import sys, os, json, zipfile, io, tempfile, urllib.request
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from turso_client import TursoClient

URLS = {
    "reunions":   "http://data.assemblee-nationale.fr/static/openData/repository/17/vp/reunions/Agenda.json.zip",
    "qe":         "http://data.assemblee-nationale.fr/static/openData/repository/17/questions/questions_ecrites/Questions_ecrites.json.zip",
    "qo":         "http://data.assemblee-nationale.fr/static/openData/repository/17/questions/questions_orales_sans_debat/Questions_orales_sans_debat.json.zip",
    "amendements":"http://data.assemblee-nationale.fr/static/openData/repository/17/loi/amendements_div_legis/Amendements.json.zip",
}

def download(label, url):
    print(f"  ↓ {label}...", flush=True)
    with urllib.request.urlopen(url, timeout=300) as r:
        return r.read()


# ─── Présences commission ─────────────────────────────────────────────────────

def parse_presences(data: bytes) -> dict:
    presences = defaultdict(int)
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for name in z.namelist():
            try:
                r = json.loads(z.read(name))
            except Exception:
                continue
            reunion = r.get("reunion", r)
            if reunion.get("@xsi:type") != "reunionCommission_type":
                continue
            parts = (reunion.get("participants") or {})
            internes = (parts.get("participantsInternes") or {})
            plist = internes.get("participantInterne", [])
            if isinstance(plist, dict): plist = [plist]
            for p in plist:
                if p.get("presence") == "présent":
                    presences[p.get("acteurRef")] += 1
    return presences


# ─── Questions ────────────────────────────────────────────────────────────────

def parse_questions(data: bytes) -> dict:
    counts = defaultdict(int)
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for name in z.namelist():
            try:
                r = json.loads(z.read(name))
            except Exception:
                continue
            q = r.get("question", r)
            auteur = (q.get("auteur") or {}).get("identite") or {}
            uid = auteur.get("acteurRef")
            if uid:
                counts[uid] += 1
    return counts


# ─── Amendements ─────────────────────────────────────────────────────────────

def parse_amendements(data: bytes) -> tuple:
    """Retourne (total_par_depute, adoptes_par_depute)."""
    total   = defaultdict(int)
    adoptes = defaultdict(int)

    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for name in z.namelist():
            try:
                r = json.loads(z.read(name))
            except Exception:
                continue
            amd = r.get("amendement", r)
            sort = (amd.get("sort") or {})
            if isinstance(sort, dict):
                sort_code = sort.get("code", "")
            else:
                sort_code = str(sort)

            is_adopte = "adopt" in sort_code.lower()

            # Signataires
            signataires = amd.get("signataires") or {}
            # Auteur principal
            auteur = signataires.get("auteur") or {}
            uid = (auteur.get("acteurRef") or
                   (auteur.get("auteur") or {}).get("acteurRef"))
            if uid:
                total[uid] += 1
                if is_adopte:
                    adoptes[uid] += 1

            # Co-signataires
            cosig = signataires.get("cosignataires") or {}
            cosiglist = cosig.get("cosignataire", [])
            if isinstance(cosiglist, dict): cosiglist = [cosiglist]
            for cs in cosiglist:
                cs_uid = cs.get("acteurRef")
                if cs_uid:
                    total[cs_uid] += 1
                    if is_adopte:
                        adoptes[cs_uid] += 1

    return total, adoptes


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    db = TursoClient()

    # Récupérer la liste des UIDs actifs
    deputes = {r["uid"] for r in db.execute("SELECT uid FROM deputes")}
    print(f"  {len(deputes)} députés à mettre à jour", flush=True)

    # Présences commission
    raw_reunions = download("Réunions/Présences", URLS["reunions"])
    presences = parse_presences(raw_reunions)
    print(f"  {len(presences)} députés avec présences commission", flush=True)

    # Questions écrites
    raw_qe = download("Questions écrites", URLS["qe"])
    qe = parse_questions(raw_qe)
    print(f"  {sum(qe.values())} questions écrites", flush=True)

    # Questions orales
    raw_qo = download("Questions orales", URLS["qo"])
    qo = parse_questions(raw_qo)
    print(f"  {sum(qo.values())} questions orales", flush=True)

    # Amendements (gros fichier)
    raw_amd = download("Amendements (263MB)", URLS["amendements"])
    amd_total, amd_adoptes = parse_amendements(raw_amd)
    print(f"  {sum(amd_total.values())} amendements", flush=True)

    # Créer/recréer la table
    db.execute("DROP TABLE IF EXISTS activite_deputes")
    db.execute("""
        CREATE TABLE activite_deputes (
            uid                        TEXT PRIMARY KEY,
            nb_presences_commission    INTEGER DEFAULT 0,
            nb_questions_ecrites       INTEGER DEFAULT 0,
            nb_questions_orales        INTEGER DEFAULT 0,
            nb_amendements             INTEGER DEFAULT 0,
            nb_amendements_adoptes     INTEGER DEFAULT 0,
            updated_at                 TEXT
        )
    """)

    import datetime
    today = datetime.date.today().isoformat()
    rows = []
    for uid in deputes:
        rows.append({
            "uid":                     uid,
            "nb_presences_commission": presences.get(uid, 0),
            "nb_questions_ecrites":    qe.get(uid, 0),
            "nb_questions_orales":     qo.get(uid, 0),
            "nb_amendements":          amd_total.get(uid, 0),
            "nb_amendements_adoptes":  amd_adoptes.get(uid, 0),
            "updated_at":              today,
        })

    print(f"  Sync {len(rows)} lignes → Turso...", flush=True)
    db.batch_insert("activite_deputes", rows)
    print(f"  ✓ Activité synchronisée")

    # Stats rapides
    top_questions = sorted(rows, key=lambda r: r["nb_questions_ecrites"] + r["nb_questions_orales"], reverse=True)[:3]
    top_presences = sorted(rows, key=lambda r: r["nb_presences_commission"], reverse=True)[:3]
    print("\n  Top questions:")
    for r in top_questions:
        print(f"    {r['uid']}: {r['nb_questions_ecrites']} écrites + {r['nb_questions_orales']} orales")
    print("  Top présences commission:")
    for r in top_presences:
        print(f"    {r['uid']}: {r['nb_presences_commission']}")


if __name__ == "__main__":
    main()
