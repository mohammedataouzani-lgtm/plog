import os, json, glob, zipfile, io, subprocess, urllib.request
from collections import defaultdict

SCRUTINS_URL = "http://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip"
POSITION_MAP = {"pours":"pour","contres":"contre","abstentions":"abstention","nonVotants":"nonVotant","nonVotantsVolontaires":"nonVotantVolontaire"}

def turso(sql):
    url = os.environ["TURSO_DATABASE_URL"]; token = os.environ["TURSO_AUTH_TOKEN"]
    r = subprocess.run(["turso","db","shell",url,"--auth-token",token,sql], capture_output=True, text=True)
    return r.stdout

def turso_file(path):
    url = os.environ["TURSO_DATABASE_URL"]; token = os.environ["TURSO_AUTH_TOKEN"]
    with open(path) as f:
        lines = [l for l in f.read().split("\n") if l.strip()]
    for i in range(0, len(lines), 200):
        bloc = "\n".join(lines[i:i+200])
        subprocess.run(["turso","db","shell",url,"--auth-token",token,bloc], capture_output=True)
        if (i//200)%10==0: print(f"  {min(i+200,len(lines))}/{len(lines)}", flush=True)

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
