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
/** Cap on returned candidates. Disclosed by `lookupCityWithCount`. */
const MAX_RESULTS = 10;

export function lookupCity(query: string): CityEntry[] {
  return searchCities(query).slice(0, MAX_RESULTS);
}

function searchCities(query: string): CityEntry[] {
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

  // Deduplicate by city name, country, and province — same-name cities within
  // one country (e.g. Springfield, MO vs Springfield, IL) must stay distinct
  // candidates rather than being silently collapsed into one.
  const seen = new Set<string>();
  const results: CityEntry[] = [];

  for (const r of rawResults) {
    const key = `${r.city}|${r.country}|${r.province}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(toCityEntry(r));
    }
  }

  return results;
}

/**
 * Same search as `lookupCity`, but also reports how many cities actually
 * matched before the cap. A truncated list that does not say it is truncated
 * misrepresents how complete the answer is: "Santa" partial-matches 37
 * cities, and the caller's real birthplace can be among the ones dropped.
 */
export function lookupCityWithCount(query: string): { matched: number; results: CityEntry[] } {
  const all = searchCities(query);
  return { matched: all.length, results: all.slice(0, MAX_RESULTS) };
}

/** Candidate shape carried in a LocationError. Identifying fields only --
 * deliberately no population: that is a ranking signal, and publishing it
 * would move the guess this module refuses to make into the caller's prompt. */
export interface LocationCandidate {
  name: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export type LocationErrorCode =
  /** The name matched more than one real place. */
  | 'ambiguous_place'
  /** The name matched nothing in the city database. */
  | 'unknown_place'
  /** `place` was combined with a partial coordinate override. */
  | 'incomplete_coordinates';

/**
 * A refusal the caller can act on programmatically.
 *
 * The prose `message` is still the primary channel for a human or an LLM
 * reading the tool result, but an agent should not have to parse English to
 * find the candidate list. `code` is stable enough to branch on; `candidates`
 * is the list to ask the user about; `matched` is the TRUE number of hits, so
 * a capped list never reads as an exhaustive one.
 */
export class LocationError extends Error {
  readonly code: LocationErrorCode;
  readonly candidates: LocationCandidate[];
  readonly matched: number;

  constructor(code: LocationErrorCode, message: string, candidates: LocationCandidate[] = [], matched = 0) {
    super(message);
    this.name = 'LocationError';
    this.code = code;
    this.candidates = candidates;
    this.matched = matched;
  }

  /** The wire form the MCP layer serialises into an isError result. */
  toPayload(): Record<string, unknown> {
    return { code: this.code, message: this.message, matched: this.matched, candidates: this.candidates };
  }
}

const toCandidate = (c: CityEntry): LocationCandidate => ({
  name: c.name,
  province: c.province ?? '',
  country: c.country,
  latitude: c.latitude,
  longitude: c.longitude,
  timezone: c.timezone,
});

export interface ResolvedLocation {
  longitude: number;
  timezone: string;
  latitude?: number;
  province?: string;
  placeName?: string;
  alternateTimezones?: string[];
  locationSource: 'resolved' | 'caller_supplied' | 'mixed';
  mixedWarning?: string;
}

/**
 * Resolves location according to BaziInput contract:
 * - If explicit longitude AND timezone are provided, use them directly (locationSource: 'caller_supplied').
 * - If place is provided alone, look up coordinates and IANA timezone from global database (locationSource: 'resolved').
 * - If place is provided alongside custom timezone, coordinates are resolved and timezone is overridden (locationSource: 'mixed').
 * - If place is provided alongside both longitude AND timezone, explicit values are used (locationSource: 'caller_supplied').
 * - Partial mixing (place + only longitude without timezone) is strictly rejected to prevent geographical mismatches.
 * - If same-name cities all share one timezone: auto-pick (no chart impact).
 * - If same-name cities disagree on timezone: always throw with candidate list.
 * - If place cannot be resolved, throws descriptive error.
 */
export function resolveLocation(input: {
  place?: string;
  longitude?: number;
  timezone?: string;
}): ResolvedLocation {
  const hasPlace = Boolean(input.place);
  const hasLon = input.longitude !== undefined;
  const hasTz = Boolean(input.timezone);

  // 1. Both longitude + timezone provided (with or without place) -> caller_supplied
  if (hasLon && hasTz) {
    const mixedWarning = hasPlace
      ? `Both \`place\` ("${input.place}") and explicit coordinates (\`longitude: ${input.longitude}\`, \`timezone: "${input.timezone}"\`) were provided; explicit values were used.`
      : undefined;

    return {
      longitude: input.longitude!,
      timezone: input.timezone!,
      placeName: input.place,
      locationSource: 'caller_supplied',
      mixedWarning,
    };
  }

  // 2. Place provided with longitude only (missing timezone) -> Reject partial override
  if (hasPlace && hasLon && !hasTz) {
    throw new LocationError(
      'incomplete_coordinates',
      `Inconsistent location input: when overriding coordinates with \`longitude\` alongside \`place\` ("${input.place}"), \`timezone\` must also be explicitly provided.`
    );
  }

  // 3. Place provided (with optional timezone override)
  if (hasPlace) {
    const { matched, results: candidates } = lookupCityWithCount(input.place!);

    if (candidates.length === 0) {
      throw new LocationError(
        'unknown_place',
        `Could not recognize birth place "${input.place}". Please use an English city name (e.g. "Beijing", "New York", "Lagos"), or explicitly pass \`longitude\` and \`timezone\`.`
      );
    }

    if (candidates.length > 1) {
      const queryNorm = normalizeQuery(input.place!);
      const exactNameMatches = candidates.filter(c => normalizeQuery(c.name) === queryNorm);
      const sameTimezone = exactNameMatches.length > 0 &&
        exactNameMatches.every(c => c.timezone === exactNameMatches[0].timezone);

      // Same timezone is NOT the same place. Columbus OH (40.0N) and Columbus
      // GA (32.5N) share America/New_York, yet 7.5 deg of latitude moves the
      // Ascendant outright and the 2 deg of longitude between them is 8
      // minutes of true solar time -- enough to cross a Bazi hour-pillar
      // boundary. An earlier "same timezone, no chart impact" shortcut picked
      // one of them silently; these servers do not guess.
      //
      // What IS safe is collapsing entries that describe the same POINT:
      // Kansas City MO and Kansas City KS are adjacent and carry identical
      // coordinates here. Recognising that two records are one location is a
      // fact about the data, not a guess about the user's intent.
      const COORD_EPSILON = 0.1; // degrees, ~11 km -- below city-centroid noise
      const sameSpot = exactNameMatches.length > 0 &&
        Math.max(...exactNameMatches.map(c => c.latitude)) -
          Math.min(...exactNameMatches.map(c => c.latitude)) <= COORD_EPSILON &&
        Math.max(...exactNameMatches.map(c => c.longitude)) -
          Math.min(...exactNameMatches.map(c => c.longitude)) <= COORD_EPSILON;

      if (sameTimezone && sameSpot) {
        const city = candidates[0];
        const isAlternateTz = Boolean(input.timezone && city.alternateTimezones?.includes(input.timezone));
        const isCustomTz = Boolean(input.timezone && input.timezone !== city.timezone && !isAlternateTz);
        const locationSource: 'resolved' | 'mixed' = isCustomTz ? 'mixed' : 'resolved';
        const mixedWarning = isCustomTz
          ? `Place "${input.place}" was resolved for coordinates (${city.longitude}°), but custom timezone ("${input.timezone}") was supplied by caller.`
          : undefined;

        return {
          longitude: city.longitude,
          timezone: input.timezone || city.timezone,
          latitude: city.latitude,
          province: city.province,
          placeName: `${city.name} (${city.country})`,
          alternateTimezones: input.timezone ? undefined : city.alternateTimezones,
          locationSource,
          mixedWarning,
        };
      }

      // Timezones disagree -> always refuse and list candidates.
      // Getting the wrong timezone silently is catastrophic for a bazi chart.
      // The calling AI agent can easily clarify with the user and retry.
      // Refuse rather than pick, and give the agent what it needs to ASK --
      // but nothing that nudges it toward an answer. Province and country are
      // how a person recognises their own birthplace; the coordinates and
      // timezone let the agent retry without a second lookup.
      //
      // Population is deliberately NOT listed. It is not identifying
      // information -- nobody knows their birthplace by its population -- it
      // is a likelihood prior, and it is the exact signal behind the
      // auto-pick this code used to do. Publishing it here would just move
      // the guess up one level, from our code into the agent's prompt.
      // Cutting a long list for size is fine; not saying you cut it is not.
      // "Santa" partial-matches 37 cities, of which 10 survive the lookup cap
      // and 5 used to be printed -- the caller's real birthplace could be
      // among the ones that vanished, dropped by population rank, silently.
      const SHOWN = 5;
      const truncationNote = matched > SHOWN
        ? ` (showing ${Math.min(SHOWN, candidates.length)} of ${matched} matches, most populous first -- narrow the name if none of these is right)`
        : '';
      const listStr = candidates
        .slice(0, SHOWN)
        .map(
          c =>
            `• ${c.name} (${c.province || ''}, ${c.country})` +
            ` -> latitude: ${c.latitude}°, longitude: ${c.longitude}°, timezone: "${c.timezone}"`
        )
        .join('\n');
      throw new LocationError(
        'ambiguous_place',
        `Place name "${input.place}" matched multiple candidate cities -- different places, ` +
        `not necessarily different timezones, but far enough apart to change the chart. ` +
        `Ask which one was meant, then retry as \`"${input.place}, <province or country>"\` ` +
        `or with explicit \`longitude\` and \`timezone\`${truncationNote}:\n${listStr}`,
        candidates.map(toCandidate),
        matched
      );
    }

    const city = candidates[0];
    const isAlternateTz = Boolean(input.timezone && city.alternateTimezones?.includes(input.timezone));
    const isCustomTz = Boolean(input.timezone && input.timezone !== city.timezone && !isAlternateTz);
    const locationSource: 'resolved' | 'mixed' = isCustomTz ? 'mixed' : 'resolved';
    const mixedWarning = isCustomTz
      ? `Place "${input.place}" was resolved for coordinates (${city.longitude}°), but custom timezone ("${input.timezone}") was supplied by caller.`
      : undefined;

    return {
      longitude: city.longitude,
      timezone: input.timezone || city.timezone,
      latitude: city.latitude,
      province: city.province,
      placeName: `${city.name} (${city.country})`,
      alternateTimezones: input.timezone ? undefined : city.alternateTimezones,
      locationSource,
      mixedWarning,
    };
  }

  // 4. Incomplete longitude without timezone
  if (hasLon && !hasTz) {
    throw new LocationError(
      'incomplete_coordinates',
      `Longitude (${input.longitude}) was provided but \`timezone\` (IANA timezone name) is missing. Rounding longitude to infer a timezone is strictly forbidden; please explicitly specify \`timezone\`.`
    );
  }

  throw new LocationError(
    'incomplete_coordinates',
    'Missing birth location: please provide `place` (English city name, e.g. "Beijing", "New York", "Lagos"), or both `longitude` and `timezone`.'
  );
}
