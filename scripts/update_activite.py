"""
scripts/update_activite.py
Calcule l'activité des députés via Turso CLI uniquement (pas de HTTP API).
"""
import os, sys, json, zipfile, io, subprocess, urllib.request, datetime, tempfile
from collections import defaultdict

URLS = {
    "reunions":    "http://data.assemblee-nationale.fr/static/openData/repository/17/vp/reunions/Agenda.json.zip",
    "qe":          "http://data.assemblee-nationale.fr/static/openData/repository/17/questions/questions_ecrites/Questions_ecrites.json.zip",
    "qo":          "http://data.assemblee-nationale.fr/static/openData/repository/17/questions/questions_orales_sans_debat/Questions_orales_sans_debat.json.zip",
    "amendements": "http://data.assemblee-nationale.fr/static/openData/repository/17/loi/amendements_div_legis/Amendements.json.zip",
}

def db_name():
    url = os.environ["TURSO_DATABASE_URL"].replace("libsql://", "")
    return url.split(".")[0]

def turso(sql):
    """Exécuter du SQL via Turso CLI."""
    r = subprocess.run(["turso", "db", "shell", db_name(), sql],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ⚠ turso: {r.stderr[:200]}", flush=True)
    return r.stdout

def turso_file(path):
    """Injecter un fichier SQL via Turso CLI."""
    with open(path) as f:
        sql = f.read()
    # Envoyer par blocs de 200 lignes
    lines = [l for l in sql.split("\n") if l.strip()]
    BLOC = 200
    for i in range(0, len(lines), BLOC):
        bloc = "\n".join(lines[i:i+BLOC])
        r = subprocess.run(["turso", "db", "shell", db_name(), bloc],
                           capture_output=True, text=True)
        if r.returncode != 0:
            print(f"  ⚠ bloc {i//BLOC}: {r.stderr[:100]}", flush=True)
        if (i // BLOC) % 10 == 0:
            print(f"  {min(i+BLOC, len(lines))}/{len(lines)} lignes", flush=True)

def get_deputes():
    """Récupérer les UIDs via Turso CLI."""
    out = turso("SELECT uid FROM deputes;")
    uids = set()
    for line in out.split("\n"):
        line = line.strip()
        if line.startswith("PA") and len(line) > 4:
            uids.add(line.split()[0].strip("|").strip())
    return uids

def download(label, url):
    print(f"  ↓ {label}...", flush=True)
    with urllib.request.urlopen(url, timeout=300) as r:
        return r.read()

def parse_presences(data):
    counts = defaultdict(int)
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for name in z.namelist():
            try: r = json.loads(z.read(name))
            except: continue
            reunion = r.get("reunion", r)
            if reunion.get("@xsi:type") != "reunionCommission_type": continue
            plist = ((reunion.get("participants") or {}).get("participantsInternes") or {}).get("participantInterne", [])
            if isinstance(plist, dict): plist = [plist]
            for p in plist:
                if p.get("presence") == "présent":
                    counts[p.get("acteurRef")] += 1
    return counts

def parse_questions(data):
    counts = defaultdict(int)
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for name in z.namelist():
            try: r = json.loads(z.read(name))
            except: continue
            q = r.get("question", r)
            uid = ((q.get("auteur") or {}).get("identite") or {}).get("acteurRef")
            if uid: counts[uid] += 1
    return counts

def parse_amendements(data):
    total = defaultdict(int)
    adoptes = defaultdict(int)
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for name in z.namelist():
            try: r = json.loads(z.read(name))
            except: continue
            amd = r.get("amendement", r)
            sort = amd.get("sort") or {}
            code = sort.get("code","") if isinstance(sort, dict) else str(sort)
            is_adopte = "adopt" in code.lower()
            sig = amd.get("signataires") or {}
            auteur = sig.get("auteur") or {}
            uid = auteur.get("acteurRef") or (auteur.get("auteur") or {}).get("acteurRef")
            if uid:
                total[uid] += 1
                if is_adopte: adoptes[uid] += 1
            cosiglist = (sig.get("cosignataires") or {}).get("cosignataire", [])
            if isinstance(cosiglist, dict): cosiglist = [cosiglist]
            for cs in cosiglist:
                cs_uid = cs.get("acteurRef")
                if cs_uid:
                    total[cs_uid] += 1
                    if is_adopte: adoptes[cs_uid] += 1
    return total, adoptes

def main():
    today = datetime.date.today().isoformat()

    print("Téléchargement des données...", flush=True)
    raw_reunions    = download("Réunions/Présences", URLS["reunions"])
    raw_qe          = download("Questions écrites",  URLS["qe"])
    raw_qo          = download("Questions orales",   URLS["qo"])
    raw_amd         = download("Amendements (263MB)", URLS["amendements"])

    print("Calcul...", flush=True)
    presences              = parse_presences(raw_reunions)
    qe                     = parse_questions(raw_qe)
    qo                     = parse_questions(raw_qo)
    amd_total, amd_adoptes = parse_amendements(raw_amd)

    print("Récupération des députés via Turso CLI...", flush=True)
    deputes = get_deputes()
    print(f"  {len(deputes)} députés", flush=True)

    # Générer SQL
    sql_path = "/tmp/activite.sql"
    with open(sql_path, "w") as f:
        f.write("DROP TABLE IF EXISTS activite_deputes;\n")
        f.write("CREATE TABLE activite_deputes (uid TEXT PRIMARY KEY, nb_presences_commission INTEGER DEFAULT 0, nb_questions_ecrites INTEGER DEFAULT 0, nb_questions_orales INTEGER DEFAULT 0, nb_amendements INTEGER DEFAULT 0, nb_amendements_adoptes INTEGER DEFAULT 0, updated_at TEXT);\n")
        for uid in deputes:
            p   = presences.get(uid, 0)
            qec = qe.get(uid, 0)
            qoc = qo.get(uid, 0)
            am  = amd_total.get(uid, 0)
            ama = amd_adoptes.get(uid, 0)
            uid_safe = uid.replace("'","''")
            f.write(f"INSERT INTO activite_deputes VALUES ('{uid_safe}',{p},{qec},{qoc},{am},{ama},'{today}');\n")

    print(f"Injection dans Turso ({len(deputes)} lignes)...", flush=True)
    turso_file(sql_path)
    print("✓ Activité parlementaire synchronisée")

if __name__ == "__main__":
    main()
