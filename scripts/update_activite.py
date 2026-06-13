import os, sys, json, zipfile, io, subprocess, urllib.request, datetime
from collections import defaultdict

URLS = {
    "reunions":    "http://data.assemblee-nationale.fr/static/openData/repository/17/vp/reunions/Agenda.json.zip",
    "qe":          "http://data.assemblee-nationale.fr/static/openData/repository/17/questions/questions_ecrites/Questions_ecrites.json.zip",
    "qo":          "http://data.assemblee-nationale.fr/static/openData/repository/17/questions/questions_orales_sans_debat/Questions_orales_sans_debat.json.zip",
    "amendements": "http://data.assemblee-nationale.fr/static/openData/repository/17/loi/amendements_div_legis/Amendements.json.zip",
}

def turso(sql):
    url = os.environ["TURSO_DATABASE_URL"]
    r = subprocess.run(["turso","db","shell",url,sql], capture_output=True, text=True)
    return r.stdout

def turso_file(path):
    url = os.environ["TURSO_DATABASE_URL"]
    with open(path) as f:
        lines = [l for l in f.read().split("\n") if l.strip()]
    for i in range(0, len(lines), 200):
        bloc = "\n".join(lines[i:i+200])
        subprocess.run(["turso","db","shell",url,bloc], capture_output=True)
        if (i//200)%10==0: print(f"  {min(i+200,len(lines))}/{len(lines)} lignes", flush=True)

def get_deputes():
    out = turso("SELECT uid FROM deputes;")
    uids = set()
    for line in out.split("\n"):
        line = line.strip().strip("|").strip()
        if line.startswith("PA"):
            uids.add(line.split()[0])
    return uids

def download(label, url):
    print(f"  down {label}...", flush=True)
    with urllib.request.urlopen(url, timeout=300) as r: return r.read()

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
                if p.get("presence") == "présent": counts[p.get("acteurRef")] += 1
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

def _ref(v):
    if isinstance(v, dict): return v.get("#text")
    return v

def parse_amendements(data):
    deposes = defaultdict(int); signes = defaultdict(int); adoptes = defaultdict(int)
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for name in z.namelist():
            try: r = json.loads(z.read(name))
            except: continue
            amd = r.get("amendement", r)
            cdv = amd.get("cycleDeVie") or {}
            sort_str = _ref(cdv.get("sort")) or ""
            is_a = "adopt" in str(sort_str).lower()
            sig = amd.get("signataires") or {}
            auteur = sig.get("auteur") or {}
            if not isinstance(auteur, dict): auteur = {}
            uid = _ref(auteur.get("acteurRef"))
            if uid:
                deposes[uid] += 1
                if is_a: adoptes[uid] += 1
            cosig = sig.get("cosignataires") or {}
            refs = cosig.get("acteurRef") or cosig.get("cosignataire") or []
            if isinstance(refs, (str, dict)): refs = [refs]
            for cs in refs:
                cs_uid = _ref(cs)
                if cs_uid:
                    signes[cs_uid] += 1
    return deposes, signes, adoptes
  

def main():
    today = datetime.date.today().isoformat()
    raw_r = download("Reunions", URLS["reunions"])
    raw_qe = download("Questions ecrites", URLS["qe"])
    raw_qo = download("Questions orales", URLS["qo"])
    raw_amd = download("Amendements", URLS["amendements"])
    presences = parse_presences(raw_r)
    qe = parse_questions(raw_qe)
    qo = parse_questions(raw_qo)
    amd_deposes, amd_signes, amd_adoptes = parse_amendements(raw_amd)
    deputes = get_deputes()
    print(f"  {len(deputes)} deputes", flush=True)
    sql_path = "/tmp/activite.sql"
    with open(sql_path, "w") as f:
        f.write("DROP TABLE IF EXISTS activite_deputes;\n")
        f.write("CREATE TABLE activite_deputes (uid TEXT PRIMARY KEY, nb_presences_commission INTEGER DEFAULT 0, nb_questions_ecrites INTEGER DEFAULT 0, nb_questions_orales INTEGER DEFAULT 0, nb_amendements_deposes INTEGER DEFAULT 0, nb_amendements_signes INTEGER DEFAULT 0, nb_amendements_adoptes INTEGER DEFAULT 0, updated_at TEXT);\n")
        for uid in deputes:
            u = uid.replace("'","''")
            f.write(f"INSERT INTO activite_deputes VALUES ('{u}',{presences.get(uid,0)},{qe.get(uid,0)},{qo.get(uid,0)},{amd_deposes.get(uid,0)},{amd_signes.get(uid,0)},{amd_adoptes.get(uid,0)},'{today}');\n")
    print(f"  Injection {len(deputes)} lignes...", flush=True)
    turso_file(sql_path)
    print("Activite synchronisee")

if __name__ == "__main__": main()
