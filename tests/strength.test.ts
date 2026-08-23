import { describe, expect, it } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';
import { computeStrengthFactors } from '../src/core/strength-factors';

// This server calculates; it does not infer. `strengthFactors` is a
// zero-weight ledger of table lookups -- roots, hidden-stem qi levels,
// 旺相休囚死, twelve-stage positions -- and stops there.
//
// v3.1.0 briefly shipped a `strengthAssessment` that scored those factors into
// 身强/身弱 using weights fitted by this project. The justification was that a
// score under a named method is a deterministic fact about that method. It is
// not enough: the classic supplies the qualitative rules, the numbers were
// ours, so the "fact" was about a table we invented. Naming a method makes it
// reproducible, not true. Removed in v4.0.0 -- see docs/spec.md.



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

describe('an unknown birth hour yields no factor ledger either', () => {
  it('the ledger is absent, not computed off a fabricated hour', () => {
    // The whole reason timeUnknown stopped substituting noon. A strength score
    // is more hour-sensitive than the pillars it is derived from.
    const r = calculateDualAxisBazi({
      solarDate: { year: 2024, month: 2, day: 4 }, place: 'Beijing',
      gender: 'male', timeUnknown: true,
    } as never) as never as Record<string, unknown>;
    expect('strengthFactors' in r).toBe(false);
  });

  it('an exact hour does produce them', () => {
    const r = calculateDualAxisBazi({
      solarDate: { year: 2024, month: 2, day: 4 }, clockTime: { hour: 8, minute: 0 },
      place: 'Beijing', gender: 'male',
    } as never) as never as Record<string, unknown>;
    expect('strengthFactors' in r).toBe(true);
  });
});

describe('the server stops at the facts', () => {
  it('emits no strength verdict, score or 喜用神 — those are inference', () => {
    // The moat is being right about what can be computed. A weighing that
    // depends on numbers this project invented is not a computation, however
    // carefully it is labelled; the calling LLM does that part, and can bring
    // a 命理 knowledge base to it.
    const r = calculateDualAxisBazi({
      solarDate: { year: 1993, month: 5, day: 20 }, clockTime: { hour: 9, minute: 40 },
      place: 'Tianjin', gender: 'female',
    } as never) as never as Record<string, unknown>;
    expect('strengthAssessment' in r).toBe(false);
    const json = JSON.stringify(r);
    for (const word of ['身强', '身弱', '中和', '喜用', '用神', '忌神']) {
      expect(json).not.toContain(word);
    }
  });

  it('but still hands over every fact the weighing needs', () => {
    const r = calculateDualAxisBazi({
      solarDate: { year: 1993, month: 5, day: 20 }, clockTime: { hour: 9, minute: 40 },
      place: 'Tianjin', gender: 'female',
    } as never) as never as { strengthFactors: Record<string, unknown> };
    const f = r.strengthFactors;
    for (const key of ['monthOrder', 'roots', 'stemSupport', 'tableNote']) {
      expect(f[key]).toBeDefined();
    }
  });
});

describe('the ledger reports facts, never a pre-weighing of them', () => {
  it('no helper/drain tally — equal weighting is itself a weighing', () => {
    // `counts: { helpers, drains }` looked like a fact but carried three
    // decisions nobody could recover from it: seven positions weighted
    // equally, branches counted by main qi only (while `roots` reports middle
    // and residual qi right there), and 泄/耗/克 merged into one bucket. It was
    // also fully derivable from roots + stemSupport, so its only contribution
    // was the weighing -- the exact thing this server leaves to the caller.
    const f = computeStrengthFactors({
      year: '癸酉', month: '丁巳', day: '辛丑', hour: '癸巳',
    } as never) as never as Record<string, unknown>;
    expect('counts' in f).toBe(false);
  });

  it('everything it does report is recoverable from a table', () => {
    const f = computeStrengthFactors({
      year: '癸酉', month: '丁巳', day: '辛丑', hour: '癸巳',
    } as never) as never as {
      roots: { rootLevel: string }[];
      stemSupport: { direction: string }[];
    };
    // Each branch's own qi level, each stem's own direction -- the caller can
    // weigh these however their school does.
    expect(f.roots).toHaveLength(4);
    expect(f.stemSupport).toHaveLength(3);
    for (const r of f.roots) expect(['本气', '中气', '余气', '无']).toContain(r.rootLevel);
    for (const s of f.stemSupport) expect(['帮', '生', '泄', '耗', '克']).toContain(s.direction);
  });
});

describe('school forks are declared, not silently applied', () => {
  const factors = computeStrengthFactors({
    year: '癸酉', month: '丁巳', day: '辛丑', hour: '癸巳',
  } as never) as never as Record<string, never>;

  it('names a school for every table that has a live dispute', () => {
    // 十二长生 and 旺相休囚死 both have a second school in print. Yin day
    // masters take the twelve-stage fork on EVERY branch -- 辛 in 巳 is 死
    // here and 长生 under 同生同死 -- so an undeclared choice would hand a
    // caller one school's answer as if it were the only one.
    const c = factors.conventions as Record<string, { used: string; alternatives: string[] }>;
    for (const key of ['twelveStage', 'wangXiangXiuQiuSi', 'bladeTag']) {
      expect(c[key]).toBeDefined();
      expect(c[key].used.length).toBeGreaterThan(0);
      expect(c[key].alternatives.length).toBeGreaterThan(0);
    }
  });

  it('every field a fork claims to affect actually exists', () => {
    // Without this, renaming an output field leaves the disclosure pointing at
    // nothing and the fork goes quiet again -- the exact failure the block was
    // added to prevent.
    const c = factors.conventions as Record<string, { affects: string[] }>;
    for (const choice of Object.values(c)) {
      for (const path of choice.affects) {
        const value = path.split('.').reduce<unknown>((node, key) => {
          if (key.endsWith('[]')) {
            const list = (node as Record<string, unknown[]>)[key.slice(0, -2)];
            expect(Array.isArray(list)).toBe(true);
            return list[0];
          }
          return (node as Record<string, unknown>)[key];
        }, factors);
        expect(value, `${path} named in affects but missing from output`).toBeDefined();
      }
    }
  });
});

describe('twelveStageSchool selects a table, and only what the table decides', () => {
  const chart = { year: '癸酉', month: '丁巳', day: '辛丑', hour: '癸巳' };
  const under = (school: string) =>
    computeStrengthFactors(chart as never, school as never) as never as {
      monthOrder: { twelveStage: string };
      roots: { branch: string; tags: string[] }[];
      conventions: Record<string, { used: string }>;
    };

  it('moves the stage for a yin day master', () => {
    // 辛 in 巳: 死 under 渊海子平's 阴干逆行, 长生 under 滴天髓's 同生同死.
    // Opposite ends of the cycle from one fork -- which is why the fork is an
    // input rather than something this file decides.
    expect(under('yang_forward_yin_backward').monthOrder.twelveStage).toBe('死');
    expect(under('yin_follows_yang').monthOrder.twelveStage).toBe('长生');
  });

  it('leaves 禄 where 十干禄 puts it, whichever school is chosen', () => {
    // The regression this guards: 禄 used to be derived from the 临官 stage.
    // That identity holds under 阳顺阴逆 only. Under 同生同死 辛's 临官 moves
    // to 申 while 辛禄 is 酉 in both schools, so the derivation would have
    // dragged a school-independent fact along with a school-dependent one.
    for (const school of ['yang_forward_yin_backward', 'yin_follows_yang']) {
      const you = under(school).roots.find(r => r.branch === '酉');
      expect(you?.tags, `辛禄 must stay on 酉 under ${school}`).toContain('禄');
    }
  });

  it('changes nothing at all for a yang day master', () => {
    // The two schools differ about yin stems and only about yin stems. If a
    // yang chart ever moved, the fork would be reaching past what it decides.
    for (const stem of '甲丙戊庚壬') {
      for (const branch of '子丑寅卯辰巳午未申酉戌亥') {
        const pillars = { year: '甲子', month: stem + branch, day: stem + branch, hour: '甲子' };
        const a = computeStrengthFactors(pillars as never, 'yang_forward_yin_backward' as never);
        const b = computeStrengthFactors(pillars as never, 'yin_follows_yang' as never);
        expect(b.monthOrder, `${stem}${branch}`).toEqual(a.monthOrder);
        expect(b.roots, `${stem}${branch}`).toEqual(a.roots);
      }
    }
  });

  it('echoes back the school actually used, not always the default', () => {
    expect(under('yang_forward_yin_backward').conventions.twelveStage.used).toContain('阴干逆行');
    expect(under('yin_follows_yang').conventions.twelveStage.used).toContain('同生同死');
  });
});

describe('the school fork moves only what it decides, on the side it decides it', () => {
  // The yang case is covered above: nothing moves at all. The yin case is the
  // one the fork exists for, and it is the one where reaching too far would
  // hide -- 旺相休囚死, rootLevel, 禄/刃/墓库根 and stem support are all decided
  // by tables the fork has no business touching.
  it('changes 长生 and the stage, and nothing else, for a yin day master', () => {
    for (const stem of '乙丁己辛癸') {
      for (const branch of '子丑寅卯辰巳午未申酉戌亥') {
        const pillars = { year: stem + branch, month: stem + branch, day: stem + branch, hour: stem + branch };
        const a = computeStrengthFactors(pillars as never, 'yang_forward_yin_backward' as never) as never as Record<string, never>;
        const b = computeStrengthFactors(pillars as never, 'yin_follows_yang' as never) as never as Record<string, never>;
        const where = `${stem}${branch}`;

        const strip = (m: Record<string, unknown>) => ({ ...m, twelveStage: undefined });
        expect(strip(a.monthOrder), where).toEqual(strip(b.monthOrder));
        expect(b.stemSupport, where).toEqual(a.stemSupport);

        const roots = (f: Record<string, never>) =>
          (f.roots as { tags: string[] }[]).map(r => ({ ...r, tags: r.tags.filter(t => t !== '长生') }));
        expect(roots(b), where).toEqual(roots(a));
      }
    }
  });

  it('and the 长生 tag really does move, or the test above proves nothing', () => {
    // 辛's 长生 is 子 under 阳顺阴逆 and 巳 under 同生同死. If the filter above
    // were masking a fork that no longer works, this fails.
    const tagsOn = (branch: string, school: string) =>
      (computeStrengthFactors(
        { year: '辛' + branch, month: '辛' + branch, day: '辛' + branch, hour: '辛' + branch } as never,
        school as never,
      ) as never as { roots: { tags: string[] }[] }).roots[0].tags;
    expect(tagsOn('子', 'yang_forward_yin_backward')).toContain('长生');
    expect(tagsOn('子', 'yin_follows_yang')).not.toContain('长生');
    expect(tagsOn('巳', 'yin_follows_yang')).toContain('长生');
  });
});
