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
const accountButton = document.querySelector("#accountButton");
const settingsButton = document.querySelector("#settingsButton");
const quotaNotice = document.querySelector("#quotaNotice");
const accountModal = document.querySelector("#accountModal");
const closeAccountModal = document.querySelector("#closeAccountModal");
const saveAccountButton = document.querySelector("#saveAccountButton");
const logoutButton = document.querySelector("#logoutButton");
const accountNameInput = document.querySelector("#accountName");
const userApiKeyInput = document.querySelector("#userApiKey");

const ACTIVE_ACCOUNT_KEY = "brand-marketing-active-account";
const MODEL_KEY = "brand-marketing-chat-model";
const FREE_LIMIT = 5;

let activeAccountId = localStorage.getItem(ACTIVE_ACCOUNT_KEY) || "";
let account = loadAccount(activeAccountId);
let sessions = account ? loadSessions() : [];
let activeSessionId = sessions[0]?.id || (account ? createSession().id : "");

if (modelSelect) {
  modelSelect.value = localStorage.getItem(MODEL_KEY) || "deepseek-v4-flash";
}

function accountKey(accountId) {
  return `brand-marketing-account:${accountId}`;
}

function sessionsKey() {
  return `brand-marketing-chat-sessions:${account.id}`;
}

function normalizeAccountId(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 60);
}

function loadAccount(accountId) {
  if (!accountId) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(accountKey(accountId)) || "null");
    if (saved?.id && saved?.name) return saved;
  } catch {
    return null;
  }
  return null;
}

function saveAccount(accountData = account) {
  if (!accountData?.id) return;
  localStorage.setItem(accountKey(accountData.id), JSON.stringify(accountData));
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountData.id);
}

function loadSessions() {
  if (!account) return [];
  try {
    return JSON.parse(localStorage.getItem(sessionsKey()) || "[]");
  } catch {
    return [];
  }
}

function saveSessions() {
  if (!account) return;
  localStorage.setItem(sessionsKey(), JSON.stringify(sessions.slice(0, 50)));
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
  if (!account) return null;
  return sessions.find((session) => session.id === activeSessionId) || createSession();
}

function setActiveSession(id) {
  activeSessionId = id;
  renderMessages();
  renderSessions();
}

function remainingFree() {
  if (!account) return 0;
  return Math.max(0, FREE_LIMIT - (account.freeUsed || 0));
}

function hasUserApiKey() {
  return Boolean(account?.userApiKey);
}

function canAsk() {
  return Boolean(account && (remainingFree() > 0 || hasUserApiKey()));
}

function escapeHtml(value) {
  return String(value || "")
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
  if (!account) {
    messagesEl.innerHTML = `
      <div class="empty">
        <h1>先登录一个账号</h1>
        <p>每个账号免费提问 5 次。免费额度用完后，填写自己的 DeepSeek API Key 继续使用，并保留该账号自己的历史记录。</p>
        <div class="prompts">
          <button type="button" data-open-account>登录 / 创建账号</button>
        </div>
      </div>
    `;
    document.querySelector("[data-open-account]")?.addEventListener("click", openAccountModal);
    return;
  }

  const session = activeSession();
  if (session.messages.length === 0) {
    messagesEl.innerHTML = `
      <div class="empty">
        <h1>今天想拆哪个品牌营销问题？</h1>
        <p>可以问增长策略、私域运营、内容营销、消费者洞察、品牌案例和品类趋势。每个账号免费 5 次，之后使用自己的 DeepSeek API Key。</p>
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
  if (!account) {
    sessionsEl.innerHTML = `<div class="session-empty">登录后显示历史</div>`;
    return;
  }

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

function renderAccountState() {
  if (!account) {
    accountButton.textContent = "登录";
    statusEl.textContent = "登录后可提问";
    quotaNotice.textContent = "请先登录或创建账号。";
    quotaNotice.classList.add("visible");
    input.disabled = true;
    sendButton.disabled = true;
    return;
  }

  const remain = remainingFree();
  accountButton.textContent = account.name;
  statusEl.textContent = hasUserApiKey()
    ? "使用自己的 DeepSeek Key"
    : `免费额度剩余 ${remain}/${FREE_LIMIT}`;

  if (remain > 0) {
    quotaNotice.textContent = `${account.name}：免费额度剩余 ${remain}/${FREE_LIMIT}`;
  } else if (hasUserApiKey()) {
    quotaNotice.textContent = `${account.name}：免费额度已用完，当前使用自己的 DeepSeek API Key`;
  } else {
    quotaNotice.textContent = `${account.name}：免费 5 次已用完，请点右下角设置自己的 DeepSeek API Key`;
  }
  quotaNotice.classList.add("visible");
  input.disabled = !canAsk();
  sendButton.disabled = !canAsk();
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
  input.disabled = isBusy || !canAsk();
  sendButton.disabled = isBusy || !canAsk();
  sendButton.textContent = isBusy ? "…" : "↗";
}

function openAccountModal() {
  accountNameInput.value = account?.name || "";
  userApiKeyInput.value = account?.userApiKey || "";
  accountModal.hidden = false;
  setTimeout(() => accountNameInput.focus(), 0);
}

function closeModal() {
  accountModal.hidden = true;
}

function switchAccount(name, userApiKey) {
  const id = normalizeAccountId(name);
  if (!id) return;

  const saved = loadAccount(id);
  account = saved || {
    id,
    name: name.trim(),
    freeUsed: 0,
    userApiKey: "",
    createdAt: Date.now(),
  };
  account.name = name.trim();
  account.userApiKey = userApiKey.trim();
  saveAccount();
  activeAccountId = account.id;
  sessions = loadSessions();
  activeSessionId = sessions[0]?.id || createSession().id;
  renderAll();
}

function logout() {
  localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  activeAccountId = "";
  account = null;
  sessions = [];
  activeSessionId = "";
  closeModal();
  renderAll();
}

async function sendMessage(text) {
  if (!account) {
    openAccountModal();
    return;
  }
  if (!canAsk()) {
    openAccountModal();
    return;
  }

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
    const useUserKey = remainingFree() <= 0 && hasUserApiKey();
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        userApiKey: useUserKey ? account.userApiKey : "",
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

    if (!useUserKey) {
      account.freeUsed = (account.freeUsed || 0) + 1;
      saveAccount();
    }
    assistantMessage.content = data.answer || "DeepSeek 没有返回内容。";
    assistantMessage.sources = data.sources || [];
    assistantMessage.model = data.model || selectedModel;
    statusEl.textContent = useUserKey
      ? `DeepSeek ${assistantMessage.model.includes("pro") ? "Pro" : "Flash"}，用户 Key`
      : `DeepSeek ${assistantMessage.model.includes("pro") ? "Pro" : "Flash"}，免费额度`;
  } catch (error) {
    assistantMessage.content = `暂时没有连上 DeepSeek 后端：${error.message}`;
    assistantMessage.sources = [];
    statusEl.textContent = "等待后端连接";
  } finally {
    saveSessions();
    renderMessages();
    renderSessions();
    renderAccountState();
    setBusy(false);
  }
}

function renderAll() {
  renderAccountState();
  renderMessages();
  renderSessions();
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
  if (!account) {
    openAccountModal();
    return;
  }
  const session = createSession();
  setActiveSession(session.id);
  input.focus();
});

historySearch?.addEventListener("input", renderSessions);
modelSelect?.addEventListener("change", () => {
  localStorage.setItem(MODEL_KEY, modelSelect.value);
  statusEl.textContent = `DeepSeek ${modelSelect.value.includes("pro") ? "Pro" : "Flash"} 已选择`;
});
accountButton?.addEventListener("click", openAccountModal);
settingsButton?.addEventListener("click", openAccountModal);
closeAccountModal?.addEventListener("click", closeModal);
accountModal?.addEventListener("click", (event) => {
  if (event.target === accountModal) closeModal();
});
saveAccountButton?.addEventListener("click", () => {
  switchAccount(accountNameInput.value, userApiKeyInput.value);
  closeModal();
});
logoutButton?.addEventListener("click", logout);

renderAll();
