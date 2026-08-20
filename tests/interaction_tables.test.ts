import { describe, it, expect } from 'bun:test';
import { detectAllInteractions } from '../src/core/interactions';

/**
 * Completeness and soundness of the hand-written correspondence tables in
 * src/core/interactions.ts.
 *
 * The classical relations are deliberately re-encoded here from source texts
 * rather than imported from the module under test. Importing them would make
 * this file agree with any mistranscription by construction, which is the exact
 * failure it exists to catch: one wrong character in a 329-line table silently
 * produces a wrong chart, and the rest of the suite only spot-checks a handful
 * of interaction instances.
 */

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const STEM_COMBINATIONS: Array<[string, string, string]> = [
  ['甲', '己', 'earth'], ['乙', '庚', 'metal'], ['丙', '辛', 'water'],
  ['丁', '壬', 'wood'], ['戊', '癸', 'fire'],
];
const TRINES: Array<[string, string, string, string]> = [
  ['申', '子', '辰', 'water'], ['亥', '卯', '未', 'wood'],
  ['寅', '午', '戌', 'fire'], ['巳', '酉', '丑', 'metal'],
];
const DIRECTIONALS: Array<[string, string, string, string]> = [
  ['寅', '卯', '辰', 'wood'], ['巳', '午', '未', 'fire'],
  ['申', '酉', '戌', 'metal'], ['亥', '子', '丑', 'water'],
];
/** Classical 半合 requires the cardinal branch (子午卯酉) of its trine. */
const HALF_TRINES_WITH_CARDINAL: Array<[string, string, string]> = [
  ['申', '子', 'water'], ['子', '辰', 'water'], ['亥', '卯', 'wood'], ['卯', '未', 'wood'],
  ['寅', '午', 'fire'], ['午', '戌', 'fire'], ['巳', '酉', 'metal'], ['酉', '丑', 'metal'],
];
/**
 * The remaining trine pairs, which lack the cardinal branch. Most classical
 * texts treat these as 拱合 rather than 半合 and do not grant them the element.
 * This implementation does report them; the assertion below pins that as a
 * deliberate doctrinal choice so it cannot change silently.
 */
const HALF_TRINES_WITHOUT_CARDINAL: Array<[string, string, string]> = [
  ['申', '辰', 'water'], ['亥', '未', 'wood'], ['寅', '戌', 'fire'], ['巳', '丑', 'metal'],
];
const SIX_COMBINATIONS: Array<[string, string, string]> = [
  ['子', '丑', 'earth'], ['寅', '亥', 'wood'], ['卯', '戌', 'fire'],
  ['辰', '酉', 'metal'], ['巳', '申', 'water'], ['午', '未', 'earth'],
];
const CLASHES: Array<[string, string]> = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
];
const HARMS: Array<[string, string]> = [
  ['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌'],
];
const DESTRUCTIONS: Array<[string, string]> = [
  ['子', '酉'], ['卯', '午'], ['巳', '申'], ['寅', '亥'], ['丑', '辰'], ['戌', '未'],
];
/** 三刑 taken pairwise, plus 无礼之刑 子卯. */
const PUNISHMENT_PAIRS: Array<[string, string]> = [
  ['寅', '巳'], ['巳', '申'], ['寅', '申'],
  ['丑', '戌'], ['戌', '未'], ['丑', '未'],
  ['子', '卯'],
];
const SELF_PUNISHMENTS = ['辰', '午', '酉', '亥'];

/** Interaction types that form an element, and therefore carry the v2.1 transformation fields. */
const COMBINING_TYPES = ['TRINE', 'DIRECTIONAL', 'HALF_TRINE', 'COMBINATION_2', 'STEM_COMBINATION'];

function detect(branches: string[], stems?: string[]) {
  return detectAllInteractions({
    year: branches[0] ?? '', month: branches[1] ?? '',
    day: branches[2] ?? '', hour: branches[3] ?? '',
    yearStem: stems?.[0], monthStem: stems?.[1],
    dayStem: stems?.[2], hourStem: stems?.[3],
  });
}

/** Finds an interaction over exactly the given members, whatever the pillar layout. */
function findExact(results: ReturnType<typeof detect>, type: string, members: string[]) {
  return results.find(r => {
    const got = r.branches ?? r.stems ?? [];
    return r.type === type && got.length === members.length && members.every(m => got.includes(m));
  });
}

describe('Interaction correspondence tables', () => {
  it('detects all 5 天干五合 with the correct transformation element', () => {
    for (const [a, b, element] of STEM_COMBINATIONS) {
      // Branches chosen to be inert so only the stem relation can match.
      const hit = findExact(detect(['子', '寅', '辰', '巳'], [a, b, '戊', '戊']), 'STEM_COMBINATION', [a, b]);
      expect(hit, `${a}${b}`).toBeDefined();
      expect(hit!.potentialElement, `${a}${b}`).toBe(element);
    }
  });

  it('detects all 4 三合 and all 4 三会 with the correct element', () => {
    for (const [a, b, c, element] of TRINES) {
      const hit = findExact(detect([a, b, c]), 'TRINE', [a, b, c]);
      expect(hit, `三合 ${a}${b}${c}`).toBeDefined();
      expect(hit!.potentialElement, `三合 ${a}${b}${c}`).toBe(element);
    }
    for (const [a, b, c, element] of DIRECTIONALS) {
      const hit = findExact(detect([a, b, c]), 'DIRECTIONAL', [a, b, c]);
      expect(hit, `三会 ${a}${b}${c}`).toBeDefined();
      expect(hit!.potentialElement, `三会 ${a}${b}${c}`).toBe(element);
    }
  });

  it('detects every two-branch relation in the classical tables', () => {
    const cases: Array<[string, [string, string], string | undefined]> = [
      ...HALF_TRINES_WITH_CARDINAL.map(([a, b, e]) => ['HALF_TRINE', [a, b], e] as [string, [string, string], string]),
      ...SIX_COMBINATIONS.map(([a, b, e]) => ['COMBINATION_2', [a, b], e] as [string, [string, string], string]),
      ...CLASHES.map(([a, b]) => ['CLASH', [a, b], undefined] as [string, [string, string], undefined]),
      ...HARMS.map(([a, b]) => ['HARM', [a, b], undefined] as [string, [string, string], undefined]),
      ...DESTRUCTIONS.map(([a, b]) => ['DESTRUCTION', [a, b], undefined] as [string, [string, string], undefined]),
      ...PUNISHMENT_PAIRS.map(([a, b]) => ['PUNISHMENT', [a, b], undefined] as [string, [string, string], undefined]),
    ];
    for (const [type, [a, b], element] of cases) {
      const hit = findExact(detect([a, b, '', '']), type, [a, b]);
      expect(hit, `${type} ${a}${b}`).toBeDefined();
      if (element) expect(hit!.potentialElement, `${type} ${a}${b}`).toBe(element);
    }
  });

  it('detects the two 三刑 triples and all 4 自刑', () => {
    for (const triple of [['寅', '巳', '申'], ['丑', '戌', '未']]) {
      expect(findExact(detect(triple), 'PUNISHMENT', triple), triple.join('')).toBeDefined();
    }
    for (const branch of SELF_PUNISHMENTS) {
      expect(findExact(detect([branch, branch, '', '']), 'PUNISHMENT', [branch, branch]), `自刑 ${branch}`).toBeDefined();
    }
  });

  it('reports no two-branch relation outside the classical tables', () => {
    const expected = new Map<string, Set<string>>();
    const note = (a: string, b: string, type: string) => {
      const key = [a, b].sort().join('');
      if (!expected.has(key)) expected.set(key, new Set());
      expected.get(key)!.add(type);
    };
    HALF_TRINES_WITH_CARDINAL.forEach(([a, b]) => note(a, b, 'HALF_TRINE'));
    HALF_TRINES_WITHOUT_CARDINAL.forEach(([a, b]) => note(a, b, 'HALF_TRINE'));
    SIX_COMBINATIONS.forEach(([a, b]) => note(a, b, 'COMBINATION_2'));
    CLASHES.forEach(([a, b]) => note(a, b, 'CLASH'));
    HARMS.forEach(([a, b]) => note(a, b, 'HARM'));
    DESTRUCTIONS.forEach(([a, b]) => note(a, b, 'DESTRUCTION'));
    PUNISHMENT_PAIRS.forEach(([a, b]) => note(a, b, 'PUNISHMENT'));

    for (let i = 0; i < BRANCHES.length; i++) {
      for (let j = i + 1; j < BRANCHES.length; j++) {
        const key = [BRANCHES[i], BRANCHES[j]].sort().join('');
        const got = new Set(detect([BRANCHES[i], BRANCHES[j], '', '']).map(r => r.type));
        expect([...got].sort(), `pair ${key}`).toEqual([...(expected.get(key) ?? new Set<string>())].sort());
      }
    }
  });

  it('carries transformation fields on combining relations and never on the others', () => {
    const checked = new Set<string>();
    const inspect = (results: ReturnType<typeof detect>) => {
      for (const r of results) {
        const key = `${r.type}:${(r.branches ?? r.stems ?? []).join('')}`;
        if (checked.has(key)) continue;
        checked.add(key);
        if (COMBINING_TYPES.includes(r.type)) {
          // A combination is a fact; whether it transforms is an inference the
          // server does not make, so `transformed` stays null and the reasoning
          // is handed to the caller in transformNote.
          expect(r.transformed, key).toBeNull();
          expect(r.potentialElement, key).toBeTruthy();
          expect(r.transformNote, key).toBeTruthy();
        } else {
          // Clashes, harms, destructions and punishments produce no element.
          expect(r.potentialElement, key).toBeUndefined();
          expect(r.transformNote, key).toBeUndefined();
        }
      }
    };
    for (const a of BRANCHES) for (const b of BRANCHES) for (const c of BRANCHES) {
      inspect(detect([a, b, c, '']));
    }
    for (const [a, b] of STEM_COMBINATIONS) inspect(detect(['子', '寅', '辰', '巳'], [a, b, '戊', '戊']));
    expect(checked.size).toBeGreaterThan(50);
  });
});
