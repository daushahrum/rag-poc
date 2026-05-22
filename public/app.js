const form = document.querySelector("#chatForm");
const input = document.querySelector("#messageInput");
const messages = document.querySelector("#messages");
const newChatButton = document.querySelector("#newChatButton");
const ingestForm = document.querySelector("#ingestForm");
const knowledgeInput = document.querySelector("#knowledgeInput");
const ingestStatus = document.querySelector("#ingestStatus");
let sessionId = null;

function createMessage(role, content, sources = []) {
  const article = document.createElement("article");
  article.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = role === "user" ? "You" : "AI";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  bubble.append(renderFormattedText(content));

  if (sources.length > 0) {
    bubble.append(createSources(sources));
  }

  article.append(avatar, bubble);
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
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    parent.append(document.createTextNode(text.slice(cursor, match.index)));

    const token = match[0];
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

  article.append(avatar, bubble);
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

  const response = await fetch("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
      message,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "The assistant could not answer right now.");
  }

  return response.json();
}

async function ingestKnowledge(content) {
  const response = await fetch("/ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Could not ingest knowledge.");
  }

  return response.json();
}

async function startSession() {
  const response = await fetch("/sessions", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Could not start a new chat session.");
  }

  const data = await response.json();
  sessionId = data.sessionId;
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

newChatButton.addEventListener("click", async () => {
  messages.innerHTML = "";
  messages.append(
    createMessage("assistant", "Hello. Ask me anything from your ingested documents."),
  );

  try {
    await startSession();
    input.focus();
  } catch (error) {
    messages.append(createMessage("assistant", error.message));
  }
});

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
    knowledgeInput.value = "";
    ingestStatus.textContent = "Knowledge ingested.";
  } catch (error) {
    ingestStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

resizeInput();
startSession().catch((error) => {
  messages.append(createMessage("assistant", error.message));
});
