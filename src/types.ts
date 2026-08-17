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
  时区口径?: {
    使用: string;
    候选时区: string[];
    时差小时: number;
    说明: string;
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
  country: string;
  province?: string;
  longitude: number;
  latitude: number;
  timezone: string;
  alternateTimezones?: string[];
}
