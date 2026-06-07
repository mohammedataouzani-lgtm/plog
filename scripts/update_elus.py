"""scripts/update_elus.py — via Turso CLI"""
import sys, os, json, csv, glob, zipfile, urllib.request, subprocess, datetime, tempfile
from collections import defaultdict

URLS = {
    "amo50":     "http://data.assemblee-nationale.fr/static/openData/repository/17/amo/acteurs_mandats_organes_divises/AMO50_acteurs_mandats_organes_divises.json.zip",
    "hist_an":   "https://www.data.gouv.fr/api/1/datasets/60f2ffc8284ff5e8c1ed0655/",
    "senat_gen": "https://data.senat.fr/data/senateurs/ODSEN_GENERAL.csv",
    "senat_elu": "https://data.senat.fr/data/senateurs/ODSEN_ELUSEN.csv",
}

def db_name():
    return os.environ["TURSO_DATABASE_URL"].replace("libsql://","").split(".")[0]

def turso_file(path):
    with open(path) as f:
        lines = [l for l in f.read().split("\n") if l.strip()]
    for i in range(0, len(lines), 200):
        bloc = "\n".join(lines[i:i+200])
        subprocess.run(["turso","db","shell",db_name(),bloc], capture_output=True)
        if (i//200)%5==0: print(f"  {min(i+200,len(lines))}/{len(lines)}", flush=True)

def dl(label, url):
    print(f"  ↓ {label}...", flush=True)
    with urllib.request.urlopen(url, timeout=120) as r: return r.read()

def clean_date(d):
    if not d: return None
    return str(d).strip().split(" ")[0] or None

def read_senat_csv(path):
    with open(path, encoding="latin-1") as f:
        lines = [l for l in f if not l.startswith("%") and l.strip()]
    return list(csv.DictReader(lines))

def esc(v):
    if v is None: return "NULL"
    return "'" + str(v).replace("'","''") + "'"

def main():
    today = datetime.date.today().isoformat()

    # ── AMO50 ──────────────────────────────────────────────────────────────────
    raw = dl("AMO50", URLS["amo50"])
    import io
    with zipfile.ZipFile(io.BytesIO(raw)) as z: z.extractall("/tmp/amo50")

    with urllib.request.urlopen(URLS["hist_an"]) as r:
        hist_url = json.load(r)["resources"][0]["url"]
    hist_raw = dl("Historique AN", hist_url)
    with open("/tmp/hist.csv","wb") as f: f.write(hist_raw)

    groupe_map = {}
    with open("/tmp/hist.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("active") == "1":
                groupe_map[row["id"]] = {"groupe_libelle": row.get("groupe"), "groupe_abrev": row.get("groupeAbrev")}

    mandats_by_acteur = defaultdict(list)
    for mf in glob.glob("/tmp/amo50/mandat/*.json"):
        try:
            m = json.load(open(mf))["mandat"]
            mandats_by_acteur[m["acteurRef"]].append(m)
        except: pass

    organe_cache = {}
    def get_org(ref):
        if not ref: return {}
        if ref not in organe_cache:
            p = f"/tmp/amo50/organe/{ref}.json"
            organe_cache[ref] = json.load(open(p)).get("organe",{}) if os.path.exists(p) else {}
        return organe_cache[ref]

    deputes = []
    for af in sorted(glob.glob("/tmp/amo50/acteur/*.json")):
        try: data = json.load(open(af))["acteur"]
        except: continue
        uid = data["uid"]["#text"] if isinstance(data["uid"],dict) else data["uid"]
        ec = data.get("etatCivil",{}); ident = ec.get("ident",{}); nais = ec.get("infoNaissance",{})
        m17 = next((m for m in mandats_by_acteur.get(uid,[]) if m.get("typeOrgane")=="ASSEMBLEE" and str(m.get("legislature",""))=="17"), None)
        if not m17: continue
        g = groupe_map.get(uid, {})
        if not g.get("groupe_abrev"):
            for m in mandats_by_acteur.get(uid,[]):
                if m.get("typeOrgane")=="GP" and str(m.get("legislature",""))=="17" and not m.get("dateFin"):
                    ref=(m.get("organes")or{}).get("organeRef"); org=get_org(ref)
                    g={"groupe_libelle":org.get("libelle"),"groupe_abrev":org.get("libelleAbrev") or org.get("libelleAbrege")}; break
        commission = None
        for m in mandats_by_acteur.get(uid,[]):
            if m.get("typeOrgane")=="COMPER" and str(m.get("legislature",""))=="17" and not m.get("dateFin"):
                commission=get_org((m.get("organes")or{}).get("organeRef")).get("libelle"); break
        mandature=m17.get("mandature") or {}; cause_fin=mandature.get("causeFin")
        election=m17.get("election",{}) or {}; lieu=election.get("lieu",{}) or {}
        adresses=data.get("adresses",{}) or {}; adresse_list=adresses.get("adresse",[])
        if isinstance(adresse_list,dict): adresse_list=[adresse_list]
        site_web=next((a.get("valElec") for a in adresse_list if isinstance(a,dict) and a.get("@xsi:type")=="AdresseSiteWeb_Type"),None)
        deputes.append({"uid":uid,"chambre":"AN","legislature":17,"civilite":ident.get("civ"),"prenom":ident.get("prenom"),"nom":ident.get("nom"),"date_naissance":clean_date(nais.get("dateNais")),"date_deces":clean_date(ec.get("dateDeces")),"profession":(data.get("profession")or{}).get("libelleCourant"),"groupe_libelle":g.get("groupe_libelle"),"groupe_abrev":g.get("groupe_abrev"),"commission":commission,"departement":lieu.get("departement"),"num_departement":lieu.get("numDepartement"),"num_circo":lieu.get("numCirco"),"region":lieu.get("region"),"date_debut_mandat":clean_date(m17.get("dateDebut")),"date_fin_mandat":clean_date(m17.get("dateFin")),"statut":"actif" if not cause_fin else "mandat_termine","raison_fin":cause_fin if cause_fin else None,"site_web":site_web,"hatvp":data.get("uri_hatvp")})

    # ── Sénateurs ──────────────────────────────────────────────────────────────
    dl("Sénat général", URLS["senat_gen"])
    with urllib.request.urlopen(URLS["senat_gen"],timeout=30) as r:
        with open("/tmp/senat_gen.csv","wb") as f: f.write(r.read())
    with urllib.request.urlopen(URLS["senat_elu"],timeout=30) as r:
        with open("/tmp/senat_elu.csv","wb") as f: f.write(r.read())

    gen_rows = read_senat_csv("/tmp/senat_gen.csv")
    elu_rows = read_senat_csv("/tmp/senat_elu.csv")
    mandats_s = defaultdict(list)
    for row in elu_rows: mandats_s[row["Matricule"]].append(row)

    senateurs = []
    for row in gen_rows:
        if row.get("État","").strip() != "ACTIF": continue
        mat=row.get("Matricule","").strip()
        mandat=next((m for m in mandats_s.get(mat,[]) if m.get("Motif fin de mandat","").strip()=="En Cours"),None)
        senateurs.append({"uid":mat,"chambre":"Senat","civilite":row.get("Qualité","").strip() or None,"prenom":row.get("Prénom usuel","").strip() or None,"nom":row.get("Nom usuel","").strip() or None,"date_naissance":clean_date(row.get("Date naissance")),"date_deces":clean_date(row.get("Date de décès")) or None,"groupe":row.get("Groupe politique","").strip() or None,"commission":row.get("Commission permanente","").strip() or None,"circonscription":row.get("Circonscription","").strip() or None,"fonction_bureau":row.get("Fonction au Bureau du Sénat","").strip() or None,"email":row.get("Courrier électronique","").strip() or None,"profession":row.get("Description de la profession","").strip() or None,"date_debut_mandat":clean_date(mandat.get("Date de début de mandat")) if mandat else None,"date_fin_mandat":clean_date(mandat.get("Date de fin de mandat")) if mandat else None,"statut":"actif"})

    # ── Générer SQL ────────────────────────────────────────────────────────────
    sql_path = "/tmp/elus.sql"
    with open(sql_path,"w") as f:
        f.write("DELETE FROM deputes;\n")
        for d in deputes:
            cols = list(d.keys())
            vals = ",".join(esc(d[c]) for c in cols)
            f.write(f"INSERT INTO deputes ({','.join(cols)}) VALUES ({vals});\n")
        f.write("DELETE FROM senateurs;\n")
        for s in senateurs:
            cols = list(s.keys())
            vals = ",".join(esc(s[c]) for c in cols)
            f.write(f"INSERT INTO senateurs ({','.join(cols)}) VALUES ({vals});\n")

    print(f"  Injection {len(deputes)} députés + {len(senateurs)} sénateurs...", flush=True)
    turso_file(sql_path)
    print(f"  ✓ {len(deputes)} dépulés, {len(senateurs)} sénateurs")

if __name__ == "__main__": main()
