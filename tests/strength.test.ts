import { describe, expect, it } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';
import type { StrengthAssessmentOutput } from '../src/types';

// Golden cases from 韦千里《千里命稿·评断篇》(1935, public domain). The book
// judges strength in prose and gives no numbers; every weight in this project
// is FITTED, and scripts/strength-calibration/ is where that fitting lives.
// Rerun it before touching a weight -- and never tune one to turn a single
// case green.
//
// Fitting set constrains the grid search. Held-out set was scored with the
// parameters locked and never fed back; it is the only evidence the weights
// generalise rather than memorise.

const chart = (pillars: string) => {
  // Cases are given as four pillars directly, so they are asserted against the
  // scoring layer rather than re-derived from a birth moment -- the book gives
  // pillars, not birth times.
  const [year, month, day, hour] = pillars.split(' ');
  return { year, month, day, hour };
};

const scoreOf = async (pillars: string) => {
  const { assessStrength } = await import('../src/core/strength');
  return assessStrength(chart(pillars) as never);
};

describe('strengthAssessment — 千里命稿 fitting set', () => {
  // Typed with the real union so this file cannot force the public type to
  // widen to `string` just to satisfy `.toBe()`. A test should never be the
  // reason an API is less precise than it could be.
  const CASES: [string, string, StrengthAssessmentOutput['verdict'], number][] = [
    ['陆姓', '癸未 甲子 丙戌 己亥', '身弱', -2.42],
    ['潘姓', '壬子 癸丑 庚子 丁亥', '身弱', -2.48],
    ['陈姓', '壬子 丙午 癸亥 戊午', '身弱', -1.22],
    ['孙君', '乙巳 戊子 乙巳 戊寅', '中和', 0.20],
    ['金君', '己亥 乙亥 丙戌 壬辰', '身弱', -1.65],
    ['悍匪', '壬午 丙午 丙戌 庚寅', '身强', 5.25],
    ['荣宗敬', '癸酉 庚申 戊午 甲寅', '中和', 0.77],
    ['陆维屏', '乙未 甲申 癸巳 丙辰', '中和', 0.12],
    ['友人', '乙巳 甲申 癸未 丙辰', '中和', -0.28],
    ['妻', '癸酉 丁巳 辛丑 癸巳', '身强', 4.62],
    ['蒋介石', '丁亥 庚戌 己巳 庚午', '身强', 4.48],
  ];

  for (const [name, pillars, verdict, score] of CASES) {
    it(`${name} ${pillars} -> ${verdict} (${score >= 0 ? '+' : ''}${score})`, async () => {
      const r = await scoreOf(pillars);
      expect(r.score).toBeCloseTo(score, 2);
      expect(r.verdict).toBe(verdict);
    });
  }

  it('潘姓 scores below 陆姓 — the book ranks it 弱不堪言', async () => {
    expect((await scoreOf('壬子 癸丑 庚子 丁亥')).score)
      .toBeLessThan((await scoreOf('癸未 甲子 丙戌 己亥')).score);
  });

  it('陆维屏 outscores 友人 — same characters, year and day branches swapped', async () => {
    // The book calls one 身不为弱 and the other 较弱. Identical stems and
    // three identical branches: this pair is the existence proof that pillar
    // position must carry weight at all.
    expect((await scoreOf('乙未 甲申 癸巳 丙辰')).score)
      .toBeGreaterThan((await scoreOf('乙巳 甲申 癸未 丙辰')).score);
  });
});

describe('strengthAssessment — held-out set (parameters locked, never fed back)', () => {
  const HELD: [string, string, StrengthAssessmentOutput['verdict']][] = [
    ['詹姓', '庚子 庚辰 甲子 戊辰', '身强'],
    ['马占山', '乙酉 丁亥 己丑 甲子', '身弱'],
    ['吴经熊', '己亥 丁卯 乙未 己卯', '身强'],
    ['交禄格', '癸酉 庚申 壬子 辛亥', '身强'],
    ['颜惠庆', '丁丑 癸卯 乙巳 丙子', '身强'],
  ];
  for (const [name, pillars, verdict] of HELD) {
    it(`${name} ${pillars} -> ${verdict}`, async () => {
      expect((await scoreOf(pillars)).verdict).toBe(verdict);
    });
  }

  it('兰英史 is not 身弱 — the book says 身主不弱, which the band must respect', async () => {
    expect((await scoreOf('辛丑 乙未 己亥 壬申')).verdict).not.toBe('身弱');
  });

  it.skip('阮玲玉 庚戌 辛巳 己亥 乙亥 -> 身弱 (KNOWN MISS: 巳亥冲 not modelled)', async () => {
    // The book's stated cause is 印绶冲散 -- the clash scatters the seals.
    // v1 does not model 冲 at all, so this case is expected to fail and is
    // recorded rather than hidden. Upgrade path: clash damping.
    expect((await scoreOf('庚戌 辛巳 己亥 乙亥')).verdict).toBe('身弱');
  });
});

describe('strengthAssessment — honesty of the verdict itself', () => {
  it('a borderline chart says so rather than committing', async () => {
    const r = await scoreOf('壬子 丙午 癸亥 戊午');   // 陈姓, -1.22, just past the line
    expect(r.margin).toBe('临界');
  });

  it('a decisive chart carries no borderline flag', async () => {
    expect((await scoreOf('癸酉 庚申 壬子 辛亥')).margin).toBeNull();   // 交禄格 +9.80
  });

  it('中和 reports which way it leans instead of pretending to be exactly balanced', async () => {
    const r = await scoreOf('乙巳 戊子 乙巳 戊寅');   // 孙君 +0.20
    expect(r.verdict).toBe('中和');
    expect(r.lean).toBe('偏强');
  });

  it('names its method and admits the weights are this project\'s', async () => {
    const r = await scoreOf('癸酉 丁巳 辛丑 癸巳');
    expect(r.method).toMatch(/千里命稿/);
    expect(r.method).toMatch(/校准|拟合/);   // must not read as if the book supplied numbers
  });
});

describe('strengthFactors — root labels follow hidden stems, not the stage table', () => {
  const factorsOf = async (input: Record<string, unknown>) => {
    const r = calculateDualAxisBazi(input as never) as never as {
      strengthFactors: {
        roots: { pillar: string; branch: string; rootLevel: string; tags: string[] }[];
        monthOrder: Record<string, unknown>;
      };
    };
    return r.strengthFactors;
  };
  const WIFE = {
    solarDate: { year: 1993, month: 5, day: 20 }, clockTime: { hour: 9, minute: 40 },
    place: 'Tianjin', gender: 'female',
  };

  it('丑 is the metal storehouse for a 辛 day master, even though 辛 sits at 养 there', async () => {
    // The spec is explicit that 墓库根 is decided by the hidden stems (丑藏辛),
    // NOT by the twelve-stage 墓 position -- they fall on different branches
    // for yin stems, which run backward. 辛 reaches 墓 at 辰 and 养 at 丑, so a
    // stage-based test silently drops the storehouse root that 丑 actually is.
    // On this chart that root is one of the reasons the day master is strong.
    const f = await factorsOf(WIFE);
    const day = f.roots.find((r) => r.pillar === 'day')!;
    expect(day.branch).toBe('丑');
    expect(day.rootLevel).toBe('余气');
    expect(day.tags).toContain('墓库根');
  });

  it('酉 is the 禄 of 辛 and both labels can coexist on one chart', async () => {
    const f = await factorsOf(WIFE);
    expect(f.roots.find((r) => r.pillar === 'year')!.tags).toContain('禄');
  });

  it('labels are a list — a branch may qualify for more than one', async () => {
    const f = await factorsOf(WIFE);
    for (const r of f.roots) expect(Array.isArray(r.tags)).toBe(true);
  });

  it('the twelve-stage position is still reported, just not used for the label', async () => {
    const f = await factorsOf(WIFE);
    expect(f.monthOrder.twelveStage).toBe('死');   // 辛 in 巳
  });
});
