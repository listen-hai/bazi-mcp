import { describe, it, expect } from 'bun:test';
import { createBaziMcpServer } from '../src/mcp/server';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

describe('MCP Server Protocol & End-to-End Tests', () => {
  it('Should list available tools correctly with standard schemas', async () => {
    const server = createBaziMcpServer();
    // @ts-ignore
    const handler = server._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
    expect(handler).toBeDefined();

    const response = await handler!({ method: 'tools/list' }, {});
    expect(response.tools.length).toBe(2);

    const toolNames = response.tools.map((t: any) => t.name);
    expect(toolNames).toContain('calculate_bazi');
    expect(toolNames).toContain('lookup_location');
  });

  it('Should call calculate_bazi with solarDate via MCP', async () => {
    const server = createBaziMcpServer();
    // @ts-ignore
    const handler = server._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const response = await handler!(
      {
        method: 'tools/call',
        params: {
          name: 'calculate_bazi',
          arguments: {
            place: 'Tacoma, WA',
            solarDate: { year: 2024, month: 2, day: 4 },
            clockTime: { hour: 8, minute: 0 },
            gender: 'male',
          },
        },
      },
      {}
    );

    expect(response.isError).toBeFalsy();
    const resultObj = JSON.parse(response.content[0].text);
    expect(resultObj.四柱).toBe('甲辰 丙寅 戊戌 丙辰');
    expect(resultObj.诊断.钟面).toContain('America/Los_Angeles');
  });

  it('Should call calculate_bazi with lunarDate and frame=local via MCP', async () => {
    const server = createBaziMcpServer();
    // @ts-ignore
    const handler = server._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const response = await handler!(
      {
        method: 'tools/call',
        params: {
          name: 'calculate_bazi',
          arguments: {
            place: 'Tacoma, WA',
            lunarDate: { year: 1990, month: 5, day: 23 },
            lunarDateFrame: 'local',
            clockTime: { hour: 20, minute: 0 },
            gender: 'male',
          },
        },
      },
      {}
    );

    expect(response.isError).toBeFalsy();
    const resultObj = JSON.parse(response.content[0].text);
    expect(resultObj.四柱).toBe('庚午 壬午 辛亥 丁酉');
    expect(resultObj.诊断.农历.输入frame).toBe('local');
  });

  it('Should call calculate_bazi with timeUnknown=true for three-pillar chart via MCP', async () => {
    const server = createBaziMcpServer();
    // @ts-ignore
    const handler = server._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const response = await handler!(
      {
        method: 'tools/call',
        params: {
          name: 'calculate_bazi',
          arguments: {
            place: 'Beijing',
            solarDate: { year: 1998, month: 7, day: 31 },
            timeUnknown: true,
            gender: 'male',
          },
        },
      },
      {}
    );

    expect(response.isError).toBeFalsy();
    const resultObj = JSON.parse(response.content[0].text);
    expect(resultObj.四柱).toContain('[时辰未知]');
    expect(resultObj.pillars.hour).toBeNull();
  });

  it('Should call lookup_location tool successfully via MCP', async () => {
    const server = createBaziMcpServer();
    // @ts-ignore
    const handler = server._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const response = await handler!(
      {
        method: 'tools/call',
        params: {
          name: 'lookup_location',
          arguments: {
            query: 'Urumqi',
          },
        },
      },
      {}
    );

    expect(response.isError).toBeFalsy();
    const resultObj = JSON.parse(response.content[0].text);
    expect(resultObj.count).toBeGreaterThan(0);
    expect(resultObj.results[0].name).toBe('Urumqi');
    // China civil-time policy: mainland places (incl. Xinjiang) report the
    // civil zone (Beijing time) as `timezone`, with the geographic zone
    // carried separately so callers can opt into it explicitly.
    expect(resultObj.results[0].timezone).toBe('Asia/Shanghai');
    expect(resultObj.results[0].geographicTimezone).toBe('Asia/Urumqi');
  });

  it('Should return graceful error for invalid tool call arguments', async () => {
    const server = createBaziMcpServer();
    // @ts-ignore
    const handler = server._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const response = await handler!(
      {
        method: 'tools/call',
        params: {
          name: 'calculate_bazi',
          arguments: {
            gender: 'male',
          },
        },
      },
      {}
    );

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('[八字排盘错误]');
  });

  it('Should flatten ZodError conflicts (solarDate + lunarDate) into a plain message, not JSON', async () => {
    const server = createBaziMcpServer();
    // @ts-ignore
    const handler = server._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const response = await handler!(
      {
        method: 'tools/call',
        params: {
          name: 'calculate_bazi',
          arguments: {
            solarDate: { year: 1988, month: 7, day: 1 },
            lunarDate: { year: 1988, month: 5, day: 18 },
            clockTime: { hour: 7, minute: 20 },
            timezone: 'Asia/Shanghai',
            longitude: 116.4074,
            gender: 'male',
          },
        },
      },
      {}
    );

    expect(response.isError).toBe(true);
    const text = response.content[0].text;
    expect(text).toContain('[八字排盘错误]');
    expect(text).toContain('不能同时提供 solarDate');
    // Must not leak raw zod issue JSON (code/path arrays etc.)
    expect(text).not.toContain('"code"');
    expect(text).not.toContain('"path"');
  });

  it('Should return graceful error for unknown tool name', async () => {
    const server = createBaziMcpServer();
    // @ts-ignore
    const handler = server._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const response = await handler!(
      {
        method: 'tools/call',
        params: {
          name: 'non_existent_tool',
          arguments: {},
        },
      },
      {}
    );

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('未知的 MCP 工具');
  });
});
