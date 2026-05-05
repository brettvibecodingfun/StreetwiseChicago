/**
 * Chicago ZIP Code → Neighborhood Mapping
 * All 56 Chicago ZIP codes mapped to their primary neighborhood/community area.
 * Source: City of Chicago Data Portal - Chicago Zip Code and Neighborhood Map
 * https://data.cityofchicago.org/Facilities-Geographic-Boundaries/Chicago-Zip-Code-and-Neighborhood-Map/mapn-ahfc
 *
 * Note: Some ZIP codes span multiple neighborhoods. The value here reflects
 * the primary/dominant neighborhood.
 */

export const ZIP_TO_NEIGHBORHOOD: Record<string, string> = {
  "60601": "The Loop",
  "60602": "The Loop",
  "60603": "The Loop",
  "60604": "The Loop",
  "60605": "South Loop",
  "60606": "The Loop",
  "60607": "West Loop",
  "60608": "Pilsen",
  "60609": "Back of the Yards",
  "60610": "Gold Coast / Near North Side",
  "60611": "Streeterville / Magnificent Mile",
  "60612": "East Garfield Park",
  "60613": "Uptown / Wrigleyville",
  "60614": "Lincoln Park",
  "60615": "Hyde Park / Kenwood",
  "60616": "Chinatown / Near South Side",
  "60617": "South Chicago / East Side",
  "60618": "Avondale / Irving Park",
  "60619": "Chatham / Avalon Park",
  "60620": "Auburn Gresham",
  "60621": "Englewood",
  "60622": "Wicker Park / Bucktown",
  "60623": "Little Village",
  "60624": "West Garfield Park",
  "60625": "Albany Park / Lincoln Square",
  "60626": "Rogers Park",
  "60628": "Roseland / Pullman",
  "60629": "Chicago Lawn / Marquette Park",
  "60630": "Jefferson Park / Forest Glen",
  "60631": "Norwood Park / Edison Park",
  "60632": "Archer Heights / Brighton Park",
  "60633": "Hegewisch",
  "60634": "Dunning / Portage Park",
  "60636": "West Englewood",
  "60637": "Woodlawn / Washington Park",
  "60638": "Garfield Ridge / Clearing",
  "60639": "Belmont Cragin / Hermosa",
  "60640": "Edgewater / Andersonville",
  "60641": "Portage Park / Irving Park",
  "60642": "River West / Noble Square",
  "60643": "Beverly / Morgan Park",
  "60644": "Austin",
  "60645": "West Rogers Park / West Ridge",
  "60646": "Norwood Park / Sauganash",
  "60647": "Logan Square",
  "60649": "South Shore",
  "60651": "Humboldt Park",
  "60652": "Ashburn",
  "60653": "Bronzeville / Douglas",
  "60654": "River North",
  "60655": "Mount Greenwood",
  "60656": "O'Hare / Norwood Park",
  "60657": "Lakeview / Wrigleyville",
  "60659": "West Ridge / Peterson Park",
  "60660": "Edgewater / Rogers Park",
  "60661": "West Loop / Near West Side",
};

/** Sorted list of all unique neighborhood names. */
export const ALL_NEIGHBORHOODS: string[] =
  [...new Set(Object.values(ZIP_TO_NEIGHBORHOOD))].sort();

/**
 * Returns all ZIP codes that map to any of the given neighborhood names (exact match).
 */
export function getZipsForNeighborhoods(neighborhoods: string[]): string[] {
  const selected = new Set(neighborhoods);
  return Object.entries(ZIP_TO_NEIGHBORHOOD)
    .filter(([, name]) => selected.has(name))
    .map(([zip]) => zip);
}
