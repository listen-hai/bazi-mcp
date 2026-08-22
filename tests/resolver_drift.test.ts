import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { createHash } from 'crypto';

// src/geo/resolver.ts is maintained by hand in three repos -- ziwei-mcp,
// bazi-mcp and astro-mcp -- because they share one birth-location contract.
// Hand-synced files drift, and this one already did: a rule deleted from two
// of them survived in the third as unreachable code, and nothing noticed.
//
// Two guards, because neither alone is enough:
//
//   1. The content hash. Works in CI, where the sibling repos are not checked
//      out. It does not detect drift by itself -- it makes editing this file
//      a DELIBERATE act, since the constant has to be updated with it, which
//      is the moment to remember the other two repos.
//   2. The sibling comparison. Only runs on a machine that has all three
//      checked out, which is where edits actually happen, and is the one that
//      detects real divergence.
const SHARED_RESOLVER_MD5 = '33ba9841d5a644fec7fec804a38168ff';

const SIBLINGS = [
  '/Users/wesleyliu/Workspace/ziwei/src/geo/resolver.ts',
  '/Users/wesleyliu/Workspace/bazi/src/geo/resolver.ts',
  '/Users/wesleyliu/Workspace/astro/src/geo/resolver.ts',
];

const md5 = (path: string) => createHash('md5').update(readFileSync(path)).digest('hex');

test('the shared resolver has not been edited without updating its hash', () => {
  // If this fails you changed src/geo/resolver.ts. That is fine -- update the
  // constant above, AND make the same edit in the other two repos.
  expect(md5('src/geo/resolver.ts')).toBe(SHARED_RESOLVER_MD5);
});

const haveAll = SIBLINGS.every(existsSync);

test.skipIf(!haveAll)('all three repos carry a byte-identical resolver', () => {
  const hashes = SIBLINGS.map(md5);
  expect(new Set(hashes).size).toBe(1);
  expect(hashes[0]).toBe(SHARED_RESOLVER_MD5);
});
