import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { BaziInputSchema, LookupLocationSchema } from '../schemas/input';
import { calculateDualAxisBazi } from '../core/dual-axis';
import { lookupCity, lookupCityWithCount, LocationError } from '../geo/resolver';
import { BaziInput } from '../types';
import rootPkg from '../../package.json';

// case a single issue's own message is huge (e.g. a long echoed value).
const MAX_REPORTED_ISSUES = 8;
const MAX_ERROR_MESSAGE_LENGTH = 4000;

// Zod issue paths are dropped here in the old code, so the LLM caller sees a bare
// "Required" or "Expected number, received string" with no field name — even
// though the path (e.g. ["solarDate", "day"]) is right there on the issue. Prefix
// it when present. The hand-written `.strict().refine(...)` messages in
// schemas/input.ts (e.g. "Must provide either solarDate or lunarDate.") attach to
// the whole object and carry an empty path — leave those bare rather than
// prefixing a stray ": " separator onto an already-readable sentence.
export function formatZodError(err: z.ZodError): string {
  const formatted = err.issues.map(i =>
    i.path.length > 0 ? `${i.path.join('.')}: ${i.message}` : i.message
  );
  const shown = formatted.slice(0, MAX_REPORTED_ISSUES);
  const omitted = formatted.length - shown.length;
  let msg = shown.join('; ');
  if (omitted > 0) msg += `; …and ${omitted} more validation errors`;
  if (msg.length > MAX_ERROR_MESSAGE_LENGTH) {
    msg = `${msg.slice(0, MAX_ERROR_MESSAGE_LENGTH)}… (truncated)`;
  }
  return msg;
}

export function createBaziMcpServer(): Server {
  const server = new Server(
    {
      name: 'bazi-mcp',
      version: rootPkg.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const tools: Tool[] = [
    {
      name: 'calculate_bazi',
      // Every tool here reads bundled tables and computes: nothing is written,
      // nothing is fetched. All four hints are stated even though the spec
      // calls destructiveHint/idempotentHint meaningful only when readOnlyHint
      // is false -- "ignorable" is not "wrong", every value here is known to be
      // true of a pure calculation, and at least one directory is reported to
      // reject tools that leave any of the four unset. openWorldHint is the one
      // that would actually mislead if omitted: it DEFAULTS TO TRUE, so silence
      // tells a client these tools reach an open world when their whole domain
      // is a bundled table.
      annotations: {
        title: 'Bazi (Four Pillars) chart',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      description:
        'Precise Bazi (Four Pillars of Destiny) chart calculation tool. Uses a dual-axis architecture (UTC instant for Year/Month pillars and Da Yun, local True Solar Time for Day/Hour pillars). Supports any birth location worldwide with full historical DST handling. IMPORTANT: The `place` field requires an ENGLISH city name. If the user provides a city name in Chinese or any other language, translate it to English before calling this tool (e.g. 北京 → "Beijing", 乌鲁木齐 → "Urumqi", 東京 → "Tokyo", 뉴욕 → "New York"). Pass exactly ONE of `solarDate`/`lunarDate` and ONE of `clockTime`/`shichen`/`timeUnknown` — conflicting combinations are rejected rather than silently resolved. Chinese mainland places default to Beijing civil time (UTC+8); for Xinjiang the geographic zone is reported separately and can be selected by passing `timezone` explicitly. `solarTime` selects the solar time correction mode: "true" (default, longitude correction + equation of time), "mean" (longitude correction only, 地方平太阳时), or "off" (neither); the older `trueSolar` boolean is a deprecated alias. PRESENTING UNCERTAINTY: with `timeUnknown: true`, a pillar whose 干支 reads "A/B" is genuinely undetermined -- report BOTH to the user, never one. `diagnostics.pillarCandidates` holds the pair, `diagnostics.dayPillarAlternative` names the value the 早子時 hour (23:00-24:00) would give instead, and `daYun.startDate` is a date RANGE, not a date. Read `diagnostics.warnings` and pass their substance on. Collapsing any of these into a single confident value reintroduces exactly the fabrication this server refuses to make. STRENGTH (旺衰): this server does NOT judge 身强/身弱, 喜用神 or 格局 -- those are inference, and no source supplies the weights they need, so a scored verdict would rest on numbers invented here. What you get instead is `strengthFactors`: a zero-weight ledger of table lookups -- 月令 relation and 旺相休囚死, per-branch roots with qi level and 禄/刃/长生/墓库根 tags and stem-support direction. Weigh them yourself, ideally against a 命理 knowledge base; do not present the ledger\'s facts as a verdict, and do not present your own weighing as if this tool produced it. Three of those tables sit on a live school dispute and each is a named input -- `twelveStageSchool`, `monthOrderSchool`, `bladeSchool` (see their own descriptions). `strengthFactors.conventions` echoes back the school in force, the ones not used, and the fields that would change under them. Defaults are the mainstream reading in every case, so pass one only when the user follows a specific school; do not choose for them. For a yin day master the 十二长生 fork changes every branch, and 阴刃 has three irreconcilable readings of which this server reports none by default -- so check `conventions` before repeating a 长生位 or a 禄/刃 tag as settled.',
      inputSchema: {
        type: 'object',
        properties: {
          place: {
            type: 'string',
            description: 'Birth city name in ENGLISH (e.g. "Beijing", "New York", "Lagos", "Tacoma, WA"). Translate from other languages before passing.',
          },
          longitude: {
            type: 'number',
            minimum: -180,
            maximum: 180,
            description: 'Birth location longitude (positive = East, negative = West, e.g. 116.4074 or -122.4443)',
          },
          timezone: {
            type: 'string',
            description: 'Birth location IANA timezone (e.g. "Asia/Shanghai", "America/Los_Angeles")',
          },
          solarDate: {
            type: 'object',
            description: 'Solar (Gregorian) birth date (mutually exclusive with lunarDate)',
            additionalProperties: false,
            properties: {
              year: { type: 'integer', minimum: 1800, maximum: 2100, description: 'Solar year (1800-2100, e.g. 1990)' },
              month: { type: 'integer', minimum: 1, maximum: 12, description: 'Month (1-12)' },
              day: { type: 'integer', minimum: 1, maximum: 31, description: 'Day (1-31)' },
            },
            required: ['year', 'month', 'day'],
          },
          lunarDate: {
            type: 'object',
            description: 'Lunar (Chinese calendar) birth date (mutually exclusive with solarDate)',
            additionalProperties: false,
            properties: {
              year: { type: 'integer', minimum: 1800, maximum: 2100, description: 'Lunar year (1800-2100, e.g. 1990)' },
              month: { type: 'integer', minimum: 1, maximum: 12, description: 'Lunar month (1-12)' },
              day: { type: 'integer', minimum: 1, maximum: 30, description: 'Lunar day (1-30)' },
              isLeapMonth: { type: 'boolean', description: 'Whether this is a leap month' },
            },
            required: ['year', 'month', 'day'],
          },
          lunarDateFrame: {
            type: 'string',
            enum: ['local', 'beijing'],
            description: 'Lunar date reference frame: "local" (default, based on local Gregorian date) or "beijing" (based on China Gregorian date)',
          },
          clockTime: {
            type: 'object',
            description: 'Clock time of birth (mutually exclusive with shichen and timeUnknown)',
            additionalProperties: false,
            properties: {
              hour: { type: 'integer', minimum: 0, maximum: 23, description: 'Hour (0-23)' },
              minute: { type: 'integer', minimum: 0, maximum: 59, description: 'Minute (0-59)' },
              second: { type: 'integer', minimum: 0, maximum: 59, description: 'Second (0-59)' },
            },
            required: ['hour', 'minute'],
          },
          shichen: {
            type: 'string',
            enum: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'],
            description: 'Traditional Chinese double-hour (use when exact minute is unknown)',
          },
          timeUnknown: {
            type: 'boolean',
            description: 'Set true when birth time is unknown (produces a 3-pillar chart, hour pillar = null)',
          },
          dstFold: {
            type: 'integer',
            enum: [0, 1],
            description: 'DST fall-back disambiguation: 0 = first occurrence (DST), 1 = second occurrence (Standard)',
          },
          gender: {
            type: 'string',
            enum: ['male', 'female'],
            description: 'Gender: "male" (男/乾造) or "female" (女/坤造)',
          },
          sect: {
            type: 'integer',
            enum: [1, 2],
            default: 2,
            description: 'Early/late Zi hour convention: 2 (default, day rolls over at 23:00 / 子初换日, self-consistent with rat-chasing cycle 五鼠遁) or 1 (day rolls over at 00:00 / 子正换日)',
          },
          solarTime: {
            type: 'string',
            enum: ['true', 'mean', 'off'],
            description: 'Solar time correction mode (default: "true"). "true" = longitude correction + equation of time (full True Solar Time). "mean" = longitude correction only, no equation of time (地方平太阳时). "off" = neither; wall clock as given.',
          },
          twelveStageSchool: {
            type: 'string',
            enum: ['yang_forward_yin_backward', 'yin_follows_yang'],
            description: 'School for 十二长生 (default: "yang_forward_yin_backward"). "yang_forward_yin_backward" = 渊海子平: yang stems run the cycle forward from their 长生 anchor, yin stems run backward. "yin_follows_yang" = 滴天髓·任铁樵注 阴阳同生同死: a yin stem runs FORWARD from its yang partner\'s anchor. Yin day masters only — yang day masters are identical under both, so pass this only when the user follows a specific school. Affects strengthFactors.monthOrder.twelveStage and the 长生 tag in strengthFactors.roots; 禄 and 刃 are read from the 十干禄/阳刃 tables and do not move with it. Whichever school is in force is echoed back in strengthFactors.conventions.twelveStage.',
          },
          monthOrderSchool: {
            type: 'string',
            enum: ['branch_main_qi', 'earth_rules_final_18_days'],
            description: 'School for 月令 / 旺相休囚死 (default: "branch_main_qi"). "branch_main_qi" takes the month branch\'s main qi as 令, so 辰戌丑未 count as 土 for the whole month. "earth_rules_final_18_days" is 土旺四季十八日: in 辰戌丑未 months the final 18 days before the next 立 are 土, and the days before them keep the closing season\'s element (辰木 未火 戌金 丑水). Only those four months can differ — the other eight are identical under both, because their main qi already IS the season\'s element. Moves strengthFactors.monthOrder.wangXiangXiuQiuSi and .rulingElement only; .relation/.mainQiStem/.tenGod are month-branch facts and do not move. If the birth lands within hours of the 18-day line, diagnostics.warnings says so — do not repeat 旺相休囚死 as settled in that case.',
          },
          bladeSchool: {
            type: 'string',
            enum: ['yang_only', 'yin_at_diwang', 'yin_at_guandai'],
            description: 'Which stems get a 刃 tag (default: "yang_only" = 阳刃 甲卯 丙午 戊午 庚酉 壬子 alone). 阴刃 has three irreconcilable readings in print and this server picks none of them: pass "yin_at_diwang" for 乙寅 丁巳 己巳 辛申 癸亥 (阴干帝旺为刃), "yin_at_guandai" for 乙辰 丁未 己未 辛戌 癸丑 (禄前一位/冠带为刃). The third school holds that yin stems have no 刃, which is what the default reports. Pass this only when the user follows a specific school — do not choose one for them.',
          },
          trueSolar: {
            type: 'boolean',
            description: 'Deprecated, use `solarTime` instead (true -> "true", false -> "off"). Whether to apply True Solar Time correction (default: true).',
          },
        },
        required: ['gender'],
        additionalProperties: false,
      },
    },
    {
      name: 'lookup_location',
      annotations: {
        title: 'Resolve a birthplace',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      description: 'Look up a city\'s coordinates and IANA timezone. Use this BEFORE a chart tool whenever the place name might be ambiguous -- it is cheaper than a refused chart call. IMPORTANT: English city names only; translate first (东京 -> "Tokyo"). When more than one city comes back, ASK the user which one they mean -- do not pick the first, the largest, or the most likely. The response reports `matched` (true hit count) and `shown` (after the cap), so a capped list never reads as an exhaustive one. Covers 7,329 cities across 227 countries.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'City name in ENGLISH (e.g. "Beijing", "Tokyo", "Lagos", "São Paulo", "Portland, OR").',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'calculate_bazi') {
        const validatedInput = BaziInputSchema.parse(args) as BaziInput;
        const result = calculateDualAxisBazi(validatedInput);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      if (name === 'lookup_location') {
        const { query } = LookupLocationSchema.parse(args);
        const { matched, results: cities } = lookupCityWithCount(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query,
                  // TRUE match count, not the post-cap length: a capped list
                  // reporting its own size tells the caller the search was
                  // exhaustive when it was not ("Santa" matches 37, returns 10).
                  matched,
                  shown: cities.length,
                  ...(matched > cities.length
                    ? { note: `Showing the ${cities.length} most populous of ${matched} matches. Narrow the query if none is right -- do not assume the intended city is in this list.` }
                    : {}),
                  results: cities,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      throw new Error(`Unknown MCP tool: ${name}`);
    } catch (err: unknown) {
      // A location refusal ships its candidate list as JSON rather than prose:
      // the agent should not have to parse English to find out which cities
      // matched. `code` is stable enough to branch on, and `matched` keeps a
      // capped list from reading as an exhaustive one.
      if (err instanceof LocationError) {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify(err.toPayload(), null, 2) }] };
      }
      const errMsg = err instanceof z.ZodError
        ? formatZodError(err)
        : err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `[Bazi Calculation Error] ${errMsg}`,
          },
        ],
      };
    }
  });

  return server;
}

export async function runServer(): Promise<void> {
  const server = createBaziMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Bazi MCP Server running on stdio transport.');
}
