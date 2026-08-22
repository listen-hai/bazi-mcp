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
 * The remaining trine pairs, which lack the cardinal branch (中神/旺支) of their trine.
 * Mainstream doctrine holds these do not combine on their own - they only form 拱合
 * when their element is transparent among the stems (透干), and are weaker than a
 * proper 半合 even then. With no stems supplied (as in the sweep below) they produce
 * no interaction at all, so they are exercised separately in the GONG_HE test below
 * rather than folded into the no-false-positive sweep's expected set.
 */
const HALF_TRINES_WITHOUT_CARDINAL: Array<[string, string, string, string]> = [
  ['申', '辰', 'water', '壬'], ['亥', '未', 'wood', '甲'], ['寅', '戌', 'fire', '丙'], ['巳', '丑', 'metal', '庚'],
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
const COMBINING_TYPES = ['TRINE', 'DIRECTIONAL', 'HALF_TRINE', 'COMBINATION_2', 'STEM_COMBINATION', 'GONG_HE'];

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
      // Filler branches are irrelevant here: findExact filters by type and exact member set,
      // so any branch relations among them (子辰 half-trine, 寅巳 harm/punishment) don't matter.
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

  it('reports GONG_HE for the 4 cardinal-less trine pairs only when their element is 透干', () => {
    for (const [a, b, element, stem] of HALF_TRINES_WITHOUT_CARDINAL) {
      // Absent the required stem: no interaction at all (not even as HALF_TRINE).
      const noStem = detect([a, b, '', '']);
      expect(findExact(noStem, 'GONG_HE', [a, b]), `${a}${b} without ${stem}`).toBeUndefined();
      expect(findExact(noStem, 'HALF_TRINE', [a, b]), `${a}${b} without ${stem}`).toBeUndefined();

      // With the required stem transparent: fires as GONG_HE with the correct element.
      const withStem = detect([a, b, '', ''], [stem, '戊', '戊', '戊']);
      const hit = findExact(withStem, 'GONG_HE', [a, b]);
      expect(hit, `${a}${b} with ${stem}`).toBeDefined();
      expect(hit!.potentialElement, `${a}${b} with ${stem}`).toBe(element);
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

  it('FIX4: a complete 三刑 triple emits exactly one PUNISHMENT entry, not the triple plus its pairwise subsets', () => {
    const full = detect(['寅', '巳', '申', '子']);
    const punishments = full.filter(i => i.type === 'PUNISHMENT');
    expect(punishments.map(p => p.branches?.join('')).sort()).toEqual(['寅巳申']);
  });

  it('FIX4: a pairwise 相刑 still fires when the third branch of its triple is absent', () => {
    const partial = detect(['寅', '巳', '丑', '酉']);
    const punishments = partial.filter(i => i.type === 'PUNISHMENT');
    expect(punishments.map(p => p.branches?.join('')).sort()).toEqual(['寅巳']);
  });

  it('reports no two-branch relation outside the classical tables', () => {
    const expected = new Map<string, Set<string>>();
    const note = (a: string, b: string, type: string) => {
      const key = [a, b].sort().join('');
      if (!expected.has(key)) expected.set(key, new Set());
      expected.get(key)!.add(type);
    };
    HALF_TRINES_WITH_CARDINAL.forEach(([a, b]) => note(a, b, 'HALF_TRINE'));
    // HALF_TRINES_WITHOUT_CARDINAL (拱合) deliberately excluded: with no stems supplied
    // (as this sweep does) they produce no interaction at all - see GONG_HE test below.
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
    for (const [a, b, , stem] of HALF_TRINES_WITHOUT_CARDINAL) inspect(detect([a, b, '', ''], [stem, '戊', '戊', '戊']));
    expect(checked.size).toBeGreaterThan(50);
  });
  /**
   * The description strings are the only part of an interaction a reading model
   * is likely to quote verbatim to a user, and nothing asserted them, so a typo
   * in a classical term — 三合水局 written as 三合火局 — would ship while
   * potentialElement stayed correct and every other test passed.
   */
  it('describes each interaction with its members and, where named, the right element', () => {
    const ELEMENT_CHARACTER: Record<string, string> = {
      water: '水', wood: '木', fire: '火', earth: '土', metal: '金',
    };
    const ALL_ELEMENT_CHARACTERS = Object.values(ELEMENT_CHARACTER);

    const inspected = new Set<string>();
    const check = (results: ReturnType<typeof detect>) => {
      for (const r of results) {
        const members = r.branches ?? r.stems ?? [];
        const key = `${r.type}:${members.join('')}`;
        if (inspected.has(key)) continue;
        inspected.add(key);

        // Every participating branch or stem must appear in the text.
        for (const member of members) {
          expect(r.description, key).toContain(member);
        }

        // Where the text names an element it must be the one reported. Six
        // combinations and stem combinations deliberately name no element, so
        // they are skipped rather than forced into a shape they do not have.
        const named = ALL_ELEMENT_CHARACTERS.filter(c => r.description.includes(c));
        if (named.length > 0) {
          expect(r.potentialElement, key).toBeTruthy();
          expect(named, key).toEqual([ELEMENT_CHARACTER[r.potentialElement!]]);
        }
      }
    };

    for (const a of BRANCHES) for (const b of BRANCHES) for (const c of BRANCHES) {
      check(detect([a, b, c, '']));
    }
    for (const [a, b] of STEM_COMBINATIONS) check(detect(['子', '寅', '辰', '巳'], [a, b, '戊', '戊']));
    for (const [a, b, , stem] of HALF_TRINES_WITHOUT_CARDINAL) check(detect([a, b, '', ''], [stem, '戊', '戊']));

    expect(inspected.size).toBeGreaterThan(60);
  });

  it('pins one description per interaction type', () => {
    // A change detector: these are the exact strings a model may quote.
    const cases: Array<[string, ReturnType<typeof detect>]> = [
      ['Trine (申子辰三合水局)', detect(['申', '子', '辰', ''])],
      ['Directional (寅卯辰三会东方木)', detect(['寅', '卯', '辰', ''])],
      ['Half-Trine (申子半合水)', detect(['申', '子', '', ''])],
      ['Combination (子丑六合)', detect(['子', '丑', '', ''])],
      ['Clash (子午相冲)', detect(['子', '午', '', ''])],
      ['Harm (子未相害)', detect(['子', '未', '', ''])],
      ['Destruction (子酉相破)', detect(['子', '酉', '', ''])],
      ['Punishment (寅巳申三刑 (无恩之刑))', detect(['寅', '巳', '申', ''])],
      ['Gong-He (申辰拱合水)', detect(['申', '辰', '', ''], ['壬', '戊', '戊'])],
      ['Stem Combination (甲己相合)', detect(['子', '寅', '辰', '巳'], ['甲', '己', '戊', '戊'])],
    ];
    for (const [expected, results] of cases) {
      expect(results.map(r => r.description), expected).toContain(expected);
    }
  });
});

describe('a non-adjudicated transformation must not read as a denial', () => {
  // Measured on this project's real output: three fresh downstream LLMs were
  // given the 癸酉 丁巳 辛丑 癸巳 chart and asked for day-master strength.
  // 3/3 judged 身弱 and 3/3 discounted the 巳酉丑三合金局 -- one wrote "这需要
  // 月令得气和天干引化……不利于金局的成立", answering the very question this
  // server declines to answer, then discarding the root support that does not
  // depend on that answer at all.
  //
  // Listing the criteria for transformation hands the verdict to a downstream
  // that will rule, and often rule wrong. The note has to say what survives
  // regardless -- that is what stopped the discount in the controlled rerun.
  it('every transformNote states what holds whether or not it transforms', async () => {
    const { detectAllInteractions } = await import('../src/core/interactions');
    const found = detectAllInteractions({
      year: '酉', month: '巳', day: '丑', hour: '巳',
      yearStem: '癸', monthStem: '丁', dayStem: '辛', hourStem: '癸',
    }) as { transformNote?: string; transformed?: unknown }[];
    const withNote = found.filter((f) => f.transformNote);
    expect(withNote.length).toBeGreaterThan(0);
    for (const f of withNote) {
      // The invariant: the constituent branches' own elemental contribution
      // does not evaporate just because the transformation is unsettled.
      expect(f.transformNote).toMatch(/无论化与不化|独立成立|不因未判定/);
    }
  });

  it('the metal trine in this chart is reported as present, not conditional', async () => {
    const { detectAllInteractions } = await import('../src/core/interactions');
    const found = detectAllInteractions({
      year: '酉', month: '巳', day: '丑', hour: '巳',
      yearStem: '癸', monthStem: '丁', dayStem: '辛', hourStem: '癸',
    }) as { type: string; potentialElement?: string; transformNote?: string }[];
    const trine = found.find((f) => f.type === 'TRINE');
    expect(trine).toBeDefined();
    expect(trine!.potentialElement).toBe('metal');
    expect(trine!.transformNote).toMatch(/通根|帮扶|独立/);
  });
});
