const config = window.BRAND_CHAT_CONFIG || {};
const apiBase = (config.apiBase || "").replace(/\/$/, "");
const apiUrl = `${apiBase}/api/chat`;

const messagesEl = document.querySelector("#messages");
const composer = document.querySelector("#composer");
const input = document.querySelector("#input");
const sendButton = document.querySelector("#send");
const newChatButton = document.querySelector("#newChat");
const sessionsEl = document.querySelector("#sessions");
const historySearch = document.querySelector("#historySearch");
const statusEl = document.querySelector("#connectionStatus");
const modelSelect = document.querySelector("#modelSelect");

const STORAGE_KEY = "brand-marketing-chat-sessions";
const MODEL_KEY = "brand-marketing-chat-model";
let sessions = loadSessions();
let activeSessionId = sessions[0]?.id || createSession().id;

if (modelSelect) {
  modelSelect.value = localStorage.getItem(MODEL_KEY) || "deepseek-v4-flash";
}

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 20)));
}

function createSession() {
  const session = {
    id: `s_${Date.now()}`,
    title: "新建提问",
    messages: [],
    updatedAt: Date.now(),
  };
  sessions.unshift(session);
  saveSessions();
  renderSessions();
  return session;
}

function activeSession() {
  return sessions.find((session) => session.id === activeSessionId) || createSession();
}

function setActiveSession(id) {
  activeSessionId = id;
  renderMessages();
  renderSessions();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMessage(text) {
  const safe = escapeHtml(text.trim());
  return safe
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

function sourceTemplate(source, index) {
  const title = source.title || "未命名文章";
  const meta = [source.account, source.date].filter(Boolean).join(" · ");
  const url = source.url || "";
  const link = url
    ? `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">打开原文</a>`
    : `<span class="source-link muted">无原文链接</span>`;

  return `
    <li class="source-item">
      <div class="source-index">${index + 1}</div>
      <div class="source-main">
        <div class="source-title">${escapeHtml(title)}</div>
        ${meta ? `<div class="source-meta">${escapeHtml(meta)}</div>` : ""}
      </div>
      ${link}
    </li>
  `;
}

function sourcesTemplate(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return "";
  return `
    <div class="sources">
      <div class="sources-heading">参考原文</div>
      <ol class="source-list">
        ${sources.slice(0, 6).map(sourceTemplate).join("")}
      </ol>
    </div>
  `;
}

function messageTemplate(message) {
  const avatar = message.role === "user" ? "你" : "营";
  return `
    <article class="message ${message.role}">
      <div class="avatar">${avatar}</div>
      <div class="bubble">
        <p>${formatMessage(message.content)}</p>
        ${message.role === "assistant" ? sourcesTemplate(message.sources) : ""}
      </div>
    </article>
  `;
}

function renderMessages() {
  const session = activeSession();
  if (session.messages.length === 0) {
    messagesEl.innerHTML = `
      <div class="empty">
        <h1>今天想拆哪个品牌营销问题？</h1>
        <p>可以问增长策略、私域运营、内容营销、消费者洞察、品牌案例和品类趋势。公开页面只提供问答入口，不展示全量文章库。</p>
        <div class="prompts">
          <button type="button" data-prompt="帮我拆一个新消费品牌的增长策略，先看哪些维度？">新消费品牌增长，先看哪些维度？</button>
          <button type="button" data-prompt="小红书内容种草怎么判断是不是有效？">小红书种草效果怎么判断？</button>
          <button type="button" data-prompt="私域复购体系应该怎么搭？">私域复购体系怎么搭？</button>
        </div>
      </div>
    `;
    bindPromptButtons();
    return;
  }

  messagesEl.innerHTML = session.messages.map(messageTemplate).join("");
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderSessions() {
  const query = historySearch?.value?.trim() || "";
  const filtered = sessions.filter((session) => session.title.includes(query));

  if (!filtered.length) {
    sessionsEl.innerHTML = `<div class="session-empty">暂无匹配对话</div>`;
    return;
  }

  sessionsEl.innerHTML = filtered
    .map((session) => {
      const active = session.id === activeSessionId ? " active" : "";
      return `<button class="session${active}" type="button" data-session-id="${session.id}">${escapeHtml(session.title)}</button>`;
    })
    .join("");

  document.querySelectorAll("[data-session-id]").forEach((button) => {
    button.addEventListener("click", () => setActiveSession(button.dataset.sessionId));
  });
}

function bindPromptButtons() {
  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.prompt;
      input.focus();
      autoResize();
    });
  });
}

function autoResize() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
}

function setBusy(isBusy) {
  input.disabled = isBusy;
  sendButton.disabled = isBusy;
  sendButton.textContent = isBusy ? "…" : "↗";
}

async function sendMessage(text) {
  const session = activeSession();
  session.messages.push({ role: "user", content: text });
  session.title = text.slice(0, 28) || "新建提问";
  session.updatedAt = Date.now();
  saveSessions();
  renderMessages();
  renderSessions();

  setBusy(true);
  const assistantMessage = { role: "assistant", content: "正在调用 DeepSeek 分析..." };
  session.messages.push(assistantMessage);
  renderMessages();

  try {
    const selectedModel = modelSelect?.value || "deepseek-v4-flash";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: session.messages
          .filter((message) => message.content !== "正在调用 DeepSeek 分析...")
          .map((message) => ({ role: message.role, content: message.content }))
          .slice(-10),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `接口请求失败：${response.status}`);
    }

    assistantMessage.content = data.answer || "DeepSeek 没有返回内容。";
    assistantMessage.sources = data.sources || [];
    assistantMessage.model = data.model || selectedModel;
    statusEl.textContent = `DeepSeek ${assistantMessage.model.includes("pro") ? "Pro" : "Flash"} 已接入`;
  } catch (error) {
    assistantMessage.content = `暂时没有连上 DeepSeek 后端：${error.message}\n\n如果这是刚部署的页面，需要先在阿里云后端配置 DEEPSEEK_API_KEY，并把前端 apiBase 指向后端域名。`;
    assistantMessage.sources = [];
    statusEl.textContent = "等待后端连接";
  } finally {
    saveSessions();
    renderMessages();
    renderSessions();
    setBusy(false);
  }
}

composer.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  autoResize();
  await sendMessage(text);
});

input.addEventListener("input", autoResize);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    composer.requestSubmit();
  }
});

newChatButton.addEventListener("click", () => {
  const session = createSession();
  setActiveSession(session.id);
  input.focus();
});

historySearch?.addEventListener("input", renderSessions);
modelSelect?.addEventListener("change", () => {
  localStorage.setItem(MODEL_KEY, modelSelect.value);
  statusEl.textContent = `DeepSeek ${modelSelect.value.includes("pro") ? "Pro" : "Flash"} 已选择`;
});

renderMessages();
renderSessions();
bindPromptButtons();
