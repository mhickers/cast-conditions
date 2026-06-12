import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  // Fail loud. An empty URL/key silently breaks every Supabase feature
  // (community feed, catch submit, feedback) while the rest of the app keeps
  // working — which is exactly what made the last outage hard to spot.
  const missing = [
    !supabaseUrl && 'REACT_APP_SUPABASE_URL',
    !supabaseKey && 'REACT_APP_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ');
  console.error(
    `[Fish Conditions] Missing Supabase env var(s): ${missing}. ` +
    'Catch feed, submissions, and feedback will not work. ' +
    'Check the Vercel env vars and redeploy.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface CatchPost {
  id: string;
  created_at: string;
  photo_url: string;
  species: string;
  location: string;
  catch_date: string;
  angler_name: string;
  approved: boolean;
}
