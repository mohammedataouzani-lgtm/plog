/**
 * lib/groupeColors.ts
 * Mapping groupe politique → couleur hex
 */

const AN_COLORS: Record<string, { bg: string; text: string }> = {
  RN:      { bg: '#001F5C', text: '#fff' },
  NFP:     { bg: '#8B0000', text: '#fff' },
  LFI:     { bg: '#CC0700', text: '#fff' },
  SOC:     { bg: '#E4003A', text: '#fff' },
  RE:      { bg: '#FFBE00', text: '#111' },
  HOR:     { bg: '#00838F', text: '#fff' },
  DEM:     { bg: '#0082C8', text: '#fff' },
  DR:      { bg: '#003082', text: '#fff' },
  LR:      { bg: '#003082', text: '#fff' },
  LIOT:    { bg: '#6D5BA3', text: '#fff' },
  GDR:     { bg: '#6B0000', text: '#fff' },
  ECO:     { bg: '#2D7A27', text: '#fff' },
  NI:      { bg: '#888880', text: '#fff' },
}

const SENAT_COLORS: Record<string, { bg: string; text: string }> = {
  'Les Républicains':                               { bg: '#003082', text: '#fff' },
  'Socialiste, Écologiste et Républicain':          { bg: '#E4003A', text: '#fff' },
  'Union Centriste':                                { bg: '#0082C8', text: '#fff' },
  'Rassemblement des démocrates, progressistes':    { bg: '#FFBE00', text: '#111' },
  'RDPI':                                           { bg: '#FFBE00', text: '#111' },
  'Communiste Républicain Citoyen et Écologiste':   { bg: '#6B0000', text: '#fff' },
  'CRCE':                                           { bg: '#6B0000', text: '#fff' },
  'Rassemblement Démocratique et Social Européen':  { bg: '#C97C00', text: '#fff' },
  'RDSE':                                           { bg: '#C97C00', text: '#fff' },
  'Les Indépendants':                               { bg: '#4A5568', text: '#fff' },
}

export function getGroupeColor(
  abrev: string | null,
  libelle: string | null,
  chambre: 'AN' | 'Senat' = 'AN'
): { bg: string; text: string } {
  const fallback = { bg: '#9CA3AF', text: '#fff' }

  if (chambre === 'AN') {
    if (abrev && AN_COLORS[abrev]) return AN_COLORS[abrev]
    // Essai par mots-clés
    const key = abrev?.toUpperCase() ?? ''
    if (key.includes('RN'))  return AN_COLORS.RN
    if (key.includes('LFI')) return AN_COLORS.LFI
    if (key.includes('RE'))  return AN_COLORS.RE
    return fallback
  }

  if (libelle) {
    for (const [k, v] of Object.entries(SENAT_COLORS)) {
      if (libelle.includes(k) || k.includes(libelle)) return v
    }
  }
  return fallback
}
