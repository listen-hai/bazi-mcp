#!/usr/bin/env bun
import { runServer } from './mcp/server';

runServer().catch((error) => {
  console.error('Fatal error in Bazi MCP Server:', error);
  process.exit(1);
});
