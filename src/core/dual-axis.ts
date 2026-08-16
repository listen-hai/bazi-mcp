import {
  calculateBaziChart,
  calculateTenGod,
  detectInteractions,
  BaziChart,
  DayBoundaryMode,
  Pillar,
  HiddenStemInfo,
  BranchInteraction
} from '@openfate/bazi-engine';
import { getTrueSolarTimeFromInstant } from '@openfate/true-solar-time';
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
} from './time';
import { resolveLocation } from '../geo/resolver';
import { getShichenMidpoint, getShichenSamplePoints } from './shichen';

/**
 * Normalizes pillar output and computes Ten Gods against the true Day Master.
 */
function formatPillar(
  pillar: Pillar | null | undefined,
  dayMasterStem: string
): PillarOutput {
  if (!pillar) {
    return {
      stem: '',
      branch: '',
      ganZhi: '',
      element: '',
    };
  }

  const stemTenGod = pillar.stem === dayMasterStem ? '日主' : calculateTenGod(pillar.stem, dayMasterStem);

  const hiddenStems = (pillar.hiddenStems || []).map((h: HiddenStemInfo) => ({
    stem: h.stem,
    element: h.element,
    tenGod: calculateTenGod(h.stem, dayMasterStem),
    isMain: h.isMain,
  }));

  const mainHidden = hiddenStems.find(h => h.isMain);
  const branchTenGod = mainHidden ? mainHidden.tenGod : (pillar as { branchTenGod?: string }).branchTenGod;

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
  let lunarDiag: DiagnosticsOutput['农历'] = undefined;

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
    throw new Error('缺少时刻信息：请提供 `clockTime` (钟表时间)、`shichen` (时辰) 或设置 `timeUnknown: true` (三柱盘)。');
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
      throw new Error(`农历日期换算失败: ${(err as Error).message}`);
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

      const wRes = wallToInstant(localWall, loc.timezone, input.dstFold);
      instant = wRes.instant;
      offsetMinutes = wRes.offsetMinutes;
      isDst = wRes.isDst;

      beijingWall = instantToWall(instant, 'Asia/Shanghai');
    } else {
      // Beijing frame: The solar date corresponds to Beijing calendar
      const beijingNaive = Date.UTC(convSolar.year, convSolar.month - 1, convSolar.day, baseHour, baseMinute, 0);
      instant = beijingNaive - 8 * 3600000;
      beijingWall = {
        year: convSolar.year,
        month: convSolar.month,
        day: convSolar.day,
        hour: baseHour,
        minute: baseMinute,
        second: 0,
      };

      localWall = instantToWall(instant, loc.timezone);
      offsetMinutes = tzOffsetMinutes(instant, loc.timezone);
      const janOffset = tzOffsetMinutes(Date.UTC(localWall.year, 0, 15, 12, 0), loc.timezone);
      const julOffset = tzOffsetMinutes(Date.UTC(localWall.year, 6, 15, 12, 0), loc.timezone);
      isDst = offsetMinutes > Math.min(janOffset, julOffset);
    }

    const localSolarStr = `${localWall.year}-${String(localWall.month).padStart(2, '0')}-${String(localWall.day).padStart(2, '0')}`;
    const beijingSolarStr = `${beijingWall.year}-${String(beijingWall.month).padStart(2, '0')}-${String(beijingWall.day).padStart(2, '0')}`;

    lunarDiag = {
      输入frame: lFrame,
      换算公历: localSolarStr,
      北京同日: beijingSolarStr,
      农历描述: `${input.lunarDate.year}年${input.lunarDate.isLeapMonth ? '闰' : ''}${input.lunarDate.month}月${input.lunarDate.day}日`,
    };

    if (localSolarStr !== beijingSolarStr) {
      if (lFrame === 'local') {
        warnings.push('当地日期与北京日期不同；若农历系按中国日期记录请改用 frame=beijing');
      } else {
        warnings.push('北京日期与当地日期不同；当前已按中国公历日基准换算当地时刻。');
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

    const wRes = wallToInstant(localWall, loc.timezone, input.dstFold);
    instant = wRes.instant;
    offsetMinutes = wRes.offsetMinutes;
    isDst = wRes.isDst;

    beijingWall = instantToWall(instant, 'Asia/Shanghai');
  } else {
    throw new Error('缺少日期信息：请提供 `solarDate` (公历) 或 `lunarDate` (农历)。');
  }

  // 4. Check historical Shanghai/China approximation (pre-1901)
  let historicalTzApprox = false;
  if (loc.timezone === 'Asia/Shanghai' && instant < Date.UTC(1901, 0, 1)) {
    historicalTzApprox = true;
    warnings.push('1901年前中国各地采用地方平时（上海LMT为UTC+08:06），北京/广州等地存在数分钟系统偏差。');
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
  const B = calculateBaziChart({
    year: localWall.year,
    month: localWall.month,
    day: localWall.day,
    hour: localWall.hour,
    minute: localWall.minute,
    gender: input.gender,
    longitude: loc.longitude,
    timezoneId: loc.timezone,
    enableTrueSolarTime: enableTrueSolar,
    dayBoundaryMode,
  });

  // Extract Solar Time details via @openfate/true-solar-time from instant directly
  const solarTimeDetail = getTrueSolarTimeFromInstant(
    { date: new Date(instant), timeZoneId: loc.timezone },
    { longitude: loc.longitude }
  );

  // 7. Shichen Ambiguity Check (if shichen was passed)
  let shichenAmbiguityDiag: DiagnosticsOutput['时辰歧义'] = undefined;
  if (input.shichen && !input.clockTime && !input.timeUnknown) {
    const samplePoints = getShichenSamplePoints(input.shichen);
    const candidateHourPillars = new Set<string>();

    for (const pt of samplePoints) {
      try {
        const sampleInstantRes = wallToInstant(
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

        const sampleB = calculateBaziChart({
          year: localWall.year,
          month: localWall.month,
          day: localWall.day,
          hour: pt.hour,
          minute: pt.minute,
          gender: input.gender,
          longitude: loc.longitude,
          timezoneId: loc.timezone,
          enableTrueSolarTime: enableTrueSolar,
          dayBoundaryMode,
        });

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
        候选时柱: Array.from(candidateHourPillars),
      };
      warnings.push(
        `提供的时辰为"${input.shichen}时"，经真太阳时与经度修正后跨越时辰边界，该区间内存在多个候选时柱: ${Array.from(
          candidateHourPillars
        ).join('、')}。建议核对具体钟表时刻。`
      );
    }
  }

  // 8. Synthesize Four Pillars & Ten Gods
  const trueDayMasterStem = B.pillars.day.stem;
  const dayMaster = B.dayMaster;

  const yearPillar = formatPillar(A.pillars.year, trueDayMasterStem);
  const monthPillar = formatPillar(A.pillars.month, trueDayMasterStem);
  const dayPillar = formatPillar(B.pillars.day, trueDayMasterStem);
  const hourPillar = isUnknownTime ? null : formatPillar(B.pillars.hour, trueDayMasterStem);

  const fourPillarsStr = isUnknownTime
    ? `${yearPillar.ganZhi} ${monthPillar.ganZhi} ${dayPillar.ganZhi} [时辰未知]`
    : `${yearPillar.ganZhi} ${monthPillar.ganZhi} ${dayPillar.ganZhi} ${hourPillar!.ganZhi}`;

  // 9. Format Da Yun (strictly from Axis A) with nominal age (虚岁)
  const daYunCycles = A.daYun.cycles.map(c => ({
    index: c.index,
    stem: c.stem,
    branch: c.branch,
    ganZhi: c.ganZhi,
    startYear: c.startYear,
    startAgeNominal: c.startAge + 1, // 虚岁
    startAgeExact: c.startAge,       // 周岁
    endYear: c.endYear,
    endAgeNominal: c.endAge + 1,
    stemTenGod: calculateTenGod(c.stem, trueDayMasterStem),
    branchTenGod: c.branchTenGod,
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
    钟面: wallStr,
    时区偏移: offsetStr,
    UTC瞬时: utcInstantStr,
    轴A_北京墙钟_定年月柱: axisAStr,
    轴B_当地真太阳时_定日时柱: axisBStr,
    经度修正分钟: Number(solarTimeDetail.longitudeCorrectionMinutes.toFixed(2)),
    时差方程分钟: Number(solarTimeDetail.equationOfTimeMinutes.toFixed(2)),
    农历: lunarDiag,
    口径: {
      sect: input.sect === 2 ? 2 : 1,
      trueSolar: enableTrueSolar,
      childLimitProvider: input.childLimitProvider || 'default',
      年龄基准: '虚岁',
    },
    时辰歧义: shichenAmbiguityDiag,
    historicalTzApprox,
    警告: warnings,
    引擎信息: {
      baziEngine: '@openfate/bazi-engine@1.1.2',
      trueSolarTimeEngine: '@openfate/true-solar-time@4.0.2',
      schemaVersion: '1.0.0',
    },
  };

  return {
    四柱: fourPillarsStr,
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
    诊断: diagnostics,
  };
}
