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
  hiddenStems?: Array<{
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
  startAgeExact: number;   // exact age
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
  branches: string[];
  pillars: string[];
  resultElement?: string;
  description: string;
}

export interface DiagnosticsOutput {
  wallClock: string;
  utcOffset: string;
  utcInstant: string;
  axisA_beijingWallClock_yearMonthPillars: string;
  axisB_localTrueSolarTime_dayHourPillars: string;
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
    trueSolar: boolean;
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
  warnings: string[];
  engineInfo: {
    baziEngine: string;
    trueSolarTimeEngine: string;
    schemaVersion: string;
  };
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
  shenSha?: Record<string, string[]>;
  diagnostics: DiagnosticsOutput;
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
