// Extract name from URL
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

// Storage for audio links
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

let currentLanguage = 'english';
let currentSearch = '';

// DOM Elements
const languageButtons = document.querySelectorAll('.lang-btn');
const audioList = document.getElementById('audioList');
const selectAllBtn = document.getElementById('selectAll');
const deselectAllBtn = document.getElementById('deselectAll');
const downloadBtn = document.getElementById('downloadBtn');
const selectedCountSpan = document.getElementById('selectedCount');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

// Initialize
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
    selectAllBtn.addEventListener('click', () => toggleAllCheckboxes(true));
    deselectAllBtn.addEventListener('click', () => toggleAllCheckboxes(false));
    downloadBtn.addEventListener('click', downloadSelected);
    searchBtn.addEventListener('click', () => applySearch());
    searchInput.addEventListener('input', () => applySearch());
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applySearch();
    });
}

function applySearch() {
    currentSearch = (searchInput.value || '').trim().toLowerCase();
    renderAudioList();
}

// Render audio list
function renderAudioList() {
    const currentLinks = audioLinksData[currentLanguage] || [];
    const filtered = currentSearch
        ? currentLinks.filter(a => a.name.toLowerCase().includes(currentSearch))
        : currentLinks;
    if (filtered.length === 0) {
        audioList.innerHTML = '<div class="empty-state">No audio links available.</div>';
        updateSelectedCount();
        return;
    }
    audioList.innerHTML = '';
    filtered.forEach((audio, index) => {
        const audioItem = document.createElement('div');
        audioItem.className = 'audio-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `audio-${index}`;
        checkbox.dataset.url = audio.url;
        checkbox.addEventListener('change', updateSelectedCount);
        const label = document.createElement('label');
        label.htmlFor = `audio-${index}`;
        label.textContent = audio.name;
        audioItem.appendChild(checkbox);
        audioItem.appendChild(label);
        audioList.appendChild(audioItem);
    });
    updateSelectedCount();
}

// Toggle all checkboxes
function toggleAllCheckboxes(checked) {
    const checkboxes = audioList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = checked);
    updateSelectedCount();
}

// Update selected count
function updateSelectedCount() {
    const checkboxes = audioList.querySelectorAll('input[type="checkbox"]');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    selectedCountSpan.textContent = checkedCount;
    downloadBtn.disabled = checkedCount === 0;
}

// Download selected audios
function downloadSelected() {
    const checkboxes = audioList.querySelectorAll('input[type="checkbox"]:checked');
    if (checkboxes.length === 0) return;
    const urls = Array.from(checkboxes).map(cb => cb.dataset.url);
    urls.forEach((url, index) => {
        setTimeout(() => {
            const win = window.open(url, '_blank', 'noopener');
            if (!win) {
                const a = document.createElement('a');
                a.href = url;
                a.download = '';
                a.target = '_blank';
                a.rel = 'noopener';
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        }, index * 400);
    });
}

