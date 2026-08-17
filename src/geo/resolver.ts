import { find as findTimezones } from 'geo-tz';
import cityTimezones, { CityTimezoneEntry } from 'city-timezones';
import { CityEntry } from '../types';

/**
 * Normalizes query string for fuzzy search:
 * - Decomposes diacritics via Unicode NFD (e.g. "São Paulo" -> "Sao Paulo", "Reykjavík" -> "Reykjavik")
 * - Removes non-spacing marks, punctuation, quotes, and whitespace.
 */
function normalizeQuery(q: string): string {
  return q
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s,\-_\.']/g, '')
    .trim();
}

/**
 * Converts a city-timezones entry to our CityEntry format, using geo-tz (real
 * timezone-boundary polygons, 1970-era dataset) to ensure authoritative IANA
 * timezone resolution. Coordinates that fall inside more than one timezone
 * boundary (border overlaps, or genuine dual civil-time regions) yield more
 * than one candidate; `alternateTimezones` carries the rest.
 *
 * Picking the default among candidates is domain knowledge, not geography:
 * China has used a single civil time zone (Beijing time, Asia/Shanghai, UTC+8)
 * nationwide since 1949 and mainland birth records use it, so when Asia/Shanghai
 * is among the candidates for a CN city, it wins regardless of polygon order.
 */
function toCityEntry(ct: CityTimezoneEntry): CityEntry {
  let candidates: string[];
  try {
    candidates = findTimezones(ct.lat, ct.lng);
  } catch {
    candidates = [];
  }
  if (candidates.length === 0) {
    candidates = [ct.timezone];
  }

  const timezone =
    ct.iso2 === 'CN' && candidates.includes('Asia/Shanghai')
      ? 'Asia/Shanghai'
      : candidates[0];
  const alternateTimezones = candidates.filter(tz => tz !== timezone);

  return {
    name: ct.city,
    country: ct.iso2,
    province: ct.province,
    longitude: ct.lng,
    latitude: ct.lat,
    timezone,
    alternateTimezones: alternateTimezones.length > 0 ? alternateTimezones : undefined,
  };
}

/**
 * Searches the global city-timezones database (7,329 cities, 227 countries).
 * Supports English city names, with fuzzy matching on city and city_ascii fields,
 * prioritized by city population descending.
 */
export function lookupCity(query: string): CityEntry[] {
  if (!query || !query.trim()) return [];

  const norm = normalizeQuery(query);
  const db: CityTimezoneEntry[] = cityTimezones.cityMapping;

  const exactMatches: CityTimezoneEntry[] = [];
  const partialMatches: CityTimezoneEntry[] = [];

  for (const city of db) {
    const nameNorm = normalizeQuery(city.city);
    const asciiNorm = normalizeQuery(city.city_ascii);
    const provinceNorm = normalizeQuery(city.province || '');
    const countryNorm = normalizeQuery(city.country || '');

    // 1. Exact match on city name or ASCII name
    if (nameNorm === norm || asciiNorm === norm) {
      exactMatches.push(city);
      continue;
    }

    // 2. "City, State/Province" style query (e.g. "San Francisco, CA" or "Tacoma, WA")
    if (norm.includes(asciiNorm) || norm.includes(nameNorm)) {
      const remainder = norm.replace(asciiNorm, '').replace(nameNorm, '');
      if (
        remainder.length === 0 ||
        provinceNorm.includes(remainder) ||
        countryNorm.includes(remainder) ||
        (city.state_ansi && normalizeQuery(city.state_ansi) === remainder)
      ) {
        exactMatches.push(city);
        continue;
      }
    }

    // 3. Partial / prefix match
    if (
      nameNorm.includes(norm) ||
      asciiNorm.includes(norm) ||
      (norm.length >= 3 && (nameNorm.startsWith(norm) || asciiNorm.startsWith(norm)))
    ) {
      partialMatches.push(city);
    }
  }

  // Sort by population descending so major cities take precedence
  const rawResults = exactMatches.length > 0 ? exactMatches : partialMatches;
  rawResults.sort((a, b) => (b.pop || 0) - (a.pop || 0));

  // Deduplicate by city name and country
  const seen = new Set<string>();
  const results: CityEntry[] = [];

  for (const r of rawResults) {
    const key = `${r.city}|${r.country}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(toCityEntry(r));
    }
  }

  return results.slice(0, 10);
}

export interface ResolvedLocation {
  longitude: number;
  timezone: string;
  latitude?: number;
  placeName?: string;
  alternateTimezones?: string[];
}

/**
 * Resolves location according to BaziInput contract:
 * - If explicit longitude AND timezone are provided, use them directly.
 * - If place is provided, look up coordinates and IANA timezone from global database.
 * - If place resolves to multiple candidates, disambiguates or reports candidates.
 * - If place cannot be resolved, throws descriptive error.
 *
 * Note: latitude is not accepted as an input (docs/spec.md §5, 纬度不收) — only
 * longitude + timezone or place are supported entry points.
 */
export function resolveLocation(input: {
  place?: string;
  longitude?: number;
  timezone?: string;
}): ResolvedLocation {
  // 1. Explicit longitude + timezone provided
  if (input.longitude !== undefined && input.timezone) {
    return {
      longitude: input.longitude,
      timezone: input.timezone,
      placeName: input.place,
    };
  }

  // 2. Place provided
  if (input.place) {
    const candidates = lookupCity(input.place);

    if (candidates.length === 0) {
      throw new Error(
        `未能识别出生地 "${input.place}"。请使用英文城市名（如 "Beijing", "New York", "Lagos"），或显式传入 \`longitude\` 和 \`timezone\`。`
      );
    }

    if (candidates.length > 1) {
      const topName = normalizeQuery(candidates[0].name);
      const queryNorm = normalizeQuery(input.place);
      if (topName === queryNorm) {
        const city = candidates[0];
        return {
          longitude: input.longitude !== undefined ? input.longitude : city.longitude,
          timezone: input.timezone || city.timezone,
          latitude: city.latitude,
          placeName: `${city.name} (${city.country})`,
          alternateTimezones: input.timezone ? undefined : city.alternateTimezones,
        };
      }

      const listStr = candidates
        .slice(0, 5)
        .map(
          c =>
            `• ${c.name} (${c.province || ''}, ${c.country}) -> 经度: ${c.longitude}°, 时区: "${c.timezone}"`
        )
        .join('\n');
      throw new Error(
        `地名 "${input.place}" 匹配到多个候选城市，请更精确指定（如 "San Francisco, CA"）或显式指定 \`longitude\` 与 \`timezone\`:\n${listStr}`
      );
    }

    const city = candidates[0];
    return {
      longitude: input.longitude !== undefined ? input.longitude : city.longitude,
      timezone: input.timezone || city.timezone,
      latitude: city.latitude,
      placeName: `${city.name} (${city.country})`,
      alternateTimezones: input.timezone ? undefined : city.alternateTimezones,
    };
  }

  // 3. Only longitude provided without timezone
  if (input.longitude !== undefined) {
    if (!input.timezone) {
      throw new Error(
        `提供了经度 (${input.longitude}) 但缺少 \`timezone\` (IANA 时区名) 或 \`place\`。严禁通过经度四舍五入推算时区，请显式指定 \`timezone\`。`
      );
    }

    return {
      longitude: input.longitude,
      timezone: input.timezone,
    };
  }

  throw new Error(
    '缺少出生地信息：请提供 `place` (英文城市名，如 "Beijing", "New York", "Lagos")，或同时提供 `longitude` 与 `timezone`。'
  );
}
