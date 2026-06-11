// ========================================
// Command routing
// ========================================

// ========================================
// Version
// ========================================
function openVersion() {
  const ver = (typeof browser !== 'undefined' && browser.runtime?.getManifest?.()?.version) || (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) || window.APP_VERSION || 'unknown';
  showAlert('Version: ' + ver, { title: 'Start Page', type: 'info' });
}

async function checkForUpdate() {
  const REMOTE_URL = 'https://raw.githubusercontent.com/caffienerd/startpage/refs/heads/master/version/version.js';
  const local = (typeof browser !== 'undefined' && browser.runtime?.getManifest?.()?.version) || (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.()?.version) || window.APP_VERSION || 'unknown';

  showToast('Checking for updates...', 'info', 2500);

  try {
    const res = await fetch(REMOTE_URL + '?_=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const match = text.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (!match) throw new Error('Could not parse remote version');
    const remote = match[1];

    if (remote === local) {
      showAlert(`You're up to date!\n\nCurrent version: v${local}`, { title: 'No Updates', type: 'success' });
    } else {
      showAlert(
        `New version available!\n\nInstalled:  v${local}\nLatest:     v${remote}\n\ngithub.com/caffienerd/startpage`,
        { title: 'Update Available', type: 'warning' }
      );
    }
  } catch (err) {
    showAlert(`Could not reach GitHub.\n\n${err.message}`, { title: 'Update Check Failed', type: 'error' });
  }
}


function handleSpecialCommands(value) {
  const rawValue = value.trim();
  const normalized = rawValue.toLowerCase();
  const input = document.getElementById('terminal-input');
  const elements = document.querySelectorAll("a");

  const clear = () => {
    input.value = '';
    resetStyles(elements);
    updateSyntaxHighlight("");
  };

  // ---- Modal commands ----
  if (normalized === ":help") { openHelp(); clear(); return; }
  if (normalized === ":version" || normalized === ":ver") { openVersion(); clear(); return; }
  if (normalized === ":update") { checkForUpdate(); clear(); return; }
  if (normalized === ":history") { openHistory(); clear(); return; }
  if (normalized === ":tour") { openTour(true); clear(); return; }
  if (normalized === ":export") { exportBackup(); clear(); return; }
  if (normalized === ":import") { importBackup(); clear(); return; }
  if (normalized === ":reset") { handleResetCommand(); clear(); return; }
  if (normalized === ":ipconfig" || normalized === ":ip") { openIPInfo(); clear(); return; }
  if (normalized === ":netspeed" || normalized === ":speed") { openSpeedTest(); clear(); return; }
  if (normalized === ":bookmarks" || normalized === ":bm") { openBookmarksModal(); clear(); return; }
  if (normalized === ":customize" || normalized === ":custom") { openCustomizeModal(); clear(); return; }
  if (normalized === ":tags") { openTagsModal(); clear(); return; }
  if (normalized === ":dir") { openDirModal(); clear(); return; }
  if (normalized === ":dirconfig") { openDirConfigModal(); clear(); return; }
  if (normalized === ":prompts") { openPromptsModal(); clear(); return; }
  if (normalized === ":config" || normalized === ":weather" || normalized === ":time") { openConfig(); clear(); return; }

  // ---- Open Directory search ----
  if (/^dir(\/[a-z]*)?(\/[a-z]*)?:/i.test(rawValue)) {
    if (handleDirCommand(rawValue)) { clear(); return; }
  }

  // ---- Theme ----
  const themeMatch = normalized.replace(/^:/, '');
  const THEME_ALIASES = { 'amoled': 'black', 'hacker': 'root', 'cyberpunk': 'neon' };
  const targetTheme = THEME_ALIASES[themeMatch] || themeMatch;

  if (THEMES.includes(targetTheme) || targetTheme === 'light') {
    THEMES.forEach(t => {
      document.body.classList.remove(`${t}-mode`);
      document.documentElement.classList.remove(`${t}-mode`);
    });
    if (targetTheme !== 'light') {
      document.documentElement.classList.add(`${targetTheme}-mode`);
    }
    saveTheme(targetTheme);
    clear();
    return;
  }

  // ---- Spell check ----
  if (/^spell\s*:/i.test(rawValue)) {
    const query = rawValue.replace(/^spell\s*:/i, "").trim();
    if (query) { handleSpellCheck(query); clear(); }
    return;
  }

  // ---- Pronounce ----
  if (/^pronounce\s*:/i.test(rawValue)) {
    const query = rawValue.replace(/^pronounce\s*:/i, "").trim();
    if (query) { handlePronounce(query); clear(); }
    return;
  }

  // ---- Custom tags (user-defined prefix:url) ----
  const customTags = typeof getStoredCustomTags === 'function' ? getStoredCustomTags() : [];
  for (const tag of customTags) {
    if (!tag.prefix || !tag.url) continue;
    const re = new RegExp(`^${tag.prefix}:`, 'i');
    if (re.test(rawValue)) {
      const q = encodeURIComponent(rawValue.replace(re, '').trim());
      navigate(tag.url.replace(/\$q/g, q) + (tag.url.includes('$q') ? '' : q));
      return;
    }
  }

  // ---- Search overrides check ----
  const overrides = typeof getStoredSearchOverrides === 'function' ? getStoredSearchOverrides() : {};

  // ---- Search shortcuts ----
  if (/^yt:/i.test(rawValue)) { navigate(`${overrides.yt || 'https://www.youtube.com/results?search_query='}${encodeSearchQuery(rawValue, 'yt:')}`); return; }
  if (/^r:/i.test(rawValue)) { navigate(`${overrides.r || 'https://google.com/search?q=site:reddit.com '}${rawValue.replace(/^r:/i, '')}`); return; }
  if (/^ddg:/i.test(rawValue)) { navigate(`${overrides.ddg || 'https://duckduckgo.com/?q='}${encodeSearchQuery(rawValue, 'ddg:')}`); return; }
  if (/^bing:/i.test(rawValue)) { navigate(`${overrides.bing || 'https://www.bing.com/search?q='}${encodeSearchQuery(rawValue, 'bing:')}`); return; }
  if (/^ggl:/i.test(rawValue)) { navigate(`${overrides.ggl || 'https://www.google.com/search?q='}${encodeSearchQuery(rawValue, 'ggl:')}`); return; }
  if (/^sp:/i.test(rawValue)) { navigate(`${overrides.sp || 'https://www.startpage.com/do/search?q='}${encodeSearchQuery(rawValue, 'sp:')}`); return; }
  if (/^amazon:/i.test(rawValue)) { navigate(`${overrides.amazon || 'https://www.amazon.com/s?k='}${encodeSearchQuery(rawValue, 'amazon:')}`); return; }
  if (/^imdb:/i.test(rawValue)) { navigate(`${overrides.imdb || 'https://www.imdb.com/find?q='}${encodeSearchQuery(rawValue, 'imdb:')}`); return; }
  if (/^alt:/i.test(rawValue)) { navigate(`${overrides.alt || 'https://alternativeto.net/browse/search/?q='}${encodeSearchQuery(rawValue, 'alt:')}`); return; }
  if (/^maps:/i.test(rawValue)) { navigate(`${overrides.maps || 'https://www.google.com/maps/search/'}${encodeSearchQuery(rawValue, 'maps:')}`); return; }
  if (/^def:/i.test(rawValue)) { navigate(`https://onelook.com/?w=${encodeSearchQuery(rawValue, "def:")}`); return; }
  if (/^the:/i.test(rawValue)) { navigate(`https://onelook.com/thesaurus/?s=${encodeSearchQuery(rawValue, "the:")}`); return; }
  if (/^syn:/i.test(rawValue)) { navigate(`https://onelook.com/?related=1&w=${encodeSearchQuery(rawValue, "syn:")}`); return; }
  if (/^quote:/i.test(rawValue)) { navigate(`https://onelook.com/?mentions=1&w=${encodeSearchQuery(rawValue, "quote:")}`); return; }
  if (/^cws:/i.test(rawValue)) {
    const q = rawValue.replace(/^cws:/i, "").trim();
    navigate(getBrowser() === "firefox"
      ? `https://addons.mozilla.org/en-US/firefox/search/?q=${encodeURIComponent(q)}`
      : `https://chromewebstore.google.com/search/${encodeURIComponent(q)}`);
    return;
  }

  // ---- Direct URL or default search ----
  if (rawValue.split(".").length >= 2 && !rawValue.includes(" ")) {
    navigate(rawValue.startsWith("http") ? rawValue : `https://${rawValue}`);
  } else {
    const engine = (typeof getStoredSearchEngine === 'function') ? getStoredSearchEngine() : 'google';
    const q = encodeURIComponent(rawValue);
    if (engine === 'ddg') navigate(`https://duckduckgo.com/?q=${q}`);
    else if (engine === 'bing') navigate(`https://www.bing.com/search?q=${q}`);
    else if (engine === 'sp') navigate(`https://www.startpage.com/do/search?q=${q}`);
    else navigate(`https://google.com/search?q=${q}`);
  }
}

function showLoading() {
  const el = document.getElementById('loading-overlay');
  if (!el) return;
  el.classList.remove('hiding');
  el.classList.add('visible');
}

function navigate(url) {
  try {
    showLoading();
    window.location.href = url;
  } catch (e) { console.error('Navigation failed', e); }
}

function encodeSearchQuery(value, prefix) {
  return encodeURIComponent(value.startsWith(prefix) ? value.slice(prefix.length).trim() : value.trim());
}

// ---- :reset — wipe all localStorage + caches ----
async function handleResetCommand() {
  const confirmed = await showConfirm(
    'This will clear ALL settings, bookmarks, API keys, themes, syntax colors, favicon cache, command history, and any other stored data.\n\nThe page will reload with factory defaults.',
    { title: 'Reset Everything?', confirmLabel: 'Yes, reset', cancelLabel: 'Cancel' }
  );
  if (!confirmed) return;

  // Clear extension storage if available
  try {
    const extStorage = (typeof browser !== 'undefined' && browser?.storage?.local)
      ? browser.storage.local
      : (typeof chrome !== 'undefined' && chrome?.storage?.local)
        ? chrome.storage.local
        : null;
    if (extStorage) extStorage.clear();
  } catch (e) {}

  // Wipe all localStorage
  localStorage.clear();

  showToast('All data cleared — reloading...', 'success', 1500);
  setTimeout(() => location.reload(), 1500);
}

// ---- Command History modal ----
let _historySelectedIndex = -1;

function openHistory() {
  _renderHistoryModal();
  document.getElementById('history-modal').classList.add('active');
  _historySelectedIndex = -1;

  // Keyboard nav within the list
  const modal = document.getElementById('history-modal');
  modal._historyKeydown = (e) => {
    const entries = [...document.querySelectorAll('#history-list .history-entry')];

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeHistoryModal();
      return;
    }

    if (!entries.length) return;

    const LIST_SCROLL_PAGE = 5; // entries per PgUp/PgDn jump

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _historySelectedIndex = Math.min(_historySelectedIndex + 1, entries.length - 1);
      if (_historySelectedIndex < 0) _historySelectedIndex = 0;
      entries[_historySelectedIndex].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _historySelectedIndex = Math.max(_historySelectedIndex - 1, 0);
      entries[_historySelectedIndex].focus();
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      _historySelectedIndex = Math.min(_historySelectedIndex + LIST_SCROLL_PAGE, entries.length - 1);
      if (_historySelectedIndex < 0) _historySelectedIndex = 0;
      entries[_historySelectedIndex].focus();
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      _historySelectedIndex = Math.max(_historySelectedIndex - LIST_SCROLL_PAGE, 0);
      entries[_historySelectedIndex].focus();
    }
  };
  modal.addEventListener('keydown', modal._historyKeydown);

  // Focus first entry if any
  requestAnimationFrame(() => {
    const first = document.querySelector('#history-list .history-entry');
    if (first) { _historySelectedIndex = 0; first.focus(); }
  });
}

function closeHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal._historyKeydown) {
    modal.removeEventListener('keydown', modal._historyKeydown);
    delete modal._historyKeydown;
  }
  modal.classList.remove('active');
  document.getElementById('terminal-input')?.focus();
}

function _renderHistoryModal() {
  const h = loadHistory();
  const list = document.getElementById('history-list');
  list.innerHTML = '';

  if (!h.length) {
    list.innerHTML = '<div class="history-empty">No history yet.</div>';
    return;
  }

  // Most-recent first
  [...h].reverse().forEach((entry, i) => {
    const el = document.createElement('div');
    el.className = 'history-entry';
    el.tabIndex = 0;
    el.dataset.entry = entry;
    el.innerHTML =
      `<span class="history-index">${i + 1}</span>` +
      `<span class="history-text">${escapeHTML(entry)}</span>`;

    el.addEventListener('click', () => _fillFromHistory(entry));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); _fillFromHistory(entry); }
    });

    list.appendChild(el);
  });
}

function _fillFromHistory(entry) {
  closeHistoryModal();
  const input = document.getElementById('terminal-input');
  if (input) {
    input.value = entry;
    input.focus();
    if (typeof updateSyntaxHighlight === 'function') updateSyntaxHighlight(entry);
  }
}

function clearHistory() {
  localStorage.removeItem('terminal-history-v1');
  _renderHistoryModal();
  showToast('History cleared', 'success');
}