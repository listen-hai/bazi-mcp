import {
  calculateBaziChart,
  calculateTenGod,
  getMainQi,
  BaziChart,
  DayBoundaryMode,
  Pillar,
  HiddenStemInfo,
} from '@openfate/bazi-engine';
import { calculateTrueSolarTime } from '@openfate/true-solar-time';
import baziEnginePkg from '@openfate/bazi-engine/package.json';
import trueSolarTimePkg from '@openfate/true-solar-time/package.json';
import { detectAllInteractions } from './interactions';
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
  getStandardOffsetMinutes,
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

  let rawHiddenStems = pillar.hiddenStems || [];
  // Normalize Si (巳) hidden stem ordering to classical 本气(丙) -> 中气(庚) -> 余气(戊)
  // for complete consistency across all Four Cardinal Branches (寅: 甲丙戊, 申: 庚壬戊, 巳: 丙庚戊, 亥: 壬甲).
  if (pillar.branch === '巳' && rawHiddenStems.length === 3) {
    const bing = rawHiddenStems.find(h => h.stem === '丙');
    const geng = rawHiddenStems.find(h => h.stem === '庚');
    const wu = rawHiddenStems.find(h => h.stem === '戊');
    if (bing && geng && wu) {
      rawHiddenStems = [bing, geng, wu];
    }
  }

  const hiddenStems = rawHiddenStems.map((h: HiddenStemInfo) => ({
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
  if (loc.mixedWarning) {
    warnings.push(loc.mixedWarning);
  }

  const sect = input.sect ?? 2;
  const dayBoundaryMode: DayBoundaryMode =
    sect === 1 ? 'MIDNIGHT_00' : 'ZI_HOUR_23';

  // 2. Resolve Date & Time inputs
  let localWall: WallDateTime;
  let beijingWall: WallDateTime;
  let instant: number;
  let offsetMinutes: number;
  let isDst: boolean;
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

  if (sect === 1 && baseHour === 23) {
    warnings.push('Late Zi hour (夜子时 23:00-23:59) with sect=1 (midnight rollover): day pillar remains the calendar day while hour stem follows the next day\'s rat-chasing formula (五鼠遁).');
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
      isDst = offsetMinutes > getStandardOffsetMinutes(instant, loc.timezone);
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
  let xinjiangNoteEmitted = false;
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
        xinjiangNoteEmitted = true;
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

  // 4. Check historical LMT / standard time approximation and regional nuances
  let historicalTzApprox = false;
  if (loc.timezone === 'Asia/Shanghai' && instant < Date.UTC(1901, 0, 1)) {
    historicalTzApprox = true;
    warnings.push('Before 1901, localities across China used Local Mean Time (Shanghai LMT was UTC+08:06); Beijing, Guangzhou, and other cities have a systematic offset of a few minutes.');
  } else if (Math.abs(offsetMinutes % 15) > 0.001 || (instant < Date.UTC(1890, 0, 1) && !isDst)) {
    historicalTzApprox = true;
    warnings.push('Historical timezone approximation: birth date precedes standard civil time zones. IANA tzdb models Local Mean Time (LMT) based on the zone\'s primary meridian, which may carry a minor regional offset before True Solar Time calculation.');
  }

  if (loc.timezone === 'Asia/Shanghai') {
    const isResolvedXinjiang = loc.province?.includes('Xinjiang') || loc.alternateTimezones?.includes('Asia/Urumqi');
    if (isResolvedXinjiang) {
      if (!xinjiangNoteEmitted) {
        warnings.push('Birth place is in Xinjiang region. While civil records standardise on Beijing Time (UTC+8), local oral records may use Xinjiang Time (UTC+6). If input clock time was recorded in Xinjiang local time, pass explicit `timezone: "Asia/Urumqi"`.');
      }
    } else if (!input.place && loc.longitude >= 73.5 && loc.longitude <= 96.4 && (loc.latitude ?? 40) >= 36.5 && (loc.latitude ?? 40) <= 49.2) {
      warnings.push('The coordinates fall in Western China (near Xinjiang border). While civil records standardise on Beijing Time (UTC+8), local oral records in Xinjiang may use Xinjiang Time (UTC+6). If the birth was recorded in Xinjiang local time, pass explicit `timezone: "Asia/Urumqi"`.');
    }
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
  //
  // solarTime is the three-way successor to the old trueSolar boolean, which
  // conflated two independent corrections. `trueSolar` is kept as a deprecated
  // alias (true -> 'true', false -> 'off'); the zod schema rejects the two
  // disagreeing. 'true' (both corrections) reproduces the exact old default
  // behavior; 'off' reproduces the exact old trueSolar:false behavior.
  const solarTimeMode: 'true' | 'mean' | 'off' =
    input.solarTime ?? (input.trueSolar === false ? 'off' : 'true');

  // Resolve standard (non-DST) offset for the birth instant by 13-point sampling.
  // This avoids upstream base meridian misattribution during historical base offset shifts (e.g. Moscow 1922, US War Time 1944).
  const standardOffsetMinutes = getStandardOffsetMinutes(instant, loc.timezone);
  const standardOffsetHours = standardOffsetMinutes / 60;
  const dstOffsetHours = isDst ? (offsetMinutes - standardOffsetMinutes) / 60 : 0;

  // Standard wall clock corresponds to civil wall time with DST offset removed
  const standardWall = toUTCWall(instant + standardOffsetMinutes * 60000);

  const axisBChart = (
    w: { year: number; month: number; day: number; hour: number; minute: number; second?: number },
    tzOffsetHours: number,
    enableTST: boolean
  ) =>
    calculateBaziChart({
      year: w.year,
      month: w.month,
      day: w.day,
      hour: w.hour,
      minute: w.minute,
      gender: input.gender,
      longitude: loc.longitude,
      timezone: tzOffsetHours,
      enableTrueSolarTime: enableTST,
      dayBoundaryMode,
    });

  // Resolves the wall clock (and whether the engine's own True Solar Time should
  // run) for a given solarTimeMode. 'true'/'off' pass the wall through unchanged
  // and let the engine apply both corrections or neither, exactly as the old
  // boolean did. 'mean' has no engine-level equivalent (it's all-or-nothing
  // there), so the longitude correction is applied here by hand -- reusing the
  // @openfate/true-solar-time package's own decomposed longitudeCorrectionMinutes
  // (a purely geometric function of longitude and the standard meridian, so it's
  // safe to compute at dstOffset=0 regardless of the actual DST state) -- and the
  // engine's True Solar Time is then disabled so it isn't corrected a second time.
  const resolveAxisBWall = (
    w: { year: number; month: number; day: number; hour: number; minute: number; second?: number },
    tzOffsetHours: number
  ): { wall: typeof w; enableTST: boolean } => {
    if (solarTimeMode !== 'mean') {
      return { wall: w, enableTST: solarTimeMode === 'true' };
    }
    const meanDetail = calculateTrueSolarTime(
      {
        year: w.year,
        month: w.month,
        day: w.day,
        hour: w.hour,
        minute: w.minute,
        second: w.second ?? 0,
        timeZoneOffset: tzOffsetHours,
        dstOffset: 0,
      },
      { longitude: loc.longitude }
    );
    const shifted = toUTCWall(
      Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second ?? 0) +
        meanDetail.longitudeCorrectionMinutes * 60000
    );
    return { wall: shifted, enableTST: false };
  };

  const { wall: axisBWall, enableTST: axisBEnableTST } = resolveAxisBWall(standardWall, standardOffsetHours);
  const B = axisBChart(axisBWall, standardOffsetHours, axisBEnableTST);

  // Extract Solar Time details via @openfate/true-solar-time using standard offset + DST offset
  //
  // Antimeridian convention: for a birth near the antimeridian (e.g. Chatham
  // Islands, longitude ~-176.5 at UTC+12:45), the underlying true-solar-time
  // library wraps the longitude correction by 360° (so an unwrapped
  // ~-1471 minute correction against the standard meridian comes back as
  // ~-31), rather than shifting the sub-solar date a full day. The day
  // pillar therefore follows the civil date at the birth location, not the
  // (much earlier) sub-solar date. This is a deliberate, if
  // undocumented-upstream, convention -- not a bug -- and matches what
  // other implementations do in practice.
  const solarTimeDetail = calculateTrueSolarTime(
    {
      year: localWall.year,
      month: localWall.month,
      day: localWall.day,
      hour: localWall.hour,
      minute: localWall.minute,
      second: localWall.second ?? 0,
      timeZoneOffset: standardOffsetHours,
      dstOffset: dstOffsetHours,
    },
    { longitude: loc.longitude }
  );

  if (Math.abs(solarTimeDetail.longitudeCorrectionMinutes) > 240) {
    warnings.push(
      `Astronomical sanity warning: longitude correction (${solarTimeDetail.longitudeCorrectionMinutes.toFixed(1)} min) exceeds ±240 minutes relative to the timezone standard meridian (${loc.timezone}). Please verify that the specified longitude and timezone belong to the same geographic region.`
    );
  }

  if (solarTimeMode === 'off' && Math.abs(solarTimeDetail.longitudeCorrectionMinutes) > 30) {
    warnings.push(
      `solarTime is "off" (trueSolar: false): a longitude correction of ${solarTimeDetail.longitudeCorrectionMinutes.toFixed(1)} minutes was NOT applied; the hour pillar (and possibly the day pillar) may differ from a true-solar-time chart.`
    );
  }

  // 7. Shichen Ambiguity Check (if shichen was passed)
  let shichenAmbiguityDiag: DiagnosticsOutput['shichenAmbiguity'] = undefined;
  if (input.shichen && !input.clockTime && !input.timeUnknown) {
    const samplePoints = getShichenSamplePoints(input.shichen);
    const candidateHourPillars = new Set<string>();

    // A gap (spring-forward) and a fold (fall-back) both make a bare sample
    // point throw, but they mean opposite things: a gap wall time doesn't
    // exist, so skipping is correct; a fold wall time exists twice, so
    // skipping would silently drop exactly the candidate this block exists
    // to enumerate. If the caller already disambiguated via `input.dstFold`,
    // honor that and sample only the occurrence they meant. Otherwise, try
    // both fold occurrences for each sample point: `wallToInstant` ignores
    // `dstFold` whenever there's only one candidate (ordinary day, or a
    // gap), so this is a no-op there and the `Set` below dedupes; on a fold
    // it yields both hour pillars.
    const foldsToTry: Array<0 | 1 | undefined> =
      input.dstFold !== undefined ? [input.dstFold] : [0, 1];

    for (const pt of samplePoints) {
      for (const fold of foldsToTry) {
        try {
          const sampleWRes = wallToInstant(
            {
              year: localWall.year,
              month: localWall.month,
              day: localWall.day,
              hour: pt.hour,
              minute: pt.minute,
            },
            loc.timezone,
            fold
          );

          const sampleStdOffsetMinutes = getStandardOffsetMinutes(sampleWRes.instant, loc.timezone);
          const sampleStdWall = toUTCWall(sampleWRes.instant + sampleStdOffsetMinutes * 60000);
          const sampleResolved = resolveAxisBWall(sampleStdWall, sampleStdOffsetMinutes / 60);
          const sampleB = axisBChart(sampleResolved.wall, sampleStdOffsetMinutes / 60, sampleResolved.enableTST);

          if (sampleB.pillars.hour) {
            candidateHourPillars.add(sampleB.pillars.hour.ganZhi);
          }
        } catch {
          // Gap: this occurrence doesn't exist, skip it.
        }
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
    startDate: `${A.daYun.startDate} (Asia/Shanghai)`,
    startOffset: A.daYun.startOffset,
    cycles: daYunCycles,
  };

  // 10. Detect all stem & branch interactions across the synthesized 4 pillars
  const interactions = detectAllInteractions({
    year: yearPillar.branch,
    month: monthPillar.branch,
    day: dayPillar.branch,
    hour: hourPillar ? hourPillar.branch : '',
    yearStem: yearPillar.stem,
    monthStem: monthPillar.stem,
    dayStem: dayPillar.stem,
    hourStem: hourPillar ? hourPillar.stem : undefined,
  });

  // 11. Assemble Diagnostics Block
  const wallStr = `${localWall.year}-${String(localWall.month).padStart(2, '0')}-${String(localWall.day).padStart(2, '0')} ${String(localWall.hour).padStart(2, '0')}:${String(localWall.minute).padStart(2, '0')} (${loc.timezone})`;
  const offsetStr = formatOffsetString(offsetMinutes, isDst);
  const utcInstantStr = new Date(instant).toISOString();
  const axisAStr = `${beijingWallForA.year}-${String(beijingWallForA.month).padStart(2, '0')}-${String(beijingWallForA.day).padStart(2, '0')} ${String(beijingWallForA.hour).padStart(2, '0')}:${String(beijingWallForA.minute).padStart(2, '0')}`;
  // The diagnostic must report the local solar time actually fed to Axis B's
  // day/hour pillar calculation, not always the full true-solar-time value:
  // - 'true': the engine applies longitude + equation of time internally, so
  //   solarTimeDetail.trueSolarDateTime (computed the same way) is correct.
  // - 'mean'/'off': `axisBWall` (longitude-only shift, or the raw standard
  //   wall clock, respectively) is passed straight through with the engine's
  //   own True Solar Time disabled, so `axisBWall` IS the value used.
  const axisBStr = solarTimeMode === 'true'
    ? solarTimeDetail.trueSolarDateTime
    : `${axisBWall.year}-${String(axisBWall.month).padStart(2, '0')}-${String(axisBWall.day).padStart(2, '0')} ${String(axisBWall.hour).padStart(2, '0')}:${String(axisBWall.minute).padStart(2, '0')}:${String(axisBWall.second ?? 0).padStart(2, '0')}`;

  const diagnostics: DiagnosticsOutput = {
    wallClock: wallStr,
    utcOffset: offsetStr,
    utcInstant: utcInstantStr,
    axisA_beijingWallClock_yearMonthPillars: axisAStr,
    axisB_localSolarTime_dayHourPillars: axisBStr,
    longitudeCorrectionMinutes: Number(solarTimeDetail.longitudeCorrectionMinutes.toFixed(2)),
    equationOfTimeMinutes: Number(solarTimeDetail.equationOfTimeMinutes.toFixed(2)),
    lunar: lunarDiag,
    convention: {
      sect,
      solarTime: solarTimeMode,
      childLimitProvider: 'three_days_one_year_shichen_quantized',
      ageBasis: 'nominal',
    },
    shichenAmbiguity: shichenAmbiguityDiag,
    timezoneResolution: tzAmbiguityDiag,
    historicalTzApprox,
    locationSource: loc.locationSource,
    warnings,
    engineInfo: {
      baziEngine: `@openfate/bazi-engine@${baziEnginePkg.version}`,
      trueSolarTimeEngine: `@openfate/true-solar-time@${trueSolarTimePkg.version}`,
      schemaVersion: '3.0.0',
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
