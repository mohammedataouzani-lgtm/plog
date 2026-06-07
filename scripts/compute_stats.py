"""
scripts/compute_stats.py
Calcule participation_rate et rebellion_rate via Turso CLI.
"""
import os, sys, json, subprocess, datetime, urllib.request
from collections import defaultdict, Counter

def db_name():
    url = os.environ["TURSO_DATABASE_URL"].replace("libsql://", "")
    return url.split(".")[0]

def turso(sql):
    r = subprocess.run(["turso", "db", "shell", db_name(), sql],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ⚠ {r.stderr[:200]}", flush=True)
    return r.stdout

def turso_file(path):
    with open(path) as f:
        lines = [l for l in f.read().split("\n") if l.strip()]
    BLOC = 200
    for i in range(0, len(lines), BLOC):
        bloc = "\n".join(lines[i:i+BLOC])
        r = subprocess.run(["turso", "db", "shell", db_name(), bloc],
                           capture_output=True, text=True)
        if r.returncode != 0:
            print(f"  ⚠ bloc {i//BLOC}: {r.stderr[:100]}", flush=True)
        if (i // BLOC) % 10 == 0:
            print(f"  {min(i+BLOC,len(lines))}/{len(lines)} lignes", flush=True)

def get_deputes():
    out = turso("SELECT uid, groupe_abrev FROM deputes WHERE groupe_abrev IS NOT NULL;")
    result = {}
    for line in out.split("\n"):
        parts = [p.strip().strip("|").strip() for p in line.split("|") if p.strip()]
        if len(parts) == 2 and parts[0].startswith("PA"):
            result[parts[0]] = parts[1]
    return result

def get_votes():
    """Charge les votes par blocs depuis Turso CLI."""
    print("  Chargement des votes...", flush=True)
    out = turso("SELECT acteur_uid, scrutin_uid, position FROM votes WHERE acteur_uid IN (SELECT uid FROM deputes);")
    votes = []
    for line in out.split("\n"):
        parts = [p.strip().strip("|").strip() for p in line.split("|") if p.strip()]
        if len(parts) == 3 and parts[0].startswith("PA"):
            votes.append((parts[0], parts[1], parts[2]))
    return votes

def main():
    today = datetime.date.today().isoformat()
    ABSENTS = {"nonVotant", "nonVotantVolontaire"}
    NI_EXCLU = {"NI", None}

    print("Chargement des groupes...", flush=True)
    deputes_groupe = get_deputes()
    print(f"  {len(deputes_groupe)} députés", flush=True)

    rows_votes = get_votes()
    print(f"  {len(rows_votes):,} votes chargés", flush=True)

    # Indexation
    votes_dep = defaultdict(list)
    votes_sg  = defaultdict(list)
    for uid, scr, pos in rows_votes:
        votes_dep[uid].append((scr, pos))
        g = deputes_groupe.get(uid)
        if g and g not in NI_EXCLU:
            votes_sg[(scr, g)].append(pos)

    # Majorité groupe
    print("  Calcul majorités...", flush=True)
    majority = {}
    for (scr, g), positions in votes_sg.items():
        actifs = [p for p in positions if p not in ABSENTS]
        if actifs:
            majority[(scr, g)] = Counter(actifs).most_common(1)[0][0]

    # Stats par député
    print("  Calcul stats...", flush=True)
    stats = {}
    for uid, vote_list in votes_dep.items():
        g = deputes_groupe.get(uid)
        total  = len(vote_list)
        actifs = sum(1 for _, p in vote_list if p not in ABSENTS)
        reb_t = reb = 0
        if g and g not in NI_EXCLU:
            for scr, pos in vote_list:
                if pos in ABSENTS: continue
                maj = majority.get((scr, g))
                if maj:
                    reb_t += 1
                    if pos != maj: reb += 1
        stats[uid] = (total, actifs,
            round(actifs/total*100, 1) if total else 0,
            reb_t, reb,
            round(reb/reb_t*100, 1) if reb_t else None)

    avg_part = sum(s[2] for s in stats.values()) / len(stats)
    avg_reb_vals = [s[5] for s in stats.values() if s[5] is not None]
    avg_reb = sum(avg_reb_vals) / len(avg_reb_vals) if avg_reb_vals else 0
    print(f"  Participation moyenne: {avg_part:.1f}%, Rébellion: {avg_reb:.1f}%", flush=True)

    # Générer SQL
    sql_path = "/tmp/stats.sql"
    with open(sql_path, "w") as f:
        f.write("DROP TABLE IF EXISTS stats_deputes;\n")
        f.write("CREATE TABLE stats_deputes (uid TEXT PRIMARY KEY, votes_total INTEGER, votes_actifs INTEGER, participation_rate REAL, votes_pour_rebellion INTEGER, rebellions INTEGER, rebellion_rate REAL, updated_at TEXT);\n")
        for uid, (total, actifs, part, reb_t, reb, reb_rate) in stats.items():
            uid_s = uid.replace("'","''")
            reb_val = str(reb_rate) if reb_rate is not None else "NULL"
            f.write(f"INSERT INTO stats_deputes VALUES ('{uid_s}',{total},{actifs},{part},{reb_t},{reb},{reb_val},'{today}');\n")

    print(f"  Injection {len(stats)} lignes → Turso...", flush=True)
    turso_file(sql_path)
    print("✓ Stats synchronisées")

if __name__ == "__main__":
    main()
