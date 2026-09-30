const API = {
    chat: "/api/chat",
    health: "/api/health",
};

const STORAGE_KEY = "product-ai:conversation:v1";
const MAX_LOCAL_MESSAGES = 60;

const elements = {
    form: document.querySelector("#chat-form"),
    input: document.querySelector("#message-input"),
    send: document.querySelector("#send-button"),
    messages: document.querySelector("#messages"),
    conversation: document.querySelector("#conversation"),
    welcome: document.querySelector("#welcome"),
    newChat: document.querySelector("#new-chat"),
    connection: document.querySelector("#connection"),
    connectionLabel: document.querySelector("#connection-label"),
    productName: document.querySelector("#product-name"),
    modelName: document.querySelector("#model-name"),
    debugToggle: document.querySelector("#debug-toggle"),
    debugDrawer: document.querySelector("#debug-drawer"),
    debugClose: document.querySelector("#debug-close"),
    debugBackdrop: document.querySelector("#drawer-backdrop"),
    debugRefresh: document.querySelector("#debug-refresh"),
    debugClear: document.querySelector("#debug-clear"),
    debugApi: document.querySelector("#debug-api"),
    debugStream: document.querySelector("#debug-stream"),
    debugModel: document.querySelector("#debug-model"),
    debugRequest: document.querySelector("#debug-request"),
    debugDuration: document.querySelector("#debug-duration"),
    debugCharacters: document.querySelector("#debug-characters"),
    debugRoutes: document.querySelector("#debug-routes"),
    eventLog: document.querySelector("#event-log"),
};

const state = {
    messages: loadConversation(),
    controller: null,
    streamError: null,
    eventCount: 0,
};

function loadConversation() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item) =>
            ["user", "assistant"].includes(item?.role)
            && typeof item?.content === "string"
            && item.content.trim()
        ).slice(-MAX_LOCAL_MESSAGES);
    } catch {
        return [];
    }
}

function saveConversation() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages.slice(-MAX_LOCAL_MESSAGES)));
}

function setConnection(status, label) {
    elements.connection.className = `connection ${status}`;
    elements.connectionLabel.textContent = label;
    elements.debugApi.textContent = label;
}

function formatTime() {
    return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(new Date());
}

function logEvent(type, detail = "") {
    if (state.eventCount === 0) elements.eventLog.replaceChildren();
    state.eventCount += 1;

    const row = document.createElement("div");
    row.className = "log-row";

    const time = document.createElement("span");
    time.className = "log-time";
    time.textContent = formatTime();

    const eventType = document.createElement("span");
    eventType.className = "log-type";
    eventType.textContent = type;

    const eventDetail = document.createElement("span");
    eventDetail.className = "log-detail";
    eventDetail.title = detail;
    eventDetail.textContent = detail;

    row.append(time, eventType, eventDetail);
    elements.eventLog.append(row);
    while (elements.eventLog.children.length > 80) {
        elements.eventLog.firstElementChild.remove();
    }
    elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
}

function clearEventLog() {
    state.eventCount = 0;
    const empty = document.createElement("p");
    empty.className = "empty-log";
    empty.textContent = "Stream events will appear here.";
    elements.eventLog.replaceChildren(empty);
}

function createAvatar(role) {
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    if (role === "assistant") {
        avatar.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3.25 14.35 9.65 20.75 12l-6.4 2.35L12 20.75l-2.35-6.4L3.25 12l6.4-2.35L12 3.25Z"/></svg>';
    } else {
        avatar.textContent = "Y";
    }
    return avatar;
}

function appendTextBlock(container, text) {
    if (!text) return;
    const block = document.createElement("div");
    block.className = "text-block";
    block.textContent = text;
    container.append(block);
}

function appendCodeBlock(container, language, code) {
    const figure = document.createElement("div");
    figure.className = "code-block";

    const header = document.createElement("div");
    header.className = "code-header";
    const label = document.createElement("span");
    label.textContent = language || "code";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "copy-button";
    copy.textContent = "Copy";
    copy.addEventListener("click", async () => {
        await navigator.clipboard.writeText(code);
        copy.textContent = "Copied";
        window.setTimeout(() => { copy.textContent = "Copy"; }, 1200);
    });

    const pre = document.createElement("pre");
    const codeElement = document.createElement("code");
    codeElement.textContent = code;
    pre.append(codeElement);
    header.append(label, copy);
    figure.append(header, pre);
    container.append(figure);
}

function renderContent(container, content, isError = false) {
    container.replaceChildren();
    container.classList.toggle("message-error", isError);

    if (isError) {
        appendTextBlock(container, content);
        return;
    }

    const fence = /```([\w.+-]*)\n?([\s\S]*?)```/g;
    let cursor = 0;
    let match;
    while ((match = fence.exec(content)) !== null) {
        appendTextBlock(container, content.slice(cursor, match.index));
        appendCodeBlock(container, match[1], match[2].replace(/\n$/, ""));
        cursor = match.index + match[0].length;
    }
    appendTextBlock(container, content.slice(cursor));
}

function addMessage(role, content, options = {}) {
    elements.welcome.hidden = true;
    const article = document.createElement("article");
    article.className = `message ${role}${options.streaming ? " streaming" : ""}`;
    article.setAttribute("aria-label", role === "user" ? "Your message" : "AI response");

    const body = document.createElement("div");
    body.className = "message-body";
    renderContent(body, content, options.error);

    article.append(createAvatar(role), body);
    elements.messages.append(article);
    scrollToBottom(true);
    return { article, body };
}

function updateMessage(message, content, options = {}) {
    renderContent(message.body, content, options.error);
    message.article.classList.toggle("streaming", Boolean(options.streaming));
    scrollToBottom();
}

function scrollToBottom(force = false) {
    const distance = elements.conversation.scrollHeight
        - elements.conversation.scrollTop
        - elements.conversation.clientHeight;
    if (force || distance < 180) {
        elements.conversation.scrollTo({
            top: elements.conversation.scrollHeight,
            behavior: force ? "smooth" : "auto",
        });
    }
}

function renderConversation() {
    elements.messages.replaceChildren();
    elements.welcome.hidden = state.messages.length > 0;
    state.messages.forEach((message) => addMessage(message.role, message.content));
}

function resizeInput() {
    elements.input.style.height = "auto";
    elements.input.style.height = `${Math.min(elements.input.scrollHeight, 192)}px`;
}

function updateSendButton() {
    const streaming = Boolean(state.controller);
    elements.send.classList.toggle("is-streaming", streaming);
    elements.send.disabled = !streaming && !elements.input.value.trim();
    elements.send.setAttribute("aria-label", streaming ? "Stop generating" : "Send message");
}

function setStreaming(active) {
    elements.debugStream.textContent = active ? "Receiving" : "Idle";
    elements.input.disabled = active;
    updateSendButton();
}

function processSseFrame(frame, onEvent) {
    if (!frame.trim()) return;
    let event = "message";
    const data = [];
    frame.split(/\r?\n/).forEach((line) => {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    });
    if (!data.length) return;

    const raw = data.join("\n");
    let payload;
    try {
        payload = JSON.parse(raw);
    } catch {
        payload = { content: raw };
    }
    onEvent(event, payload);
}

async function readEventStream(response, onEvent) {
    if (!response.body) throw new Error("Streaming is not supported by this browser.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() || "";
        frames.forEach((frame) => processSseFrame(frame, onEvent));
    }

    buffer += decoder.decode();
    processSseFrame(buffer, onEvent);
}

function responseError(response, body) {
    const detail = body?.detail;
    if (Array.isArray(detail)) return detail[0]?.msg || `Request failed (${response.status})`;
    if (typeof detail === "string") return detail;
    return `Request failed (${response.status})`;
}

async function submitMessage(event) {
    event.preventDefault();
    if (state.controller) {
        state.controller.abort();
        return;
    }

    const content = elements.input.value.trim();
    if (!content) return;

    const userMessage = { role: "user", content };
    state.messages.push(userMessage);
    state.messages = state.messages.slice(-MAX_LOCAL_MESSAGES);
    saveConversation();
    addMessage("user", content);

    elements.input.value = "";
    resizeInput();
    const assistantMessage = addMessage("assistant", "", { streaming: true });
    const controller = new AbortController();
    state.controller = controller;
    state.streamError = null;
    elements.debugRequest.textContent = "Pending";
    elements.debugDuration.textContent = "—";
    elements.debugCharacters.textContent = "0";
    setStreaming(true);
    logEvent("send", `${state.messages.length} message(s)`);

    let answer = "";
    try {
        const response = await fetch(API.chat, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: state.messages }),
            signal: controller.signal,
        });

        if (!response.ok) {
            let body = null;
            try { body = await response.json(); } catch { /* response was not JSON */ }
            throw new Error(responseError(response, body));
        }

        await readEventStream(response, (type, payload) => {
            if (type === "meta") {
                elements.debugRequest.textContent = payload.requestId || "—";
                elements.debugModel.textContent = payload.model || "—";
                logEvent("meta", payload.requestId || "request opened");
            } else if (type === "token") {
                const token = payload.content || "";
                answer += token;
                elements.debugCharacters.textContent = String(answer.length);
                updateMessage(assistantMessage, answer, { streaming: true });
                logEvent("token", `${token.length} character(s)`);
            } else if (type === "error") {
                state.streamError = payload.message || "The stream failed.";
                logEvent("error", state.streamError);
            } else if (type === "done") {
                elements.debugDuration.textContent = `${payload.durationMs ?? "—"} ms`;
                logEvent("done", payload.status || "complete");
            }
        });

        if (state.streamError) throw new Error(state.streamError);
        if (!answer) throw new Error("The AI service returned an empty response.");
        updateMessage(assistantMessage, answer);
        state.messages.push({ role: "assistant", content: answer });
        state.messages = state.messages.slice(-MAX_LOCAL_MESSAGES);
        saveConversation();
    } catch (error) {
        if (error.name === "AbortError") {
            logEvent("stop", "generation stopped by user");
            if (answer) {
                updateMessage(assistantMessage, answer);
                state.messages.push({ role: "assistant", content: answer });
                saveConversation();
            } else {
                updateMessage(assistantMessage, "Generation stopped.", { error: true });
            }
        } else {
            const message = error.message || "Something went wrong. Please try again.";
            updateMessage(assistantMessage, message, { error: true });
            logEvent("error", message);
        }
    } finally {
        state.controller = null;
        state.streamError = null;
        setStreaming(false);
        elements.input.focus();
    }
}

function newChat() {
    if (state.controller) state.controller.abort();
    state.messages = [];
    saveConversation();
    elements.messages.replaceChildren();
    elements.welcome.hidden = false;
    elements.input.value = "";
    resizeInput();
    updateSendButton();
    logEvent("reset", "local conversation cleared");
    elements.input.focus();
}

function openDebug() {
    elements.debugDrawer.classList.add("open");
    elements.debugDrawer.setAttribute("aria-hidden", "false");
    elements.debugToggle.setAttribute("aria-expanded", "true");
    elements.debugBackdrop.hidden = false;
    requestAnimationFrame(() => elements.debugBackdrop.classList.add("visible"));
    refreshDebug();
}

function closeDebug() {
    elements.debugDrawer.classList.remove("open");
    elements.debugDrawer.setAttribute("aria-hidden", "true");
    elements.debugToggle.setAttribute("aria-expanded", "false");
    elements.debugBackdrop.classList.remove("visible");
    window.setTimeout(() => { elements.debugBackdrop.hidden = true; }, 180);
}

async function refreshDebug() {
    try {
        const response = await fetch(API.health, { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = await response.json();
        elements.debugApi.textContent = data.status === "ok" ? "Online" : data.status;
        elements.debugModel.textContent = data.model || "—";
        logEvent("health", data.status || "unknown");
    } catch {
        elements.debugApi.textContent = "Unavailable";
        logEvent("error", "health endpoint unavailable");
    }
}

async function initialize() {
    renderConversation();
    resizeInput();
    updateSendButton();

    try {
        const healthResponse = await fetch(API.health, { cache: "no-store" });
        if (!healthResponse.ok) throw new Error();
        const health = await healthResponse.json();
        elements.modelName.textContent = health.model || "AI";
        elements.debugModel.textContent = health.model || "—";
        setConnection("online", "Online");
        logEvent("ready", health.model || "configured");
    } catch {
        setConnection("offline", "Offline");
        logEvent("error", "API health check failed");
    }
}

elements.form.addEventListener("submit", submitMessage);
elements.input.addEventListener("input", () => {
    resizeInput();
    updateSendButton();
});
elements.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        elements.form.requestSubmit();
    }
});
elements.newChat.addEventListener("click", newChat);
elements.debugToggle.addEventListener("click", openDebug);
elements.debugClose.addEventListener("click", closeDebug);
elements.debugBackdrop.addEventListener("click", closeDebug);
elements.debugRefresh.addEventListener("click", refreshDebug);
elements.debugClear.addEventListener("click", clearEventLog);
document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
        elements.input.value = button.dataset.prompt;
        resizeInput();
        updateSendButton();
        elements.input.focus();
    });
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.debugDrawer.classList.contains("open")) closeDebug();
});

initialize();
