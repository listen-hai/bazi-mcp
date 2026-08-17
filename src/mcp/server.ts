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
import { lookupCity } from '../geo/resolver';
import { BaziInput } from '../types';
import rootPkg from '../../package.json';

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
      description:
        'Precise Bazi (Four Pillars of Destiny) chart calculation tool. Uses a dual-axis architecture (UTC instant for Year/Month pillars and Da Yun, local True Solar Time for Day/Hour pillars). Supports any birth location worldwide with full historical DST handling. IMPORTANT: The `place` field requires an ENGLISH city name. If the user provides a city name in Chinese or any other language, translate it to English before calling this tool (e.g. 北京 → "Beijing", 乌鲁木齐 → "Urumqi", 東京 → "Tokyo", 뉴욕 → "New York"). Pass exactly ONE of `solarDate`/`lunarDate` and ONE of `clockTime`/`shichen`/`timeUnknown` — conflicting combinations are rejected rather than silently resolved. Chinese mainland places default to Beijing civil time (UTC+8); for Xinjiang the geographic zone is reported separately and can be selected by passing `timezone` explicitly.',
      inputSchema: {
        type: 'object',
        properties: {
          place: {
            type: 'string',
            description: 'Birth city name in ENGLISH (e.g. "Beijing", "New York", "Lagos", "Tacoma, WA"). Translate from other languages before passing.',
          },
          longitude: {
            type: 'number',
            description: 'Birth location longitude (positive = East, negative = West, e.g. 116.4074 or -122.4443)',
          },
          timezone: {
            type: 'string',
            description: 'Birth location IANA timezone (e.g. "Asia/Shanghai", "America/Los_Angeles")',
          },
          solarDate: {
            type: 'object',
            description: 'Solar (Gregorian) birth date (mutually exclusive with lunarDate)',
            properties: {
              year: { type: 'integer', description: 'Year (e.g. 1990)' },
              month: { type: 'integer', description: 'Month (1-12)' },
              day: { type: 'integer', description: 'Day (1-31)' },
            },
            required: ['year', 'month', 'day'],
          },
          lunarDate: {
            type: 'object',
            description: 'Lunar (Chinese calendar) birth date (mutually exclusive with solarDate)',
            properties: {
              year: { type: 'integer', description: 'Lunar year (e.g. 1990)' },
              month: { type: 'integer', description: 'Lunar month (1-12)' },
              day: { type: 'integer', description: 'Lunar day (1-30)' },
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
            properties: {
              hour: { type: 'integer', description: 'Hour (0-23)' },
              minute: { type: 'integer', description: 'Minute (0-59)' },
              second: { type: 'integer', description: 'Second (0-59)' },
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
            description: 'Early/late Zi hour convention: 1 (default, midnight rollover at 00:00) or 2 (rollover at 23:00)',
          },
          trueSolar: {
            type: 'boolean',
            description: 'Whether to apply True Solar Time correction (default: true)',
          },
          childLimitProvider: {
            type: 'string',
            enum: ['default', 'china95', 'season', 'lunarSect1'],
            description: 'Da Yun onset calculation method',
          },
        },
        required: ['gender'],
      },
    },
    {
      name: 'lookup_location',
      description: 'Look up a city\'s geographic coordinates (latitude, longitude) and official IANA timezone. IMPORTANT: Use ENGLISH city names only. If the user provides a name in another language, translate it to English first (e.g. 东京 → "Tokyo", 巴黎 → "Paris"). Covers 7,329 cities across 227 countries. Chinese mainland places default to Beijing civil time (UTC+8); for Xinjiang the geographic zone is reported separately and can be selected by passing `timezone` explicitly.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'City name in ENGLISH (e.g. "Beijing", "Tokyo", "Lagos", "São Paulo", "Portland, OR").',
          },
        },
        required: ['query'],
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
        const cities = lookupCity(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query,
                  count: cities.length,
                  results: cities,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      throw new Error(`未知的 MCP 工具: ${name}`);
    } catch (err: unknown) {
      const errMsg = err instanceof z.ZodError
        ? err.issues.map(i => i.message).join('; ')
        : err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `[八字排盘错误] ${errMsg}`,
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
