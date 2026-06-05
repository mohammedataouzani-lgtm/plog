"""
scripts/turso_client.py
Client HTTP simple pour l'API Turso (sans dépendances externes).
"""

import os
import json
import urllib.request
import urllib.error


class TursoClient:
    def __init__(self):
        url = os.environ["TURSO_DATABASE_URL"]
        self.token = os.environ["TURSO_AUTH_TOKEN"]
        # libsql://xxx.turso.io → https://xxx.turso.io
        self.base_url = url.replace("libsql://", "https://")
        self.pipeline_url = f"{self.base_url}/v2/pipeline"

    def execute(self, sql: str, args: list = None) -> list:
        """Exécute une seule requête SQL et retourne les rows."""
        results = self.pipeline([{"sql": sql, "args": args or []}])
        return results[0]

    def pipeline(self, statements: list) -> list:
        """Exécute plusieurs statements en un seul appel HTTP."""
        requests = [
            {"type": "execute", "stmt": {"sql": s["sql"], "args": [
                self._arg(a) for a in s.get("args", [])
            ]}}
            for s in statements
        ]
        requests.append({"type": "close"})

        payload = json.dumps({"requests": requests}).encode("utf-8")
        req = urllib.request.Request(
            self.pipeline_url,
            data=payload,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
        )

        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())

        results = []
        for item in data.get("results", []):
            if item.get("type") == "ok" and "response" in item:
                rs = item["response"].get("result", {})
                cols = [c["name"] for c in rs.get("cols", [])]
                rows = []
                for row in rs.get("rows", []):
                    rows.append(dict(zip(cols, [self._val(v) for v in row])))
                results.append(rows)
        return results

    def batch_insert(self, table: str, rows: list, replace: bool = True):
        """Insère un batch de lignes (dicts) dans une table."""
        if not rows:
            return
        cols = list(rows[0].keys())
        placeholders = ", ".join(["?" for _ in cols])
        col_list = ", ".join(cols)
        verb = "INSERT OR REPLACE" if replace else "INSERT OR IGNORE"
        sql = f"{verb} INTO {table} ({col_list}) VALUES ({placeholders})"

        BATCH = 100  # max rows par appel HTTP
        for i in range(0, len(rows), BATCH):
            chunk = rows[i:i+BATCH]
            stmts = [{"sql": sql, "args": [r.get(c) for c in cols]} for r in chunk]
            self.pipeline(stmts)

    @staticmethod
    def _arg(v):
        if v is None:
            return {"type": "null"}
        if isinstance(v, bool):
            return {"type": "integer", "value": str(int(v))}
        if isinstance(v, int):
            return {"type": "integer", "value": str(v)}
        if isinstance(v, float):
            return {"type": "float", "value": str(v)}
        return {"type": "text", "value": str(v)}

    @staticmethod
    def _val(v):
        if v is None or v.get("type") == "null":
            return None
        t = v.get("type", "text")
        val = v.get("value")
        if t == "integer":
            return int(val) if val is not None else None
        if t == "float":
            return float(val) if val is not None else None
        return val
