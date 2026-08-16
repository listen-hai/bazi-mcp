import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { BaziInputSchema } from '../schemas/input';
import { calculateDualAxisBazi } from '../core/dual-axis';
import { lookupCity } from '../geo/resolver';
import { BaziInput } from '../types';

export function createBaziMcpServer(): Server {
  const server = new Server(
    {
      name: 'bazi-mcp',
      version: '1.0.0',
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
        '精准八字排盘工具。采用双时间轴架构（UTC 瞬时定年月柱与大运起运，当地真太阳时定日时柱），对全球任意出生地、历史夏令时、新疆等特殊经度及农历闰月均给出严谨四柱与完整诊断块。',
      inputSchema: {
        type: 'object',
        properties: {
          place: {
            type: 'string',
            description: '出生城市名称（中英文均可，如 "广州"、"北京"、"Tacoma, WA"、"乌鲁木齐"、"New York"）',
          },
          longitude: {
            type: 'number',
            description: '出生地经度（东经为正，西经为负，如 116.4074 或 -122.4443）',
          },
          timezone: {
            type: 'string',
            description: '出生地 IANA 时区名（如 "Asia/Shanghai"、"America/Los_Angeles"）',
          },
          solarDate: {
            type: 'object',
            description: '公历出生日期（与 lunarDate 二选一）',
            properties: {
              year: { type: 'integer', description: '公历年份 (如 1990)' },
              month: { type: 'integer', description: '公历月份 (1-12)' },
              day: { type: 'integer', description: '公历日期 (1-31)' },
            },
            required: ['year', 'month', 'day'],
          },
          lunarDate: {
            type: 'object',
            description: '农历出生日期（与 solarDate 二选一）',
            properties: {
              year: { type: 'integer', description: '农历年份 (如 1990)' },
              month: { type: 'integer', description: '农历月份 (1-12)' },
              day: { type: 'integer', description: '农历日期 (1-30)' },
              isLeapMonth: { type: 'boolean', description: '是否为闰月 (如闰四月传 true)' },
            },
            required: ['year', 'month', 'day'],
          },
          lunarDateFrame: {
            type: 'string',
            enum: ['local', 'beijing'],
            description: '农历日期基准：local (默认，按出生地当地公历日对应的农历) 或 beijing (按中国公历日)',
          },
          clockTime: {
            type: 'object',
            description: '钟表出生时刻（与 shichen、timeUnknown 三选一）',
            properties: {
              hour: { type: 'integer', description: '小时 (0-23)' },
              minute: { type: 'integer', description: '分钟 (0-59)' },
              second: { type: 'integer', description: '秒数 (0-59)' },
            },
            required: ['hour', 'minute'],
          },
          shichen: {
            type: 'string',
            enum: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'],
            description: '传统时辰（仅知时辰不知具体分钟时使用）',
          },
          timeUnknown: {
            type: 'boolean',
            description: '时辰未知（排三柱盘，时柱及相关神煞置 null）',
          },
          dstFold: {
            type: 'integer',
            enum: [0, 1],
            description: '秋季夏令时折返重叠消歧：0 = 第一次出现 (夏令时)，1 = 第二次出现 (标准时)',
          },
          gender: {
            type: 'string',
            enum: ['male', 'female'],
            description: '性别：male (男/乾造) 或 female (女/坤造)',
          },
          sect: {
            type: 'integer',
            enum: [1, 2],
            description: '早晚子时口径：1 (默认，00:00 换日) 或 2 (23:00 换日)',
          },
          trueSolar: {
            type: 'boolean',
            description: '是否开启真太阳时修正 (默认 true)',
          },
          childLimitProvider: {
            type: 'string',
            enum: ['default', 'china95', 'season', 'lunarSect1'],
            description: '起运计算口径',
          },
        },
        required: ['gender'],
      },
    },
    {
      name: 'lookup_location',
      description: '查询城市的地理经纬度与官方 IANA 时区（支持中英文模糊查询）。',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '城市名称（如 "广州"、"北京"、"Tacoma"、"Seattle"、"乌鲁木齐"）',
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
        const typedArgs = args as Record<string, unknown> | undefined;
        const query = typeof typedArgs?.query === 'string' ? typedArgs.query : '';
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
      const errMsg = err instanceof Error ? err.message : String(err);
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
