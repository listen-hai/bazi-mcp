import { describe, it, expect } from 'bun:test';
import { computeStrengthFactors, MissingJieDistanceError } from '../src/core/strength-factors';
import { daysToNextJie } from '../src/core/time';
import { calculateDualAxisBazi } from '../src/core/dual-axis';

const SEASONAL = '辰未戌丑';
const ALL_BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

const factors = (monthBranch: string, days: number, school: string) =>
  computeStrengthFactors(
    { year: '甲子', month: '丙' + monthBranch, day: '甲子', hour: '甲子' } as never,
    undefined as never,
    { monthOrderSchool: school, daysToNextJie: days } as never,
  ) as never as { monthOrder: Record<string, unknown>; roots: unknown; stemSupport: unknown };

describe('土旺四季十八日 divides the 四季月, and only the 四季月', () => {
  it('hands 令 to the closing season before the 18-day line and to 土 inside it', () => {
    // 辰 closes spring, so before the line the 令 is still 木; inside it, 土.
    expect(factors('辰', 25, 'earth_rules_final_18_days').monthOrder.rulingElement).toBe('wood');
    expect(factors('辰', 10, 'earth_rules_final_18_days').monthOrder.rulingElement).toBe('earth');
    // The default takes the branch's main qi, which is 土 for the whole month.
    expect(factors('辰', 25, 'branch_main_qi').monthOrder.rulingElement).toBe('earth');
    expect(factors('辰', 10, 'branch_main_qi').monthOrder.rulingElement).toBe('earth');
  });

  it('gives each 四季月 the season it actually closes', () => {
    const closing = { 辰: 'wood', 未: 'fire', 戌: 'metal', 丑: 'water' } as Record<string, string>;
    for (const branch of SEASONAL) {
      expect(factors(branch, 25, 'earth_rules_final_18_days').monthOrder.rulingElement, branch).toBe(closing[branch]);
      expect(factors(branch, 18, 'earth_rules_final_18_days').monthOrder.rulingElement, `${branch} on the line`).toBe('earth');
    }
  });

  it('changes nothing in the other eight months, at any distance', () => {
    // Their main qi already IS the season's element, so the two schools cannot
    // disagree there. If they ever do, the fork is reaching past what it decides.
    for (const branch of ALL_BRANCHES) {
      if (SEASONAL.includes(branch)) continue;
      for (const days of [0.5, 5, 18, 18.5, 29]) {
        const a = factors(branch, days, 'branch_main_qi');
        const b = factors(branch, days, 'earth_rules_final_18_days');
        expect(b.monthOrder, `${branch} @${days}d`).toEqual(a.monthOrder);
      }
    }
  });

  it('leaves the month-branch facts alone even where it does change 令', () => {
    // relation / mainQiStem / tenGod are read off the branch, not off 令.
    for (const branch of SEASONAL) {
      const a = factors(branch, 25, 'branch_main_qi').monthOrder;
      const b = factors(branch, 25, 'earth_rules_final_18_days').monthOrder;
      for (const key of ['monthBranch', 'mainQiStem', 'mainQiElement', 'tenGod', 'relation', 'twelveStage']) {
        expect(b[key], `${branch}.${key}`).toEqual(a[key]);
      }
      expect(b.rulingElement).not.toEqual(a.rulingElement); // or the case proves nothing
    }
  });

  it('refuses rather than falling back when the datum it needs is absent', () => {
    // Quietly computing with branch_main_qi would answer a question the caller
    // did not ask, and nothing downstream could tell.
    expect(() =>
      computeStrengthFactors(
        { year: '甲子', month: '丙辰', day: '甲子', hour: '甲子' } as never,
        undefined as never,
        { monthOrderSchool: 'earth_rules_final_18_days' } as never,
      ),
    ).toThrow(MissingJieDistanceError);
    // ...but a month the rule cannot touch needs no datum to be honest about.
    expect(() =>
      computeStrengthFactors(
        { year: '甲子', month: '丙寅', day: '甲子', hour: '甲子' } as never,
        undefined as never,
        { monthOrderSchool: 'earth_rules_final_18_days' } as never,
      ),
    ).not.toThrow();
  });
});

describe('the 节 distance is measured in the frame the month pillar uses', () => {
  it('crosses zero exactly where the month pillar changes', () => {
    // The frame trap: lunar-javascript reports 节 instants in fixed UTC+8,
    // blind to the DST China ran 1986-1991. Summer 1990 is inside that window,
    // so if the distance were measured against a civil wall clock it would
    // disagree with the month pillar by an hour. 立秋 1990 starts 申月.
    const at = (day: number, hour: number, minute: number) =>
      calculateDualAxisBazi({
        solarDate: { year: 1990, month: 8, day }, clockTime: { hour, minute },
        place: 'Tianjin', gender: 'female',
      } as never) as never as {
        pillars: { month: { ganZhi: string } };
        strengthFactors: { monthOrder: { daysToNextJie: number } };
      };

    let previous = at(1, 12, 0);
    let flips = 0;
    for (let day = 2; day <= 15; day++) {
      const current = at(day, 12, 0);
      if (current.pillars.month.ganZhi !== previous.pillars.month.ganZhi) {
        flips++;
        // The day the month pillar rolls over is the day the distance resets
        // from ~0 to a full month. Measured in the wrong frame these part ways.
        expect(previous.strengthFactors.monthOrder.daysToNextJie).toBeLessThan(1);
        expect(current.strengthFactors.monthOrder.daysToNextJie).toBeGreaterThan(25);
      }
      previous = current;
    }
    expect(flips, '立秋 must fall inside 1990-08-01..15').toBe(1);
  });

  it('is always positive and shorter than any solar month', () => {
    for (const month of [1, 4, 7, 10]) {
      for (const day of [3, 12, 21, 28]) {
        const d = daysToNextJie(Date.UTC(1990, month - 1, day, 12, 0) + 8 * 3600000);
        expect(d, `1990-${month}-${day}`).toBeGreaterThan(0);
        expect(d, `1990-${month}-${day}`).toBeLessThan(32);
      }
    }
  });
});

describe('the 节 table this depends on', () => {
  it('puts the four terms behind the fixture charts where an independent ephemeris does', () => {
    // Cross-checked once against astronomy-engine (VSOP87, in the astro repo)
    // by solving for the sun's ecliptic longitude at each term's defining
    // multiple of 15 degrees. Largest disagreement: 16 seconds. So these are
    // pinned values that were verified, not values pinned to themselves.
    //
    // The tolerance is five minutes rather than exact seconds on purpose: a
    // lunar-javascript release that sharpens its series by a few seconds
    // breaks nothing about a chart, while a broken term table moves by hours
    // or days. Asserting to the second would only ever go red for the harmless
    // case.
    const expected: [number, number, number, number, number, number][] = [
      // from, to (UTC+8 wall clock of the next 节)
      [1993, 5, 1, 1993, 5, 5],
      [1993, 6, 1, 1993, 6, 6],
      [1990, 8, 5, 1990, 8, 8],
      [1993, 4, 1, 1993, 4, 5],
    ];
    const instants = ['1993-05-05T20:01:43', '1993-06-06T00:15:13', '1990-08-08T02:45:32', '1993-04-05T02:37:11'];
    expected.forEach(([fy, fm, fd], i) => {
      const fromMs = Date.UTC(fy, fm - 1, fd, 0, 0, 0);
      const actualMs = fromMs + daysToNextJie(fromMs) * 86400000;
      const pinnedMs = Date.parse(instants[i] + 'Z');
      expect(Math.abs(actualMs - pinnedMs) / 60000, instants[i]).toBeLessThan(5);
    });
  });
});

describe('阴刃 is named by the caller or not reported at all', () => {
  const tags = (stem: string, branch: string, bladeSchool?: string) =>
    (computeStrengthFactors(
      { year: stem + branch, month: '丙寅', day: stem + branch, hour: '甲子' } as never,
      undefined as never,
      (bladeSchool ? { bladeSchool } : {}) as never,
    ) as never as { roots: { tags: string[] }[] }).roots[0].tags;

  it('defaults to 阳刃 alone', () => {
    // The third school in print holds that yin stems have no 刃; that is what
    // the default reports, rather than this file choosing between the other two.
    expect(tags('甲', '卯')).toContain('刃');
    for (const [stem, diwang, guandai] of [['乙', '寅', '辰'], ['丁', '巳', '未'], ['己', '巳', '未'], ['辛', '申', '戌'], ['癸', '亥', '丑']]) {
      expect(tags(stem, diwang), `${stem}${diwang}`).not.toContain('刃');
      expect(tags(stem, guandai), `${stem}${guandai}`).not.toContain('刃');
    }
  });

  it('places 阴刃 where each named school places it, and nowhere else', () => {
    for (const [stem, diwang, guandai] of [['乙', '寅', '辰'], ['丁', '巳', '未'], ['己', '巳', '未'], ['辛', '申', '戌'], ['癸', '亥', '丑']]) {
      expect(tags(stem, diwang, 'yin_at_diwang'), `${stem}${diwang}`).toContain('刃');
      expect(tags(stem, guandai, 'yin_at_diwang'), `${stem}${guandai}`).not.toContain('刃');
      expect(tags(stem, guandai, 'yin_at_guandai'), `${stem}${guandai}`).toContain('刃');
      expect(tags(stem, diwang, 'yin_at_guandai'), `${stem}${diwang}`).not.toContain('刃');
    }
  });

  it('never moves 阳刃, whichever yin reading is chosen', () => {
    for (const [stem, branch] of [['甲', '卯'], ['丙', '午'], ['戊', '午'], ['庚', '酉'], ['壬', '子']]) {
      for (const school of ['yang_only', 'yin_at_diwang', 'yin_at_guandai']) {
        expect(tags(stem, branch, school), `${stem}${branch} @${school}`).toContain('刃');
      }
    }
  });

  it('does not tag the 禄 positions as 刃 under any school', () => {
    // 4.0.1 and 4.1.0 published 乙卯 丁午 己午 辛酉 癸子 as "the" 阴刃
    // alternative. Those are the yin stems' 禄 branches and match no school in
    // print; the list was written by analogy and never sourced.
    for (const [stem, lu] of [['乙', '卯'], ['丁', '午'], ['己', '午'], ['辛', '酉'], ['癸', '子']]) {
      for (const school of ['yang_only', 'yin_at_diwang', 'yin_at_guandai']) {
        expect(tags(stem, lu, school), `${stem}${lu} @${school}`).toEqual(['禄']);
      }
    }
  });
});
