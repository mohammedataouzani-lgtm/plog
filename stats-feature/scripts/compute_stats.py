"""
scripts/compute_stats.py
Calcule participation_rate et rebellion_rate pour chaque député
et les synchronise dans la table stats_deputes sur Turso.

Logique :
  participation_rate = votes actifs (pour/contre/abstention) / votes totaux enregistrés
  rebellion_rate     = votes ≠ majorité du groupe / votes actifs
                       (NI exclus car groupe non cohérent)
"""

import sys
import os
import json
import urllib.request
from collections import defaultdict, Counter

sys.path.insert(0, os.path.dirname(__file__))
from turso_client import TursoClient

GROUPES_EXCLUS_REBELLION = {"NI", None}


def main():
    db = TursoClient()

    # ── 1. Récupérer les groupes des députés ──────────────────────────────────
    print("  Chargement des groupes...", flush=True)
    deputes_rows = db.execute("SELECT uid, groupe_abrev FROM deputes WHERE groupe_abrev IS NOT NULL")
    deputes_groupe = {r["uid"]: r["groupe_abrev"] for r in deputes_rows}
    deputes_uids = set(deputes_groupe.keys())
    print(f"  {len(deputes_uids)} députés", flush=True)

    # ── 2. Charger tous les votes ─────────────────────────────────────────────
    print("  Chargement des votes (peut prendre 1 min)...", flush=True)
    BATCH = 50_000
    offset = 0
    all_votes = []

    while True:
        chunk = db.execute(
            f"SELECT acteur_uid, scrutin_uid, position FROM votes LIMIT {BATCH} OFFSET {offset}"
        )
        if not chunk:
            break
        all_votes.extend(chunk)
        offset += BATCH
        if len(chunk) < BATCH:
            break

    print(f"  {len(all_votes):,} votes chargés", flush=True)

    # ── 3. Indexation ─────────────────────────────────────────────────────────
    votes_par_depute  = defaultdict(list)
    votes_par_sg      = defaultdict(list)   # (scrutin_uid, groupe) → [positions]

    for v in all_votes:
        uid      = v["acteur_uid"]
        scr      = v["scrutin_uid"]
        position = v["position"]
        if uid not in deputes_uids:
            continue
        votes_par_depute[uid].append((scr, position))
        groupe = deputes_groupe.get(uid)
        if groupe and groupe not in GROUPES_EXCLUS_REBELLION:
            votes_par_sg[(scr, groupe)].append(position)

    # ── 4. Majorité de groupe par scrutin ─────────────────────────────────────
    print("  Calcul majorités de groupe...", flush=True)
    majority = {}
    for (scr, groupe), positions in votes_par_sg.items():
        actifs = [p for p in positions if p not in ("nonVotant", "nonVotantVolontaire")]
        if actifs:
            majority[(scr, groupe)] = Counter(actifs).most_common(1)[0][0]

    # ── 5. Stats par député ───────────────────────────────────────────────────
    print("  Calcul stats individuelles...", flush=True)
    ABSENTS = {"nonVotant", "nonVotantVolontaire"}
    stats = {}

    for uid, vote_list in votes_par_depute.items():
        groupe = deputes_groupe.get(uid)
        total  = len(vote_list)
        actifs = sum(1 for _, p in vote_list if p not in ABSENTS)

        rebellion_total = 0
        rebellions      = 0

        if groupe and groupe not in GROUPES_EXCLUS_REBELLION:
            for scr, position in vote_list:
                if position in ABSENTS:
                    continue
                maj = majority.get((scr, groupe))
                if maj:
                    rebellion_total += 1
                    if position != maj:
                        rebellions += 1

        stats[uid] = {
            "uid":                   uid,
            "votes_total":           total,
            "votes_actifs":          actifs,
            "participation_rate":    round(actifs / total * 100, 1) if total else 0.0,
            "votes_pour_rebellion":  rebellion_total,
            "rebellions":            rebellions,
            "rebellion_rate":        round(rebellions / rebellion_total * 100, 1) if rebellion_total else None,
        }

    # ── 6. Moyennes par groupe (pour comparaison) ─────────────────────────────
    groupe_participation = defaultdict(list)
    groupe_rebellion     = defaultdict(list)

    for uid, s in stats.items():
        g = deputes_groupe.get(uid)
        if g:
            groupe_participation[g].append(s["participation_rate"])
            if s["rebellion_rate"] is not None:
                groupe_rebellion[g].append(s["rebellion_rate"])

    avg_part_global = sum(s["participation_rate"] for s in stats.values()) / len(stats)
    avg_reb_global  = sum(s["rebellion_rate"] for s in stats.values() if s["rebellion_rate"] is not None)
    avg_reb_global  = avg_reb_global / sum(1 for s in stats.values() if s["rebellion_rate"] is not None)

    print(f"  Participation moyenne: {avg_part_global:.1f}%")
    print(f"  Rébellion moyenne: {avg_reb_global:.1f}%")

    # ── 7. Créer / recréer la table ───────────────────────────────────────────
    print("  Sync Turso...", flush=True)
    db.execute("DROP TABLE IF EXISTS stats_deputes")
    db.execute("""
        CREATE TABLE stats_deputes (
            uid                   TEXT PRIMARY KEY,
            votes_total           INTEGER,
            votes_actifs          INTEGER,
            participation_rate    REAL,
            votes_pour_rebellion  INTEGER,
            rebellions            INTEGER,
            rebellion_rate        REAL,
            updated_at            TEXT
        )
    """)

    today = __import__("datetime").date.today().isoformat()
    rows = [{**s, "updated_at": today} for s in stats.values()]
    db.batch_insert("stats_deputes", rows, replace=True)

    print(f"  ✓ {len(rows)} stats synchronisées")


if __name__ == "__main__":
    main()
