// Navigation data for the Fishing Tips overflow menu.
//
// This MIRRORS scripts/tip-links.js (SPECIES_TIPS + CONDITIONS_TIPS). The React
// app can't import that CommonJS generator module (it lives outside src/), so the
// list is duplicated here. Keep the two in sync when adding/removing tip pages.

export interface TipLink { slug: string; title: string; }

export const READING_CONDITIONS: TipLink[] = [
  { slug: 'reading-freshwater-conditions', title: 'How to Read Freshwater Conditions' },
  { slug: 'reading-saltwater-conditions', title: 'How to Read Saltwater Fishing Conditions' },
];

export const FRESHWATER_SPECIES: TipLink[] = [
  { slug: 'largemouth-bass', title: 'Largemouth Bass' },
  { slug: 'smallmouth-bass', title: 'Smallmouth Bass' },
  { slug: 'rainbow-trout', title: 'Rainbow Trout' },
  { slug: 'brown-trout', title: 'Brown Trout' },
  { slug: 'brook-trout', title: 'Brook Trout' },
  { slug: 'walleye', title: 'Walleye' },
  { slug: 'crappie', title: 'Crappie' },
  { slug: 'bluegill', title: 'Bluegill' },
  { slug: 'yellow-perch', title: 'Yellow Perch' },
  { slug: 'channel-catfish', title: 'Channel Catfish' },
  { slug: 'northern-pike', title: 'Northern Pike' },
];

export const SALTWATER_SPECIES: TipLink[] = [
  { slug: 'striped-bass', title: 'Striped Bass' },
  { slug: 'redfish', title: 'Redfish (Red Drum)' },
  { slug: 'speckled-trout', title: 'Speckled Trout' },
  { slug: 'fluke', title: 'Fluke (Summer Flounder)' },
  { slug: 'snook', title: 'Snook' },
  { slug: 'sheepshead', title: 'Sheepshead' },
  { slug: 'black-drum', title: 'Black Drum' },
  { slug: 'florida-pompano', title: 'Florida Pompano' },
  { slug: 'black-sea-bass', title: 'Black Sea Bass' },
  { slug: 'tautog', title: 'Tautog (Blackfish)' },
  { slug: 'bluefish', title: 'Bluefish' },
  { slug: 'kingfish', title: 'Kingfish (Whiting)' },
  { slug: 'red-snapper', title: 'Red Snapper' },
  { slug: 'spanish-mackerel', title: 'Spanish Mackerel' },
];
