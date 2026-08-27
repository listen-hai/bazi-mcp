import { describe, it, expect } from 'bun:test';
import { createBaziMcpServer } from '../src/mcp/server';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool annotations are advertised metadata, so a missing one is not a silent
 * default -- `openWorldHint` defaults to TRUE, which would tell a client these
 * tools reach an open world when every one of them reads bundled tables and
 * computes. Nothing here writes, and nothing here fetches; the annotations say
 * so. All four hints are declared, not just the two the spec calls meaningful
 * here, because every value is known to be true of a pure calculation and at
 * least one registry rejects tools that leave any of them unset. This keeps a
 * tool added later from quietly claiming otherwise.
 */
describe('every advertised tool says it is read-only and closed-world', () => {
  it('carries accurate annotations', async () => {
    const server = createBaziMcpServer() as any;
    const handler = server._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
    const { tools } = await handler({ method: 'tools/list' }, {});
    expect(tools.length).toBeGreaterThan(0);

    for (const tool of tools) {
      const a = tool.annotations as Record<string, unknown> | undefined;
      expect(a, `${tool.name} has no annotations`).toBeDefined();
      if (!a) continue;
      expect(a.readOnlyHint, tool.name).toBe(true);
      expect(a.openWorldHint, tool.name).toBe(false);
      expect(typeof a.title, `${tool.name} needs a human-readable title`).toBe('string');
      expect(String(a.title).length, tool.name).toBeGreaterThan(0);
      // Stated even though the spec calls these two ignorable under
      // readOnlyHint: true. They are still true of a pure calculation, and a
      // directory that requires all four should find all four.
      expect(a.destructiveHint, tool.name).toBe(false);
      expect(a.idempotentHint, tool.name).toBe(true);
    }
  });
});
