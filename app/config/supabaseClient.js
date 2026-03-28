// supabaseClient.js
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const PORT = process.env.PORT;
console.log(SUPABASE_KEY, SUPABASE_URL, PORT);
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
