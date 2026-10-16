// DeenSpace - Supabase Config - FINAL FIXED
const SUPABASE_URL = 'https://qipcemraijvvbgrjwntx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_swIjbGnxaSPTsF_OPAxQig_YVzW5csI';

// Create client - use different variable name to avoid conflict
var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Make it available as 'supabase' for app.js
var supabase = supabaseClient;
console.log('Supabase connected:', SUPABASE_URL);
