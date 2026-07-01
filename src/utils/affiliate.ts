// Affiliate links for tackle suggestions — monetization without a paywall.
//
// Set your Amazon Associates store ID in REACT_APP_AMAZON_TAG (Vercel env +
// local .env). Until it is set the links still work as plain Amazon searches
// (useful to the reader, just not monetized), so the feature degrades cleanly.
//
// Keep this intentionally low-key: one small, contextual link per opened
// species card. Utility for the reader comes first; the commission is a bonus.

const AMAZON_TAG = (process.env.REACT_APP_AMAZON_TAG || '').trim();

// True once a real Associates tag is configured — used to decide whether to
// show the affiliate disclosure (no material connection = no disclosure needed).
export const AFFILIATE_ACTIVE = AMAZON_TAG.length > 0;

// Build an Amazon search URL for tackle relevant to a species. We search on the
// species name rather than the raw lure blurb so results stay on artificial
// tackle the reader can actually buy (and avoids live-bait terms like "clams").
export function tackleSearchUrl(species: string): string {
  const q = encodeURIComponent(`${species} fishing lures`);
  const base = `https://www.amazon.com/s?k=${q}`;
  return AMAZON_TAG ? `${base}&tag=${AMAZON_TAG}` : base;
}
