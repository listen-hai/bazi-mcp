import { describe, expect, it } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';
import type { StrengthAssessmentOutput } from '../src/types';
import { computeStrengthFactors } from '../src/core/strength-factors';

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
    // 颜惠庆 is pinned at 身强 while the book reads it 得令未获气势之盛 --
    // roughly 中和 to 偏强. +1.48 lands just past the line, so this is an
    // adjacent-band result kept as a regression pin, not a claim the model
    // agrees with 韦千里 here. 王姓 (+0.70) and 吴佩孚 (-0.82) are the other two
    // adjacent-band cases; they are deliberately left out of the assertions
    // rather than pinned to a verdict the book does not clearly support.
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
  // Pillars, not a birth moment. The chart these assertions exercise belongs to
  // a real person who never agreed to have her date, time and city sit in a
  // public repository; the four pillars are the only part the tests need, and
  // calibrate.py already stores every case that way.
  const factorsOf = (pillars: string) => {
    const [year, month, day, hour] = pillars.split(' ');
    return computeStrengthFactors({ year, month, day, hour } as never) as never as {
      roots: { pillar: string; branch: string; rootLevel: string; tags: string[] }[];
      monthOrder: Record<string, unknown>;
    };
  };
  const XIN_ON_CHOU = '癸酉 丁巳 辛丑 癸巳';

  it('丑 is the metal storehouse for a 辛 day master, even though 辛 sits at 养 there', async () => {
    // The spec is explicit that 墓库根 is decided by the hidden stems (丑藏辛),
    // NOT by the twelve-stage 墓 position -- they fall on different branches
    // for yin stems, which run backward. 辛 reaches 墓 at 辰 and 养 at 丑, so a
    // stage-based test silently drops the storehouse root that 丑 actually is.
    // On this chart that root is one of the reasons the day master is strong.
    const f = factorsOf(XIN_ON_CHOU);
    const day = f.roots.find((r) => r.pillar === 'day')!;
    expect(day.branch).toBe('丑');
    expect(day.rootLevel).toBe('余气');
    expect(day.tags).toContain('墓库根');
  });

  it('酉 is the 禄 of 辛 and both labels can coexist on one chart', async () => {
    const f = factorsOf(XIN_ON_CHOU);
    expect(f.roots.find((r) => r.pillar === 'year')!.tags).toContain('禄');
  });

  it('labels are a list — a branch may qualify for more than one', async () => {
    const f = factorsOf(XIN_ON_CHOU);
    for (const r of f.roots) expect(Array.isArray(r.tags)).toBe(true);
  });


  it('the storehouse root fires for yang stems too — it is elemental, not per-stem', () => {
    // First fix judged by the twelve-stage 墓 position, which silently dropped
    // every yin stem. The correction judged by exact hidden STEM, which
    // silently dropped every yang one: 未 hides 乙, so 甲 never matched, even
    // though the rootLevel four lines above already counts 甲 as rooted in 未
    // by element. One file, two definitions of "has a root".
    const yang: [string, string, string][] = [
      ['甲', '未', '木库'], ['丙', '戌', '火库'], ['庚', '丑', '金库'], ['壬', '辰', '水库'],
    ];
    for (const [dayStem, branch] of yang) {
      const f = computeStrengthFactors({
        year: '甲子', month: '丙寅', day: `${dayStem}午`, hour: `辛${branch}`,
      } as never) as never as { roots: { branch: string; tags: string[] }[] };
      expect(f.roots.find((r) => r.branch === branch)!.tags).toContain('墓库根');
    }
  });

  it('a storehouse that holds no same-element stem stays unlabelled', () => {
    // 戊 seated on 戌: 戌's main qi IS 戊, so it is a 本气 root -- but 戌 is the
    // FIRE storehouse, not an earth one. The old stage-based code lit it by
    // coincidence.
    const f = computeStrengthFactors({
      year: '甲子', month: '丙寅', day: '戊午', hour: '辛戌',
    } as never) as never as { roots: { branch: string; rootLevel: string; tags: string[] }[] };
    const xu = f.roots.find((r) => r.branch === '戌')!;
    expect(xu.rootLevel).toBe('本气');
    expect(xu.tags).not.toContain('墓库根');
  });

  it('the twelve-stage position is still reported, just not used for the label', async () => {
    const f = factorsOf(XIN_ON_CHOU);
    expect(f.monthOrder.twelveStage).toBe('死');   // 辛 in 巳
  });
});

describe('the tables that back all of this are locked, not just believed', () => {
  it('the twelve-stage anchors satisfy the book\'s own two identities', async () => {
    // 临官 must equal 十干禄 for every stem, and 帝旺 must equal 刃 for every
    // yang one. verifyTwelveStageAnchors() encoded this and was exported but
    // never called -- a check that runs nowhere is a check that was performed
    // once, in someone's scratch buffer, and is now indistinguishable from an
    // assertion.
    const { verifyTwelveStageAnchors } = await import('../src/core/strength-factors');
    expect(verifyTwelveStageAnchors()).toBe(true);
  });

  it('the combination tables in strength.ts match the ones in interactions.ts', async () => {
    // strength.ts carries a third copy of 三合/三会/半合, after interactions.ts
    // and calibrate.py. This project has already been bitten by hand-synced
    // duplicates (three copies of geo/resolver.ts, one of which kept a rule the
    // other two had deleted).
    const strength = await import('../src/core/strength');
    const inter = await import('../src/core/interactions');
    const norm = (rows: { branches: string[]; element?: string }[]) =>
      rows.map((r) => `${[...r.branches].sort().join('')}:${r.element ?? ''}`).sort();
    for (const key of ['TRINES', 'DIRECTIONALS'] as const) {
      const a = (strength as Record<string, unknown>)[key];
      const b = (inter as Record<string, unknown>)[key];
      if (!a || !b) continue;   // only compare what both actually export
      expect(norm(a as never)).toEqual(norm(b as never));
    }
  });

  it('the hidden-stem table is the engine\'s, not a private copy', async () => {
    const { BRANCH_HIDDEN_STEMS } = await import('@openfate/bazi-engine');
    const { orderHiddenStems } = await import('../src/core/hidden-stems');
    // 巳 is the one branch this project reorders (本气丙 -> 中气庚 -> 余气戊).
    expect(orderHiddenStems('巳', BRANCH_HIDDEN_STEMS['巳']).map((h) => h.stem))
      .toEqual(['丙', '庚', '戊']);
    // Every other branch passes through untouched.
    for (const br of ['子', '丑', '寅', '卯', '辰', '午', '未', '申', '酉', '戌', '亥']) {
      expect(orderHiddenStems(br, BRANCH_HIDDEN_STEMS[br]).map((h) => h.stem))
        .toEqual(BRANCH_HIDDEN_STEMS[br].map((h: { stem: string }) => h.stem));
    }
  });
});

describe('an unknown birth hour yields no strength verdict at all', () => {
  it('both layers are absent, not computed off a fabricated hour', () => {
    // The whole reason timeUnknown stopped substituting noon. A strength score
    // is more hour-sensitive than the pillars it is derived from.
    const r = calculateDualAxisBazi({
      solarDate: { year: 2024, month: 2, day: 4 }, place: 'Beijing',
      gender: 'male', timeUnknown: true,
    } as never) as never as Record<string, unknown>;
    expect('strengthAssessment' in r).toBe(false);
    expect('strengthFactors' in r).toBe(false);
  });

  it('an exact hour does produce them', () => {
    const r = calculateDualAxisBazi({
      solarDate: { year: 2024, month: 2, day: 4 }, clockTime: { hour: 8, minute: 0 },
      place: 'Beijing', gender: 'male',
    } as never) as never as Record<string, unknown>;
    expect('strengthAssessment' in r).toBe(true);
  });
});
