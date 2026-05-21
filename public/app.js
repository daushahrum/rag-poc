const form = document.querySelector("#chatForm");
const input = document.querySelector("#messageInput");
const messages = document.querySelector("#messages");
const newChatButton = document.querySelector("#newChatButton");

function createMessage(role, content, sources = []) {
  const article = document.createElement("article");
  article.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = role === "user" ? "You" : "AI";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const text = document.createElement("p");
  text.textContent = content;
  bubble.append(text);

  if (sources.length > 0) {
    bubble.append(createSources(sources));
  }

  article.append(avatar, bubble);
  return article;
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
  const response = await fetch("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error("The assistant could not answer right now.");
  }

  return response.json();
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

newChatButton.addEventListener("click", () => {
  messages.innerHTML = "";
  messages.append(
    createMessage("assistant", "Hello. Ask me anything from your ingested documents."),
  );
  input.focus();
});

resizeInput();
