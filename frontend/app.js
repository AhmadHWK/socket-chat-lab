/**
 * Multi-Client Chat — Frontend Logic (app.js)
 * Phase 4: Responsive Web Frontend
 *
 * Communicates with the Python socket server via HTTP/JSON using fetch().
 * Polls /messages every 1.5 seconds for updates.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
// Backend chat server runs on port 8080. Frontend may be served on a
// different port (e.g. 5500 via python -m http.server), so we hardcode
// the backend URL here instead of using window.location.origin.
const SERVER_BASE = "http://localhost:8080"; // Change to your PC's IP for mobile testing
const POLL_INTERVAL = 1500; // ms

let currentUser = null;
let lastMessageCount = 0;
let isPolling = false;

// ---------------------------------------------------------------------------
// DOM Elements
// ---------------------------------------------------------------------------
const loginModal = document.getElementById('login-modal');
const chatApp = document.getElementById('chat-app');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const loginError = document.getElementById('login-error');
const serverDisplay = document.getElementById('server-display');

const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const usersCountEl = document.getElementById('users-count');
const usersCountBadge = document.getElementById('users-count-badge');

const messagesArea = document.getElementById('messages-area');
const emptyState = document.getElementById('empty-state');
const usersList = document.getElementById('users-list');

const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// ---------------------------------------------------------------------------
// Helper: Format timestamp
// ---------------------------------------------------------------------------
function formatTimestamp(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Helper: API fetch wrapper
// ---------------------------------------------------------------------------
async function apiRequest(path, method = 'GET', body = null) {
    const options = {
        method,
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${SERVER_BASE}${path}`, options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }

        const text = await response.text();
        if (!text) return {};
        return JSON.parse(text);
    } catch (err) {
        throw new Error(`Network error: ${err.message}`);
    }
}

// ---------------------------------------------------------------------------
// UI: Show login modal
// ---------------------------------------------------------------------------
function showLogin() {
    loginModal.style.display = 'flex';
    chatApp.style.display = 'none';
    usernameInput.focus();
    serverDisplay.textContent = SERVER_BASE.replace('http://', '');
}

// ---------------------------------------------------------------------------
// UI: Show chat app
// ---------------------------------------------------------------------------
function showChat() {
    loginModal.style.display = 'none';
    chatApp.style.display = 'flex';
    messageInput.focus();
    updateEmptyState();
}

// ---------------------------------------------------------------------------
// UI: Toggle empty state visibility
// ---------------------------------------------------------------------------
function updateEmptyState() {
    const hasMessages = messagesArea.children.length > 0;
    if (emptyState) {
        emptyState.style.display = hasMessages ? 'none' : 'flex';
    }
}

// ---------------------------------------------------------------------------
// UI: Render a single chat message
// ---------------------------------------------------------------------------
function renderMessage(message) {
    const isSelf = message.user === currentUser;
    const div = document.createElement('div');
    div.className = `message ${isSelf ? 'self' : 'other'}`;
    div.style.animation = 'messageSlideIn 0.3s ease';

    const sender = document.createElement('span');
    sender.className = 'sender';
    sender.textContent = isSelf ? 'You' : message.user;

    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = message.msg;

    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = formatTimestamp(message.timestamp);

    div.appendChild(sender);
    div.appendChild(text);
    div.appendChild(timestamp);

    messagesArea.appendChild(div);
    scrollToBottom();
    updateEmptyState();
}

// ---------------------------------------------------------------------------
// UI: Render system message
// ---------------------------------------------------------------------------
function renderSystem(text) {
    const div = document.createElement('div');
    div.className = 'system-msg';
    div.textContent = text;
    messagesArea.appendChild(div);
    scrollToBottom();
    updateEmptyState();
}

// ---------------------------------------------------------------------------
// UI: Scroll messages area to bottom
// ---------------------------------------------------------------------------
function scrollToBottom() {
    requestAnimationFrame(() => {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    });
}

// ---------------------------------------------------------------------------
// UI: Update active users list
// ---------------------------------------------------------------------------
function updateUsersList(users) {
    usersList.innerHTML = '';
    users.forEach((user) => {
        const li = document.createElement('li');
        li.textContent = user;
        li.title = user;

        if (user === currentUser) {
            li.className = 'current-user';
            const dot = document.createElement('span');
            dot.className = 'user-dot';
            li.insertBefore(dot, li.firstChild);
        }

        usersList.appendChild(li);
    });

    const count = users.length;
    usersCountEl.textContent = count;
    usersCountBadge.textContent = count;
    usersCountEl.setAttribute('title', `${count} ${count === 1 ? 'user' : 'users'} online`);
}

// ---------------------------------------------------------------------------
// UI: Update connection status
// ---------------------------------------------------------------------------
function setStatus(online, text) {
    const dot = statusIndicator.querySelector('.status-dot');
    statusText.textContent = text;

    if (online) {
        statusIndicator.classList.remove('disconnected');
        dot.style.background = 'var(--success-color)';
    } else {
        statusIndicator.classList.add('disconnected');
        dot.style.background = 'var(--danger-color)';
    }
}

// ---------------------------------------------------------------------------
// UI: Show temporary error message
// ---------------------------------------------------------------------------
function showTempError(msg) {
    const existing = document.querySelector('.temp-error');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = 'system-msg temp-error';
    div.style.background = '#fee2e2';
    div.style.color = '#991b1b';
    div.style.border = '1px solid #fecaca';
    div.textContent = msg;
    messagesArea.appendChild(div);
    scrollToBottom();

    setTimeout(() => {
        div.style.opacity = '0';
        setTimeout(() => div.remove(), 300);
    }, 4000);
}

// ---------------------------------------------------------------------------
// Action: Join chat
// ---------------------------------------------------------------------------
async function handleJoin() {
    const username = usernameInput.value.trim();
    if (!username) {
        loginError.textContent = 'Please enter a username';
        usernameInput.focus();
        return;
    }

    joinBtn.disabled = true;
    joinBtn.textContent = 'Joining...';
    loginError.textContent = '';

    try {
        const data = await apiRequest('/join', 'POST', { username });
        if (data.status === 'joined') {
            currentUser = username;
            showChat();
            setStatus(true, 'Online');
            fetchStatus();
            fetchMessages();
            startPolling();
            renderSystem(`Welcome, ${username}!`);
        } else {
            loginError.textContent = data.error || 'Failed to join';
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join Chat';
        }
    } catch (err) {
        loginError.textContent = 'Unable to connect to server';
        joinBtn.disabled = false;
        joinBtn.textContent = 'Join Chat';
        console.error(err);
    }
}

// ---------------------------------------------------------------------------
// Action: Send message
// ---------------------------------------------------------------------------
async function handleSendMessage(e) {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !currentUser) return;

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
        await apiRequest('/send', 'POST', { user: currentUser, message: text });
        messageInput.value = '';
    } catch (err) {
        console.error('Send failed:', err);
        setStatus(false, 'Disconnected');
        showTempError('Failed to send message. Please try again.');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
}

// ---------------------------------------------------------------------------
// Polling: Fetch status (/users + /status)
// ---------------------------------------------------------------------------
async function fetchStatus() {
    try {
        const [statusData, usersData] = await Promise.all([
            apiRequest('/status'),
            apiRequest('/users'),
        ]);
        setStatus(true, 'Online');
        updateUsersList(usersData.active_users || []);
    } catch (err) {
        setStatus(false, 'Disconnected');
        console.error('Status fetch failed:', err);
    }
}

// ---------------------------------------------------------------------------
// Polling: Fetch new messages (/messages)
// ---------------------------------------------------------------------------
async function fetchMessages() {
    try {
        const data = await apiRequest('/messages');
        const messages = data.messages || [];

        // Only render new messages
        if (messages.length > lastMessageCount) {
            const newMessages = messages.slice(lastMessageCount);
            newMessages.forEach(renderMessage);
            lastMessageCount = messages.length;
        }
    } catch (err) {
        console.error('Messages fetch failed:', err);
    }
}

// ---------------------------------------------------------------------------
// Polling loop
// ---------------------------------------------------------------------------
function startPolling() {
    if (isPolling) return;
    isPolling = true;

    async function poll() {
        if (!isPolling) return;
        await fetchStatus();
        await fetchMessages();
        setTimeout(poll, POLL_INTERVAL);
    }

    poll();
}

function stopPolling() {
    isPolling = false;
}

// ---------------------------------------------------------------------------
// Event Listeners
// ---------------------------------------------------------------------------
joinBtn.addEventListener('click', handleJoin);

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleJoin();
});

messageInput.addEventListener('input', () => {
    sendBtn.disabled = !messageInput.value.trim() || !currentUser;
});

messageForm.addEventListener('submit', handleSendMessage);

// ---------------------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------------------
showLogin();

// Handle page visibility: pause polling when tab is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopPolling();
    } else if (currentUser) {
        lastMessageCount = 0;
        startPolling();
    }
});

// Handle window close / refresh
window.addEventListener('beforeunload', stopPolling);
