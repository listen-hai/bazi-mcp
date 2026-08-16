declare module 'city-timezones' {
  export interface CityTimezoneEntry {
    city: string;
    city_ascii: string;
    lat: number;
    lng: number;
    pop: number;
    country: string;
    iso2: string;
    iso3: string;
    province: string;
    state_ansi?: string;
    timezone: string;
  }

  export function lookupViaCity(city: string): CityTimezoneEntry[];
  export function findFromCityStateProvince(cityStateProvince: string): CityTimezoneEntry[];
  export function findFromIsoCode(isoCode: string): CityTimezoneEntry[];
  export const cityMapping: CityTimezoneEntry[];
}

declare module '@photostructure/tz-lookup' {
  export default function tzlookup(latitude: number, longitude: number): string;
}
