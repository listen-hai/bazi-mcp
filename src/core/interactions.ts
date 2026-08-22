import { BranchInteractionOutput } from '../types';

interface PillarBranches {
  year: string;
  month: string;
  day: string;
  hour: string;
  yearStem?: string;
  monthStem?: string;
  dayStem?: string;
  hourStem?: string;
}

interface InteractionDef {
  type: string;
  branches?: string[];
  stems?: string[];
  potentialElement?: string;
  description: string;
}

const STEM_COMBINATIONS: Array<{ stems: [string, string]; element: string; name: string }> = [
  { stems: ['甲', '己'], element: 'earth', name: '甲己相合' },
  { stems: ['乙', '庚'], element: 'metal', name: '乙庚相合' },
  { stems: ['丙', '辛'], element: 'water', name: '丙辛相合' },
  { stems: ['丁', '壬'], element: 'wood', name: '丁壬相合' },
  { stems: ['戊', '癸'], element: 'fire', name: '戊癸相合' },
];

const TRINES: Array<{ branches: [string, string, string]; element: string; name: string }> = [
  { branches: ['申', '子', '辰'], element: 'water', name: '申子辰三合水局' },
  { branches: ['寅', '午', '戌'], element: 'fire', name: '寅午戌三合火局' },
  { branches: ['巳', '酉', '丑'], element: 'metal', name: '巳酉丑三合金局' },
  { branches: ['亥', '卯', '未'], element: 'wood', name: '亥卯未三合木局' },
];

const DIRECTIONALS: Array<{ branches: [string, string, string]; element: string; name: string }> = [
  { branches: ['寅', '卯', '辰'], element: 'wood', name: '寅卯辰三会东方木' },
  { branches: ['巳', '午', '未'], element: 'fire', name: '巳午未三会南方火' },
  { branches: ['申', '酉', '戌'], element: 'metal', name: '申酉戌三会西方金' },
  { branches: ['亥', '子', '丑'], element: 'water', name: '亥子丑三会北方水' },
];

const HALF_TRINES: Array<{ branches: [string, string]; element: string; name: string }> = [
  // 生旺半合
  { branches: ['申', '子'], element: 'water', name: '申子半合水' },
  { branches: ['寅', '午'], element: 'fire', name: '寅午半合火' },
  { branches: ['巳', '酉'], element: 'metal', name: '巳酉半合金' },
  { branches: ['亥', '卯'], element: 'wood', name: '亥卯半合木' },
  // 墓库半合
  { branches: ['子', '辰'], element: 'water', name: '子辰半合水' },
  { branches: ['午', '戌'], element: 'fire', name: '午戌半合火' },
  { branches: ['酉', '丑'], element: 'metal', name: '酉丑半合金' },
  { branches: ['卯', '未'], element: 'wood', name: '卯未半合木' },
];

// 拱合: pairs that lack the cardinal branch (子午卯酉) of their trine. Mainstream doctrine
// holds these lack the 中神 needed to combine on their own, and only form when the element
// is transparent among the stems (透干) - weaker than a proper 半合.
const GONG_HE: Array<{ branches: [string, string]; element: string; stems: [string, string]; name: string }> = [
  { branches: ['申', '辰'], element: 'water', stems: ['壬', '癸'], name: '申辰拱合水' },
  { branches: ['寅', '戌'], element: 'fire', stems: ['丙', '丁'], name: '寅戌拱合火' },
  { branches: ['巳', '丑'], element: 'metal', stems: ['庚', '辛'], name: '巳丑拱合金' },
  { branches: ['亥', '未'], element: 'wood', stems: ['甲', '乙'], name: '亥未拱合木' },
];

const SIX_COMBINATIONS: Array<{ branches: [string, string]; element: string; name: string }> = [
  { branches: ['子', '丑'], element: 'earth', name: '子丑六合' },
  { branches: ['寅', '亥'], element: 'wood', name: '寅亥六合' },
  { branches: ['卯', '戌'], element: 'fire', name: '卯戌六合' },
  { branches: ['辰', '酉'], element: 'metal', name: '辰酉六合' },
  { branches: ['巳', '申'], element: 'water', name: '巳申六合' },
  { branches: ['午', '未'], element: 'earth', name: '午未六合' },
];

const CLASHES: Array<{ branches: [string, string]; name: string }> = [
  { branches: ['子', '午'], name: '子午相冲' },
  { branches: ['丑', '未'], name: '丑未相冲' },
  { branches: ['寅', '申'], name: '寅申相冲' },
  { branches: ['卯', '酉'], name: '卯酉相冲' },
  { branches: ['辰', '戌'], name: '辰戌相冲' },
  { branches: ['巳', '亥'], name: '巳亥相冲' },
];

const HARMS: Array<{ branches: [string, string]; name: string }> = [
  { branches: ['子', '未'], name: '子未相害' },
  { branches: ['丑', '午'], name: '丑午相害' },
  { branches: ['寅', '巳'], name: '寅巳相害' },
  { branches: ['卯', '辰'], name: '卯辰相害' },
  { branches: ['申', '亥'], name: '申亥相害' },
  { branches: ['酉', '戌'], name: '酉戌相害' },
];

const DESTRUCTIONS: Array<{ branches: [string, string]; name: string }> = [
  { branches: ['子', '酉'], name: '子酉相破' },
  { branches: ['卯', '午'], name: '卯午相破' },
  { branches: ['辰', '丑'], name: '辰丑相破' },
  { branches: ['戌', '未'], name: '戌未相破' },
  { branches: ['寅', '亥'], name: '寅亥相破' },
  { branches: ['巳', '申'], name: '巳申相破' },
];

const PUNISHMENTS: Array<{ branches: string[]; name: string; isSelf?: boolean }> = [
  // 无恩之刑 / 恃势之刑 (三刑组合)
  { branches: ['寅', '巳', '申'], name: '寅巳申三刑 (无恩之刑)' },
  { branches: ['丑', '戌', '未'], name: '丑戌未三刑 (恃势之刑)' },
  { branches: ['寅', '巳'], name: '寅巳相刑' },
  { branches: ['巳', '申'], name: '巳申相刑' },
  { branches: ['寅', '申'], name: '寅申相刑' },
  { branches: ['丑', '戌'], name: '丑戌相刑' },
  { branches: ['戌', '未'], name: '戌未相刑' },
  { branches: ['丑', '未'], name: '丑未相刑' },
  // 无礼之刑
  { branches: ['子', '卯'], name: '子卯相刑 (无礼之刑)' },
  // 自刑
  { branches: ['辰', '辰'], name: '辰辰自刑', isSelf: true },
  { branches: ['午', '午'], name: '午午自刑', isSelf: true },
  { branches: ['酉', '酉'], name: '酉酉自刑', isSelf: true },
  { branches: ['亥', '亥'], name: '亥亥自刑', isSelf: true },
];

/**
 * Detects all branch interactions across the 4 pillars with full support for:
 * - 三会 (DIRECTIONAL)
 * - 三合 (TRINE)
 * - 半合 (HALF_TRINE) / 拱合 (GONG_HE)
 * - 六合 (COMBINATION_2)
 * - 六冲 (CLASH)
 * - 六害 (HARM)
 * - 相刑 (PUNISHMENT)
 * - 相破 (DESTRUCTION)
 */
export function detectAllInteractions(pillars: PillarBranches): BranchInteractionOutput[] {
  const activePillars: Array<{ name: string; branch: string }> = [
    { name: 'year', branch: pillars.year },
    { name: 'month', branch: pillars.month },
    { name: 'day', branch: pillars.day },
  ];
  if (pillars.hour) {
    activePillars.push({ name: 'hour', branch: pillars.hour });
  }

  const results: BranchInteractionOutput[] = [];
  const seen = new Set<string>();

  const PILLAR_ORDER: Record<string, number> = {
    year: 0,
    month: 1,
    day: 2,
    hour: 3,
  };

  function sortPillars(pNames: string[]): string[] {
    return [...pNames].sort((a, b) => (PILLAR_ORDER[a] ?? 99) - (PILLAR_ORDER[b] ?? 99));
  }

  function addResult(
    type: string,
    branches: string[],
    pillarNames: string[],
    potentialElement?: string,
    description?: string,
    /**
     * Why this note must end with the invariant sentence: listing the criteria
     * for transformation hands the verdict to the downstream model, which
     * rules on it -- measured, 3/3 fresh LLMs answered "does not transform"
     * and then discarded the root support that never depended on that answer.
     * Stating what holds either way is what stopped the discount in a
     * controlled rerun. Declining to adjudicate is not enough if the decline
     * itself reads as a denial.
     */
    transformNote?: string
  ) {
    const sortedBranches = [...branches].sort().join('-');
    const key = `${type}:${sortedBranches}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        type,
        branches,
        pillars: sortPillars(pillarNames),
        potentialElement,
        transformed: transformNote ? null : undefined,
        description: description || `${type} (${branches.join('')})`,
        transformNote,
      });
    }
  }

  const branchMap = new Map<string, string[]>();
  for (const p of activePillars) {
    if (!branchMap.has(p.branch)) branchMap.set(p.branch, []);
    branchMap.get(p.branch)!.push(p.name);
  }

  const presentStems = new Set(
    [pillars.yearStem, pillars.monthStem, pillars.dayStem, pillars.hourStem].filter(
      (s): s is string => !!s
    )
  );

  // 0. 天干五合 (Heavenly Stem Combinations)
  if (pillars.yearStem && pillars.monthStem && pillars.dayStem) {
    const activeStems: Array<{ name: string; stem: string }> = [
      { name: 'year', stem: pillars.yearStem },
      { name: 'month', stem: pillars.monthStem },
      { name: 'day', stem: pillars.dayStem },
    ];
    if (pillars.hourStem) {
      activeStems.push({ name: 'hour', stem: pillars.hourStem });
    }

    const stemMap = new Map<string, string[]>();
    for (const p of activeStems) {
      if (!stemMap.has(p.stem)) stemMap.set(p.stem, []);
      stemMap.get(p.stem)!.push(p.name);
    }

    for (const sc of STEM_COMBINATIONS) {
      if (sc.stems.every(s => stemMap.has(s))) {
        const pNames = sc.stems.flatMap(s => stemMap.get(s)!);
        const sortedStems = [...sc.stems].sort().join('-');
        const key = `STEM_COMBINATION:${sortedStems}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            type: 'STEM_COMBINATION',
            stems: sc.stems,
            pillars: sortPillars(pNames),
            potentialElement: sc.element,
            transformed: null,
            description: `Stem Combination (${sc.name})`,
            transformNote: '是否化神需结合月令得气、争合妒合与引化条件综合判定，本服务不作武断判定。无论化与不化，参与本局各支所藏的本气/中气/余气对日主的通根帮扶均独立成立，不因未判定化气而失效',
          });
        }
      }
    }
  }

  // 1. 三会 (Directionals)
  for (const d of DIRECTIONALS) {
    if (d.branches.every(b => branchMap.has(b))) {
      const pNames = d.branches.flatMap(b => branchMap.get(b)!);
      addResult(
        'DIRECTIONAL',
        d.branches,
        pNames,
        d.element,
        `Directional (${d.name})`,
        '三会局之化气需结合月令得气与透干引化情况，本服务不作武断判定。无论化与不化，参与本局各支所藏的本气/中气/余气对日主的通根帮扶均独立成立，不因未判定化气而失效'
      );
    }
  }

  // 2. 三合 (Trines)
  const fullTrineElements = new Set<string>();
  for (const t of TRINES) {
    if (t.branches.every(b => branchMap.has(b))) {
      const pNames = t.branches.flatMap(b => branchMap.get(b)!);
      addResult(
        'TRINE',
        t.branches,
        pNames,
        t.element,
        `Trine (${t.name})`,
        '三合局之化气需结合月令得气与透干引化情况，本服务不作武断判定。无论化与不化，参与本局各支所藏的本气/中气/余气对日主的通根帮扶均独立成立，不因未判定化气而失效'
      );
      fullTrineElements.add(t.element);
    }
  }

  // 3. 半合 (Half Trines with cardinal - only report if full trine is not already present)
  for (const ht of HALF_TRINES) {
    if (!fullTrineElements.has(ht.element) && ht.branches.every(b => branchMap.has(b))) {
      const pNames = ht.branches.flatMap(b => branchMap.get(b)!);
      addResult(
        'HALF_TRINE',
        ht.branches,
        pNames,
        ht.element,
        `Half-Trine (${ht.name})`,
        '半合之化气需视月令与透干引化情况'
      );
    }
  }

  // 3b. 拱合 (pairs lacking the cardinal branch - only form when their element is 透干)
  for (const gh of GONG_HE) {
    if (fullTrineElements.has(gh.element) || !gh.branches.every(b => branchMap.has(b))) continue;
    const transparentStem = gh.stems.find(s => presentStems.has(s));
    if (!transparentStem) continue;
    const pNames = gh.branches.flatMap(b => branchMap.get(b)!);
    addResult(
      'GONG_HE',
      gh.branches,
      pNames,
      gh.element,
      `Gong-He (${gh.name})`,
      `因${transparentStem}透干而成拱合，力量较真半合为弱`
    );
  }

  // 4. 六合 (Six Combinations)
  for (const sc of SIX_COMBINATIONS) {
    if (sc.branches.every(b => branchMap.has(b))) {
      const pNames = sc.branches.flatMap(b => branchMap.get(b)!);
      addResult(
        'COMBINATION_2',
        sc.branches,
        pNames,
        sc.element,
        `Combination (${sc.name})`,
        '是否化神需结合月令与引化条件综合判定'
      );
    }
  }

  // 5. 六冲 (Clashes)
  for (const cl of CLASHES) {
    if (cl.branches.every(b => branchMap.has(b))) {
      const pNames = cl.branches.flatMap(b => branchMap.get(b)!);
      addResult('CLASH', cl.branches, pNames, undefined, `Clash (${cl.name})`);
    }
  }

  // 6. 六害 (Harms)
  for (const h of HARMS) {
    if (h.branches.every(b => branchMap.has(b))) {
      const pNames = h.branches.flatMap(b => branchMap.get(b)!);
      addResult('HARM', h.branches, pNames, undefined, `Harm (${h.name})`);
    }
  }

  // 7. 相破 (Destructions)
  for (const des of DESTRUCTIONS) {
    if (des.branches.every(b => branchMap.has(b))) {
      const pNames = des.branches.flatMap(b => branchMap.get(b)!);
      addResult('DESTRUCTION', des.branches, pNames, undefined, `Destruction (${des.name})`);
    }
  }

  // 8. 相刑 (Punishments)
  // Full triple punishments (寅巳申, 丑戌未) whose branches are all present are tracked here so
  // their pairwise subsets (寅巳/巳申/寅申, 丑戌/戌未/丑未) are suppressed once the triple already
  // fired — otherwise a complete triple emits 4 entries (the triple + all 3 pairs) instead of 1.
  // A pair still fires normally when the third branch is absent.
  const firedTriplePunishments: Set<string>[] = [];
  for (const pun of PUNISHMENTS) {
    if (pun.isSelf) {
      const b = pun.branches[0];
      const pNames = branchMap.get(b) || [];
      if (pNames.length >= 2) {
        addResult('PUNISHMENT', pun.branches, pNames, undefined, `Punishment (${pun.name})`);
      }
    } else if (pun.branches.length === 3) {
      if (pun.branches.every(b => branchMap.has(b))) {
        const pNames = pun.branches.flatMap(b => branchMap.get(b)!);
        addResult('PUNISHMENT', pun.branches, pNames, undefined, `Punishment (${pun.name})`);
        firedTriplePunishments.push(new Set(pun.branches));
      }
    } else if (pun.branches.length === 2) {
      // 2-branch punishment (skip if it's a subset of an already-fired triple punishment)
      const isSubsetOfFiredTriple = firedTriplePunishments.some(triple =>
        pun.branches.every(b => triple.has(b))
      );
      if (!isSubsetOfFiredTriple && pun.branches.every(b => branchMap.has(b))) {
        const pNames = pun.branches.flatMap(b => branchMap.get(b)!);
        addResult('PUNISHMENT', pun.branches, pNames, undefined, `Punishment (${pun.name})`);
      }
    }
  }

  return results;
}
