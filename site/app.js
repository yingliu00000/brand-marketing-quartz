const messages = document.querySelector("#messages")
const composer = document.querySelector("#composer")
const input = document.querySelector("#input")
const prompts = document.querySelectorAll("[data-prompt]")
const sessions = document.querySelector("#sessions")

const placeholderReply =
  "这个入口已经切换为对外提问界面。DeepSeek 后端接入阿里云后，我会基于精选知识库回答，并隐藏全量文章列表。当前版本先收集问题，不公开底层文章。"

function addMessage(role, text) {
  const empty = messages.querySelector(".empty")
  if (empty) empty.remove()

  const item = document.createElement("article")
  item.className = `message ${role}`
  item.innerHTML = `
    <div class="avatar">${role === "user" ? "你" : "营"}</div>
    <div class="bubble"></div>
  `
  item.querySelector(".bubble").textContent = text
  messages.appendChild(item)
  messages.scrollTop = messages.scrollHeight
}

function rememberQuestion(text) {
  const empty = sessions.querySelector(".session-empty")
  if (empty) empty.remove()
  const item = document.createElement("button")
  item.className = "session"
  item.type = "button"
  item.textContent = text.length > 22 ? `${text.slice(0, 22)}...` : text
  sessions.prepend(item)
}

function submitQuestion(text) {
  const question = text.trim()
  if (!question) return
  addMessage("user", question)
  rememberQuestion(question)
  input.value = ""
  window.setTimeout(() => addMessage("assistant", placeholderReply), 420)
}

composer.addEventListener("submit", (event) => {
  event.preventDefault()
  submitQuestion(input.value)
})

input.addEventListener("input", () => {
  input.style.height = "auto"
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`
})

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    submitQuestion(input.value)
  }
})

prompts.forEach((button) => {
  button.addEventListener("click", () => submitQuestion(button.dataset.prompt || ""))
})
