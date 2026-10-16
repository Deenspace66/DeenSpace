const SUPABASE_URL = 'https://qipcemraijvvbgrjwntx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_swIjbGnxaSPTsF_OPAxQig_YVzW5csI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('Supabase Connected:', SUPABASE_URL);
