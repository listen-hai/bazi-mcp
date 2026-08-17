import { z } from 'zod';

export const ShichenEnum = z.enum([
  '子', '丑', '寅', '卯', '辰', '巳',
  '午', '未', '申', '酉', '戌', '亥',
]);

export const SolarDateSchema = z.object({
  year: z.number().int().min(1700).max(2200).describe('公历年份 (1700-2200)'),
  month: z.number().int().min(1).max(12).describe('公历月份 (1-12)'),
  day: z.number().int().min(1).max(31).describe('公历日期 (1-31)'),
});

export const LunarDateSchema = z.object({
  year: z.number().int().min(1700).max(2200).describe('农历年份 (1700-2200)'),
  month: z.number().int().min(1).max(12).describe('农历月份 (1-12)'),
  day: z.number().int().min(1).max(30).describe('农历日期 (1-30)'),
  isLeapMonth: z.boolean().optional().describe('是否为闰月 (如闰四月传 true)'),
});

export const ClockTimeSchema = z.object({
  hour: z.number().int().min(0).max(23).describe('钟表小时 (0-23)'),
  minute: z.number().int().min(0).max(59).describe('钟表分钟 (0-59)'),
  second: z.number().int().min(0).max(59).optional().describe('钟表秒数 (0-59)'),
});

export const BaziInputSchema = z.object({
  // 出生地
  place: z.string().optional().describe('Birth city name in English, e.g. "Beijing", "New York", "Tacoma, WA"'),
  longitude: z.number().min(-180).max(180).optional().describe('出生地经度（东经为正，西经为负），如 116.4074 或 -122.4443'),
  timezone: z.string().optional().describe('IANA 时区名称，如 "Asia/Shanghai"、"America/Los_Angeles"'),

  // 日期（二选一）
  solarDate: SolarDateSchema.optional().describe('公历出生日期'),
  lunarDate: LunarDateSchema.optional().describe('农历出生日期'),
  lunarDateFrame: z.enum(['local', 'beijing']).optional().default('local').describe('农历时区参照：local (默认，按当地公历日对应农历) 或 beijing (按北京公历日)'),

  // 时刻（三选一）
  clockTime: ClockTimeSchema.optional().describe('钟表时刻 (推荐精确提供)'),
  shichen: ShichenEnum.optional().describe('传统十二时辰 (子/丑/寅/卯/辰/巳/午/未/申/酉/戌/亥)'),
  timeUnknown: z.boolean().optional().describe('时辰未知 (排三柱盘)'),

  // 夏令时消歧
  dstFold: z.union([z.literal(0), z.literal(1)]).optional().describe('夏令时秋季折返消歧：0 = 第一次出现 (夏令时)，1 = 第二次出现 (标准时)'),

  // 性别与排盘口径
  gender: z.enum(['male', 'female']).describe('性别：male (乾造/男) 或 female (坤造/女)'),
  sect: z.union([z.literal(1), z.literal(2)]).optional().default(1).describe('早晚子时口径：1 (默认，00:00 换日) 或 2 (23:00 换日)'),
  trueSolar: z.boolean().optional().default(true).describe('是否开启真太阳时校正 (默认 true)'),
  childLimitProvider: z.enum(['default', 'china95', 'season', 'lunarSect1']).optional().default('default').describe('起运算法口径'),
}).refine(
  data => data.solarDate || data.lunarDate,
  { message: '必须提供 solarDate (公历) 或 lunarDate (农历) 之一。' }
).refine(
  data => !(data.solarDate && data.lunarDate),
  { message: '不能同时提供 solarDate (公历) 与 lunarDate (农历)，请只提供其中之一。' }
).refine(
  data => data.clockTime || data.shichen || data.timeUnknown,
  { message: '必须提供 clockTime、shichen 或设置 timeUnknown: true 之一。' }
).refine(
  data => !(data.clockTime && data.shichen),
  { message: '不能同时提供 clockTime (钟表时间) 与 shichen (时辰)，请只提供其中之一。' }
).refine(
  data => data.place || (data.longitude !== undefined && data.timezone),
  { message: '必须提供 place，或同时提供 longitude 与 timezone。' }
);

export const LookupLocationSchema = z.object({
  query: z.string().min(1, '搜索词不能为空').describe('City name in English, e.g. "Tokyo", "London", "San Francisco"'),
});

export type ShichenBranch = z.infer<typeof ShichenEnum>;
export type SolarDateInput = z.input<typeof SolarDateSchema>;
export type LunarDateInput = z.input<typeof LunarDateSchema>;
export type ClockTimeInput = z.input<typeof ClockTimeSchema>;
export type BaziInput = z.input<typeof BaziInputSchema>;
export type ValidatedBaziInput = z.output<typeof BaziInputSchema>;
export type LookupLocationInput = z.input<typeof LookupLocationSchema>;
