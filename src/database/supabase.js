import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: './config/.env' });

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

//example change git push origin <your-local-branch>:refs/for/<remote-target-branch>