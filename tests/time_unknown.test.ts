import { describe, expect, it } from 'bun:test';
import { calculateDualAxisBazi } from '../src/core/dual-axis';

// `timeUnknown: true` used to substitute noon and carry on. The hour pillar was
// nulled, which looks like honest degradation -- but the fabricated noon still
// drove the year, month and day pillars and the entire 大运 sequence, with no
// warning at all. Measured on 2024-02-04 in Beijing (立春 falls that day):
//
//   00:30  癸卯 乙丑 戊戌      起运 2033-09-14
//   20:00  甲辰 丙寅 戊戌      起运 2033-12-14   <- year AND month flip
//   noon   癸卯 乙丑 戊戌      起运 2033-11-14 12:00:00, zero warnings
//
// A silent noon is the same sin as astro-mcp's banned `clockTime: 12:00`.

const AT = (extra: Record<string, unknown>) =>
  calculateDualAxisBazi({
    solarDate: { year: 2024, month: 2, day: 4 }, place: 'Beijing', gender: 'male', ...extra,
  } as never) as never as {
    fourPillars: string;
    pillars: Record<string, unknown>;
    daYun: unknown;
    diagnostics: { warnings?: string[]; pillarCandidates?: unknown };
  };

describe('timeUnknown must not fabricate a time', () => {
  it('never reports a noon anywhere in the output', () => {
    const r = AT({ timeUnknown: true });
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/12:00:00/);
    expect(json).not.toMatch(/"hour":12\b/);
  });

  it('warns when the pillars are not determined by the date alone', () => {
    // On a 立春 day the year and month pillars genuinely depend on the hour.
    const r = AT({ timeUnknown: true });
    const warnings = r.diagnostics.warnings ?? [];
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.join(' ')).toMatch(/立春|year pillar|month pillar|unknown time/i);
  });

  it('reports both candidates when a pillar flips within the day', () => {
    const r = AT({ timeUnknown: true });
    const candidates = JSON.stringify(r.diagnostics.pillarCandidates ?? {});
    expect(candidates).toContain('癸卯');   // pre-立春 year pillar
    expect(candidates).toContain('甲辰');   // post-立春 year pillar
  });

  it('does not report a precise 大运 start when the hour is unknown', () => {
    // 起运 swings across three months over the course of one unknown day, so a
    // to-the-second answer is a fabrication.
    const r = AT({ timeUnknown: true });
    expect(JSON.stringify(r.daYun)).not.toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  });

  it('an ordinary day settles the YEAR and MONTH pillars outright', () => {
    // Degradation must be proportionate. Away from a solar-term boundary the
    // date alone fixes the year and month pillars, and hedging those would be
    // its own kind of dishonesty.
    const r = calculateDualAxisBazi({
      solarDate: { year: 2024, month: 6, day: 15 }, place: 'Beijing', gender: 'male',
      timeUnknown: true,
    } as never) as never as {
      pillars: Record<string, { ganZhi: string }>;
      diagnostics: { pillarCandidates?: Record<string, unknown> };
    };
    expect(r.pillars.year.ganZhi).toBe('甲辰');
    expect(r.pillars.month.ganZhi).toBe('庚午');
    expect(r.diagnostics.pillarCandidates?.year ?? null).toBeNull();
    expect(r.diagnostics.pillarCandidates?.month ?? null).toBeNull();
  });

  it('the DAY pillar is qualified on every unknown-time chart, not just special days', () => {
    // Under the default 早子时 rule the day pillar rolls at 23:00, so the last
    // hour of every day belongs to the next one. An earlier version of this
    // suite asserted that an ordinary day "flips nothing" -- a false premise
    // that pushed the implementation into sampling only to 22:59, which hid
    // real ambiguity rather than reporting it. Measured on 2024-06-15 Beijing:
    // 23:00 gives 庚戌, 23:30 gives 辛亥.
    const r = calculateDualAxisBazi({
      solarDate: { year: 2024, month: 6, day: 15 }, place: 'Beijing', gender: 'male',
      timeUnknown: true,
    } as never) as never as {
      pillars: Record<string, { ganZhi: string }>;
      diagnostics: { warnings?: string[]; dayPillarAlternative?: { ganZhi: string; window: string } };
    };
    // The overwhelmingly likely value is still stated plainly -- 23 hours of
    // the day give it. This is disclosure, not a 50/50 candidate list.
    expect(r.pillars.day.ganZhi).toBe('庚戌');
    // ...but the other hour is named, with the window that produces it.
    expect(r.diagnostics.dayPillarAlternative?.ganZhi).toBe('辛亥');
    expect(r.diagnostics.dayPillarAlternative?.window).toMatch(/23/);
  });

  it('an exact time is unaffected by any of this', () => {
    const r = AT({ clockTime: { hour: 20, minute: 0 } });
    expect(r.fourPillars).toBe('甲辰 丙寅 戊戌 壬戌');
    expect(r.diagnostics.warnings ?? []).toHaveLength(0);
  });

  it('the Da Yun range reads in chronological order', () => {
    // The two samples are the ends of the birth DAY, not the ends of the
    // resulting range: 大运 start does not move monotonically with the birth
    // hour, and the direction can flip outright. Concatenating the samples in
    // sampling order produced "2031-10-05 to 2031-06-15".
    for (const solarDate of [
      { year: 2024, month: 6, day: 15 },
      { year: 2024, month: 2, day: 4 },
      { year: 1990, month: 11, day: 7 },
    ]) {
      const r = calculateDualAxisBazi({
        solarDate, place: 'Beijing', gender: 'male', timeUnknown: true,
      } as never) as never as { daYun: { startDate: string } };
      const dates = r.daYun.startDate.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
      if (dates.length === 2) {
        expect(new Date(dates[0]).getTime()).toBeLessThanOrEqual(new Date(dates[1]).getTime());
      }
    }
  });
});
