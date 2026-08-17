import { z } from 'zod';

export const ShichenEnum = z.enum([
  '子', '丑', '寅', '卯', '辰', '巳',
  '午', '未', '申', '酉', '戌', '亥',
]);

export const SolarDateSchema = z.object({
  year: z.number().int().min(1700).max(2200).describe('Solar (Gregorian) year (1700-2200)'),
  month: z.number().int().min(1).max(12).describe('Solar (Gregorian) month (1-12)'),
  day: z.number().int().min(1).max(31).describe('Solar (Gregorian) day (1-31)'),
});

export const LunarDateSchema = z.object({
  year: z.number().int().min(1700).max(2200).describe('Lunar year (1700-2200)'),
  month: z.number().int().min(1).max(12).describe('Lunar month (1-12)'),
  day: z.number().int().min(1).max(30).describe('Lunar day (1-30)'),
  isLeapMonth: z.boolean().optional().describe('Whether this is a leap month (e.g. pass true for a leap 4th month)'),
});

export const ClockTimeSchema = z.object({
  hour: z.number().int().min(0).max(23).describe('Clock hour (0-23)'),
  minute: z.number().int().min(0).max(59).describe('Clock minute (0-59)'),
  second: z.number().int().min(0).max(59).optional().describe('Clock second (0-59)'),
});

export const BaziInputSchema = z.object({
  // Birth location
  place: z.string().optional().describe('Birth city name in English, e.g. "Beijing", "New York", "Tacoma, WA"'),
  longitude: z.number().min(-180).max(180).optional().describe('Birth location longitude (positive = East, negative = West), e.g. 116.4074 or -122.4443'),
  timezone: z.string().optional().describe('IANA timezone name, e.g. "Asia/Shanghai", "America/Los_Angeles"'),

  // Date (choose one)
  solarDate: SolarDateSchema.optional().describe('Solar (Gregorian) birth date'),
  lunarDate: LunarDateSchema.optional().describe('Lunar (Chinese calendar) birth date'),
  lunarDateFrame: z.enum(['local', 'beijing']).optional().default('local').describe('Lunar date timezone reference: local (default, matches the local solar date at the birth place) or beijing (matches the Beijing solar date)'),

  // Time (choose one of three)
  clockTime: ClockTimeSchema.optional().describe('Clock time of birth (precise time preferred)'),
  shichen: ShichenEnum.optional().describe('Traditional Chinese double-hour (子/丑/寅/卯/辰/巳/午/未/申/酉/戌/亥)'),
  timeUnknown: z.boolean().optional().describe('Birth time unknown (produces a 3-pillar chart)'),

  // DST disambiguation
  dstFold: z.union([z.literal(0), z.literal(1)]).optional().describe('DST fall-back disambiguation: 0 = first occurrence (DST), 1 = second occurrence (standard time)'),

  // Gender and charting convention
  gender: z.enum(['male', 'female']).describe('Gender: male or female'),
  sect: z.union([z.literal(1), z.literal(2)]).optional().default(1).describe('Early/late Zi-hour convention: 1 (default, day rolls over at 00:00) or 2 (day rolls over at 23:00)'),
  trueSolar: z.boolean().optional().default(true).describe('Whether to apply True Solar Time correction (default true)'),
  childLimitProvider: z.enum(['default', 'china95', 'season', 'lunarSect1']).optional().default('default').describe('Da Yun (luck pillar) onset calculation convention'),
}).refine(
  data => data.solarDate || data.lunarDate,
  { message: 'Must provide either solarDate or lunarDate.' }
).refine(
  data => !(data.solarDate && data.lunarDate),
  { message: 'Cannot provide both solarDate and lunarDate; please provide only one.' }
).refine(
  data => data.clockTime || data.shichen || data.timeUnknown,
  { message: 'Must provide one of clockTime, shichen, or timeUnknown: true.' }
).refine(
  data => !(data.clockTime && data.shichen),
  { message: 'Cannot provide both clockTime and shichen; please provide only one.' }
).refine(
  data => data.place || (data.longitude !== undefined && data.timezone),
  { message: 'Must provide place, or both longitude and timezone.' }
);

export const LookupLocationSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty').describe('City name in English, e.g. "Tokyo", "London", "San Francisco"'),
});

export type ShichenBranch = z.infer<typeof ShichenEnum>;
export type SolarDateInput = z.input<typeof SolarDateSchema>;
export type LunarDateInput = z.input<typeof LunarDateSchema>;
export type ClockTimeInput = z.input<typeof ClockTimeSchema>;
export type BaziInput = z.input<typeof BaziInputSchema>;
export type ValidatedBaziInput = z.output<typeof BaziInputSchema>;
export type LookupLocationInput = z.input<typeof LookupLocationSchema>;
