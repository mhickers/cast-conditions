import React, { useId } from 'react';

// Species icons for the bite forecast. The body silhouette itself differs per
// species (long pike, round panfish, flat flounder, football tuna, steep mahi,
// broad-headed catfish...) plus signature markings — stripes, whiskers, tail
// spot, lateral line. Single fill (currentColor) so they tint via CSS.
// viewBox is 40x26 (fish are wider than tall) and renders larger than icon-size.

type FishType =
  | 'gamefish' | 'stripedBass' | 'flatfish' | 'tuna' | 'mahi' | 'tarpon'
  | 'snook' | 'redfish' | 'trout' | 'salmon' | 'pike' | 'catfish' | 'panfish';

function classify(name: string): FishType {
  const n = name.toLowerCase();
  if (/striped bass|striper/.test(n)) return 'stripedBass';
  if (/flounder|fluke|halibut|\bsole\b|plaice|turbot|\bdab\b/.test(n)) return 'flatfish';
  if (/tuna|albacore|bonito|tunny/.test(n)) return 'tuna';
  if (/mahi|dorado|dolphinfish/.test(n)) return 'mahi';
  if (/tarpon/.test(n)) return 'tarpon';
  if (/snook/.test(n)) return 'snook';
  if (/red drum|redfish|channel bass/.test(n)) return 'redfish';
  if (/trout/.test(n)) return 'trout';
  if (/salmon|steelhead|chinook|coho|sockeye|kokanee/.test(n)) return 'salmon';
  if (/pike|musky|muskie|\bgar\b|barracuda|needlefish|mackerel|\beel\b/.test(n)) return 'pike';
  if (/catfish|bullhead|channel cat/.test(n)) return 'catfish';
  if (/crappie|bluegill|sunfish|\bperch\b|pumpkinseed|panfish|\bbream\b|redear|sheepshead|scup|porgy|spadefish|triggerfish/.test(n)) return 'panfish';
  return 'gamefish';
}

const EYE = '#EAF2FB';
const Eye = ({ x, y, r = 0.85 }: { x: number; y: number; r?: number }) => <circle cx={x} cy={y} r={r} fill={EYE} />;

function shape(t: FishType, cid: string): React.ReactNode {
  switch (t) {
    case 'stripedBass':
      return (<>
        <defs><clipPath id={cid}><path d="M3 13C8 9 14 7.4 21 7.8 26 8.1 30 9.9 32 13 30 16.1 26 17.9 21 18.2 14 18.6 8 17 3 13Z" /></clipPath></defs>
        <path d="M3 13C8 9 14 7.4 21 7.8 26 8.1 30 9.9 32 13 30 16.1 26 17.9 21 18.2 14 18.6 8 17 3 13Z" />
        <g clipPath={`url(#${cid})`} fill={EYE}>
          <rect x="3" y="9.6" width="29" height="0.7" /><rect x="3" y="11.2" width="29" height="0.7" /><rect x="3" y="12.8" width="29" height="0.7" /><rect x="3" y="14.4" width="29" height="0.7" /><rect x="3" y="16" width="29" height="0.7" />
        </g>
        <path d="M31.5 13 39.5 8.6 36 13 39.5 17.4z" /><path d="M15 7.7l2-2.6 1.3 2.4z" /><Eye x={7.2} y={11.4} />
      </>);
    case 'flatfish':
      return (<>
        <path d="M19 4C26 4.4 31 8 31 13 31 18 26 21.6 19 22 11 22.4 5 18 5 13 5 8 11 3.6 19 4Z" />
        <path d="M30.6 13 36.2 10.4 36.2 15.6z" /><Eye x={13} y={9.6} r={0.95} /><Eye x={16.5} y={9.6} r={0.95} />
      </>);
    case 'tuna':
      return (<>
        <path d="M3 13C7 7.8 13 6.2 18 6.2 22.5 6.2 25.8 8.4 27.4 11.6 27.8 12.3 27.8 13.7 27.4 14.4 25.8 17.6 22.5 19.8 18 19.8 13 19.8 7 18.2 3 13Z" />
        <path d="M26.6 13C30.5 9.8 33.5 8.2 38.5 6.4 36 9.8 36 16.2 38.5 19.6 33.5 17.8 30.5 16.2 26.6 13Z" />
        <path d="M20 6.6l1.6-2.2 0.8 2.6z" /><path d="M22.4 7.4l1.4-1.6 0.7 2.1z" /><path d="M20 19.4l1.6 2.2 0.8-2.6z" />
        <path d="M13 17q2.6 3.6 5.4 3l-3-4z" /><Eye x={7.4} y={11} />
      </>);
    case 'mahi':
      return (<>
        <path d="M5.5 5C12 5 22 8.6 31 13 22 17.4 12 21 6 21 4 21 3.2 16 3.2 13 3.2 9.6 4 5 5.5 5Z" />
        <path d="M6 5.2C13 3 24 4.6 31 8.6 24 6.8 13 6.4 7 8z" />
        <path d="M30.6 13 39 7.8 36.4 13 39 18.2z" /><Eye x={7.6} y={9.6} />
      </>);
    case 'tarpon':
      return (<>
        <path d="M3.6 13C7 7.4 13 5.5 19 5.9 25 6.3 29.6 9 31.6 13 29.6 17 25 19.7 19 20.1 13 20.5 7 18.6 3.6 13Z" />
        <path d="M3.6 13.6 1.4 11.2 4 12.4z" /><path d="M31 13 39.6 7.4 35.6 13 39.6 18.6z" /><Eye x={8} y={11} r={1.5} />
      </>);
    case 'snook':
      return (<>
        <defs><clipPath id={cid}><path d="M3 13C8 9.4 14 8 21 8.4 26 8.7 30 10.4 32 13 30 15.6 26 17.3 21 17.6 14 18 8 16.6 3 13Z" /></clipPath></defs>
        <path d="M3 13C8 9.4 14 8 21 8.4 26 8.7 30 10.4 32 13 30 15.6 26 17.3 21 17.6 14 18 8 16.6 3 13Z" />
        <g clipPath={`url(#${cid})`} fill={EYE}><rect x="4" y="12.6" width="28" height="1.0" /></g>
        <path d="M3 13.2 0.9 14.4 3.2 14z" /><path d="M16 8.3l1.8-2.4 1.2 2.3z" /><path d="M31.5 13 39.5 8.6 36 13 39.5 17.4z" /><Eye x={7.2} y={11.2} />
      </>);
    case 'redfish':
      return (<>
        <path d="M3 13.4C7 8 13 6.4 19 6.8 25 7.2 29.6 9.6 31.6 13 29.6 16.4 25 18.8 19 19.2 13 19.6 7 18 3 13.4Z" />
        <circle cx="27" cy="11" r="1.6" fill={EYE} /><path d="M31 13 38.6 9.6 37 13 38.6 16.4z" /><path d="M3 13.4 1 14.8 3.4 14.2z" /><Eye x={7.4} y={11.4} />
      </>);
    case 'trout':
      return (<>
        <path d="M3 13C8 8.6 15 7.1 22 7.7 27 8.1 31 10 33 13 31 16 27 17.9 22 18.3 15 18.9 8 17.4 3 13Z" />
        <path d="M14 7.5q3-2.6 6-0.3l-5 1.1z" /><path d="M27 8.7q1.8-1.1 3-0.2l-2.7 0.9z" />
        <path d="M33 13 39.5 9.6 38 13 39.5 16.4z" />
        {[[10, 9.6], [13, 9], [16, 9.7], [19, 9.2], [12, 11], [15.5, 11.4], [18.5, 11]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={0.5} fill={EYE} />)}
        <Eye x={7} y={11.4} />
      </>);
    case 'salmon':
      return (<>
        <path d="M3.4 12.6C8 8.4 15 7 22.5 7.6 27.6 8 31.6 10 33.6 13 31.6 16 27.6 18 22.5 18.4 15 19 8 17.6 3.4 13.4Z" />
        <path d="M14 7.4q3-2.4 6-0.2l-5 1z" /><path d="M27.5 8.6q1.8-1 3-0.2l-2.7 0.9z" />
        <path d="M33.6 13 39.6 9 37.8 13 39.6 17z" /><path d="M3.4 12.6q-2.4-0.2-2.8 2 2 0.6 3-0.8z" /><Eye x={7.6} y={11} />
      </>);
    case 'pike':
      return (<>
        <path d="M2.5 13C9 10.8 19 9.8 28 11.4 30 11.75 31 12.4 31.6 13 31 13.6 30 14.25 28 14.6 19 16.2 9 15.2 2.5 13Z" />
        <path d="M2.5 13 0.4 11.9Q-0.3 13 0.4 14.1Z" /><path d="M22 10.9l2-3.2 1.4 2.8 1.6-2.4 1 2.7z" />
        <path d="M30.8 13 39 8.4 36 13 39 17.6z" /><Eye x={6} y={12} />
      </>);
    case 'catfish':
      return (<>
        <path d="M3 13C3 9.2 7 7.4 12 7.4 19 7.4 26 9.4 30 13 26 16.6 19 18.6 12 18.6 7 18.6 3 16.8 3 13Z" />
        <path d="M3.6 10.6 0.3 7.8 1.4 10.2z" /><path d="M3.3 11.9 0 10.4 1.1 12z" /><path d="M3.6 15.4 0.3 18.2 1.4 15.8z" /><path d="M3.3 14.1 0 15.6 1.1 14z" />
        <path d="M13 7.6q3.4-2.2 6-0.2l-5 1z" /><path d="M30 13 38.5 9.4 36.6 13 38.5 16.6z" /><Eye x={7.4} y={11.2} />
      </>);
    case 'panfish':
      return (<>
        <defs><clipPath id={cid}><path d="M17 3.4C23 3.4 28 7.6 28 13 28 18.4 23 22.6 16.5 22.6 11.5 22.6 7 19.8 5 15.6L4.4 13 5 10.4C7 6.2 11.5 3.4 17 3.4Z" /></clipPath></defs>
        <path d="M17 3.4C23 3.4 28 7.6 28 13 28 18.4 23 22.6 16.5 22.6 11.5 22.6 7 19.8 5 15.6L4.4 13 5 10.4C7 6.2 11.5 3.4 17 3.4Z" />
        <path d="M9 5.2l2-2.8 1.3 2.4 1.8-2.4 1.2 2.4 1.8-2.2 1.2 2.3 1.8-1.8 1.2 2.2z" />
        <g clipPath={`url(#${cid})`} fill={EYE}><rect x="9" y="3" width="0.8" height="20" /><rect x="13" y="3" width="0.8" height="20" /><rect x="17" y="3" width="0.8" height="20" /><rect x="21" y="3" width="0.8" height="20" /></g>
        <path d="M27.5 13 34 9.4 34 16.6z" /><Eye x={9} y={10.4} />
      </>);
    default:
      return (<>
        <path d="M3.5 13C7 7.8 12 6.2 17.5 6.4 23 6.6 27.5 8.8 30.5 13 27.5 17.2 23 19.4 17.5 19.6 12 19.8 7 18.2 3.5 13Z" />
        <path d="M12 6.6l2-3.4 1.2 3 1.7-2.8 1.1 2.8 1.8-2.4 1 2.6 2-1.8 1.1 2.2z" />
        <path d="M30 13 39.5 7.2 35.6 13 39.5 18.8z" /><path d="M13.5 16.6q3.6 3.4 7.2 1.8l-4.6-3.6z" /><Eye x={7.6} y={11} />
      </>);
  }
}

export default function SpeciesIcon({ name, size = 30 }: { name: string; size?: number }) {
  const cid = 'fi-' + useId().replace(/:/g, '');
  return (
    <svg width={size} height={Math.round(size * 0.65)} viewBox="0 0 40 26" fill="currentColor" aria-hidden="true">
      {shape(classify(name), cid)}
    </svg>
  );
}
