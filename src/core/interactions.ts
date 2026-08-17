import { BranchInteractionOutput } from '../types';

interface PillarBranches {
  year: string;
  month: string;
  day: string;
  hour: string;
}

interface InteractionDef {
  type: string;
  branches: string[];
  resultElement?: string;
  description: string;
}

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
  // 拱合
  { branches: ['申', '辰'], element: 'water', name: '申辰拱合水' },
  { branches: ['寅', '戌'], element: 'fire', name: '寅戌拱合火' },
  { branches: ['巳', '丑'], element: 'metal', name: '巳丑拱合金' },
  { branches: ['亥', '未'], element: 'wood', name: '亥未拱合木' },
];

const SIX_COMBINATIONS: Array<{ branches: [string, string]; element: string; name: string }> = [
  { branches: ['子', '丑'], element: 'earth', name: '子丑六合土' },
  { branches: ['寅', '亥'], element: 'wood', name: '寅亥六合木' },
  { branches: ['卯', '戌'], element: 'fire', name: '卯戌六合火' },
  { branches: ['辰', '酉'], element: 'metal', name: '辰酉六合金' },
  { branches: ['巳', '申'], element: 'water', name: '巳申六合水' },
  { branches: ['午', '未'], element: 'earth', name: '午未六合土' },
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
 * - 半合 / 拱合 (HALF_TRINE)
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

  function addResult(type: string, branches: string[], pillarNames: string[], resultElement?: string, description?: string) {
    const sortedBranches = [...branches].sort().join('-');
    const key = `${type}:${sortedBranches}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        type,
        branches,
        pillars: pillarNames,
        resultElement,
        description: description || `${type} (${branches.join('')})`,
      });
    }
  }

  const branchMap = new Map<string, string[]>();
  for (const p of activePillars) {
    if (!branchMap.has(p.branch)) branchMap.set(p.branch, []);
    branchMap.get(p.branch)!.push(p.name);
  }

  // 1. 三会 (Directionals)
  for (const d of DIRECTIONALS) {
    if (d.branches.every(b => branchMap.has(b))) {
      const pNames = d.branches.flatMap(b => branchMap.get(b)!);
      addResult('DIRECTIONAL', d.branches, pNames, d.element, `Directional (${d.name})`);
    }
  }

  // 2. 三合 (Trines)
  const fullTrineElements = new Set<string>();
  for (const t of TRINES) {
    if (t.branches.every(b => branchMap.has(b))) {
      const pNames = t.branches.flatMap(b => branchMap.get(b)!);
      addResult('TRINE', t.branches, pNames, t.element, `Trine (${t.name})`);
      fullTrineElements.add(t.element);
    }
  }

  // 3. 半合 / 拱合 (Half Trines - only report if full trine is not already present)
  for (const ht of HALF_TRINES) {
    if (!fullTrineElements.has(ht.element) && ht.branches.every(b => branchMap.has(b))) {
      const pNames = ht.branches.flatMap(b => branchMap.get(b)!);
      addResult('HALF_TRINE', ht.branches, pNames, ht.element, `Half-Trine (${ht.name})`);
    }
  }

  // 4. 六合 (Six Combinations)
  for (const sc of SIX_COMBINATIONS) {
    if (sc.branches.every(b => branchMap.has(b))) {
      const pNames = sc.branches.flatMap(b => branchMap.get(b)!);
      addResult('COMBINATION_2', sc.branches, pNames, sc.element, `Combination (${sc.name})`);
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
      }
    } else if (pun.branches.length === 2) {
      // 2-branch punishment
      if (pun.branches.every(b => branchMap.has(b))) {
        const pNames = pun.branches.flatMap(b => branchMap.get(b)!);
        addResult('PUNISHMENT', pun.branches, pNames, undefined, `Punishment (${pun.name})`);
      }
    }
  }

  return results;
}
