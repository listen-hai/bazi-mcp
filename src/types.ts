export type ShichenBranch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

export interface SolarDateInput {
  year: number;
  month: number;
  day: number;
}

export interface LunarDateInput {
  year: number;
  month: number;
  day: number;
  isLeapMonth?: boolean;
}

export interface ClockTimeInput {
  hour: number;
  minute: number;
  second?: number;
}

export interface BaziInput {
  // Place of birth
  place?: string;
  longitude?: number;
  timezone?: string;

  // Date
  solarDate?: SolarDateInput;
  lunarDate?: LunarDateInput;
  lunarDateFrame?: 'local' | 'beijing';

  // Time
  clockTime?: ClockTimeInput;
  shichen?: ShichenBranch;
  timeUnknown?: boolean;

  // DST disambiguation (0 = first occurrence / DST, 1 = second occurrence / Standard)
  dstFold?: 0 | 1;

  // Gender
  gender: 'male' | 'female';

  // School switches
  sect?: 1 | 2; // 1 = early/late zi hour (default 1, 00:00 midnight rollover), 2 = 23:00 rollover
  trueSolar?: boolean; // default true
  childLimitProvider?: 'default' | 'china95' | 'season' | 'lunarSect1';
}

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
  startAgeNominal: number; // 虚岁 (startAge + 1)
  startAgeExact: number;   // 周岁
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
  钟面: string;
  时区偏移: string;
  UTC瞬时: string;
  轴A_北京墙钟_定年月柱: string;
  轴B_当地真太阳时_定日时柱: string;
  经度修正分钟: number;
  时差方程分钟: number;
  农历?: {
    输入frame: 'local' | 'beijing';
    换算公历: string;
    北京同日: string;
    农历描述?: string;
  };
  口径: {
    sect: 1 | 2;
    trueSolar: boolean;
    childLimitProvider: string;
    年龄基准: string;
  };
  时辰歧义?: {
    isAmbiguous: boolean;
    候选时柱: string[];
  };
  historicalTzApprox?: boolean;
  警告: string[];
  引擎信息: {
    baziEngine: string;
    trueSolarTimeEngine: string;
    schemaVersion: string;
  };
}

export interface BaziCalculationResult {
  四柱: string;
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
  诊断: DiagnosticsOutput;
}

export interface CityEntry {
  name: string;
  chineseName?: string;
  pinyin?: string;
  country: string;
  province?: string;
  longitude: number;
  latitude: number;
  timezone: string;
  aliases?: string[];
}
