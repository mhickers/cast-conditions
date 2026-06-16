import React, { useId } from 'react';

// Species-specific fish icons for the bite forecast. Each shape carries the
// feature that species is actually known for (stripes, whiskers, tail spot,
// crescent tail, two top-eyes, etc.). Single fill (currentColor) so they tint
// via CSS. Mapped by name, so the whole species database is covered.

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
  if (/crappie|bluegill|sunfish|\bperch\b|pumpkinseed|panfish|\bbream\b|redear/.test(n)) return 'panfish';
  return 'gamefish';
}

const EYE = '#F5F0E8';
const BODY = 'M2.6 12 C5 8.6 9 7.3 12 7.3 C15 7.3 17.2 9.2 18 12 C17.2 14.8 15 16.7 12 16.7 C9 16.7 5 15.4 2.6 12 Z';
const TAILF = 'M17.6 12 L23 8.6 L21.3 12 L23 15.4 Z';
const Eye = ({ x, y, r = 1 }: { x: number; y: number; r?: number }) => <circle cx={x} cy={y} r={r} fill={EYE} />;

function shape(t: FishType, cid: string): React.ReactNode {
  switch (t) {
    case 'stripedBass':
      return (<>
        <defs><clipPath id={cid}><path d={BODY} /></clipPath></defs>
        <path d={BODY} /><path d={TAILF} />
        <g clipPath={`url(#${cid})`} fill={EYE}>
          <rect x="3" y="9.4" width="15" height="0.7" /><rect x="3" y="11" width="15" height="0.7" />
          <rect x="3" y="12.6" width="15" height="0.7" /><rect x="3" y="14.2" width="15" height="0.7" />
        </g><Eye x={6} y={10.6} />
      </>);
    case 'flatfish':
      return (<>
        <ellipse cx="10.8" cy="12" rx="8.6" ry="5.4" /><path d="M18.8 12 L22.8 9.4 L22.8 14.6 Z" />
        <Eye x={7.4} y={10} r={0.85} /><Eye x={10} y={10} r={0.85} />
      </>);
    case 'tuna':
      return (<>
        <path d="M3 12 C5.5 8.4 9.5 7 12.5 7 C15.2 7 17 8.8 17.8 11 C18 11.4 18 12.6 17.8 13 C17 15.2 15.2 17 12.5 17 C9.5 17 5.5 15.6 3 12 Z" />
        <path d="M17.6 12 C19 10.6 20.6 9.6 22.6 8.6 C21.6 10.6 21.6 13.4 22.6 15.4 C20.6 14.4 19 13.4 17.6 12 Z" />
        <path d="M13.6 7.6 l1 -1.3 l0.6 1.5 z" /><path d="M15.2 8 l0.9 -1 l0.5 1.2 z" /><Eye x={6.5} y={10.6} />
      </>);
    case 'mahi':
      return (<>
        <path d="M3 13.2 C3 9.2 5.2 6.6 8.4 6.6 C12.4 6.6 15.8 8.6 17.6 12 C15.8 15 12.4 16.6 8.6 16.6 C5.2 16.6 3 15 3 13.2 Z" />
        <path d="M5 6.8 C8.5 4.8 13.5 4.6 17 6.2 C13.5 6.4 8.6 6.7 6.4 7.6 Z" />
        <path d="M17 12 L22 9 L20.6 12 L22 15 Z" /><Eye x={6.6} y={11} />
      </>);
    case 'tarpon':
      return (<>
        <path d="M3 12 C5 8.4 9 7 12 7 C15 7 17.4 9 18 12 C17.4 15 15 17 12 17 C9 17 5 15.6 3 12 Z" />
        <path d={TAILF} /><path d="M2.6 12.8 L4.2 11.4 L4.2 12.9 Z" /><Eye x={6.8} y={11} r={1.6} />
      </>);
    case 'snook':
      return (<>
        <defs><clipPath id={cid}><path d={BODY} /></clipPath></defs>
        <path d={BODY} /><path d={TAILF} />
        <g clipPath={`url(#${cid})`}><rect x="3" y="11.8" width="15" height="0.7" fill={EYE} /></g>
        <path d="M2.6 12.2 L1.2 13.2 L3.2 13 Z" /><Eye x={6} y={10.4} />
      </>);
    case 'redfish':
      return (<><path d={BODY} /><path d={TAILF} /><Eye x={6} y={10.6} /><circle cx="15.4" cy="11.2" r="1.4" fill={EYE} /></>);
    case 'trout':
      return (<>
        <path d="M2.6 12 C5 8.8 9 7.6 12 7.6 C15 7.6 17.2 9.4 18 12 C17.2 14.6 15 16.4 12 16.4 C9 16.4 5 15.2 2.6 12 Z" />
        <path d="M17.6 12 L22.4 9.4 L22.6 12 L22.4 14.6 Z" /><path d="M14.6 8.8 q1 -0.5 1.6 0.3 l-1.6 0.5 z" />
        {[[8, 9.4], [10.2, 9], [12.2, 9.6], [9.4, 10.8], [11.6, 11]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.45" fill={EYE} />)}
        <Eye x={6} y={10.6} />
      </>);
    case 'salmon':
      return (<>
        <path d="M3 12 C5.4 8.8 9.2 7.6 12.2 7.6 C15.2 7.6 17.3 9.4 18 12 C17.3 14.6 15.2 16.4 12.2 16.4 C9.2 16.4 5.4 15.2 3 12 Z" />
        <path d="M14.6 8.8 q1 -0.5 1.6 0.3 l-1.6 0.5 z" /><path d="M17.6 12 L22.6 9 L21.2 12 L22.6 15 Z" />
        <path d="M3 11.6 C1.8 11.2 1.6 12.8 3 13.2 L3 12 Z" /><Eye x={6.4} y={10.6} />
      </>);
    case 'pike':
      return (<>
        <path d="M1.6 12 C5 10.2 11 9.5 16.4 10.7 C16.7 10.8 16.7 13.2 16.4 13.3 C11 14.5 5 13.8 1.6 12 Z" />
        <path d="M16.2 12 L21.6 9.4 L20.3 12 L21.6 14.6 Z" /><path d="M11.4 10 L13 8.4 L13.8 10 Z" />
        <path d="M1.6 12 L0.4 11.4 L0.7 12.6 Z" /><Eye x={4.2} y={11.2} r={0.9} />
      </>);
    case 'catfish':
      return (<>
        <path d="M2.4 12 C2.4 9.6 5 8.4 8 8.4 C12 8.4 15.6 9.6 17.6 12 C15.6 14.4 12 15.6 8 15.6 C5 15.6 2.4 14.4 2.4 12 Z" />
        <path d="M17.4 12 C21.4 9.8 22.6 11 22.6 12 C22.6 13 21.4 14.2 17.4 12 Z" />
        <path d="M2.8 10.6 L0.6 8.8 L1.2 10.2 Z" /><path d="M2.8 11.4 L0.4 10.6 L1 11.6 Z" />
        <path d="M2.8 13.4 L0.4 13.4 L1 12.6 Z" /><path d="M2.8 14.2 L0.6 15.2 L1.2 13.9 Z" /><Eye x={6} y={10.8} />
      </>);
    case 'panfish':
      return (<>
        <defs><clipPath id={cid}><path d="M10.8 6 C14.8 6 18 8.6 18 12 C18 15.4 14.8 18 10.8 18 C7.6 18 5 16.6 3.8 14.4 L3.4 12 L3.8 9.6 C5 7.4 7.6 6 10.8 6 Z" /></clipPath></defs>
        <path d="M10.8 6 C14.8 6 18 8.6 18 12 C18 15.4 14.8 18 10.8 18 C7.6 18 5 16.6 3.8 14.4 L3.4 12 L3.8 9.6 C5 7.4 7.6 6 10.8 6 Z" />
        <path d="M17.8 12 L21.6 9.6 L21.6 14.4 Z" />
        <path d="M7 6.6 l1 -1.4 l0.7 1.2 l0.9 -1.2 l0.7 1.2 l0.9 -1.1 l0.6 1.2 z" />
        <g clipPath={`url(#${cid})`} fill={EYE}><rect x="8" y="6" width="0.7" height="12" /><rect x="11" y="6" width="0.7" height="12" /><rect x="14" y="6" width="0.7" height="12" /></g>
        <Eye x={7} y={10.4} />
      </>);
    default:
      return (<><path d={BODY} /><path d={TAILF} /><path d="M9 7.6 L11 5 L12.6 7.7 Z" /><Eye x={6} y={10.6} /></>);
  }
}

export default function SpeciesIcon({ name, size = 20 }: { name: string; size?: number }) {
  const cid = 'fi-' + useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {shape(classify(name), cid)}
    </svg>
  );
}
