import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

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
