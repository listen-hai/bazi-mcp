import {
  calculateBaziChart,
  calculateTenGod,
  detectInteractions,
  getMainQi,
  BaziChart,
  DayBoundaryMode,
  Pillar,
  HiddenStemInfo,
  BranchInteraction
} from '@openfate/bazi-engine';
import { getTrueSolarTimeFromInstant } from '@openfate/true-solar-time';
import baziEnginePkg from '@openfate/bazi-engine/package.json';
import trueSolarTimePkg from '@openfate/true-solar-time/package.json';
import {
  BaziInput,
  BaziCalculationResult,
  PillarOutput,
  DaYunOutput,
  BranchInteractionOutput,
  DiagnosticsOutput,
  WallDateTime,
} from '../types';
import {
  tzOffsetMinutes,
  wallToInstant,
  instantToWall,
  toUTCWall,
  formatOffsetString,
  WallToInstantResult,
} from './time';
import { resolveLocation } from '../geo/resolver';
import { getShichenMidpoint, getShichenSamplePoints } from './shichen';

/**
 * Normalizes pillar output and computes Ten Gods against the true Day Master.
 * `日主` (Day Master) is only correct for the day pillar itself — any other
 * pillar whose stem happens to match the day master's stem is 比肩 like any
 * other stem comparison, so the label is gated on `isDayPillar` rather than a
 * stem equality check.
 */
function formatPillar(
  pillar: Pillar,
  dayMasterStem: string,
  isDayPillar: boolean
): PillarOutput {
  const stemTenGod = isDayPillar ? '日主' : calculateTenGod(dayMasterStem, pillar.stem);

  const hiddenStems = (pillar.hiddenStems || []).map((h: HiddenStemInfo) => ({
    stem: h.stem,
    element: h.element,
    tenGod: calculateTenGod(dayMasterStem, h.stem),
    isMain: h.isMain,
  }));

  const mainHidden = hiddenStems.find(h => h.isMain);
  // Fallback recomputed against the true (Axis B) day master, not the raw engine
  // value on `pillar` (which for Axis A pillars was computed against Axis A's own
  // day master and would be wrong here). In practice every branch has a main
  // hidden stem so this path is not expected to fire.
  const branchTenGod = mainHidden ? mainHidden.tenGod : calculateTenGod(dayMasterStem, getMainQi(pillar.branch));

  return {
    stem: pillar.stem,
    branch: pillar.branch,
    ganZhi: pillar.ganZhi,
    element: pillar.element,
    stemTenGod,
    branchTenGod,
    hiddenStems,
    naYin: pillar.naYin,
    xun: pillar.xun,
    voidBranches: pillar.voidBranches,
  };
}

/**
 * Deduplicates branch interactions.
 */
function deduplicateInteractions(interactions: BranchInteraction[]): BranchInteractionOutput[] {
  const seen = new Set<string>();
  const results: BranchInteractionOutput[] = [];

  for (const item of interactions) {
    const sortedBranches = [...item.branches].sort().join('-');
    const key = `${item.type}:${sortedBranches}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        type: item.type,
        branches: item.branches,
        pillars: item.pillars,
        resultElement: item.resultElement,
        description: item.description,
      });
    }
  }

  return results;
}

/**
 * The core dual-axis calculation engine.
 */
export function calculateDualAxisBazi(input: BaziInput): BaziCalculationResult {
  const warnings: string[] = [];

  // 1. Resolve Location & IANA Timezone
  const loc = resolveLocation({
    place: input.place,
    longitude: input.longitude,
    timezone: input.timezone,
  });

  const dayBoundaryMode: DayBoundaryMode =
    input.sect === 2 ? 'ZI_HOUR_23' : 'MIDNIGHT_00';

  // 2. Resolve Date & Time inputs
  let localWall: WallDateTime;
  let beijingWall: WallDateTime;
  let instant: number;
  let offsetMinutes: number;
  let isDst: boolean;
  // Set only when the local wall clock had more than one UTC candidate (a DST
  // fall-back fold); carries the already-resolved offset through to Axis B (FIX 1).
  let localFoldOffsetMinutes: number | undefined;
  let lunarDiag: DiagnosticsOutput['lunar'] = undefined;

  // Determine clock time (hour, minute)
  let baseHour = 12;
  let baseMinute = 0;
  let isUnknownTime = Boolean(input.timeUnknown);

  if (input.clockTime) {
    baseHour = input.clockTime.hour;
    baseMinute = input.clockTime.minute ?? 0;
  } else if (input.shichen) {
    const mid = getShichenMidpoint(input.shichen);
    baseHour = mid.hour;
    baseMinute = mid.minute;
  } else if (input.timeUnknown) {
    baseHour = 12;
    baseMinute = 0;
  } else {
    // If no time is given and timeUnknown not explicitly set, throw error
    throw new Error('Missing time information: please provide `clockTime` (clock time), `shichen` (traditional double-hour), or set `timeUnknown: true` (3-pillar chart).');
  }

  // Resolves a local wall clock to a UTC instant. If the wall clock was built
  // from a shichen midpoint and lands exactly in a DST spring-forward gap,
  // falls back to the first shichen sample point (start/mid/end) that does
  // exist rather than telling someone genuinely born in that shichen that
  // their birth record is wrong (FIX 6).
  function resolveWallInstant(wall: WallDateTime, tz: string): { wall: WallDateTime; result: WallToInstantResult } {
    try {
      return { wall, result: wallToInstant(wall, tz, input.dstFold) };
    } catch (err) {
      if (!input.shichen || input.clockTime || !(err as Error).message.includes('spring-forward gap')) {
        throw err;
      }
      for (const pt of getShichenSamplePoints(input.shichen)) {
        if (pt.hour === wall.hour && pt.minute === wall.minute) continue;
        try {
          const fallbackWall = { ...wall, hour: pt.hour, minute: pt.minute };
          const result = wallToInstant(fallbackWall, tz, input.dstFold);
          warnings.push(
            `The midpoint of shichen "${input.shichen}" (${String(wall.hour).padStart(2, '0')}:${String(wall.minute).padStart(2, '0')}) falls in a DST spring-forward gap and does not exist; used ${String(pt.hour).padStart(2, '0')}:${String(pt.minute).padStart(2, '0')} instead. Please double-check the exact clock time.`
          );
          return { wall: fallbackWall, result };
        } catch {
          // try the next sample point
        }
      }
      throw err;
    }
  }

  // 3. Handle Lunar vs Solar Date
  if (input.lunarDate) {
    const lFrame = input.lunarDateFrame || 'local';

    // Convert Lunar date to Solar using engine's lunar converter
    let lunarConvChart: BaziChart;
    try {
      lunarConvChart = calculateBaziChart({
        year: input.lunarDate.year,
        month: input.lunarDate.month,
        day: input.lunarDate.day,
        isLeapMonth: Boolean(input.lunarDate.isLeapMonth),
        calendarType: 'lunar',
        hour: baseHour,
        minute: baseMinute,
        gender: input.gender,
        longitude: 120,
        timezone: 8,
      });
    } catch (err) {
      throw new Error(`Lunar date conversion failed: ${(err as Error).message}`);
    }

    const convSolar = lunarConvChart.calendar.civilSolar;
    const convSolarStr = `${convSolar.year}-${String(convSolar.month).padStart(2, '0')}-${String(convSolar.day).padStart(2, '0')}`;

    if (lFrame === 'local') {
      // Local frame: The solar date corresponds to local calendar at place of birth
      localWall = {
        year: convSolar.year,
        month: convSolar.month,
        day: convSolar.day,
        hour: baseHour,
        minute: baseMinute,
        second: 0,
      };

      const { wall: resolvedWall, result: wRes } = resolveWallInstant(localWall, loc.timezone);
      localWall = resolvedWall;
      instant = wRes.instant;
      offsetMinutes = wRes.offsetMinutes;
      isDst = wRes.isDst;
      if (wRes.candidates) localFoldOffsetMinutes = wRes.offsetMinutes;

      beijingWall = instantToWall(instant, 'Asia/Shanghai');
    } else {
      // Beijing frame: The solar date corresponds to Beijing calendar
      beijingWall = {
        year: convSolar.year,
        month: convSolar.month,
        day: convSolar.day,
        hour: baseHour,
        minute: baseMinute,
        second: 0,
      };
      // Use the real Asia/Shanghai offset (not a fixed +8) so this is correct
      // during China's 1986-1991 DST years too.
      instant = wallToInstant(beijingWall, 'Asia/Shanghai', input.dstFold).instant;

      localWall = instantToWall(instant, loc.timezone);
      offsetMinutes = tzOffsetMinutes(instant, loc.timezone);
      const janOffset = tzOffsetMinutes(Date.UTC(localWall.year, 0, 15, 12, 0), loc.timezone);
      const julOffset = tzOffsetMinutes(Date.UTC(localWall.year, 6, 15, 12, 0), loc.timezone);
      isDst = offsetMinutes > Math.min(janOffset, julOffset);
    }

    const localSolarStr = `${localWall.year}-${String(localWall.month).padStart(2, '0')}-${String(localWall.day).padStart(2, '0')}`;
    const beijingSolarStr = `${beijingWall.year}-${String(beijingWall.month).padStart(2, '0')}-${String(beijingWall.day).padStart(2, '0')}`;

    lunarDiag = {
      inputFrame: lFrame,
      convertedSolarDate: localSolarStr,
      beijingSolarDate: beijingSolarStr,
      lunarDescription: `lunar ${input.lunarDate.year}-${String(input.lunarDate.month).padStart(2, '0')}-${String(input.lunarDate.day).padStart(2, '0')}${input.lunarDate.isLeapMonth ? ' (leap month)' : ''}`,
    };

    if (localSolarStr !== beijingSolarStr) {
      if (lFrame === 'local') {
        warnings.push('Local date differs from the Beijing date; if this lunar date is recorded by the China date, switch to frame=beijing instead.');
      } else {
        warnings.push('Beijing date differs from the local date; the local clock time has been converted using the China solar date as the reference.');
      }
    }
  } else if (input.solarDate) {
    localWall = {
      year: input.solarDate.year,
      month: input.solarDate.month,
      day: input.solarDate.day,
      hour: baseHour,
      minute: baseMinute,
      second: 0,
    };

    const { wall: resolvedWall, result: wRes } = resolveWallInstant(localWall, loc.timezone);
    localWall = resolvedWall;
    instant = wRes.instant;
    offsetMinutes = wRes.offsetMinutes;
    isDst = wRes.isDst;
    if (wRes.candidates) localFoldOffsetMinutes = wRes.offsetMinutes;

    beijingWall = instantToWall(instant, 'Asia/Shanghai');
  } else {
    throw new Error('Missing date information: please provide `solarDate` (solar/Gregorian) or `lunarDate` (lunar).');
  }

  // 3.5 Timezone ambiguity at the resolved instant: coordinates can fall inside
  // more than one timezone boundary (border overlaps, or genuine dual civil-time
  // regions like Xinjiang). Decide here, at the actual instant, not at geo lookup
  // time — two zones sharing the same UTC offset at this instant (e.g. the
  // Guajará-Mirim/Brazil overlap) is not a real ambiguity and gets no warning.
  let tzAmbiguityDiag: DiagnosticsOutput['timezoneResolution'] = undefined;
  if (loc.alternateTimezones && loc.alternateTimezones.length > 0) {
    const baseOffset = tzOffsetMinutes(instant, loc.timezone);
    const genuineAlts = loc.alternateTimezones.filter(
      alt => tzOffsetMinutes(instant, alt) !== baseOffset
    );
    if (genuineAlts.length > 0) {
      const diffHours = Number(
        (Math.max(...genuineAlts.map(alt => Math.abs(tzOffsetMinutes(instant, alt) - baseOffset))) / 60).toFixed(2)
      );
      let note = `The birth coordinates fall inside more than one timezone boundary: ${[loc.timezone, ...genuineAlts].join(', ')}; this chart was calculated using "${loc.timezone}" (up to ${diffHours} hours different from the alternate candidates). To use a different timezone, explicitly pass the \`timezone\` parameter.`;
      if (loc.timezone === 'Asia/Shanghai' && genuineAlts.includes('Asia/Urumqi')) {
        note += ' The birth place is in Xinjiang: mainland China has used Beijing time as its single civil time zone since 1949, but some Xinjiang households still record birth times in Xinjiang local time (UTC+6, 2 hours behind Beijing time); if the birth was recorded in local time, pass `timezone: "Asia/Urumqi"`.';
      }
      tzAmbiguityDiag = {
        used: loc.timezone,
        candidates: genuineAlts,
        maxOffsetDiffHours: diffHours,
        note,
      };
      warnings.push(note);
    }
  }

  // 4. Check historical Shanghai/China approximation (pre-1901)
  let historicalTzApprox = false;
  if (loc.timezone === 'Asia/Shanghai' && instant < Date.UTC(1901, 0, 1)) {
    historicalTzApprox = true;
    warnings.push('Before 1901, localities across China used Local Mean Time (Shanghai LMT was UTC+08:06); Beijing, Guangzhou, and other cities have a systematic offset of a few minutes.');
  }

  // 5. Calculate Axis A (UTC Instant -> Beijing Wall Clock)
  // Preserves exact astronomical instant; determines Year Pillar, Month Pillar, and Da Yun
  const beijingWallForA = toUTCWall(instant + 8 * 3600000);
  const A = calculateBaziChart({
    year: beijingWallForA.year,
    month: beijingWallForA.month,
    day: beijingWallForA.day,
    hour: beijingWallForA.hour,
    minute: beijingWallForA.minute,
    gender: input.gender,
    longitude: 120,
    timezone: 8,
    enableTrueSolarTime: false,
    dayBoundaryMode,
  });

  // 6. Calculate Axis B (Local Wall Clock + IANA Timezone + Birth Longitude)
  // Calculates True Solar Time; determines Day Pillar and Hour Pillar
  const enableTrueSolar = input.trueSolar !== false;

  // The engine re-derives its own UTC instant from wall+timezoneId internally
  // and silently takes the first DST fall-back fold, discarding whichever
  // fold `dstFold` resolved. So when the wall clock was ambiguous
  // (foldOffsetMinutes given), pass the already-resolved numeric
  // fractional-hour offset instead of timezoneId; otherwise keep timezoneId
  // so pre-1901 sub-minute LMT offsets (e.g. Shanghai +08:05:43) stay exact
  // (FIX 1). One helper for both call sites (main chart + shichen sampling
  // below) so the fix can't drift between them (FIX 4).
  const axisBChart = (wall: { year: number; month: number; day: number; hour: number; minute: number }, foldOffsetMinutes?: number) =>
    calculateBaziChart({
      year: wall.year,
      month: wall.month,
      day: wall.day,
      hour: wall.hour,
      minute: wall.minute,
      gender: input.gender,
      longitude: loc.longitude,
      ...(foldOffsetMinutes !== undefined
        ? { timezone: foldOffsetMinutes / 60 }
        : { timezoneId: loc.timezone }),
      enableTrueSolarTime: enableTrueSolar,
      dayBoundaryMode,
    });

  const B = axisBChart(localWall, localFoldOffsetMinutes);

  // Extract Solar Time details via @openfate/true-solar-time from instant directly
  const solarTimeDetail = getTrueSolarTimeFromInstant(
    { date: new Date(instant), timeZoneId: loc.timezone },
    { longitude: loc.longitude }
  );

  // 7. Shichen Ambiguity Check (if shichen was passed)
  let shichenAmbiguityDiag: DiagnosticsOutput['shichenAmbiguity'] = undefined;
  if (input.shichen && !input.clockTime && !input.timeUnknown) {
    const samplePoints = getShichenSamplePoints(input.shichen);
    const candidateHourPillars = new Set<string>();

    for (const pt of samplePoints) {
      try {
        // Throws on a DST gap (nonexistent wall time); the catch below then
        // skips this sample point entirely.
        const sampleWRes = wallToInstant(
          {
            year: localWall.year,
            month: localWall.month,
            day: localWall.day,
            hour: pt.hour,
            minute: pt.minute,
          },
          loc.timezone,
          input.dstFold
        );

        const sampleB = axisBChart(
          { year: localWall.year, month: localWall.month, day: localWall.day, hour: pt.hour, minute: pt.minute },
          sampleWRes.candidates ? sampleWRes.offsetMinutes : undefined
        );

        if (sampleB.pillars.hour) {
          candidateHourPillars.add(sampleB.pillars.hour.ganZhi);
        }
      } catch {
        // ignore
      }
    }

    if (candidateHourPillars.size > 1) {
      shichenAmbiguityDiag = {
        isAmbiguous: true,
        candidateHourPillars: Array.from(candidateHourPillars),
      };
      if (input.shichen === '子') {
        warnings.push(
          `The provided shichen is "子" (Zi), which spans early-Zi (23:00-24:00, belongs to the previous day) and late-Zi (00:00-01:00, belongs to the current day); this range contains multiple candidate hour pillars: ${Array.from(
            candidateHourPillars
          ).join(', ')}. Please double-check the exact clock time to distinguish early-Zi from late-Zi.`
        );
      } else {
        warnings.push(
          `The provided shichen is "${input.shichen}", and after True Solar Time and longitude correction it crosses a shichen boundary; this range contains multiple candidate hour pillars: ${Array.from(
            candidateHourPillars
          ).join(', ')}. Please double-check the exact clock time.`
        );
      }
    }
  }

  // 8. Synthesize Four Pillars & Ten Gods
  const trueDayMasterStem = B.pillars.day.stem;
  const dayMaster = B.dayMaster;

  const yearPillar = formatPillar(A.pillars.year, trueDayMasterStem, false);
  const monthPillar = formatPillar(A.pillars.month, trueDayMasterStem, false);
  const dayPillar = formatPillar(B.pillars.day, trueDayMasterStem, true);
  // B.pillars.hour is only null when hour/minute weren't supplied to the engine;
  // we always supply them when !isUnknownTime, so this is safe.
  const hourPillar = isUnknownTime ? null : formatPillar(B.pillars.hour!, trueDayMasterStem, false);

  const fourPillarsStr = isUnknownTime
    ? `${yearPillar.ganZhi} ${monthPillar.ganZhi} ${dayPillar.ganZhi} [hour unknown]`
    : `${yearPillar.ganZhi} ${monthPillar.ganZhi} ${dayPillar.ganZhi} ${hourPillar!.ganZhi}`;

  // 9. Format Da Yun (strictly from Axis A) with nominal age
  const daYunCycles = A.daYun.cycles.map(c => ({
    index: c.index,
    stem: c.stem,
    branch: c.branch,
    ganZhi: c.ganZhi,
    startYear: c.startYear,
    startAgeNominal: c.startAge + 1,     // nominal age
    startAgeInWholeYears: c.startAge,    // whole years only, not precise — see startOffset
    endYear: c.endYear,
    endAgeNominal: c.endAge + 1,
    stemTenGod: calculateTenGod(trueDayMasterStem, c.stem),
    branchTenGod: calculateTenGod(trueDayMasterStem, getMainQi(c.branch)),
  }));

  const daYun: DaYunOutput = {
    isForward: A.daYun.isForward,
    startYear: A.daYun.startYear,
    startAgeNominal: A.daYun.startAge + 1,
    startDate: A.daYun.startDate,
    startOffset: A.daYun.startOffset,
    cycles: daYunCycles,
  };

  // 10. Deduplicate branch interactions across the synthesized 4 pillars
  const allInteractions = detectInteractions({
    year: yearPillar.branch,
    month: monthPillar.branch,
    day: dayPillar.branch,
    hour: hourPillar ? hourPillar.branch : '',
  });
  const interactions = deduplicateInteractions(allInteractions);

  // 11. Assemble Diagnostics Block
  const wallStr = `${localWall.year}-${String(localWall.month).padStart(2, '0')}-${String(localWall.day).padStart(2, '0')} ${String(localWall.hour).padStart(2, '0')}:${String(localWall.minute).padStart(2, '0')} (${loc.timezone})`;
  const offsetStr = formatOffsetString(offsetMinutes, isDst);
  const utcInstantStr = new Date(instant).toISOString();
  const axisAStr = `${beijingWallForA.year}-${String(beijingWallForA.month).padStart(2, '0')}-${String(beijingWallForA.day).padStart(2, '0')} ${String(beijingWallForA.hour).padStart(2, '0')}:${String(beijingWallForA.minute).padStart(2, '0')}`;
  const axisBStr = solarTimeDetail.trueSolarDateTime;

  const diagnostics: DiagnosticsOutput = {
    wallClock: wallStr,
    utcOffset: offsetStr,
    utcInstant: utcInstantStr,
    axisA_beijingWallClock_yearMonthPillars: axisAStr,
    axisB_localTrueSolarTime_dayHourPillars: axisBStr,
    longitudeCorrectionMinutes: Number(solarTimeDetail.longitudeCorrectionMinutes.toFixed(2)),
    equationOfTimeMinutes: Number(solarTimeDetail.equationOfTimeMinutes.toFixed(2)),
    lunar: lunarDiag,
    convention: {
      sect: input.sect === 2 ? 2 : 1,
      trueSolar: enableTrueSolar,
      childLimitProvider: input.childLimitProvider || 'default',
      ageBasis: 'nominal',
    },
    shichenAmbiguity: shichenAmbiguityDiag,
    timezoneResolution: tzAmbiguityDiag,
    historicalTzApprox,
    warnings,
    engineInfo: {
      baziEngine: `@openfate/bazi-engine@${baziEnginePkg.version}`,
      trueSolarTimeEngine: `@openfate/true-solar-time@${trueSolarTimePkg.version}`,
      schemaVersion: '2.0.0',
    },
  };

  return {
    fourPillars: fourPillarsStr,
    pillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
    },
    dayMaster: {
      char: dayMaster.char,
      pinyin: dayMaster.pinyin,
      element: dayMaster.element,
      polarity: dayMaster.polarity,
    },
    daYun,
    interactions,
    diagnostics,
  };
}
