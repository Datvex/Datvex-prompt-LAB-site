const CSV_URL = 'https://raw.githubusercontent.com/f/prompts.chat/main/prompts.csv';

let promptsData = [];
let currentLang = 'ru';
let activeSearchPattern = null; // Глобальное кэшированное регулярное выражение для подсветки

const i18n = {
  ru: {
    nav_home: "Главная", nav_cat: "По категориям", nav_mod: "По моделям",
    title: "Промпты", search_ph: "Поиск промптов...", ai_search: "Интеллектуальный поиск", search_btn: "Поиск",
    filter_sort: "Сортировка", sort_rel: "По релевантности", sort_az: "По алфавиту", 
    sort_long: "Сначала длинные", sort_short: "Сначала короткие", copy: "Копировать", copied: "Скопировано!"
  },
  en: {
    nav_home: "Home", nav_cat: "Categories", nav_mod: "Models",
    title: "Prompts", search_ph: "Search prompts...", ai_search: "Smart Search", search_btn: "Search",
    filter_sort: "Sort by", sort_rel: "Relevance", sort_az: "Alphabetical", 
    sort_long: "Longest first", sort_short: "Shortest first", copy: "Copy", copied: "Copied!"
  }
};

const smartDict = {
  'код': ['code', 'script', 'react', 'python', 'программирование', 'developer', 'html', 'css', 'js'],
  'дизайн': ['design', 'ui', 'ux', 'midjourney', 'картинка', 'image', 'svg'],
  'бизнес': ['business', 'startup', 'finance', 'saas', 'стартап', 'финансы', 'marketing', 'seo'],
  'текст': ['text', 'seo', 'writing', 'статья', 'копирайтинг', 'blog', 'writer']
};

const iconCopy = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const iconCheck = `<svg viewBox="0 0 24 24" fill="none" stroke="#d97757" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

// ОПТИМИЗАЦИЯ: Парсер CSV сразу генерирует строку для быстрого поиска `_searchableText`
function parseCSV(str) {
  const arr = [];
  let quote = false, col = '', row = {}, isHeader = true, headers = [], headerIndex = 0;

  for (let c = 0; c < str.length; c++) {
    let cc = str[c], nc = str[c+1];
    if (cc === '"' && quote && nc === '"') { col += cc; ++c; continue; }
    if (cc === '"') { quote = !quote; continue; }
    if (cc === ',' && !quote) {
      if (isHeader) headers.push(col.trim().toLowerCase());
      else row[headers[headerIndex]] = col.trim();
      col = ''; headerIndex++; continue;
    }
    if ((cc === '\n' || cc === '\r') && !quote) {
      if (cc === '\r' && nc === '\n') ++c; 
      if (isHeader) { isHeader = false; }
      else {
        row[headers[headerIndex]] = col.trim();
        if (row.act && row.prompt) {
          const title = row.act;
          const desc = `Act as a ${row.act}. Provides structured and expert advice based on this persona.`;
          const snippet = row.prompt;
          const tag = row.act.split(' ')[0].toLowerCase().replace(/[^a-z]/g,'');
          
          arr.push({
            id: arr.length + 1, title, desc, snippet, tags: [tag],
            _searchableText: `${title} ${desc} ${snippet} ${tag}`.toLowerCase()
          });
        }
        row = {};
      }
      col = ''; headerIndex = 0; continue;
    }
    col += cc;
  }
  return arr;
}

// Загрузка
async function fetchPrompts() {
  const loader = document.getElementById('loader');
  loader.classList.add('active');
  try {
    const res = await fetch(CSV_URL);
    const text = await res.text();
    promptsData = parseCSV(text);
  } catch (e) {
    console.error("Fetch error.", e);
  } finally {
    loader.classList.remove('active');
    executeSearch(); // Выполняем первичный рендер
  }
}

// Утилиты
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}

// ОПТИМИЗАЦИЯ: Подсветка текста теперь использует заранее собранное RegExp выражение
function highlightTextFast(text) {
  const safeText = escapeHTML(text);
  if (!activeSearchPattern) return safeText;
  return safeText.replace(activeSearchPattern, '<mark>$1</mark>');
}

// Извлечение поисковых слов
function getSearchWords(q, isAi) {
  const words = q.toLowerCase().split(/\s+/).filter(x => x.length > 1);
  if (!isAi) return words;
  
  let expanded = [...words];
  words.forEach(w => {
    for (const [key, syns] of Object.entries(smartDict)) {
      if (w === key || syns.includes(w)) expanded.push(key, ...syns);
    }
  });
  return [...new Set(expanded)];
}

// Главная функция поиска
function executeSearch() {
  const q = document.getElementById('searchInput').value.trim();
  const ai = document.getElementById('aiSearchToggle').checked;
  const sort = document.getElementById('sortDropdown').dataset.value;
  
  let result = promptsData;
  activeSearchPattern = null; // Сбрасываем паттерн

  if (q) {
    const searchWords = getSearchWords(q, ai);
    
    if (searchWords.length > 0) {
      // Кэшируем RegExp 1 раз на весь поиск, а не 1000 раз в цикле отрисовки
      const escapedWords = searchWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      activeSearchPattern = new RegExp(`(${escapedWords.join('|')})`, 'gi');

      result = result.map(x => {
        let score = 0;
        if (ai) {
          searchWords.forEach(w => { if (x._searchableText.includes(w)) score += w.length > 3 ? 10 : 5; });
        } else {
          // Строгий поиск: все слова должны присутствовать
          if (searchWords.every(w => x._searchableText.includes(w))) score = 1;
        }
        return { ...x, _score: score };
      }).filter(x => x._score > 0);
    }
  }

  // Сортировка
  result.sort((a, b) => {
    if(sort === 'relevance' && q) return b._score - a._score;
    if(sort === 'lenDesc') return b.snippet.length - a.snippet.length;
    if(sort === 'lenAsc') return a.snippet.length - b.snippet.length;
    if(sort === 'az') return a.title.localeCompare(b.title);
    return 0;
  });

  draw(result);
}

// Отрисовка
function draw(data) {
  const grid = document.getElementById('cardGrid');
  document.getElementById('promptCount').textContent = data.length;
  grid.innerHTML = '';

  data.forEach((d) => {
    const c = document.createElement('article');
    c.className = 'card';
    c.onclick = () => openModal(d);

    const tagsHTML = d.tags.slice(0, 3).map(t => t ? `<span class="tag-item">${escapeHTML(t)}</span>` : '').join('');
    
    // Используем быструю подсветку
    const titleHtml = highlightTextFast(d.title);
    const snippetHtml = highlightTextFast(d.snippet);

    c.innerHTML = `
      <div class="card-header">
        <h2 class="card-title">${titleHtml}</h2>
      </div>
      <p class="card-desc">${escapeHTML(d.desc)}</p>
      <div class="code-snippet">${snippetHtml}</div>
      <div class="card-footer">
        <div class="tags-row">${tagsHTML}</div>
        <button class="btn-icon copy-stop" title="${i18n[currentLang].copy}">${iconCopy}</button>
      </div>
    `;

    const cb = c.querySelector('.copy-stop');
    cb.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(d.snippet).catch(() => {});
      cb.innerHTML = iconCheck;
      setTimeout(() => cb.innerHTML = iconCopy, 1500);
    };

    grid.appendChild(c);
  });
}

// Модальное окно
const modal = document.getElementById('promptModal');
const modalCopyBtn = document.getElementById('modalCopyBtn');
let currentModalSnippet = '';

function openModal(data) {
  document.getElementById('modalTitle').innerHTML = highlightTextFast(data.title);
  document.getElementById('modalDesc').innerHTML = escapeHTML(data.desc);
  document.getElementById('modalSnippet').innerHTML = highlightTextFast(data.snippet);
  
  currentModalSnippet = data.snippet;
  modalCopyBtn.innerHTML = `${iconCopy} <span data-i18n="copy">${i18n[currentLang].copy}</span>`;
  
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
document.getElementById('closeModal').addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeModal(); });

modalCopyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(currentModalSnippet).catch(() => {});
  modalCopyBtn.innerHTML = `${iconCheck} <span>${i18n[currentLang].copied}</span>`;
  setTimeout(() => {
    modalCopyBtn.innerHTML = `${iconCopy} <span data-i18n="copy">${i18n[currentLang].copy}</span>`;
  }, 1500);
});

// Настройка UI
function setupUI() {
  document.querySelectorAll('.claude-dropdown').forEach(dropdown => {
    const trigger = dropdown.querySelector('.dropdown-trigger');
    const items = dropdown.querySelectorAll('.dropdown-item');
    const valSpan = dropdown.querySelector('.dropdown-val');
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.claude-dropdown.open').forEach(d => { if (d !== dropdown) d.classList.remove('open'); });
      dropdown.classList.toggle('open');
    });

    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        items.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        if (dropdown.id === 'langSelector') {
          setLanguage(item.dataset.lang);
        } else {
          dropdown.dataset.value = item.dataset.val;
          if(valSpan) valSpan.textContent = item.textContent;
          executeSearch(); // Сортировка выполняется моментально
        }
        dropdown.classList.remove('open');
      });
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.claude-dropdown.open').forEach(d => d.classList.remove('open'));
  });

  // ПОИСК ТОЛЬКО ПО КНОПКЕ ИЛИ ENTER
  document.getElementById('searchBtn').addEventListener('click', executeSearch);
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeSearch();
  });
  
  // Переключатель AI (при изменении обновляем поиск, если строка не пуста)
  document.getElementById('aiToggleWrapper').addEventListener('click', (e) => {
    if(e.target.tagName !== 'INPUT') {
      const cb = document.getElementById('aiSearchToggle');
      cb.checked = !cb.checked;
      executeSearch();
    }
  });
  document.getElementById('aiSearchToggle').addEventListener('change', executeSearch);
}

// Мультиязычность
function setLanguage(lang) {
  currentLang = lang;
  const dict = i18n[lang];
  
  document.getElementById('currentLang').textContent = lang === 'ru' ? 'Русский' : 'English';
  document.getElementById('searchInput').placeholder = dict.search_ph;
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupUI();
  setLanguage('ru');
  fetchPrompts();
});
