import { supabase } from "../database/supabase.js";
import {
  generateProjectKey,
  hashProjectKey,
} from "../utils/keyUtils.js";

export async function createProject({
  name,
  code,
}) {
  const projectKey =
    generateProjectKey();
  const keyHash =
    hashProjectKey(projectKey);

  const { data, error } =
    await supabase
      .from("projects")
      .insert({
        name,
        code,
        project_key_hash: keyHash,
      })
      .select("id, name, code")
      .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    code: data.code,
    project_key: projectKey,
  };
}
