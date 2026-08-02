/**
 * The flight layer — how the camera got between the places.
 *
 * places.ts is the archive's WHERE and outings.ts its WHEN; this is the route
 * that connects them, transcribed from Rouven's Passport app (2026-07-27
 * screenshots). It works to the same honesty standard as the place sheet:
 * every row states where it came from. `logged: false` marks a leg the app
 * never had and Rouven recalled himself — real travel, reconstructed date.
 * The app's own year counts (13 flights in 2025, 17 in 2026) reconcile
 * exactly with the `logged: true` rows, so the transcription is complete.
 *
 * Airport coordinates are public facts, to the airport — unlike place
 * coordinates these are nobody's recollection, so recording them at full
 * precision claims nothing that isn't known.
 *
 * Nothing renders this yet. It exists so the globe can draw the route as
 * arcs (the accent hairline tracing how the archive was actually made) and
 * so log dates can be cross-checked against the itinerary. Chronological,
 * oldest first: this file reads as the trip happened.
 */

export interface Airport {
  /** IATA code, the key used by flight legs */
  code: string
  /** lowercase city label, matching the site's voice */
  city: string
  /** [latitude, longitude] of the airport itself */
  coords: [number, number]
}

export interface FlightLeg {
  /** ISO date as the app logged it; null when the leg isn't in the app */
  date: string | null
  /** airline + number as logged; null for reconstructed legs */
  flight: string | null
  /** IATA codes into `airports` */
  from: string
  to: string
  /** false = reconstructed from memory, not present in the app */
  logged: boolean
  /** only where a row needs its provenance stated */
  note?: string
}

export const airports: Record<string, Airport> = {
  BER: { code: 'BER', city: 'berlin', coords: [52.3667, 13.5033] },
  DOH: { code: 'DOH', city: 'doha', coords: [25.2731, 51.6081] },
  CPT: { code: 'CPT', city: 'cape town', coords: [-33.9648, 18.6017] },
  NTE: { code: 'NTE', city: 'nantes', coords: [47.1532, -1.6108] },
  LIS: { code: 'LIS', city: 'lisbon', coords: [38.7742, -9.1342] },
  HAM: { code: 'HAM', city: 'hamburg', coords: [53.6304, 9.9882] },
  BSL: { code: 'BSL', city: 'basel', coords: [47.5896, 7.5299] },
  ALC: { code: 'ALC', city: 'alicante', coords: [38.2822, -0.5582] },
  MAD: { code: 'MAD', city: 'madrid', coords: [40.4936, -3.5668] },
  VCE: { code: 'VCE', city: 'venice', coords: [45.5053, 12.3519] },
  BCN: { code: 'BCN', city: 'barcelona', coords: [41.2974, 2.0833] },
  FRA: { code: 'FRA', city: 'frankfurt', coords: [50.0379, 8.5622] },
  AUH: { code: 'AUH', city: 'abu dhabi', coords: [24.4331, 54.6511] },
  DPS: { code: 'DPS', city: 'denpasar', coords: [-8.7482, 115.1672] },
  SUB: { code: 'SUB', city: 'surabaya', coords: [-7.3798, 112.7871] },
  HAN: { code: 'HAN', city: 'hanoi', coords: [21.2212, 105.8072] },
  DAD: { code: 'DAD', city: 'da nang', coords: [16.0439, 108.1994] },
  CNX: { code: 'CNX', city: 'chiang mai', coords: [18.7668, 98.9626] },
  // same city string as BKK on purpose: the waypoint layer labels cities,
  // not terminals, and the two collapse to whichever flew more legs
  DMK: { code: 'DMK', city: 'bangkok', coords: [13.9126, 100.6068] },
  BKK: { code: 'BKK', city: 'bangkok', coords: [13.69, 100.7501] },
  SGN: { code: 'SGN', city: 'ho chi minh city', coords: [10.8188, 106.652] },
  BNE: { code: 'BNE', city: 'brisbane', coords: [-27.3842, 153.1175] },
  OOL: { code: 'OOL', city: 'gold coast', coords: [-28.1644, 153.5047] },
  SYD: { code: 'SYD', city: 'sydney', coords: [-33.9399, 151.1753] },
  ZQN: { code: 'ZQN', city: 'queenstown', coords: [-45.0211, 168.7392] },
  MNL: { code: 'MNL', city: 'manila', coords: [14.5086, 121.0194] },
  HND: { code: 'HND', city: 'tokyo', coords: [35.5494, 139.7798] },
  SIN: { code: 'SIN', city: 'singapore', coords: [1.3644, 103.9915] },
  USM: { code: 'USM', city: 'koh samui', coords: [9.5478, 100.0623] },
  BAH: { code: 'BAH', city: 'bahrain', coords: [26.2708, 50.6336] },
  CDG: { code: 'CDG', city: 'paris', coords: [49.0097, 2.5479] },
}

export const flights: FlightLeg[] = [
  // cape town, early 2025 — all four legs confirmed by Rouven, none in the app
  { date: null, flight: null, from: 'BER', to: 'DOH', logged: false },
  { date: null, flight: null, from: 'DOH', to: 'CPT', logged: false },
  { date: null, flight: null, from: 'CPT', to: 'DOH', logged: false },
  { date: null, flight: null, from: 'DOH', to: 'BER', logged: false },

  // the european summer
  { date: '2025-06-30', flight: 'U2 7610', from: 'NTE', to: 'LIS', logged: true },
  { date: '2025-07-04', flight: 'TP 560', from: 'LIS', to: 'HAM', logged: true },
  { date: '2025-08-20', flight: 'EC 5500', from: 'BSL', to: 'ALC', logged: true },
  { date: '2025-09-02', flight: 'IB 677', from: 'MAD', to: 'VCE', logged: true },
  { date: '2025-09-21', flight: 'VY 1883', from: 'BER', to: 'BCN', logged: true },
  { date: '2025-10-01', flight: 'VY 1886', from: 'BCN', to: 'BER', logged: true },

  // 14 oct 2025: the one-way east. Everything from here to CDG is one
  // unbroken nine-month trip — vol. 02.
  { date: '2025-10-14', flight: 'EY 122', from: 'FRA', to: 'AUH', logged: true },
  { date: '2025-10-14', flight: 'EY 476', from: 'AUH', to: 'DPS', logged: true },
  {
    date: '2025-12-08',
    flight: 'QG 698',
    from: 'SUB',
    to: 'DPS',
    logged: true,
    note: 'the outbound to surabaya was overland — only the flight back exists',
  },
  { date: '2025-12-09', flight: 'VJ 900', from: 'DPS', to: 'HAN', logged: true },
  { date: '2025-12-16', flight: 'VJ 501', from: 'HAN', to: 'DAD', logged: true },
  { date: '2025-12-20', flight: 'VJ 516', from: 'DAD', to: 'HAN', logged: true },
  { date: '2025-12-21', flight: 'FD 871', from: 'HAN', to: 'CNX', logged: true },
  { date: '2026-01-06', flight: 'SL 507', from: 'CNX', to: 'DMK', logged: true },
  { date: '2026-01-15', flight: 'VJ 1964', from: 'BKK', to: 'DAD', logged: true },
  { date: '2026-02-04', flight: 'VJ 1621', from: 'DAD', to: 'SGN', logged: true },
  { date: '2026-02-04', flight: 'VJ 83', from: 'SGN', to: 'BNE', logged: true },
  {
    date: null,
    flight: null,
    from: 'OOL',
    to: 'SYD',
    logged: true,
    note: 'in the app, but the date was cut off in the screenshot — feb/mar 2026',
  },
  { date: null, flight: null, from: 'SYD', to: 'ZQN', logged: false },
  { date: '2026-03-27', flight: 'VA 162', from: 'ZQN', to: 'SYD', logged: true },
  { date: '2026-03-27', flight: 'VA 65', from: 'SYD', to: 'DPS', logged: true },
  { date: '2026-04-04', flight: 'PR 538', from: 'DPS', to: 'MNL', logged: true },
  { date: '2026-04-04', flight: 'PR 422', from: 'MNL', to: 'HND', logged: true },
  { date: '2026-05-10', flight: 'TR 883', from: 'HND', to: 'SIN', logged: true },
  { date: '2026-05-10', flight: 'TR 288', from: 'SIN', to: 'DPS', logged: true },
  { date: '2026-06-15', flight: 'TR 289', from: 'DPS', to: 'SIN', logged: true },
  { date: '2026-06-15', flight: 'TR 626', from: 'SIN', to: 'BKK', logged: true },
  { date: '2026-06-24', flight: 'PG 451', from: 'DMK', to: 'USM', logged: true },
  { date: '2026-07-09', flight: 'PG 144', from: 'USM', to: 'BKK', logged: true },
  { date: '2026-07-09', flight: 'GF 153', from: 'BKK', to: 'BAH', logged: true },
  { date: '2026-07-10', flight: 'GF 19', from: 'BAH', to: 'CDG', logged: true },
  // nothing after CDG — the paris → home leg was never logged
]

/**
 * The flown route as coordinate pairs for the globe's arc layer, every leg
 * including the reconstructed ones — an unlogged flight still happened.
 * Routes flown more than once overdraw and render brighter, which is honest:
 * the bali–singapore corridor WAS the spine of the year.
 */
export const flightArcs = flights.map(
  (leg) =>
    [airports[leg.from].coords, airports[leg.to].coords] as [
      [number, number],
      [number, number],
    ]
)

/**
 * One airport per city, for the globe's waypoint labels. A city served by two
 * airports (bangkok: BKK and DMK) keeps the one that flew more legs — the
 * label marks the city, not the terminal. `legCount` ships so the label layer
 * can rank: a hub flown through four times reads louder than a one-off hop.
 */
export const waypointAirports: (Airport & { legCount: number })[] = (() => {
  const uses = new Map<string, number>()
  for (const leg of flights) {
    uses.set(leg.from, (uses.get(leg.from) ?? 0) + 1)
    uses.set(leg.to, (uses.get(leg.to) ?? 0) + 1)
  }
  const byCity = new Map<string, Airport & { legCount: number }>()
  for (const airport of Object.values(airports)) {
    const count = uses.get(airport.code)
    if (!count) continue
    const held = byCity.get(airport.city)
    if (!held || count > held.legCount) {
      byCity.set(airport.city, { ...airport, legCount: count })
    }
  }
  return [...byCity.values()]
})()
