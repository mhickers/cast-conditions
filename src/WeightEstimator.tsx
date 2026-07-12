import React, { useState } from 'react';
import { Scale } from 'lucide-react';
import { UnitSystem } from './utils/units';

// Standard hook-and-line length-weight estimation. With girth: the classic
// W = L x G^2 / K formula (inches -> pounds). Without girth, girth is
// approximated from length using a body-shape ratio, then the same formula
// applies. K and the girth ratio vary by body shape. Estimates only -- real
// weights vary with season, spawn, and forage.
interface ShapeParams { k: number; girthRatio: number }

const SHAPES: { match: RegExp; params: ShapeParams }[] = [
  { match: /pike|muskie|musky|pickerel|barracuda|needlefish|gar/i, params: { k: 900, girthRatio: 0.46 } },
  { match: /trout|salmon|steelhead|char|grayling|kokanee/i, params: { k: 775, girthRatio: 0.54 } },
  { match: /walleye|sauger|perch|snook|weakfish|seatrout|corvina/i, params: { k: 800, girthRatio: 0.52 } },
  { match: /bluegill|crappie|sunfish|pumpkinseed|panfish|spadefish|porgy|scup/i, params: { k: 750, girthRatio: 0.78 } },
  { match: /catfish|bullhead|cod|burbot|grouper|sheepshead|drum|redfish|tautog/i, params: { k: 800, girthRatio: 0.60 } },
  { match: /tuna|jack|amberjack|mahi|dorado|wahoo|bonito|mackerel/i, params: { k: 800, girthRatio: 0.58 } },
  { match: /flounder|halibut|fluke|sole|turbot|ray|skate/i, params: { k: 1450, girthRatio: 0.75 } },
  { match: /striped bass|striper|rockfish|sea bass|tarpon|snapper|bluefish|cobia|bonefish|permit|pompano/i, params: { k: 800, girthRatio: 0.55 } },
  { match: /bass/i, params: { k: 800, girthRatio: 0.66 } },
];
const DEFAULT_SHAPE: ShapeParams = { k: 800, girthRatio: 0.58 };

function shapeFor(name: string): ShapeParams {
  const hit = SHAPES.find(s => s.match.test(name));
  return hit ? hit.params : DEFAULT_SHAPE;
}

function estimateLbs(name: string, lengthIn: number, girthIn: number | null): number {
  const p = shapeFor(name);
  const g = girthIn != null && girthIn > 0 ? girthIn : lengthIn * p.girthRatio;
  return (lengthIn * g * g) / p.k;
}

interface Props {
  speciesOptions: string[];
  units: UnitSystem;
}

export default function WeightEstimator({ speciesOptions, units }: Props) {
  const metric = units === 'metric';
  const [species, setSpecies] = useState('');
  const [lengthStr, setLengthStr] = useState('');
  const [girthStr, setGirthStr] = useState('');

  const toInches = (v: number) => (metric ? v / 2.54 : v);
  const lengthNum = parseFloat(lengthStr);
  const girthNum = parseFloat(girthStr);
  const validLen = Number.isFinite(lengthNum) && lengthNum > 0 && lengthNum < (metric ? 400 : 160);
  const hasGirth = Number.isFinite(girthNum) && girthNum > 0;

  let display: string | null = null;
  if (species && validLen) {
    const lbs = estimateLbs(species, toInches(lengthNum), hasGirth ? toInches(girthNum) : null);
    if (metric) {
      const kg = lbs * 0.45359237;
      display = kg >= 10 ? `${kg.toFixed(1)} kg` : `${kg.toFixed(2)} kg`;
    } else if (lbs < 1) {
      display = `${Math.max(1, Math.round(lbs * 16))} oz`;
    } else {
      const whole = Math.floor(lbs);
      const oz = Math.round((lbs - whole) * 16);
      display = oz === 0 ? `${whole} lb` : oz === 16 ? `${whole + 1} lb` : `${whole} lb ${oz} oz`;
    }
  }

  const lenUnit = metric ? 'cm' : 'in';

  return (
    <section className="section">
      <h3 className="section-label"><Scale size={14} style={{ verticalAlign: '-2px' }} /> Weight estimator</h3>
      <div className="estimator-row">
        <select className="search-input estimator-species" value={species} onChange={e => setSpecies(e.target.value)} aria-label="Species for weight estimate">
          <option value="">Species...</option>
          {[...speciesOptions].sort().map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input
          className="search-input estimator-input"
          type="number"
          inputMode="decimal"
          min="0"
          placeholder={`Length (${lenUnit})`}
          value={lengthStr}
          onChange={e => setLengthStr(e.target.value)}
          aria-label={`Length in ${lenUnit}`}
        />
        <input
          className="search-input estimator-input"
          type="number"
          inputMode="decimal"
          min="0"
          placeholder={`Girth (${lenUnit}, optional)`}
          value={girthStr}
          onChange={e => setGirthStr(e.target.value)}
          aria-label={`Girth in ${lenUnit}, optional`}
        />
      </div>
      {display && (
        <p className="estimator-result">Estimated weight: <strong>{display}</strong>{!hasGirth && <span className="muted"> (add girth for a better estimate)</span>}</p>
      )}
      <p className="muted estimator-note">Ballpark from standard length-weight formulas. Actual weight varies with season and condition.</p>
    </section>
  );
}
