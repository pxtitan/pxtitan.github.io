// Extract a human-friendly name from a URL (strip query/fragment, extension, and clean spacing).
function extractNameFromUrl(url) {
    try {
        let cleanUrl = url.split('?')[0].split('#')[0];
        let parts = cleanUrl.split('/');
        let filename = parts[parts.length - 1];
        filename = decodeURIComponent(filename);
        filename = filename.replace(/\.[^/.]+$/, '');
        filename = filename.replace(/[-_]/g, ' ');
        filename = filename.replace(/\s+/g, ' ').trim();
        return filename || url;
    } catch (e) {
        return url;
    }
}

// Parse the preloaded newline-separated URLs into {url, name} objects for rendering.
const parsePredefinedLinks = (input) => {
    const lines = Array.isArray(input) ? input : String(input || '').split('\n');
    return lines
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(url => ({ url, name: extractNameFromUrl(url) }));
};

const preloaded = window.preloadedLinks || {};
const audioLinksData = {
    english: parsePredefinedLinks(preloaded.english || preloaded.englishText),
    hindi: parsePredefinedLinks(preloaded.hindi || preloaded.hindiText)
};

// Set to your Railway domain (e.g., "https://your-app.up.railway.app") to route downloads through the /download proxy.
const RAILWAY_DOMAIN = "https://osho-production.up.railway.app";

const buildDownloadUrl = (url) =>
    RAILWAY_DOMAIN ? `${RAILWAY_DOMAIN}/download?url=${encodeURIComponent(url)}` : url;

let currentLanguage = 'english';
let currentSearch = '';

// DOM Elements
const languageButtons = document.querySelectorAll('.lang-btn');
const audioList = document.getElementById('audioList');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const shareBtn = document.getElementById('shareBtn');

// Initialize once DOM is ready.
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    renderAudioList();
});

// Event Listeners
function setupEventListeners() {
    languageButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            languageButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLanguage = btn.dataset.lang;
            renderAudioList();
        });
    });
    searchBtn.addEventListener('click', () => applySearch());
    searchInput.addEventListener('input', () => applySearch());
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applySearch();
    });
    shareBtn.addEventListener('click', shareSite);
}

function applySearch() {
    currentSearch = (searchInput.value || '').trim().toLowerCase();
    renderAudioList();
}

// Render audio list with per-item download buttons.
function renderAudioList() {
    const currentLinks = audioLinksData[currentLanguage] || [];
    const filtered = currentSearch
        ? currentLinks.filter(a => a.name.toLowerCase().includes(currentSearch))
        : currentLinks;
    if (filtered.length === 0) {
        audioList.innerHTML = '<div class="empty-state">No audio links available.</div>';
        return;
    }
    audioList.innerHTML = '';
    filtered.forEach((audio, index) => {
        const audioItem = document.createElement('div');
        audioItem.className = 'audio-item';
        const label = document.createElement('span');
        label.className = 'audio-title';
        label.textContent = audio.name;

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-icon';
        downloadBtn.setAttribute('aria-label', `Download ${audio.name}`);
        downloadBtn.innerText = '↓';
        downloadBtn.addEventListener('click', () => downloadSingle(audio.url));

        audioItem.appendChild(label);
        audioItem.appendChild(downloadBtn);
        audioList.appendChild(audioItem);
    });
}

async function shareSite() {
    // Prefer Web Share API; fall back to clipboard or manual prompt on unsupported platforms.
    const shareData = {
        title: 'Osho Discourses',
        text: 'Browse and download Osho discourses (English & Hindi).',
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            return;
        } catch (err) {
            // If user cancels, just return silently.
            if (err && err.name === 'AbortError') return;
        }
    }

    const url = shareData.url;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(url);
            window.alert('Link copied to clipboard.');
            return;
        } catch (err) {
            // fallback below
        }
    }

    // Final fallback: prompt so the user can copy manually.
    window.prompt('Copy this link', url);
}

// Download a single audio via proxy (if configured)
function downloadSingle(url) {
    const finalUrl = buildDownloadUrl(url);
    const a = document.createElement('a');
    a.href = finalUrl;
    a.download = '';
    a.target = '_self';
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Theme toggle functionality
const toggleBtn = document.getElementById("themeToggle");
const html = document.documentElement;

// Load saved theme or use system preference
const savedTheme = localStorage.getItem("theme");
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Function to apply theme
function applyTheme(theme) {
    html.setAttribute("color-scheme", theme);
    html.style.colorScheme = theme; // This is what makes light-dark() work
    //update icon
    const sun=document.getElementById("sun");
    const moon=document.getElementById("moon");
    if(theme==="dark"){
        sun.style.display="none";
        moon.style.display="block";
    } else{
        sun.style.display="block";
        moon.style.display="none";
    }
}

if (savedTheme) {
    applyTheme(savedTheme);
} else if (systemPrefersDark) {
    applyTheme("dark");
} else {
    applyTheme("light");
}

if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        const current = html.getAttribute("color-scheme") || "light";
        const next = current === "dark" ? "light" : "dark";
        
        applyTheme(next);
        localStorage.setItem("theme", next);
    });
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
    }
});
