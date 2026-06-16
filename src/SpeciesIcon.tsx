import React from 'react';

// Clean fish silhouettes for the bite forecast, chosen by species body-type.
// Single fill (currentColor) so they tint via CSS — consistent, no emojis.

type FishType = 'gamefish' | 'flatfish' | 'pelagic' | 'elongated' | 'panfish';

function classify(name: string): FishType {
  const n = name.toLowerCase();
  if (/flounder|fluke|halibut|\bsole\b|plaice|turbot|dab/.test(n)) return 'flatfish';
  if (/tuna|mahi|marlin|sailfish|wahoo|bonito|albacore|amberjack|cobia|king mackerel|spanish mackerel|\bjack\b|dorado/.test(n)) return 'pelagic';
  if (/pike|musky|muskie|barracuda|\bgar\b|needlefish|mackerel|\beel\b/.test(n)) return 'elongated';
  if (/crappie|bluegill|sunfish|\bperch\b|pumpkinseed|panfish|\bbream\b/.test(n)) return 'panfish';
  return 'gamefish';
}

const EYE = '#F5F0E8'; // sand — reads as an eye on the tinted body

const SHAPES: Record<FishType, React.ReactNode> = {
  // classic streamlined fish (bass, trout, redfish, snook, walleye, drum...)
  gamefish: (
    <>
      <path d="M2.5 12C5 8.4 8.8 6.7 12 6.7c3 0 5.2 1.7 6.4 4.6l-.1.7.1.7C17.2 15.6 15 17.3 12 17.3c-3.2 0-7-1.7-9.5-5.3z" />
      <path d="M17.8 12l5.2-3.2-1.4 3.2 1.4 3.2z" />
      <path d="M9.5 6.9l1.8-2.6 1.7 3.1z" />
      <circle cx="6.2" cy="10.4" r="1" fill={EYE} />
    </>
  ),
  // flatfish viewed from above — broad oval, two eyes close together
  flatfish: (
    <>
      <ellipse cx="10.8" cy="12" rx="8.4" ry="5.6" />
      <path d="M18.8 12l4.2-2.6v5.2z" />
      <circle cx="7.6" cy="10.2" r=".9" fill={EYE} />
      <circle cx="10.2" cy="10.2" r=".9" fill={EYE} />
    </>
  ),
  // fast pelagic — deeper body, deeply forked tail (tuna, mahi, cobia, jacks)
  pelagic: (
    <>
      <path d="M2.6 12c2.2-3.8 5.6-5.6 9.2-5.6 3.2 0 5.7 1.6 7.2 4.4l-.2 1.2.2 1.2c-1.5 2.8-4 4.4-7.2 4.4-3.6 0-7-1.8-9.2-5.6z" />
      <path d="M18.4 12l4.6-3.4-1.8 3.4 1.8 3.4z" />
      <path d="M9 6.8l1.6-2.4 1.2 3z" />
      <circle cx="6.6" cy="10.6" r="1" fill={EYE} />
    </>
  ),
  // long slender predator (pike, mackerel, barracuda, gar, eel)
  elongated: (
    <>
      <path d="M1.6 12c4-1.9 9.4-2.7 15.4-1.4l.2 1.4-.2 1.4C11 14.7 5.6 13.9 1.6 12z" />
      <path d="M16.6 12l6.4-2.6-1.6 2.6 1.6 2.6z" />
      <circle cx="4.6" cy="11.4" r=".9" fill={EYE} />
    </>
  ),
  // tall round-bodied panfish (crappie, bluegill, perch, sunfish)
  panfish: (
    <>
      <path d="M11 5.4c4.4 0 7.6 2.9 7.6 6.6S15.4 18.6 11 18.6c-3 0-5.6-1.3-7.1-3.4l-.3-3.2.3-3.2C5.4 6.7 8 5.4 11 5.4z" />
      <path d="M18 12l5-3v6z" />
      <circle cx="7.6" cy="10.4" r="1" fill={EYE} />
    </>
  ),
};

export default function SpeciesIcon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {SHAPES[classify(name)]}
    </svg>
  );
}
