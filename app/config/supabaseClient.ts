// supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../backend/models/menteeModel"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_KEY!);
