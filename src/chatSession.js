import { supabase } from "./supabase.js";
import { v4 as uuidv4 } from "uuid";

export async function createSession() {
  const sessionId = uuidv4();

  const { error } =
    await supabase
    .from("chat_sessions")
    .insert({
      id: sessionId,
    });

  if (error) {
    throw error;
  }

  return sessionId;
}

export async function saveMessage(
  sessionId,
  role,
  content
) {
  const { error } =
    await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        role,
        content,
      });

  if (error) {
    console.error(error);
  }
}

export async function getHistory(
  sessionId,
  limit = 10
) {
  const { data, error } =
    await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", {
        ascending: true,
      })
      .limit(limit);

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}
