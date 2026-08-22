export type {
  ShichenBranch,
  SolarDateInput,
  LunarDateInput,
  ClockTimeInput,
  BaziInput,
  ValidatedBaziInput,
  LookupLocationInput,
} from './schemas/input';

export interface WallDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface PillarOutput {
  stem: string;
  branch: string;
  ganZhi: string;
  element: string;
  stemTenGod?: string;
  branchTenGod?: string;
  hiddenStems: Array<{
    stem: string;
    element: string;
    tenGod: string;
    isMain: boolean;
  }>;
  naYin?: string;
  xun?: string;
  voidBranches?: string[];
}

export interface DaYunCycleOutput {
  index: number;
  stem: string;
  branch: string;
  ganZhi: string;
  startYear: number;
  startAgeNominal: number; // nominal age (startAge + 1)
  // Whole years only (floor), not a precise age — see `startOffset` for the
  // actual years/months/days/hours precision.
  startAgeInWholeYears: number;
  endYear: number;
  endAgeNominal: number;
  stemTenGod: string;
  branchTenGod: string;
}

export interface DaYunOutput {
  isForward: boolean;
  startYear: number;
  startAgeNominal: number;
  startDate: string;
  startOffset: {
    years: number;
    months: number;
    days: number;
    hours: number;
  };
  cycles: DaYunCycleOutput[];
}

export interface BranchInteractionOutput {
  type: string;
  branches?: string[];
  stems?: string[];
  pillars: string[];
  potentialElement?: string;
  transformed?: boolean | null;
  description: string;
  transformNote?: string;
}

export interface DiagnosticsOutput {
  wallClock: string;
  utcOffset: string;
  utcInstant: string;
  axisA_beijingWallClock_yearMonthPillars: string;
  axisB_localSolarTime_dayHourPillars: string;
  longitudeCorrectionMinutes: number;
  equationOfTimeMinutes: number;
  lunar?: {
    inputFrame: 'local' | 'beijing';
    convertedSolarDate: string;
    beijingSolarDate: string;
    lunarDescription?: string;
  };
  convention: {
    sect: 1 | 2;
    /**
     * Resolved solar time correction mode: 'true' (longitude + equation of
     * time, the default), 'mean' (longitude only, 地方平太阳时), or 'off'
     * (neither). Supersedes the old `trueSolar` boolean, which could not
     * express the 'mean' case; see `BaziInput.solarTime`.
     */
    solarTime: 'true' | 'mean' | 'off';
    childLimitProvider: string;
    ageBasis: string;
  };
  shichenAmbiguity?: {
    isAmbiguous: boolean;
    candidateHourPillars: string[];
  };
  timezoneResolution?: {
    used: string;
    candidates: string[];
    maxOffsetDiffHours: number;
    note: string;
  };
  historicalTzApprox?: boolean;
  locationSource?: 'resolved' | 'caller_supplied' | 'mixed';
  /**
   * Present only when `timeUnknown: true` and a pillar isn't determined by
   * the date alone (typically a solar term, e.g. 立春, falling within the
   * day). Each entry holds the two candidate `ganZhi` values, one per end of
   * the local day. Absent when every pillar agrees across the whole day.
   */
  pillarCandidates?: {
    year?: [string, string];
    month?: [string, string];
    day?: [string, string];
  };
  /**
   * The 早子時 hour (23:00-24:00) rolls the day pillar to the next calendar
   * day on every date, so an unknown birth time always leaves it open. Unlike
   * `pillarCandidates` this is deliberately ASYMMETRIC: `pillars.day` holds
   * the value 23 of the day's 24 hours produce, and this names the one the
   * remaining hour produces, with that window.
   */
  dayPillarAlternative?: {
    ganZhi: string;
    window: string;
  };
  warnings: string[];
  engineInfo: {
    baziEngine: string;
    trueSolarTimeEngine: string;
    schemaVersion: string;
  };
}

export interface MonthOrderFactOutput {
  monthBranch: string;
  mainQiStem: string;
  mainQiElement: string;
  tenGod: string;
  relation: string; // 同我 | 生我 | 我生 | 我克 | 克我
  wangXiangXiuQiuSi: string; // 旺 | 相 | 休 | 囚 | 死
  twelveStage: string;
}

export interface RootFactOutput {
  pillar: 'year' | 'month' | 'day' | 'hour';
  branch: string;
  rootLevel: '本气' | '中气' | '余气' | '无';
  rootStem: string | null;
  /**
   * Every label this branch earns for the day stem. A list, not one value:
   * a branch can qualify more than once, and 墓库根 is decided by what the
   * branch HIDES rather than by the twelve-stage position -- the two diverge
   * for yin stems, which run the cycle backward.
   */
  tags: ('禄' | '刃' | '长生' | '墓库根')[];
}

export interface StemSupportFactOutput {
  pillar: 'year' | 'month' | 'hour';
  stem: string;
  tenGod: string;
  direction: string; // 帮 | 生 | 泄 | 耗 | 克
}

export interface StrengthFactorsOutput {
  monthOrder: MonthOrderFactOutput;
  roots: RootFactOutput[];
  stemSupport: StemSupportFactOutput[];
  counts: { helpers: number; drains: number };
  tableNote: string;
}

export interface StrengthAssessmentOutput {
  score: number;
  /** Literal union, not `string`: the three verdicts are the whole API surface
   * of this field, and a consumer branching on them should get an exhaustive
   * check rather than a stringly-typed guess. */
  verdict: '身强' | '身弱' | '中和';
  /** '临界' when the score sits within 0.5 of the threshold -- present both
   * readings to the user rather than the verdict alone. */
  margin: '临界' | null;
  /** Which way a 中和 chart leans. Null for a decisive verdict. */
  lean: '偏强' | '偏弱' | null;
  method: string;
}

export interface BaziCalculationResult {
  fourPillars: string;
  pillars: {
    year: PillarOutput;
    month: PillarOutput;
    day: PillarOutput;
    hour: PillarOutput | null;
  };
  dayMaster: {
    char: string;
    pinyin: string;
    element: string;
    polarity: string;
  };
  daYun: DaYunOutput;
  interactions: BranchInteractionOutput[];
  diagnostics: DiagnosticsOutput;
  // Only present when the hour pillar is known -- an unknown birth hour
  // (`timeUnknown: true`) must not silently score strength from a fabricated
  // hour, so both fields are simply absent rather than computed from a guess.
  strengthFactors?: StrengthFactorsOutput;
  strengthAssessment?: StrengthAssessmentOutput;
}

export interface CityEntry {
  name: string;
  country: string;
  province?: string;
  longitude: number;
  latitude: number;
  timezone: string;
  alternateTimezones?: string[];
}
