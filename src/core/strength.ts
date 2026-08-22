import { STEM_TO_ELEMENT, BRANCH_HIDDEN_STEMS } from '@openfate/bazi-engine';
import { orderHiddenStems } from './hidden-stems';

/**
 * 千里命稿扶抑计分法 (Day Master strength, 扶抑 scoring) -- TypeScript port of
 * `scripts/strength-calibration/calibrate.py`'s `score()`. That script is the
 * only place these weights are decided (grid search over a fitting set drawn
 * from 韦千里《千里命稿·评断篇》, 1935, public domain); this file must stay a
 * literal restatement of its logic, not a re-derivation. Re-run the script
 * before ever touching a number here.
 */

export interface FourPillarsGanZhi {
  year: string;
  month: string;
  day: string;
  hour: string;
}

export type Verdict = '身强' | '身弱' | '中和';
export type Margin = '临界' | null;
export type Lean = '偏强' | '偏弱' | null;

export interface StrengthAssessment {
  score: number;
  /** Literal unions, not `string`. An earlier version widened these so a
   * loosely-typed test fixture could compare against them -- which made the
   * public API less precise for every consumer in order to accommodate one
   * test file. The test was typed properly instead. */
  verdict: Verdict;
  margin: Margin;
  lean: Lean;
  method: string;
}

// Selected parameters (`CHOSEN` in calibrate.py) -- one of 172 grid points
// that passed every fitting-set constraint, picked as a round-number
// representative of the passing region. Do not retune to fit a test.
const PARAMS = {
  stem: 0.6,
  zhong: 0.5,
  yu: 0.3,
  year: 1.0,
  month: 2.5,
  day: 1.5,
  hour: 1.0,
  ju: 2.5,
  ban: 1.5,
  theta: 1.0,
  k: 0.6,
} as const;

type Element = string;

const GENERATES: Record<Element, Element> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

// 方向函数 d(e): 同我 or 生我 -> +1.0, otherwise -> -k
function direction(dayMasterElement: Element, e: Element): number {
  return e === dayMasterElement || GENERATES[e] === dayMasterElement ? 1.0 : -PARAMS.k;
}

function hiddenStemsOf(branch: string): { stem: string }[] {
  return orderHiddenStems(branch, BRANCH_HIDDEN_STEMS[branch] ?? []);
}

const SANHE: Array<[string[], Element]> = [
  [['申', '子', '辰'], 'water'],
  [['寅', '午', '戌'], 'fire'],
  [['巳', '酉', '丑'], 'metal'],
  [['亥', '卯', '未'], 'wood'],
];

const SANHUI: Array<[string[], Element]> = [
  [['寅', '卯', '辰'], 'wood'],
  [['巳', '午', '未'], 'fire'],
  [['申', '酉', '戌'], 'metal'],
  [['亥', '子', '丑'], 'water'],
];

// 生旺半合 only (寅午/巳酉/申子/亥卯) -- 墓半合 (子辰/午戌/酉丑/卯未), 六合, 冲, 刑, 害 are all v1 no-ops.
const BANHE: Array<[[string, string], Element]> = [
  [['寅', '午'], 'fire'],
  [['巳', '酉'], 'metal'],
  [['申', '子'], 'water'],
  [['亥', '卯'], 'wood'],
];

const FULL_TRIOS = [...SANHE, ...SANHUI].map(([trio]) => trio);

function scoreOf(pillars: FourPillarsGanZhi): number {
  const stems = [pillars.year[0], pillars.month[0], pillars.day[0], pillars.hour[0]];
  const branches = [pillars.year[1], pillars.month[1], pillars.day[1], pillars.hour[1]];
  const dme = STEM_TO_ELEMENT[stems[2]];
  const posMul = [PARAMS.year, PARAMS.month, PARAMS.day, PARAMS.hour];
  const qiWeight = [1.0, PARAMS.zhong, PARAMS.yu];

  let s = 0;
  for (let i = 0; i < 4; i++) {
    if (i !== 2) {
      s += PARAMS.stem * direction(dme, STEM_TO_ELEMENT[stems[i]]);
    }
    const hidden = hiddenStemsOf(branches[i]);
    let branchSum = 0;
    hidden.forEach((h, qi) => {
      branchSum += qiWeight[qi] * direction(dme, STEM_TO_ELEMENT[h.stem]);
    });
    s += posMul[i] * branchSum;
  }

  const bs = new Set(branches);
  for (const [trio, e] of [...SANHE, ...SANHUI]) {
    if (trio.every(b => bs.has(b))) {
      s += PARAMS.ju * direction(dme, e);
    }
  }
  for (const [[a, b], e] of BANHE) {
    if (bs.has(a) && bs.has(b)) {
      const coveredByFullTrio = FULL_TRIOS.some(
        trio => trio.includes(a) && trio.includes(b) && trio.every(x => bs.has(x))
      );
      if (!coveredByFullTrio) {
        s += PARAMS.ban * direction(dme, e);
      }
    }
  }
  return s;
}

export function assessStrength(pillars: FourPillarsGanZhi): StrengthAssessment {
  const score = scoreOf(pillars);
  const { theta } = PARAMS;

  const verdict: Verdict = score >= theta ? '身强' : score <= -theta ? '身弱' : '中和';

  const margin: Margin = Math.abs(Math.abs(score) - theta) <= 0.5 ? '临界' : null;

  const lean: Lean = verdict === '中和' ? (score >= 0 ? '偏强' : '偏弱') : null;

  return {
    score,
    verdict,
    margin,
    lean,
    method:
      '千里命稿扶抑计分法 (Wei Qianli, 1935) — the direction and structure of each ' +
      'term follow the book; the weights are this project\'s own 校准 (calibration), ' +
      'fitted in scripts/strength-calibration/calibrate.py, not numbers the book itself gives.',
  };
}
