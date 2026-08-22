import { STEM_TO_ELEMENT, STEM_TO_POLARITY, BRANCH_HIDDEN_STEMS, calculateTenGod, getMainQi } from '@openfate/bazi-engine';
import { orderHiddenStems } from './hidden-stems';
/** Four pillars as 干支 strings, e.g. { year: '癸酉', ... }. */
export interface FourPillarsGanZhi {
  year: string;
  month: string;
  day: string;
  hour: string;
}

/**
 * Zero-weight, deterministic strength FACTS -- no weight, no threshold, no
 * verdict word appears anywhere in this file. `strength.ts` turns these same
 * relationships into a scored, weighted verdict; this module only reports
 * what is true of the chart so a caller can weigh it however they like.
 *
 * In particular this never reports 得令/失令 -- that is itself a judgment
 * (whether the month's season *favours* the Day Master), not a fact. What IS
 * a fact, and what this reports instead, is the plain relation between the
 * Day Master and the month's governing element (`monthOrder.relation`) and
 * the classical 旺相休囚死 category that relation falls into.
 */

type Element = string; // bazi-engine's FiveElement ('wood' | 'fire' | 'earth' | 'metal' | 'water')
type Relation = '同我' | '生我' | '我生' | '我克' | '克我';
type Direction = '帮' | '生' | '泄' | '耗' | '克';
type WangXiangXiuQiuSi = '旺' | '相' | '休' | '囚' | '死';
type PillarName = 'year' | 'month' | 'day' | 'hour';
type RootLevel = '本气' | '中气' | '余气' | '无';
type RootLabel = '禄' | '刃' | '长生' | '墓库根';

const GENERATES: Record<Element, Element> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
};
const CONTROLS: Record<Element, Element> = {
  wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
};

// 同我/生我/我生/我克/克我 -- the five-way relation of element `e` to the Day
// Master's element `dme`, read as "how e stands toward the Day Master".
function relationOf(dme: Element, e: Element): Relation {
  if (e === dme) return '同我';
  if (GENERATES[e] === dme) return '生我';
  if (GENERATES[dme] === e) return '我生';
  if (CONTROLS[dme] === e) return '我克';
  return '克我'; // the only remaining case: CONTROLS[e] === dme
}

const DIRECTION_OF_RELATION: Record<Relation, Direction> = {
  '同我': '帮', '生我': '生', '我生': '泄', '我克': '耗', '克我': '克',
};

// 旺相休囚死, with the month's main-qi element `me` (令) as the reference
// and the Day Master's element `dme` as the thing being placed in season.
function wangXiangXiuQiuSiOf(dme: Element, me: Element): WangXiangXiuQiuSi {
  if (dme === me) return '旺';           // 同令
  if (GENERATES[me] === dme) return '相'; // 令生者
  if (GENERATES[dme] === me) return '休'; // 生令者
  if (CONTROLS[dme] === me) return '囚';  // 克令者
  return '死';                            // 令克者
}

// ---- 十二长生 (twelve growth stages) --------------------------------------
// 《渊海子平·论天干生旺死绝》: yang stems run forward through the branch
// cycle from their 长生 anchor, yin stems run backward. Anchors below are
// the book's own; see the module-level self-check function for the two
// identities the book gives to verify them against (临官=禄, 阳干帝旺=刃).
const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const YANG_ANCHOR: Record<string, string> = { 甲: '亥', 丙: '寅', 戊: '寅', 庚: '巳', 壬: '申' };
const YIN_ANCHOR: Record<string, string> = { 乙: '午', 丁: '酉', 己: '酉', 辛: '子', 癸: '卯' };

function stageOf(dayStem: string, branch: string): string {
  const isYang = STEM_TO_POLARITY[dayStem] === 'yang';
  const anchor = isYang ? YANG_ANCHOR[dayStem] : YIN_ANCHOR[dayStem];
  const bi = BRANCH_ORDER.indexOf(branch);
  const ai = BRANCH_ORDER.indexOf(anchor);
  const idx = isYang ? (bi - ai + 12) % 12 : (ai - bi + 12) % 12;
  return STAGES[idx];
}

// Self-check (run once, e.g. from a scratch script -- not part of the test
// count): every stem's 临官 branch must equal its 十干禄 branch, and every
// yang stem's 帝旺 branch must equal its 刃 branch.
//   临官: 甲寅 乙卯 丙巳 丁午 戊巳 己午 庚申 辛酉 壬亥 癸子
//   帝旺 (yang only): 甲卯 丙午 戊午 庚酉 壬子
export function verifyTwelveStageAnchors(): boolean {
  const lu: Record<string, string> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
  const ren: Record<string, string> = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };
  for (const stem of Object.keys(lu)) {
    if (stageOf(stem, lu[stem]) !== '临官') return false;
  }
  for (const stem of Object.keys(ren)) {
    if (stageOf(stem, ren[stem]) !== '帝旺') return false;
  }
  return true;
}

/**
 * The four storehouse branches and the ELEMENT each stores. This criterion got
 * it wrong twice in opposite directions, so both are recorded:
 *
 *  1. By twelve-stage 墓 position — coincides with the storehouse for yang
 *     stems and diverges for yin ones, which run the cycle backward. 辛 reaches
 *     墓 at 辰 while the metal storehouse is 丑, where 辛 sits at 养. Every yin
 *     day master lost the label, including 辛 on its own seat.
 *  2. By exact hidden STEM — 未 hides 乙, so 甲 never matched, and every YANG
 *     day master lost it instead. Worse, the rootLevel computed four lines
 *     below already counted 甲 as rooted in 未 by element: one file, two
 *     definitions of "has a root".
 *
 * Element matching is the one that agrees with rootLevel. 戊 on 戌 stays
 * unlabelled and should: 戌 is the FIRE storehouse; that 戌 also happens to
 * hide 戊 as its main qi makes it a 本气 root, not a storehouse one.
 */
const STOREHOUSE_ELEMENT: Record<string, string> = {
  未: 'wood', 戌: 'fire', 丑: 'metal', 辰: 'water',
};

/**
 * Returns every label a branch earns for this day stem. A list, not a single
 * value: nothing stops one branch from qualifying twice, and an
 * order-dependent first-match-wins would decide which fact to hide.
 */
function labelsFor(dayStem: string, branch: string): RootLabel[] {
  const labels: RootLabel[] = [];
  const stage = stageOf(dayStem, branch);
  if (stage === '临官') labels.push('禄');
  if (stage === '帝旺' && STEM_TO_POLARITY[dayStem] === 'yang') labels.push('刃');
  if (stage === '长生') labels.push('长生');
  if (STOREHOUSE_ELEMENT[branch] === STEM_TO_ELEMENT[dayStem]) labels.push('墓库根');
  return labels;
}

function hiddenStemsOf(branch: string): { stem: string }[] {
  return orderHiddenStems(branch, BRANCH_HIDDEN_STEMS[branch] ?? []);
}

const QI_LEVELS: RootLevel[] = ['本气', '中气', '余气'];

export interface MonthOrderFact {
  monthBranch: string;
  mainQiStem: string;
  mainQiElement: Element;
  tenGod: string;
  relation: Relation;
  wangXiangXiuQiuSi: WangXiangXiuQiuSi;
  twelveStage: string;
}

export interface RootFact {
  pillar: PillarName;
  branch: string;
  rootLevel: RootLevel;
  rootStem: string | null;
  /** Every label this branch earns for the day stem -- a list, because one
   * branch can qualify more than once and picking a winner would hide a fact. */
  tags: RootLabel[];
}

export interface StemSupportFact {
  pillar: 'year' | 'month' | 'hour';
  stem: string;
  tenGod: string;
  direction: Direction;
}

export interface StrengthFactors {
  monthOrder: MonthOrderFact;
  roots: RootFact[];
  stemSupport: StemSupportFact[];
  counts: { helpers: number; drains: number };
  tableNote: string;
}

export function computeStrengthFactors(pillars: FourPillarsGanZhi): StrengthFactors {
  const dayStem = pillars.day[0];
  const dme = STEM_TO_ELEMENT[dayStem];

  const monthBranch = pillars.month[1];
  const mainQiStem = getMainQi(monthBranch);
  const mainQiElement = STEM_TO_ELEMENT[mainQiStem];
  const monthOrder: MonthOrderFact = {
    monthBranch,
    mainQiStem,
    mainQiElement,
    tenGod: calculateTenGod(dayStem, mainQiStem),
    relation: relationOf(dme, mainQiElement),
    wangXiangXiuQiuSi: wangXiangXiuQiuSiOf(dme, mainQiElement),
    twelveStage: stageOf(dayStem, monthBranch),
  };

  const pillarBranches: Array<[PillarName, string]> = [
    ['year', pillars.year[1]], ['month', pillars.month[1]], ['day', pillars.day[1]], ['hour', pillars.hour[1]],
  ];
  const roots: RootFact[] = pillarBranches.map(([pillar, branch]) => {
    const hidden = hiddenStemsOf(branch);
    let rootLevel: RootLevel = '无';
    let rootStem: string | null = null;
    for (let i = 0; i < hidden.length; i++) {
      if (STEM_TO_ELEMENT[hidden[i].stem] === dme) {
        rootLevel = QI_LEVELS[i];
        rootStem = hidden[i].stem;
        break;
      }
    }
    return { pillar, branch, rootLevel, rootStem, tags: labelsFor(dayStem, branch) };
  });

  const stemPositions: Array<['year' | 'month' | 'hour', string]> = [
    ['year', pillars.year[0]], ['month', pillars.month[0]], ['hour', pillars.hour[0]],
  ];
  const stemSupport: StemSupportFact[] = stemPositions.map(([pillar, stem]) => {
    const relation = relationOf(dme, STEM_TO_ELEMENT[stem]);
    return { pillar, stem, tenGod: calculateTenGod(dayStem, stem), direction: DIRECTION_OF_RELATION[relation] };
  });

  let helpers = 0;
  let drains = 0;
  for (const { stem } of stemSupport) {
    const rel = relationOf(dme, STEM_TO_ELEMENT[stem]);
    if (rel === '同我' || rel === '生我') helpers++; else drains++;
  }
  for (const [, branch] of pillarBranches) {
    const rel = relationOf(dme, STEM_TO_ELEMENT[getMainQi(branch)]);
    if (rel === '同我' || rel === '生我') helpers++; else drains++;
  }

  return {
    monthOrder,
    roots,
    stemSupport,
    counts: { helpers, drains },
    tableNote:
      'Hidden-stem proportions follow @openfate/bazi-engine\'s BRANCH_HIDDEN_STEMS table ' +
      '(mainstream 本气/中气/余气 apportionment, Si 巳 reordered to 丙庚戊 -- see hidden-stems.ts); ' +
      'other schools (e.g. 三命通会) assign minor qi slightly differently and this project ' +
      'does not cross-check against a second source.',
  };
}
