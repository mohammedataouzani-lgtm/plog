import os, json, glob, zipfile, io, subprocess, urllib.request
from collections import defaultdict

SCRUTINS_URL = "http://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip"
POSITION_MAP = {"pours":"pour","contres":"contre","abstentions":"abstention","nonVotants":"nonVotant","nonVotantsVolontaires":"nonVotantVolontaire"}

def _turso_http(stmts):
    base = os.environ["TURSO_DATABASE_URL"].replace("libsql://", "https://").rstrip("/")
    token = os.environ["TURSO_AUTH_TOKEN"]
    payload = {"requests": [{"type": "execute", "stmt": {"sql": s}} for s in stmts]}
    payload["requests"].append({"type": "close"})
    req = urllib.request.Request(base + "/v2/pipeline",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())

def turso(sql):
    res = _turso_http([sql])
    rows_out = []
    for r in res.get("results", []):
        resp = r.get("response", {})
        if resp.get("type") != "execute": continue
        for row in resp.get("result", {}).get("rows", []):
            vals = [c.get("value") if isinstance(c, dict) else c for c in row]
            rows_out.append("|".join("" if v is None else str(v) for v in vals))
    return "\n".join(rows_out)

def turso_file(path):
    with open(path) as f:
        stmts = [l for l in f.read().split("\n") if l.strip()]
    for i in range(0, len(stmts), 100):
        _turso_http(stmts[i:i+100])
        if (i//100)%5==0: print(f"  {min(i+100,len(stmts))}/{len(stmts)}", flush=True)
def esc(v):
    if v is None: return "NULL"
    return "'" + str(v).replace("'","''") + "'"

def extract_votants(s):
    if not s: return []
    v = s.get("votant",[]); return [v] if isinstance(v,dict) else (v or [])

def main():
    out = turso("SELECT MAX(numero) as n FROM scrutins WHERE chambre='AN';")
    last_num = 0
    for line in out.split("\n"):
        t = line.strip().strip("|").strip()
        try: last_num = int(t); break
        except: pass
    print(f"  Dernier: #{last_num}", flush=True)
    with urllib.request.urlopen(SCRUTINS_URL, timeout=120) as r: data = r.read()
    with zipfile.ZipFile(io.BytesIO(data)) as z: z.extractall("/tmp/scrutins_new")
    files = sorted(glob.glob("/tmp/scrutins_new/json/*.json"))
    sql_path = "/tmp/scrutins.sql"; new_s = new_v = 0
    with open(sql_path,"w") as f:
        for fp in files:
            try: raw = json.load(open(fp))["scrutin"]
            except: continue
            num = int(raw.get("numero") or 0)
            if num <= last_num: continue
            uid = raw.get("uid"); synth=raw.get("syntheseVote") or {}; dec=synth.get("decompte") or {}; tv=raw.get("typeVote") or {}
            sort_code=(raw.get("sort") or {}).get("code")
            f.write(f"INSERT OR IGNORE INTO scrutins VALUES ({esc(uid)},'AN',{num},17,{esc(raw.get('dateScrutin'))},{esc(raw.get('titre'))},{esc(tv.get('codeTypeVote'))},{esc(tv.get('libelleTypeVote'))},{esc(sort_code)},{int(dec.get('pour') or 0)},{int(dec.get('contre') or 0)},{int(dec.get('abstentions') or 0)},{int(dec.get('nonVotants') or 0)},{int(synth.get('nombreVotants') or 0)},{int(synth.get('suffragesExprimes') or 0)});\n")
            new_s += 1
            gpes=((raw.get("ventilationVotes") or {}).get("organe") or {})
            groupes=(gpes.get("groupes") or {}).get("groupe",[])
            if isinstance(groupes,dict): groupes=[groupes]
            for g in groupes:
                dn=(g.get("vote") or {}).get("decompteNominatif") or {}
                for key,pos in POSITION_MAP.items():
                    for v in extract_votants(dn.get(key)):
                        acteur=v.get("acteurRef")
                        if acteur and uid:
                            deleg=1 if v.get("parDelegation")=="true" else 0
                            f.write(f"INSERT OR IGNORE INTO votes VALUES ({esc(uid)},{esc(acteur)},{esc(pos)},{deleg});\n")
                            new_v+=1
    if new_s==0: print("  Aucun nouveau scrutin."); return
    print(f"  {new_s} scrutins, {new_v} votes...", flush=True)
    turso_file(sql_path)
    print(f"  Scrutins importes")

if __name__=="__main__": main()
