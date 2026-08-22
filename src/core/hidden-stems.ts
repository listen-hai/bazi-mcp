/**
 * Single source of truth for classical hidden-stem (藏干) ordering.
 *
 * `@openfate/bazi-engine`'s `BRANCH_HIDDEN_STEMS` lists Si (巳) as 丙戊庚, but
 * every other Four Cardinal Branch (寅甲丙戊, 申庚壬戊, 亥壬甲) puts the
 * 中气 (secondary qi) before the 余气 (residual qi). This reorders Si to
 * 丙庚戊 so position 0/1/2 means 本气/中气/余气 consistently for every
 * branch. Both `dual-axis.ts`'s pillar formatting and `strength.ts`'s
 * scoring read hidden stems through this function so the two consumers
 * can never drift into two different tables.
 */
export function orderHiddenStems<T extends { stem: string }>(branch: string, stems: T[]): T[] {
  if (branch === '巳' && stems.length === 3) {
    const bing = stems.find(h => h.stem === '丙');
    const geng = stems.find(h => h.stem === '庚');
    const wu = stems.find(h => h.stem === '戊');
    if (bing && geng && wu) {
      return [bing, geng, wu];
    }
  }
  return stems;
}
