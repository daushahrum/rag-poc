const form = document.querySelector("#chatForm");
const input = document.querySelector("#messageInput");
const messages = document.querySelector("#messages");
const newChatButton = document.querySelector("#newChatButton");
const historyList = document.querySelector("#historyList");
const openProjectButton = document.querySelector("#openProjectButton");
const openIngestButton = document.querySelector("#openIngestButton");
const openKnowledgeButton = document.querySelector("#openKnowledgeButton");
const closeProjectButton = document.querySelector("#closeProjectButton");
const closeIngestButton = document.querySelector("#closeIngestButton");
const projectDrawer = document.querySelector("#projectDrawer");
const projectForm = document.querySelector("#projectForm");
const projectNameInput = document.querySelector("#projectNameInput");
const projectCodeInput = document.querySelector("#projectCodeInput");
const createProjectButton = document.querySelector("#createProjectButton");
const projectStatus = document.querySelector("#projectStatus");
const projectResult = document.querySelector("#projectResult");
const createdProjectName = document.querySelector("#createdProjectName");
const createdProjectCode = document.querySelector("#createdProjectCode");
const projectKeyOutput = document.querySelector("#projectKeyOutput");
const copyProjectKeyButton = document.querySelector("#copyProjectKeyButton");
const ingestDrawer = document.querySelector("#ingestDrawer");
const ingestForm = document.querySelector("#ingestForm");
const knowledgeTitleInput = document.querySelector("#knowledgeTitleInput");
const knowledgeInput = document.querySelector("#knowledgeInput");
const ingestStatus = document.querySelector("#ingestStatus");
const textIngestTab = document.querySelector("#textIngestTab");
const documentIngestTab = document.querySelector("#documentIngestTab");
const textIngestPanel = document.querySelector("#textIngestPanel");
const documentIngestPanel = document.querySelector("#documentIngestPanel");
const documentUpload = document.querySelector("#documentUpload");
const uploadDocumentButton = document.querySelector("#uploadDocumentButton");
const documentIngestStatus = document.querySelector("#documentIngestStatus");
const knowledgeCenter = document.querySelector("#knowledgeCenter");
const closeKnowledgeButton = document.querySelector("#closeKnowledgeButton");
const refreshKnowledgeButton = document.querySelector("#refreshKnowledgeButton");
const knowledgeList = document.querySelector("#knowledgeList");
const knowledgeEditor = document.querySelector("#knowledgeEditor");
const knowledgeEditorTitle = document.querySelector("#knowledgeEditorTitle");
const knowledgeEditorContent = document.querySelector("#knowledgeEditorContent");
const saveKnowledgeButton = document.querySelector("#saveKnowledgeButton");
const deleteKnowledgeButton = document.querySelector("#deleteKnowledgeButton");
const knowledgeCenterStatus = document.querySelector("#knowledgeCenterStatus");
const logoutButton = document.querySelector("#logoutButton");

let sessionId = null;
let sessions = [];
let knowledgeDocuments = [];
let selectedKnowledgeId = null;

import { getToken, getAuthHeaders, clearAuth, isAuthenticated } from './auth.js';

// Check authentication
if (!isAuthenticated()) {
    window.location.href = '/login.html';
}

let randomGreetingMessages = [
  "Hi there! What would you like to talk about today?",
  "Hello! I'm here to help. What can I do for you?",
  "Hey! Feel free to ask me anything.",
  "Greetings! What would you like to discuss?",
  "Hi! I'm ready to chat. What's on your mind?",

];

function getRandomGreeting() {
  const index = Math.floor(Math.random() * randomGreetingMessages.length);
  return randomGreetingMessages[index];
}

function renderWelcomeMessage() {
  messages.innerHTML = "";
  messages.append(
    createMessage("assistant", getRandomGreeting()),
  );
}

function createMessage(role, content, sources = []) {
  const article = document.createElement("article");
  article.className = `message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  bubble.append(renderFormattedText(content));

  if (sources.length > 0) {
    bubble.append(createSources(sources));
  }

  article.append(bubble);
  return article;
}

function renderFormattedText(content) {
  const fragment = document.createDocumentFragment();
  const lines = String(content ?? "").split("\n");
  let paragraph = [];
  let list = null;
  let codeBlock = null;

  function flushParagraph() {
    if (paragraph.length === 0) return;

    const p = document.createElement("p");
    appendInlineFormatting(p, paragraph.join(" "));
    fragment.append(p);
    paragraph = [];
  }

  function flushList() {
    if (!list) return;

    fragment.append(list.element);
    list = null;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushList();

      if (codeBlock) {
        fragment.append(codeBlock);
        codeBlock = null;
      } else {
        codeBlock = document.createElement("pre");
        codeBlock.append(document.createElement("code"));
      }

      continue;
    }

    if (codeBlock) {
      codeBlock.firstElementChild.textContent += `${line}\n`;
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();

      const level = Math.min(heading[1].length + 2, 5);
      const element = document.createElement(`h${level}`);
      appendInlineFormatting(element, heading[2]);
      fragment.append(element);
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    const numbered = trimmed.match(/^\d+\.\s+(.+)$/);

    if (bullet || numbered) {
      flushParagraph();

      const type = bullet ? "ul" : "ol";
      if (!list || list.type !== type) {
        flushList();
        list = {
          type,
          element: document.createElement(type),
        };
      }

      const item = document.createElement("li");
      appendInlineFormatting(item, bullet ? bullet[1] : numbered[1]);
      list.element.append(item);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  if (codeBlock) {
    fragment.append(codeBlock);
  }

  return fragment;
}

function appendInlineFormatting(parent, text) {
  const pattern =
    /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<]+|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    parent.append(document.createTextNode(text.slice(cursor, match.index)));

    const token = match[0];
    const markdownLink = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);

    if (markdownLink) {
      parent.append(createLink(markdownLink[1], markdownLink[2]));
      cursor = match.index + token.length;
      continue;
    }

    if (token.startsWith("http://") || token.startsWith("https://")) {
      parent.append(createLink(token, token));
      cursor = match.index + token.length;
      continue;
    }

    const element = document.createElement(
      token.startsWith("`")
        ? "code"
        : token.startsWith("**")
          ? "strong"
          : "em"
    );

    element.textContent = token.startsWith("**")
      ? token.slice(2, -2)
      : token.slice(1, -1);

    parent.append(element);
    cursor = match.index + token.length;
  }

  parent.append(document.createTextNode(text.slice(cursor)));
}

function createLink(label, url) {
  const link = document.createElement("a");
  link.href = url;
  link.textContent = label;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function createSources(sources) {
  const wrapper = document.createElement("div");
  wrapper.className = "sources";

  const heading = document.createElement("strong");
  heading.textContent = "Sources";

  const list = document.createElement("ul");

  sources.slice(0, 3).forEach((source, index) => {
    const item = document.createElement("li");
    item.textContent = source.content
      ? source.content.slice(0, 120)
      : `Document ${index + 1}`;
    list.append(item);
  });

  wrapper.append(heading, list);
  return wrapper;
}

function createTypingMessage() {
  const article = document.createElement("article");
  article.className = "message assistant";
  article.id = "typingMessage";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = "AI";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `
    <div class="typing" aria-label="Assistant is typing">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  article.append(bubble);
  return article;
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function resizeInput() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
}

async function sendMessage(message) {
    if (!sessionId) {
        await startSession();
    }

    const response = await fetch("/api/chat/portal/send", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({
            session_id: sessionId,
            message,
        }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "The assistant could not answer right now.");
    }

    return response.json();
}

async function fetchSessions() {
    const response = await fetch("/api/chat/sessions/list", {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not load chat history.");
    }

    const data = await response.json();
    return data.sessions ?? [];
}

async function fetchSessionMessages(nextSessionId) {
    const response = await fetch(`/api/chat/sessions/${encodeURIComponent(nextSessionId)}`, {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not load that chat.");
    }

    const data = await response.json();
    return data.messages ?? [];
}

async function createProject(name, code) {
    const response = await fetch("/api/project/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({
            name,
            code,
        }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error ?? "Could not create project.");
    }

    return data.project;
}

async function ingestKnowledge(content) {
    const response = await fetch("/api/knowledge_document/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({
            title: knowledgeTitleInput.value.trim(),
            content,
        }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not ingest knowledge.");
    }

    return response.json();
}

async function fetchKnowledgeDocuments() {
    const response = await fetch("/api/knowledge_document/list", {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not load knowledge documents.");
    }

    const data = await response.json();
    return data.documents ?? [];
}

async function fetchKnowledgeDocument(documentId) {
    const response = await fetch(`/api/knowledge_document/${encodeURIComponent(documentId)}`, {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not load knowledge document.");
    }

    const data = await response.json();
    return data.document;
}

async function updateKnowledgeDocument(documentId, payload) {
    const response = await fetch(`/api/knowledge_document/update`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({
            id: documentId,
            ...payload,
        }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not update knowledge document.");
    }

    return response.json();
}

async function deleteKnowledgeDocument(documentId) {
    const response = await fetch(`/api/knowledge_document/delete`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ id: documentId }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not delete knowledge document.");
    }

    return response.json();
}

async function ingestDocumentFile(file) {
    const formData = new FormData();
    formData.append("document", file);

    const response = await fetch("/api/knowledge_document/create", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not ingest document.");
    }

    return response.json();
}

async function startSession() {
    const response = await fetch("/api/chat/sessions/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
    });

    if (!response.ok) {
        throw new Error("Could not start a new chat session.");
    }

    const data = await response.json();
    sessionId = data.sessionId;
    await refreshSessions();
}

async function refreshSessions() {
  sessions = await fetchSessions();
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";

  if (sessions.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "No previous chats";
    historyList.append(empty);
    return;
  }

  for (const session of sessions) {
    const button = document.createElement("button");
    button.className = "history-item";
    button.type = "button";
    button.classList.toggle("active", session.id === sessionId);
    button.setAttribute(
      "aria-current",
      session.id === sessionId ? "true" : "false"
    );

    const title = document.createElement("span");
    title.className = "history-title";
    title.textContent = truncateText(session.title, 58);

    button.append(title);

    button.addEventListener("click", () => {
      loadSession(session.id);
    });

    historyList.append(button);
  }
}

async function refreshKnowledgeDocuments() {
  knowledgeDocuments =
    await fetchKnowledgeDocuments();

  renderKnowledgeDocuments();
}

function renderKnowledgeDocuments() {
  knowledgeList.innerHTML = "";

  if (knowledgeDocuments.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "No knowledge documents";
    knowledgeList.append(empty);
    return;
  }

  for (const knowledgeDocument of knowledgeDocuments) {
    const button = document.createElement("button");
    button.className = "knowledge-item";
    button.type = "button";
    button.classList.toggle("active", knowledgeDocument.id === selectedKnowledgeId);

    const title = document.createElement("span");
    title.className = "knowledge-item-title";
    title.textContent = knowledgeDocument.title;

    const meta = document.createElement("span");
    meta.className = "knowledge-item-meta";
    meta.textContent = `${knowledgeDocument.chunk_count} chunks · ${formatSessionTime(knowledgeDocument.created_at)}`;

    const preview = document.createElement("span");
    preview.className = "knowledge-item-preview";
    preview.textContent = knowledgeDocument.preview || "No preview available";

    button.append(title, meta, preview);
    button.addEventListener("click", () => {
      loadKnowledgeDocument(knowledgeDocument.id);
    });

    knowledgeList.append(button);
  }
}

async function loadKnowledgeDocument(documentId) {
  selectedKnowledgeId = documentId;
  renderKnowledgeDocuments();
  setKnowledgeEditorDisabled(true);
  knowledgeCenterStatus.textContent = "Loading document...";

  try {
    const document =
      await fetchKnowledgeDocument(documentId);

    selectedKnowledgeId = document.id;
    knowledgeEditorTitle.value = document.title;
    knowledgeEditorContent.value = document.content;
    setKnowledgeEditorDisabled(false);
    knowledgeCenterStatus.textContent = `${document.chunk_count} chunks loaded.`;
  } catch (error) {
    knowledgeCenterStatus.textContent = error.message;
  }
}

function clearKnowledgeEditor() {
  selectedKnowledgeId = null;
  knowledgeEditorTitle.value = "";
  knowledgeEditorContent.value = "";
  setKnowledgeEditorDisabled(true);
}

function setKnowledgeEditorDisabled(disabled) {
  knowledgeEditorTitle.disabled = disabled;
  knowledgeEditorContent.disabled = disabled;
  saveKnowledgeButton.disabled = disabled;
  deleteKnowledgeButton.disabled = disabled;
}

async function loadSession(nextSessionId) {
  if (nextSessionId === sessionId) return;

  sessionId = nextSessionId;
  renderHistory();
  messages.innerHTML = "";
  messages.append(createTypingMessage());

  try {
    const sessionMessages =
      await fetchSessionMessages(nextSessionId);

    messages.innerHTML = "";

    if (sessionMessages.length === 0) {
      renderWelcomeMessage();
    } else {
      for (const message of sessionMessages) {
        messages.append(createMessage(message.role, message.content));
      }
    }

    scrollToBottom();
    input.focus();
  } catch (error) {
    messages.innerHTML = "";
    messages.append(createMessage("assistant", error.message));
  }
}

function truncateText(text, maxLength) {
  const value = String(text ?? "").trim();

  if (value.length <= maxLength) {
    return value || "New chat";
  }

  return `${value.slice(0, maxLength - 1).trim()}...`;
}

function formatSessionTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

async function initializeChat() {
  try {
    await refreshSessions();
    renderWelcomeMessage();
    await startSession();
  } catch (error) {
    renderWelcomeMessage();
    messages.append(createMessage("assistant", error.message));
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = input.value.trim();
  if (!message) return;

  messages.append(createMessage("user", message));
  input.value = "";
  resizeInput();

  const typing = createTypingMessage();
  messages.append(typing);
  scrollToBottom();

  form.querySelector("button").disabled = true;

  try {
    const data = await sendMessage(message);
    typing.replaceWith(createMessage("assistant", data.answer, data.sources));
    await refreshSessions();
  } catch (error) {
    typing.replaceWith(createMessage("assistant", error.message));
  } finally {
    form.querySelector("button").disabled = false;
    input.focus();
    scrollToBottom();
  }
});

input.addEventListener("input", resizeInput);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && projectDrawer.classList.contains("open")) {
    closeProjectMenu();
  }

  if (event.key === "Escape" && ingestDrawer.classList.contains("open")) {
    closeIngestMenu();
  }

  if (event.key === "Escape" && knowledgeCenter.classList.contains("open")) {
    closeKnowledgeCenter();
  }
});

newChatButton.addEventListener("click", async () => {
  renderWelcomeMessage();

  try {
    await startSession();
    input.focus();
  } catch (error) {
    messages.append(createMessage("assistant", error.message));
  }
});

openIngestButton.addEventListener("click", () => {
  ingestDrawer.classList.add("open");
  ingestDrawer.setAttribute("aria-hidden", "false");
  knowledgeInput.focus();
});

openProjectButton.addEventListener("click", () => {
  projectDrawer.classList.add("open");
  projectDrawer.setAttribute("aria-hidden", "false");
  projectNameInput.focus();
});

openKnowledgeButton.addEventListener("click", async () => {
  knowledgeCenter.classList.add("open");
  knowledgeCenter.setAttribute("aria-hidden", "false");
  knowledgeCenterStatus.textContent = "Loading documents...";

  try {
    await refreshKnowledgeDocuments();
    knowledgeCenterStatus.textContent = "";
  } catch (error) {
    knowledgeCenterStatus.textContent = error.message;
  }
});

closeProjectButton.addEventListener("click", () => {
  closeProjectMenu();
});

closeIngestButton.addEventListener("click", () => {
  closeIngestMenu();
});

closeKnowledgeButton.addEventListener("click", () => {
  closeKnowledgeCenter();
});

refreshKnowledgeButton.addEventListener("click", async () => {
  knowledgeCenterStatus.textContent = "Refreshing documents...";

  try {
    await refreshKnowledgeDocuments();
    knowledgeCenterStatus.textContent = "";
  } catch (error) {
    knowledgeCenterStatus.textContent = error.message;
  }
});

function closeIngestMenu() {
  ingestDrawer.classList.remove("open");
  ingestDrawer.setAttribute("aria-hidden", "true");
  openIngestButton.focus();
}

function closeProjectMenu() {
  projectDrawer.classList.remove("open");
  projectDrawer.setAttribute("aria-hidden", "true");
  openProjectButton.focus();
}

function closeKnowledgeCenter() {
  knowledgeCenter.classList.remove("open");
  knowledgeCenter.setAttribute("aria-hidden", "true");
  openKnowledgeButton.focus();
}

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = projectNameInput.value.trim();
  const code = projectCodeInput.value.trim();

  if (!name || !code) {
    projectStatus.textContent = "Name and code are required.";
    return;
  }

  createProjectButton.disabled = true;
  projectStatus.textContent = "Creating project...";
  projectResult.hidden = true;

  try {
    const project =
      await createProject(name, code);

    createdProjectName.textContent = project.name;
    createdProjectCode.textContent = project.code;
    projectKeyOutput.value = project.project_key;
    projectResult.hidden = false;
    projectForm.reset();
    projectStatus.textContent = "Project created.";
  } catch (error) {
    projectStatus.textContent = error.message;
  } finally {
    createProjectButton.disabled = false;
  }
});

copyProjectKeyButton.addEventListener("click", async () => {
  if (!projectKeyOutput.value) return;

  try {
    await navigator.clipboard.writeText(projectKeyOutput.value);
    projectStatus.textContent = "Project key copied.";
  } catch (error) {
    projectKeyOutput.select();
    projectStatus.textContent = "Project key selected.";
  }
});

textIngestTab.addEventListener("click", () => {
  setIngestTab("text");
});

documentIngestTab.addEventListener("click", () => {
  setIngestTab("document");
});

function setIngestTab(tab) {
  const isText = tab === "text";

  textIngestTab.classList.toggle("active", isText);
  documentIngestTab.classList.toggle("active", !isText);
  textIngestTab.setAttribute("aria-selected", String(isText));
  documentIngestTab.setAttribute("aria-selected", String(!isText));

  textIngestPanel.classList.toggle("active", isText);
  documentIngestPanel.classList.toggle("active", !isText);
  textIngestPanel.hidden = !isText;
  documentIngestPanel.hidden = isText;
}

ingestForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const content = knowledgeInput.value.trim();
  if (!content) {
    ingestStatus.textContent = "Paste some knowledge first.";
    return;
  }

  const button = ingestForm.querySelector("button");
  button.disabled = true;
  ingestStatus.textContent = "Ingesting knowledge...";

  try {
    await ingestKnowledge(content);
    knowledgeTitleInput.value = "";
    knowledgeInput.value = "";
    ingestStatus.textContent = "Knowledge ingested.";
    if (knowledgeCenter.classList.contains("open")) {
      await refreshKnowledgeDocuments();
    }
  } catch (error) {
    ingestStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

uploadDocumentButton.addEventListener("click", async () => {
  const file = documentUpload.files[0];

  if (!file) {
    documentIngestStatus.textContent = "Choose a document first.";
    return;
  }

  uploadDocumentButton.disabled = true;
  documentIngestStatus.textContent = "Uploading document...";

  try {
    await ingestDocumentFile(file);
    documentUpload.value = "";
    documentIngestStatus.textContent = "Document ingested.";
    if (knowledgeCenter.classList.contains("open")) {
      await refreshKnowledgeDocuments();
    }
  } catch (error) {
    documentIngestStatus.textContent = error.message;
  } finally {
    uploadDocumentButton.disabled = false;
  }
});

knowledgeEditor.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedKnowledgeId) return;

  const title = knowledgeEditorTitle.value.trim();
  const content = knowledgeEditorContent.value.trim();

  if (!title || !content) {
    knowledgeCenterStatus.textContent = "Title and content are required.";
    return;
  }

  setKnowledgeEditorDisabled(true);
  knowledgeCenterStatus.textContent = "Saving document...";

  try {
    await updateKnowledgeDocument(selectedKnowledgeId, {
      title,
      content,
    });
    await refreshKnowledgeDocuments();
    await loadKnowledgeDocument(selectedKnowledgeId);
    knowledgeCenterStatus.textContent = "Document updated.";
  } catch (error) {
    knowledgeCenterStatus.textContent = error.message;
    setKnowledgeEditorDisabled(false);
  }
});

deleteKnowledgeButton.addEventListener("click", async () => {
  if (!selectedKnowledgeId) return;

  const confirmed = window.confirm(
    "Delete this knowledge document and all of its chunks?"
  );

  if (!confirmed) return;

  setKnowledgeEditorDisabled(true);
  knowledgeCenterStatus.textContent = "Deleting document...";

  try {
    await deleteKnowledgeDocument(selectedKnowledgeId);
    clearKnowledgeEditor();
    await refreshKnowledgeDocuments();
    knowledgeCenterStatus.textContent = "Document deleted.";
  } catch (error) {
    knowledgeCenterStatus.textContent = error.message;
    setKnowledgeEditorDisabled(false);
  }
});

clearKnowledgeEditor();
resizeInput();
initializeChat();

logoutButton.addEventListener('click', () => {
    clearAuth();
    window.location.href = '/login';
});
