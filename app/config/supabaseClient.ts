// supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../backend/models/Model"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

console.log(SUPABASE_KEY, SUPABASE_URL)

export const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: {
        storage: {
            getItem: (key) => {
                if (typeof document === "undefined") return null;
                const cookies = document.cookie.split("; ");
                const found = cookies.find((c) => c.startsWith(`${key}=`));
                return found ? decodeURIComponent(found.split("=")[1]) : null;
            },
            setItem: (key, value) => {
                document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000`;
            },
            removeItem: (key) => {
                document.cookie = `${key}=; path=/; max-age=0`;
            },
        },
    },
});
