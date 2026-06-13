import { createClient, type Client } from "@libsql/client";

let _db: Client | null = null;

function getDb(): Client {
  if (_db) return _db;
  _db = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:data/parlement.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return _db;
}

export interface Depute {
  uid: string; chambre: string; legislature: number;
  civilite: string | null; prenom: string | null; nom: string | null;
  date_naissance: string | null; date_deces: string | null; profession: string | null;
  groupe_libelle: string | null; groupe_abrev: string | null; commission: string | null;
  departement: string | null; num_departement: string | null;
  num_circo: string | null; region: string | null;
  date_debut_mandat: string | null; date_fin_mandat: string | null;
  statut: "actif" | "mandat_termine"; raison_fin: string | null;
  site_web: string | null; hatvp: string | null;
  // Stats
  participation_rate: number | null;
  rebellion_rate: number | null;
  votes_total: number | null;
}


export interface Senateur {
  uid: string; chambre: string;
  civilite: string | null; prenom: string | null; nom: string | null;
  date_naissance: string | null; date_deces: string | null;
  groupe: string | null; commission: string | null;
  circonscription: string | null; fonction_bureau: string | null;
  email: string | null; profession: string | null;
  date_debut_mandat: string | null; date_fin_mandat: string | null;
  statut: "actif";
}

export interface Archive {
  uid: string; chambre: "AN" | "Senat";
  civilite: string | null; prenom: string | null; nom: string | null;
  date_naissance: string | null; date_deces: string | null; profession: string | null;
  groupe: string | null; groupe_abrev: string | null;
  departement: string | null; num_departement: string | null; num_circo: string | null;
  derniere_legislature: string | null; date_prise_fonction: string | null;
  nombre_mandats: number | null; mail: string | null;
  twitter: string | null; website: string | null;
  score_participation: number | null; circonscription: string | null; raison_fin: string | null;
}

export interface Scrutin {
  uid: string; chambre: string; numero: number; legislature: number;
  date: string | null; titre: string | null;
  type_vote_code: string | null; type_vote_libelle: string | null;
  sort: string | null;
  pour: number; contre: number; abstentions: number;
  non_votants: number; votants: number; suffrages: number;
}

export interface VoteActeur {
  scrutin_uid: string; date: string | null; titre: string | null;
  sort: string | null; position: string; par_delegation: number;
  pour: number; contre: number; abstentions: number;
}

export interface PaginatedResult<T> {
  data: T[]; total: number; page: number; pageSize: number; totalPages: number;
}

export interface ConvergenceResult {
  total: number; accord: number; taux: number;
}

export interface VoteCommun {
  scrutin_uid: string; date: string | null; titre: string | null;
  sort: string | null; pos_a: string; pos_b: string;
}

async function rows<T>(sql: string, args: Record<string, any> | any[] = {}): Promise<T[]> {
  const res = await getDb().execute({ sql, args: args as any });
  return res.rows as unknown as T[];
}

async function row<T>(sql: string, args: Record<string, any> | any[] = {}): Promise<T | null> {
  const r = await rows<T>(sql, args);
  return r[0] ?? null;
}

async function paginate<T>(
  countSql: string, dataSql: string,
  params: Record<string, any>, page: number, pageSize: number
): Promise<PaginatedResult<T>> {
  const countRow = await row<{ total: number }>(countSql, params);
  const total = Number(countRow?.total ?? 0);
  const data = await rows<T>(dataSql, { ...params, limit: pageSize, offset: (page - 1) * pageSize });
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getDeputes(opts: {
  page?: number; pageSize?: number;
  groupe?: string; departement?: string; statut?: string; q?: string;
  tri?: string;
}): Promise<PaginatedResult<Depute>> {
  const { page = 1, pageSize = 60, groupe, departement, statut, q, tri = "nom" } = opts;
  const where: string[] = []; const p: Record<string, any> = {};
  if (groupe) { where.push("d.groupe_abrev = :groupe"); p.groupe = groupe; }
  if (departement) { where.push("d.num_departement = :dept"); p.dept = departement; }
  if (statut) { where.push("d.statut = :statut"); p.statut = statut; }
  if (q) { where.push("(d.nom LIKE :q OR d.prenom LIKE :q)"); p.q = `%${q}%`; }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const ORDER = {
    "nom": "d.nom, d.prenom",
    "participation_asc": "COALESCE(s.participation_rate, 0) ASC",
    "participation_desc": "COALESCE(s.participation_rate, 0) DESC",
    "rebellion_desc": "COALESCE(s.rebellion_rate, 0) DESC",
  }[tri] ?? "d.nom, d.prenom";

  const JOIN = "LEFT JOIN stats_deputes s ON d.uid = s.uid";
  const SELECT = `d.*, s.participation_rate, s.rebellion_rate, s.votes_total`;

  return paginate<Depute>(
    `SELECT COUNT(*) as total FROM deputes d ${w}`,
    `SELECT ${SELECT} FROM deputes d ${JOIN} ${w} ORDER BY ${ORDER} LIMIT :limit OFFSET :offset`,
    p, page, pageSize
  );
}

export async function getDepute(uid: string): Promise<Depute | null> {
  return row<Depute>(`
    SELECT d.*,
           s.participation_rate, s.rebellion_rate, s.votes_total,
           a.nb_presences_commission, a.nb_questions_ecrites,
           a.nb_questions_orales, a.nb_amendements_deposes,
           a.nb_amendements_signes, a.nb_amendements_adoptes
    FROM deputes d
    LEFT JOIN stats_deputes s ON d.uid = s.uid
    LEFT JOIN activite_deputes a ON d.uid = a.uid
    WHERE d.uid = ?`, [uid]);
}

export async function getSenateurs(opts: {
  page?: number; pageSize?: number; groupe?: string; circonscription?: string; q?: string;
}): Promise<PaginatedResult<Senateur>> {
  const { page = 1, pageSize = 60, groupe, circonscription, q } = opts;
  const where: string[] = []; const p: Record<string, any> = {};
  if (groupe) { where.push("groupe = :groupe"); p.groupe = groupe; }
  if (circonscription) { where.push("circonscription = :circo"); p.circo = circonscription; }
  if (q) { where.push("(nom LIKE :q OR prenom LIKE :q)"); p.q = `%${q}%`; }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return paginate<Senateur>(
    `SELECT COUNT(*) as total FROM senateurs ${w}`,
    `SELECT * FROM senateurs ${w} ORDER BY nom, prenom LIMIT :limit OFFSET :offset`,
    p, page, pageSize
  );
}

export async function getSenateur(uid: string): Promise<Senateur | null> {
  return row<Senateur>("SELECT * FROM senateurs WHERE uid = ?", [uid]);
}

export async function getArchives(opts: {
  page?: number; pageSize?: number;
  chambre?: string; groupe?: string; departement?: string; legislature?: string; q?: string;
}): Promise<PaginatedResult<Archive>> {
  const { page = 1, pageSize = 60, chambre, groupe, departement, legislature, q } = opts;
  const where: string[] = []; const p: Record<string, any> = {};
  if (chambre) { where.push("chambre = :chambre"); p.chambre = chambre; }
  if (groupe) { where.push("groupe = :groupe"); p.groupe = groupe; }
  if (departement) { where.push("num_departement = :dept"); p.dept = departement; }
  if (legislature) { where.push("derniere_legislature = :leg"); p.leg = legislature; }
  if (q) { where.push("(nom LIKE :q OR prenom LIKE :q)"); p.q = `%${q}%`; }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return paginate<Archive>(
    `SELECT COUNT(*) as total FROM archives ${w}`,
    `SELECT * FROM archives ${w} ORDER BY nom, prenom LIMIT :limit OFFSET :offset`,
    p, page, pageSize
  );
}

export async function getArchive(uid: string, chambre: string): Promise<Archive | null> {
  return row<Archive>("SELECT * FROM archives WHERE uid = ? AND chambre = ?", [uid, chambre]);
}

export async function getScrutins(opts: {
  page?: number; pageSize?: number;
  sort?: string; type?: string; q?: string;
}): Promise<PaginatedResult<Scrutin>> {
  const { page = 1, pageSize = 50, sort, type, q } = opts;
  const where: string[] = []; const p: Record<string, any> = {};
  if (sort) { where.push("sort = :sort"); p.sort = sort; }
  if (type) { where.push("type_vote_code = :type"); p.type = type; }
  if (q) { where.push("titre LIKE :q"); p.q = `%${q}%`; }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return paginate<Scrutin>(
    `SELECT COUNT(*) as total FROM scrutins ${w}`,
    `SELECT * FROM scrutins ${w} ORDER BY date DESC, numero DESC LIMIT :limit OFFSET :offset`,
    p, page, pageSize
  );
}

export async function getScrutin(uid: string): Promise<Scrutin | null> {
  return row<Scrutin>("SELECT * FROM scrutins WHERE uid = ?", [uid]);
}

export async function getVotesPourScrutin(scrutinUid: string) {
  return rows<any>(`
    SELECT v.acteur_uid, v.position, v.par_delegation,
           d.prenom, d.nom, d.groupe_abrev, d.groupe_libelle,
           d.departement, d.num_departement
    FROM votes v
    LEFT JOIN deputes d ON v.acteur_uid = d.uid
    WHERE v.scrutin_uid = ?
    ORDER BY v.position, d.groupe_abrev, d.nom
  `, [scrutinUid]);
}

export async function getVotesActeur(acteurUid: string, opts: {
  page?: number; pageSize?: number; position?: string;
}): Promise<PaginatedResult<VoteActeur>> {
  const { page = 1, pageSize = 30, position } = opts;
  const posFilter = position ? "AND v.position = :position" : "";
  const p: Record<string, any> = { uid: acteurUid };
  if (position) p.position = position;
  return paginate<VoteActeur>(
    `SELECT COUNT(*) as total FROM votes v WHERE v.acteur_uid = :uid ${posFilter}`,
    `SELECT v.scrutin_uid, s.date, s.titre, s.sort, v.position, v.par_delegation,
            s.pour, s.contre, s.abstentions
     FROM votes v JOIN scrutins s ON v.scrutin_uid = s.uid
     WHERE v.acteur_uid = :uid ${posFilter}
     ORDER BY s.date DESC LIMIT :limit OFFSET :offset`,
    p, page, pageSize
  );
}

export async function getStatsVotesActeur(acteurUid: string) {
  const r = await rows<{ position: string; n: number }>(
    "SELECT position, COUNT(*) as n FROM votes WHERE acteur_uid = ? GROUP BY position",
    [acteurUid]
  );
  const map = Object.fromEntries(r.map(x => [x.position, Number(x.n)]));
  const pour = map.pour ?? 0;
  const contre = map.contre ?? 0;
  const abstention = map.abstention ?? 0;
  const nonVotant = (map.nonVotant ?? 0) + (map.nonVotantVolontaire ?? 0);
  const total = pour + contre + abstention + nonVotant;
  const participation = total > 0 ? Math.round((pour + contre + abstention) / total * 100) : 0;
  return { total, pour, contre, abstention, nonVotant, participation };
}

export async function globalSearch(q: string, limit = 10) {
  const pat = `%${q}%`;
  const [deputes, senateurs, archives, scrutins] = await Promise.all([
    rows(`SELECT uid,'AN' as chambre,'depute' as type,prenom,nom,groupe_abrev as groupe,statut,departement FROM deputes WHERE nom LIKE ? OR prenom LIKE ? LIMIT ?`, [pat, pat, limit]),
    rows(`SELECT uid,'Senat' as chambre,'senateur' as type,prenom,nom,groupe,'actif' as statut,circonscription as departement FROM senateurs WHERE nom LIKE ? OR prenom LIKE ? LIMIT ?`, [pat, pat, limit]),
    rows(`SELECT uid,chambre,'archive' as type,prenom,nom,groupe,'ancien' as statut,departement FROM archives WHERE nom LIKE ? OR prenom LIKE ? LIMIT ?`, [pat, pat, limit]),
    rows(`SELECT uid,'scrutin' as type,titre,date,sort FROM scrutins WHERE titre LIKE ? ORDER BY date DESC LIMIT ?`, [pat, Math.min(limit, 5)]),
  ]);
  return { deputes, senateurs, archives, scrutins };
}

export async function getStats() {
  const [d, s, a, sc, gAN, gSen, recents] = await Promise.all([
    row<{ n: number }>("SELECT COUNT(*) as n FROM deputes WHERE statut='actif'"),
    row<{ n: number }>("SELECT COUNT(*) as n FROM senateurs"),
    row<{ n: number }>("SELECT COUNT(*) as n FROM archives"),
    row<{ n: number }>("SELECT COUNT(*) as n FROM scrutins"),
    rows("SELECT groupe_abrev as abrev,groupe_libelle as libelle,COUNT(*) as nb FROM deputes WHERE statut='actif' AND groupe_abrev IS NOT NULL GROUP BY groupe_abrev ORDER BY nb DESC"),
    rows("SELECT groupe,COUNT(*) as nb FROM senateurs WHERE groupe IS NOT NULL GROUP BY groupe ORDER BY nb DESC"),
    rows("SELECT uid,date,titre,sort,pour,contre,abstentions FROM scrutins ORDER BY date DESC LIMIT 5"),
  ]);
  return {
    totalDeputes: Number(d?.n ?? 0),
    totalSenateurs: Number(s?.n ?? 0),
    totalArchives: Number(a?.n ?? 0),
    totalScrutins: Number(sc?.n ?? 0),
    groupesAN: gAN,
    groupesSenat: gSen,
    recentScrutins: recents,
  };
}

export async function getConvergence(uid_a: string, uid_b: string): Promise<ConvergenceResult> {
  const r = await row<{ total: number; accord: number }>(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN v1.position = v2.position THEN 1 ELSE 0 END) as accord
    FROM votes v1
    JOIN votes v2 ON v1.scrutin_uid = v2.scrutin_uid
    WHERE v1.acteur_uid = ? AND v2.acteur_uid = ?
  `, [uid_a, uid_b]);
  const total = Number(r?.total ?? 0);
  const accord = Number(r?.accord ?? 0);
  return { total, accord, taux: total > 0 ? Math.round(accord / total * 100) : 0 };
}

export async function getVotesDivergents(uid_a: string, uid_b: string, limit = 50): Promise<VoteCommun[]> {
  return rows<VoteCommun>(`
    SELECT v1.scrutin_uid, s.date, s.titre, s.sort,
           v1.position as pos_a, v2.position as pos_b
    FROM votes v1
    JOIN votes v2 ON v1.scrutin_uid = v2.scrutin_uid
    JOIN scrutins s ON v1.scrutin_uid = s.uid
    WHERE v1.acteur_uid = ? AND v2.acteur_uid = ?
      AND v1.position != v2.position
      AND v1.position NOT IN ('nonVotant','nonVotantVolontaire')
      AND v2.position NOT IN ('nonVotant','nonVotantVolontaire')
    ORDER BY s.date DESC LIMIT ?
  `, [uid_a, uid_b, limit]);
}
