import os, subprocess, datetime
from collections import defaultdict, Counter

def turso(sql):
    url   = os.environ["TURSO_DATABASE_URL"]
    token = os.environ["TURSO_AUTH_TOKEN"]
    r = subprocess.run(
        ["turso", "db", "shell", url, "--auth-token", token, sql],
        capture_output=True, text=True
    )
    return r.stdout

def turso_file(path):
    url   = os.environ["TURSO_DATABASE_URL"]
    token = os.environ["TURSO_AUTH_TOKEN"]
    with open(path) as f:
        lines = [l for l in f.read().split("\n") if l.strip()]
    for i in range(0, len(lines), 200):
        bloc = "\n".join(lines[i:i+200])
        subprocess.run(
            ["turso", "db", "shell", url, "--auth-token", token, bloc],
            capture_output=True
        )
        if (i // 200) % 10 == 0:
            print(f"  {min(i+200, len(lines))}/{len(lines)} lignes", flush=True)

def main():
    today = datetime.date.today().isoformat()
    ABSENTS = {"nonVotant", "nonVotantVolontaire"}
    NI = {"NI", None}

    print("Chargement groupes...", flush=True)
    out = turso("SELECT uid, groupe_abrev FROM deputes WHERE groupe_abrev IS NOT NULL;")
    deputes = {}
    for line in out.split("\n"):
        parts = [p.strip().strip("|").strip() for p in line.split("|") if p.strip()]
        if len(parts) == 2 and parts[0].startswith("PA"):
            deputes[parts[0]] = parts[1]
    print(f"  {len(deputes)} deputes", flush=True)

    print("Chargement votes...", flush=True)
    out2 = turso("SELECT acteur_uid, scrutin_uid, position FROM votes WHERE acteur_uid IN (SELECT uid FROM deputes);")
    all_votes = []
    for line in out2.split("\n"):
        parts = [p.strip().strip("|").strip() for p in line.split("|") if p.strip()]
        if len(parts) == 3 and parts[0].startswith("PA"):
            all_votes.append((parts[0], parts[1], parts[2]))
    print(f"  {len(all_votes):,} votes", flush=True)

    votes_dep = defaultdict(list)
    votes_sg  = defaultdict(list)
    for uid, scr, pos in all_votes:
        votes_dep[uid].append((scr, pos))
        g = deputes.get(uid)
        if g and g not in NI:
            votes_sg[(scr, g)].append(pos)

    print("  Majorites...", flush=True)
    majority = {}
    for (scr, g), positions in votes_sg.items():
        actifs = [p for p in positions if p not in ABSENTS]
        if actifs:
            majority[(scr, g)] = Counter(actifs).most_common(1)[0][0]

    print("  Stats...", flush=True)
    stats = {}
    for uid, vote_list in votes_dep.items():
        g = deputes.get(uid)
        total = len(vote_list)
        actifs = sum(1 for _, p in vote_list if p not in ABSENTS)
        reb_t = reb = 0
        if g and g not in NI:
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

    avg = sum(s[2] for s in stats.values()) / len(stats)
    print(f"  Participation moy: {avg:.1f}%", flush=True)

    sql_path = "/tmp/stats.sql"
    with open(sql_path, "w") as f:
        f.write("DROP TABLE IF EXISTS stats_deputes;\n")
        f.write("CREATE TABLE stats_deputes (uid TEXT PRIMARY KEY, votes_total INTEGER, votes_actifs INTEGER, participation_rate REAL, votes_pour_rebellion INTEGER, rebellions INTEGER, rebellion_rate REAL, updated_at TEXT);\n")
        for uid, (total, actifs, part, reb_t, reb, reb_rate) in stats.items():
            u = uid.replace("'", "''")
            rv = str(reb_rate) if reb_rate is not None else "NULL"
            f.write(f"INSERT INTO stats_deputes VALUES ('{u}',{total},{actifs},{part},{reb_t},{reb},{rv},'{today}');\n")

    print(f"  Injection {len(stats)} lignes...", flush=True)
    turso_file(sql_path)
    print("Stats synchronisees")

if __name__ == "__main__":
    main()
