// Configuration (Replace with your actual API Gateway URL once deployed)
const API_BASE_URL = 'http://localhost:5000/api'; // Local fallback
let currentUser = null;

// --- UI Elements ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const registerFields = document.getElementById('register-fields');
const authForm = document.getElementById('auth-form');
const authBtn = document.getElementById('auth-btn');

const userAvatar = document.getElementById('user-avatar');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');

const queryForm = document.getElementById('query-form');
const queryResults = document.getElementById('query-results');
const subscriptionsList = document.getElementById('subscriptions-list');
const noSubsMsg = document.getElementById('no-subs-msg');

let currentAuthMode = 'login'; // 'login' or 'register'

// --- Utility Functions ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// --- Auth flow ---
function switchAuthTab(mode) {
    currentAuthMode = mode;
    if (mode === 'login') {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        registerFields.classList.add('hidden');
        authBtn.textContent = 'Sign In';
    } else {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerFields.classList.remove('hidden');
        authBtn.textContent = 'Register';
    }
}

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (currentAuthMode === 'login') {
        try {
            const res = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                currentUser = data.user;
                initApp();
                showToast('Welcome back!');
            } else {
                showToast(data.error || 'Login failed', 'error');
            }
        } catch (err) {
            showToast('Network error', 'error');
        }
    } else {
        const username = document.getElementById('username').value;
        try {
            const res = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Registration successful! Please sign in.');
                switchAuthTab('login');
            } else {
                showToast(data.error || 'Registration failed', 'error');
            }
        } catch (err) {
            showToast('Network error', 'error');
        }
    }
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    appContainer.classList.add('hidden');
    appContainer.classList.remove('active');
    authContainer.classList.remove('hidden');
});

// --- Main App Logic ---
function initApp() {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    appContainer.classList.add('active');
    
    userDisplayName.textContent = currentUser.username || currentUser.email.split('@')[0];
    userAvatar.textContent = userDisplayName.textContent.charAt(0).toUpperCase();

    loadSubscriptions();
}

async function loadSubscriptions() {
    try {
        const res = await fetch(`${API_BASE_URL}/subscriptions?email=${encodeURIComponent(currentUser.email)}`);
        const data = await res.json();
        
        subscriptionsList.innerHTML = '';
        if (data.length === 0) {
            noSubsMsg.classList.remove('hidden');
        } else {
            noSubsMsg.classList.add('hidden');
            data.forEach(song => {
                subscriptionsList.appendChild(createSongCard(song, true));
            });
        }
    } catch (err) {
        showToast('Failed to load subscriptions', 'error');
    }
}

// --- Query Logic ---
queryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const artist = document.getElementById('q-artist').value.trim();
    const title = document.getElementById('q-title').value.trim();
    const year = document.getElementById('q-year').value.trim();
    const album = document.getElementById('q-album').value.trim();

    if (!artist && !album && !(artist && year)) {
        showToast("Provide Artist, Album, or Artist + Year", "error");
        return;
    }

    const params = new URLSearchParams();
    if (artist) params.append('artist', artist);
    if (title) params.append('title', title);
    if (year) params.append('year', year);
    if (album) params.append('album', album);

    try {
        const res = await fetch(`${API_BASE_URL}/query?${params.toString()}`);
        const data = await res.json();

        queryResults.innerHTML = '';
        if (data.error) {
            showToast(data.error, 'error');
            return;
        }

        if (data.length === 0) {
            queryResults.innerHTML = '<p class="empty-state">No songs found matching your query.</p>';
        } else {
            data.forEach(song => {
                queryResults.appendChild(createSongCard(song, false));
            });
        }
    } catch (err) {
        showToast('Query failed', 'error');
    }
});

function createSongCard(song, isSubscribed) {
    const div = document.createElement('div');
    div.className = 'song-card';
    div.innerHTML = `
        <img src="${song.image_url || 'https://via.placeholder.com/220?text=No+Image'}" alt="Cover" class="song-img">
        <div class="song-info">
            <h3 class="song-title">${song.title}</h3>
            <p class="song-artist">${song.artist}</p>
            <div class="song-meta">
                <span>${song.year}</span>
                <span>${song.album}</span>
            </div>
            <button class="${isSubscribed ? 'unsubscribe-btn' : 'subscribe-btn'}" 
                onclick="handleSubscription('${song.artist}', '${song.title}', ${isSubscribed})">
                ${isSubscribed ? 'Remove' : 'Subscribe'}
            </button>
        </div>
    `;
    return div;
}

async function handleSubscription(artist, title, isRemoving) {
    const endpoint = isRemoving ? '/unsubscribe' : '/subscribe';
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, artist, title })
        });
        
        if (res.ok) {
            showToast(isRemoving ? 'Subscription removed' : 'Subscribed successfully');
            loadSubscriptions(); // Refresh the list
        } else {
            showToast('Failed to update subscription', 'error');
        }
    } catch (err) {
        showToast('Network error', 'error');
    }
}
