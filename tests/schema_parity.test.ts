import { describe, it, expect } from 'bun:test';
import { createBaziMcpServer } from '../src/mcp/server';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BaziInputSchema } from '../src/schemas/input';

/**
 * The MCP tool advertises a hand-written JSON Schema that mirrors the zod schema
 * in src/schemas/input.ts. Nothing makes the two agree, so they can drift: a new
 * field reaches only one of them, or zod tightens a bound the tool never
 * advertises. Both failures land on the caller, which is a model — it cannot see
 * the zod schema, so whatever the JSON Schema omits it has to discover by
 * guessing and reading validation errors.
 *
 * These tests make drift fail the build instead.
 */

/** Strips ZodOptional / ZodDefault / ZodEffects wrappers down to the base type. */
function unwrap(schema: any): any {
  let current = schema;
  while (current?._def?.innerType || current?._def?.schema) {
    current = current._def.innerType ?? current._def.schema;
  }
  return current;
}

/** The object schema underneath BaziInputSchema's chain of .refine() calls. */
function rootShape(): Record<string, any> {
  let root: any = BaziInputSchema;
  while (root._def?.schema) root = root._def.schema;
  return root.shape;
}

/** zod's numeric bounds for a field, in JSON Schema vocabulary. */
function zodBounds(schema: any): { minimum?: number; maximum?: number } {
  const base = unwrap(schema);
  if (base?._def?.typeName !== 'ZodNumber') return {};
  const bounds: { minimum?: number; maximum?: number } = {};
  for (const check of base._def.checks ?? []) {
    if (check.kind === 'min') bounds.minimum = check.value;
    if (check.kind === 'max') bounds.maximum = check.value;
  }
  return bounds;
}

async function calculateBaziInputSchema(): Promise<any> {
  const server = createBaziMcpServer() as any;
  const handler = server._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
  const { tools } = await handler({ method: 'tools/list' }, {});
  return tools.find((tool: any) => tool.name === 'calculate_bazi').inputSchema;
}

describe('MCP input schema parity with the zod schema', () => {
  it('advertises exactly the fields zod accepts', async () => {
    const advertised = Object.keys((await calculateBaziInputSchema()).properties).sort();
    expect(advertised).toEqual(Object.keys(rootShape()).sort());
  });

  it('advertises every numeric bound zod enforces, at the top level and nested', async () => {
    const properties = (await calculateBaziInputSchema()).properties;
    const shape = rootShape();

    // Walk both schemas together so a nested field cannot be missed.
    for (const [field, zodField] of Object.entries(shape)) {
      const advertised = properties[field];
      const base = unwrap(zodField);

      if (base?._def?.typeName === 'ZodNumber') {
        expect(advertised, field).toMatchObject(zodBounds(zodField));
        continue;
      }
      if (base?._def?.typeName === 'ZodObject') {
        for (const [nested, zodNested] of Object.entries<any>(base.shape)) {
          const bounds = zodBounds(zodNested);
          if (Object.keys(bounds).length === 0) continue;
          expect(advertised.properties[nested], `${field}.${nested}`).toMatchObject(bounds);
        }
      }
    }
  });

  it('rejects out-of-range values that the advertised bounds forbid', async () => {
    // The bounds above are only worth advertising if zod actually enforces them.
    const base = { place: 'Beijing', clockTime: { hour: 8, minute: 0 }, gender: 'male' };
    const outOfRange = [
      { ...base, solarDate: { year: 1500, month: 1, day: 1 } },
      { ...base, solarDate: { year: 1990, month: 1, day: 1 }, longitude: 999, timezone: 'Asia/Shanghai' },
      { ...base, solarDate: { year: 1990, month: 1, day: 1 }, clockTime: { hour: 8, minute: 99 } },
    ];
    for (const input of outOfRange) {
      expect(BaziInputSchema.safeParse(input).success).toBe(false);
    }
  });
});
