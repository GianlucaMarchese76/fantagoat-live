import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function ok(msg: string) {
  console.log(`✅ ${msg}`);
}

export function warn(msg: string) {
  console.log(`⚠️  ${msg}`);
}

export function err(msg: string) {
  console.log(`❌ ${msg}`);
}