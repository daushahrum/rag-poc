import { supabase } from "../database/supabase.js";
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

export async function listSessions() {
  const { data: sessions, error: sessionsError } =
    await supabase
      .from("chat_sessions")
      .select("id, topic, created_at")
      .order("created_at", {
        ascending: false,
      });

  if (sessionsError) {
    throw sessionsError;
  }

  if ((sessions ?? []).length === 0) {
    return [];
  }

  const sessionIds = sessions.map(session => session.id);

  const { data: messages, error: messagesError } =
    await supabase
      .from("chat_messages")
      .select("session_id, role, content, created_at")
      .in("session_id", sessionIds)
      .order("created_at", {
        ascending: true,
      });

  if (messagesError) {
    throw messagesError;
  }

  const messagesBySession = new Map();

  for (const message of messages ?? []) {
    if (!messagesBySession.has(message.session_id)) {
      messagesBySession.set(message.session_id, []);
    }

    messagesBySession.get(message.session_id).push(message);
  }

  return sessions.map(session => {
    const sessionMessages =
      messagesBySession.get(session.id) ?? [];

    const firstUserMessage =
      sessionMessages.find(message => message.role === "user");

    const lastMessage =
      sessionMessages.at(-1);

    return {
      id: session.id,
      created_at: session.created_at,
      title: session.topic ?? firstUserMessage?.content ?? "New chat",
      preview: lastMessage?.content ?? "No messages yet",
      updated_at: lastMessage?.created_at ?? session.created_at,
    };
  }).sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
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

export async function updateSessionTopic(
  sessionId,
  topic
) {
  const { error } =
    await supabase
      .from("chat_sessions")
      .update({
        topic,
      })
      .eq("id", sessionId);

  if (error) {
    throw error;
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

export async function getSessionMessages(sessionId) {
  return getHistory(sessionId, 100);
}
