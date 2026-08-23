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
 * verdict word appears anywhere in this file. `strength.ts` used to turn these
 * same relationships into a scored, weighted verdict; 4.0.0 deleted it,
 * because the classics supply the rules and the weights were ours. This module
 * only reports what is true of the chart so a caller can weigh it themselves.
 *
 * In particular this never reports 得令/失令 -- that is itself a judgment
 * (whether the month's season *favours* the Day Master), not a fact. What IS
 * a fact, and what this reports instead, is the plain relation between the Day
 * Master and the month branch's main qi (`monthOrder.relation`), the element
 * actually in command (`monthOrder.rulingElement`), and the classical
 * 旺相休囚死 category the Day Master falls into against it. The first two
 * coincide under the default school and can part under 土旺四季十八日, so both
 * are reported rather than one standing in for the other.
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

// 旺相休囚死, with the element in command (`me`, 令) as the reference and the
// Day Master's element `dme` as the thing being placed in season. Under the
// default school 令 is the month branch's main qi; under 土旺四季十八日 it is
// not always, which is why the caller passes the resolved element rather than
// this function reaching for the branch itself.
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
/** Under 阴阳同生同死 a yin stem runs the cycle forward from its yang partner's anchor. */
const YIN_PARTNER: Record<string, string> = { 乙: '甲', 丁: '丙', 己: '戊', 辛: '庚', 癸: '壬' };

/**
 * 《渊海子平》(the default) and 《滴天髓》任铁樵注 disagree about yin stems and
 * only about yin stems, so this changes half of all charts and none of the
 * other half. It is a table fork, not a judgment: given the school, both
 * branches here are pure lookups.
 */
export type TwelveStageSchool = 'yang_forward_yin_backward' | 'yin_follows_yang';

function stageOf(dayStem: string, branch: string, school: TwelveStageSchool): string {
  const isYang = STEM_TO_POLARITY[dayStem] === 'yang';
  const runsBackward = !isYang && school === 'yang_forward_yin_backward';
  const anchor = isYang
    ? YANG_ANCHOR[dayStem]
    : school === 'yang_forward_yin_backward'
      ? YIN_ANCHOR[dayStem]
      : YANG_ANCHOR[YIN_PARTNER[dayStem]];
  const bi = BRANCH_ORDER.indexOf(branch);
  const ai = BRANCH_ORDER.indexOf(anchor);
  const idx = runsBackward ? (ai - bi + 12) % 12 : (bi - ai + 12) % 12;
  return STAGES[idx];
}

/**
 * 十干禄 and 阳刃, as their own tables rather than as the 临官/帝旺 positions.
 * They coincide with those positions under 阳顺阴逆 -- that identity is what
 * `verifyTwelveStageAnchors` checks -- but the identity is a property of that
 * school, not a definition. Under 同生同死 辛's 临官 moves to 申 while 辛禄 is
 * 酉 either way, so deriving 禄 from the stage would have moved a
 * school-independent fact along with a school-dependent one.
 */
const LU: Record<string, string> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
const YANG_BLADE: Record<string, string> = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };

/**
 * 阴刃 has no settled position. Three doctrines are in print and they do not
 * reconcile: the 帝旺 reading (乙寅 丁巳 己巳 辛申 癸亥), the 冠带 / 禄前一位
 * reading (乙辰 丁未 己未 辛戌 癸丑), and the position that yin stems have no
 * 刃 at all. Both tables below are entered explicitly rather than read off
 * `stageOf`: each is defined inside the 阳顺阴逆 framework, and deriving them
 * would silently couple this fork to `twelveStageSchool`, which decides
 * something else.
 *
 * The default remains 阳刃 alone. This project does not pick between the two
 * yin readings; the caller names the one their school uses or gets neither.
 */
const YIN_BLADE_DIWANG: Record<string, string> = { 乙: '寅', 丁: '巳', 己: '巳', 辛: '申', 癸: '亥' };
const YIN_BLADE_GUANDAI: Record<string, string> = { 乙: '辰', 丁: '未', 己: '未', 辛: '戌', 癸: '丑' };
export type BladeSchool = 'yang_only' | 'yin_at_diwang' | 'yin_at_guandai';

/**
 * The element ruling the season that a 四季月 closes. Under 土旺四季十八日 the
 * final 18 days before the next 立 belong to 土 and the days before them stay
 * with the season that is ending; the four other seasons' months need no entry
 * because their main qi already IS the season's element.
 */
const CLOSING_SEASON_ELEMENT: Record<string, Element> = {
  辰: 'wood', 未: 'fire', 戌: 'metal', 丑: 'water',
};
/** 四立前十八日. A classical figure, not one fitted here. */
const EARTH_RULES_FINAL_DAYS = 18;
export type MonthOrderSchool = 'branch_main_qi' | 'earth_rules_final_18_days';

// Cross-checks the 长生 anchors against the independently-entered LU and
// YANG_BLADE tables: every stem's 临官 branch must equal its 十干禄 branch, and
// every yang stem's 帝旺 branch its 刃 branch. A typo in either table, or in
// the index arithmetic, fails it. Called from tests/strength.test.ts.
//   临官: 甲寅 乙卯 丙巳 丁午 戊巳 己午 庚申 辛酉 壬亥 癸子
//   帝旺 (yang only): 甲卯 丙午 戊午 庚酉 壬子
export function verifyTwelveStageAnchors(): boolean {
  // Only under 阳顺阴逆. Asserting it for 同生同死 would be asserting that
  // school is wrong -- there 辛's 临官 is 申 while 辛禄 stays 酉.
  for (const stem of Object.keys(LU)) {
    if (stageOf(stem, LU[stem], 'yang_forward_yin_backward') !== '临官') return false;
  }
  for (const stem of Object.keys(YANG_BLADE)) {
    if (stageOf(stem, YANG_BLADE[stem], 'yang_forward_yin_backward') !== '帝旺') return false;
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
function labelsFor(
  dayStem: string,
  branch: string,
  school: TwelveStageSchool,
  bladeSchool: BladeSchool,
): RootLabel[] {
  const labels: RootLabel[] = [];
  if (LU[dayStem] === branch) labels.push('禄');
  const yinBlade = bladeSchool === 'yin_at_diwang' ? YIN_BLADE_DIWANG
    : bladeSchool === 'yin_at_guandai' ? YIN_BLADE_GUANDAI
      : undefined;
  if (YANG_BLADE[dayStem] === branch || yinBlade?.[dayStem] === branch) labels.push('刃');
  // 长生 is the one of the three that genuinely moves with the school -- the
  // position of 长生 IS what the two schools disagree about.
  if (stageOf(dayStem, branch, school) === '长生') labels.push('长生');
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
  /**
   * The element actually in command (令), and the thing 旺相休囚死 is measured
   * against. Equal to `mainQiElement` under `branch_main_qi`; under
   * `earth_rules_final_18_days` it is 土 inside the last 18 days of a 四季月
   * and the closing season's element before them. Reported explicitly because
   * without it the 旺相休囚死 value is not reproducible from the pillars alone.
   */
  rulingElement: Element;
  /**
   * Days from the birth instant to the next 节, in the same fixed-UTC+8 frame
   * the month pillar is derived in. Present whenever the caller supplied it;
   * it is the datum the 18-day rule turns on, so it ships alongside the
   * verdict rather than behind it.
   */
  daysToNextJie?: number;
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

/**
 * Every school fork these tables sit on. The tables themselves are lookups --
 * given a fork, any correct implementation returns the same value -- but two
 * of the forks below are live disputes, so leaving the choice unstated would
 * present one school's answer as the answer. For a yin day master the twelve
 * stage fork alone moves every branch: 辛 in 巳 is 死 under the convention
 * used here and 长生 under the other one.
 *
 * These are declared inputs, not judgments: no weight is attached to either
 * side and this file does not decide which school is right.
 */
export interface ConventionChoice {
  used: string;
  source: string;
  /** Named schools this does NOT follow. */
  alternatives: string[];
  /** Fields whose value changes if the caller assumes an alternative.
   * Machine-resolvable paths into this object -- a test walks every one. */
  affects: string[];
  /** Narrows `affects` where only part of a listed field moves. */
  note?: string;
}

const TWELVE_STAGE_SCHOOLS: Record<TwelveStageSchool, { used: string; source: string; other: string }> = {
  yang_forward_yin_backward: {
    used: '阳干顺行、阴干逆行',
    source: '渊海子平·论天干生旺死绝',
    other: '阴阳同生同死（滴天髓·任铁樵注，阴干随其阳干顺行）— 传 twelveStageSchool: "yin_follows_yang"',
  },
  yin_follows_yang: {
    used: '阴阳同生同死，阴干随其阳干顺行',
    source: '滴天髓·任铁樵注',
    other: '阳干顺行、阴干逆行（渊海子平）— 传 twelveStageSchool: "yang_forward_yin_backward"',
  },
};

const MONTH_ORDER_SCHOOLS: Record<MonthOrderSchool, { used: string; source: string; other: string }> = {
  branch_main_qi: {
    used: '以月支本气为令（辰戌丑未整月皆以土为令）',
    source: '五行旺相休囚死通行口径',
    other: '土旺四季十八日：辰戌丑未月，四立前十八日以土为令，之前仍以将尽之季的五行为令 — 传 monthOrderSchool: "earth_rules_final_18_days"（需要 daysToNextJie）',
  },
  earth_rules_final_18_days: {
    used: '土旺四季十八日：四立前十八日以土为令，之前以将尽之季的五行为令',
    source: '四立前各十八日土旺用事，通行子平口径',
    other: '以月支本气为令（辰戌丑未整月皆以土为令）— 传 monthOrderSchool: "branch_main_qi"',
  },
};

/**
 * 阴刃 is where this file most has to keep its hands off. The three readings in
 * print disagree about the position itself, not about its meaning, and nothing
 * available here breaks the tie -- so the default reports 阳刃 alone and the
 * caller names a reading or gets none. An earlier release listed 乙卯 丁午 己午
 * 辛酉 癸子 here as "the" 阴刃 alternative; those are the yin stems' 禄
 * positions and match no school. It was written by analogy and never sourced.
 */
const BLADE_SCHOOLS: Record<BladeSchool, { used: string; source: string; other: string[] }> = {
  yang_only: {
    used: '仅阳干标刃：甲卯 丙午 戊午 庚酉 壬子',
    source: '通行阳刃说',
    other: [
      '阴刃取帝旺位：乙寅 丁巳 己巳 辛申 癸亥 — 传 bladeSchool: "yin_at_diwang"',
      '阴刃取冠带位（禄前一位）：乙辰 丁未 己未 辛戌 癸丑 — 传 bladeSchool: "yin_at_guandai"',
    ],
  },
  yin_at_diwang: {
    used: '阳刃加阴刃，阴刃取帝旺位：乙寅 丁巳 己巳 辛申 癸亥',
    source: '传统派阴刃说（阴干帝旺为刃）',
    other: [
      '阴刃取冠带位（禄前一位）：乙辰 丁未 己未 辛戌 癸丑 — 传 bladeSchool: "yin_at_guandai"',
      '阴干不立刃，仅标阳刃 — 传 bladeSchool: "yang_only"',
    ],
  },
  yin_at_guandai: {
    used: '阳刃加阴刃，阴刃取冠带位（禄前一位）：乙辰 丁未 己未 辛戌 癸丑',
    source: '盲派阴刃说（禄前一位为刃）',
    other: [
      '阴刃取帝旺位：乙寅 丁巳 己巳 辛申 癸亥 — 传 bladeSchool: "yin_at_diwang"',
      '阴干不立刃，仅标阳刃 — 传 bladeSchool: "yang_only"',
    ],
  },
};

export function strengthFactorConventions(
  school: TwelveStageSchool,
  monthOrderSchool: MonthOrderSchool,
  bladeSchool: BladeSchool,
): Record<string, ConventionChoice> {
  const twelveStage = TWELVE_STAGE_SCHOOLS[school];
  const monthOrder = MONTH_ORDER_SCHOOLS[monthOrderSchool];
  const blade = BLADE_SCHOOLS[bladeSchool];
  return {
    twelveStage: {
      used: twelveStage.used,
      source: twelveStage.source,
      alternatives: [twelveStage.other],
      affects: ['monthOrder.twelveStage', 'roots[].tags'],
      note: '仅 roots[].tags 中的「长生」随本岔路变动；「禄」「刃」分别取自十干禄表与刃表，与本岔路无关。',
    },
    wangXiangXiuQiuSi: {
      used: monthOrder.used,
      source: monthOrder.source,
      alternatives: [monthOrder.other],
      affects: ['monthOrder.wangXiangXiuQiuSi', 'monthOrder.rulingElement'],
      note: '仅辰戌丑未月可能改变；其余八个月的本气即当季五行，两派同值。monthOrder.relation/mainQiStem/tenGod 是月支事实，不随本岔路变动。',
    },
    bladeTag: {
      used: blade.used,
      source: blade.source,
      alternatives: blade.other,
      affects: ['roots[].tags'],
      note: '阴刃位置本身有三种互不相容的说法，本包不代为选择：默认只标阳刃，阴刃须由调用方具名指定。',
    },
  };
}

export interface StrengthFactors {
  monthOrder: MonthOrderFact;
  roots: RootFact[];
  stemSupport: StemSupportFact[];
  /** Which school each table above follows -- see strengthFactorConventions(). */
  conventions: Record<string, ConventionChoice>;
  tableNote: string;
}

export interface StrengthFactorOptions {
  monthOrderSchool?: MonthOrderSchool;
  bladeSchool?: BladeSchool;
  /**
   * Days from the birth instant to the next 节. Required by, and only by,
   * `earth_rules_final_18_days`; supplying it otherwise is harmless and it is
   * reported back either way.
   */
  daysToNextJie?: number;
}

/** Thrown rather than quietly falling back -- see rulingElementOf. */
export class MissingJieDistanceError extends Error {
  constructor() {
    super(
      'monthOrderSchool "earth_rules_final_18_days" needs daysToNextJie: the rule turns on ' +
      'where the birth instant sits inside the month, which four 干支 cannot say. Computing ' +
      'with the default table instead would answer a question the caller did not ask.',
    );
    this.name = 'MissingJieDistanceError';
  }
}

/**
 * Which element holds 令. Under `branch_main_qi` that is simply the month
 * branch's main qi, which for 寅卯 巳午 申酉 亥子 already equals the season's
 * element and for 辰戌丑未 is 土 for the whole month. `earth_rules_final_18_days`
 * splits those four: 土 inside the final 18 days before the next 立, the
 * closing season's element before them. The other eight months are untouched,
 * so the fork can only ever move a 四季月 chart.
 */
function rulingElementOf(
  monthBranch: string,
  mainQiElement: Element,
  school: MonthOrderSchool,
  daysToNextJie: number | undefined,
): Element {
  if (school !== 'earth_rules_final_18_days') return mainQiElement;
  const closing = CLOSING_SEASON_ELEMENT[monthBranch];
  if (closing === undefined) return mainQiElement;
  if (daysToNextJie === undefined) throw new MissingJieDistanceError();
  // Ties go to 土: 十八日 is stated inclusively ("四立前十八日"), and that is
  // also the side that keeps the rest of the month identical to the default.
  return daysToNextJie <= EARTH_RULES_FINAL_DAYS ? 'earth' : closing;
}

export function computeStrengthFactors(
  pillars: FourPillarsGanZhi,
  school: TwelveStageSchool = 'yang_forward_yin_backward',
  options: StrengthFactorOptions = {},
): StrengthFactors {
  const monthOrderSchool = options.monthOrderSchool ?? 'branch_main_qi';
  const bladeSchool = options.bladeSchool ?? 'yang_only';
  const dayStem = pillars.day[0];
  const dme = STEM_TO_ELEMENT[dayStem];

  const monthBranch = pillars.month[1];
  const mainQiStem = getMainQi(monthBranch);
  const mainQiElement = STEM_TO_ELEMENT[mainQiStem];
  const rulingElement = rulingElementOf(monthBranch, mainQiElement, monthOrderSchool, options.daysToNextJie);
  const monthOrder: MonthOrderFact = {
    monthBranch,
    mainQiStem,
    mainQiElement,
    tenGod: calculateTenGod(dayStem, mainQiStem),
    // A branch fact: what the month's main qi is to the Day Master. It is read
    // off the branch, not off 令, so it does not move with monthOrderSchool.
    relation: relationOf(dme, mainQiElement),
    rulingElement,
    ...(options.daysToNextJie === undefined ? {} : { daysToNextJie: options.daysToNextJie }),
    wangXiangXiuQiuSi: wangXiangXiuQiuSiOf(dme, rulingElement),
    twelveStage: stageOf(dayStem, monthBranch, school),
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
    return { pillar, branch, rootLevel, rootStem, tags: labelsFor(dayStem, branch, school, bladeSchool) };
  });

  const stemPositions: Array<['year' | 'month' | 'hour', string]> = [
    ['year', pillars.year[0]], ['month', pillars.month[0]], ['hour', pillars.hour[0]],
  ];
  const stemSupport: StemSupportFact[] = stemPositions.map(([pillar, stem]) => {
    const relation = relationOf(dme, STEM_TO_ELEMENT[stem]);
    return { pillar, stem, tenGod: calculateTenGod(dayStem, stem), direction: DIRECTION_OF_RELATION[relation] };
  });

  // No helper/drain tally here. It looked like a fact but carried three
  // decisions the caller could not recover from the number: seven positions
  // weighted equally, branches counted by main qi alone while `roots` reports
  // middle and residual qi a few lines above, and 泄/耗/克 collapsed into one
  // bucket. It was derivable from roots + stemSupport anyway, so the tally's
  // only contribution was the weighing -- which is the caller's to do.

  return {
    monthOrder,
    roots,
    stemSupport,
    conventions: strengthFactorConventions(school, monthOrderSchool, bladeSchool),
    tableNote:
      'Hidden-stem proportions follow @openfate/bazi-engine\'s BRANCH_HIDDEN_STEMS table ' +
      '(mainstream 本气/中气/余气 apportionment, Si 巳 reordered to 丙庚戊 -- see hidden-stems.ts); ' +
      'other schools (e.g. 三命通会) assign minor qi slightly differently and this project ' +
      'does not cross-check against a second source.',
  };
}
