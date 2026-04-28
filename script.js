(function() {
'use strict';

let translations = {};

async function loadTranslations(lang) {
    if (translations[lang]) return;
    try {
        const res = await fetch(`i18n/${lang}.json`);
        if (!res.ok) throw new Error('Failed to load ' + lang);
        translations[lang] = await res.json();
    } catch (e) {
        console.error('Translation load error:', e);
        translations[lang] = {};
    }
}

let currentLang = localStorage.getItem('appLang') || 'ru';
let closeRadixMenu = null;

let allPrompts = [];
let filteredPrompts = [];
let currentFilter = { type: null, id: null, displayName: null };
let likesCache = {};
let currentPromptIndex = 0;
const PROMPTS_PER_PAGE = 15;
let isLoadingPrompts = false;
let isAppReady = false;
let pendingViewSwitch = null;
let viewSwitchTimeout = null;

let _categoriesPromise = null;
let _tagsPromise = null;

function ensureCategories() {
    if (!_categoriesPromise) {
        _categoriesPromise = fetch(
            'https://raw.githubusercontent.com/Datvex/Datvex-prompt-LAB/main/data/categories.json',
            { cache: 'no-store' }
        ).then(r => {
            if (!r.ok) throw new Error('Failed to load categories');
            return r.json();
        });
    }
    return _categoriesPromise;
}

function ensureTags() {
    if (!_tagsPromise) {
        _tagsPromise = fetch(
            'https://raw.githubusercontent.com/Datvex/Datvex-prompt-LAB/main/data/tags.json',
            { cache: 'no-store' }
        ).then(r => {
            if (!r.ok) throw new Error('Failed to load tags');
            return r.json();
        });
    }
    return _tagsPromise;
}

const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => (c || document).querySelectorAll(s);

// Маппинг viewId ↔ URL slug (чистые URL без решётки)
const VIEW_SLUGS = {
    'home-view': '/',
    'main-view': '/prompts',
    'tags-view': '/tags',
    'categories-view': '/categories',
    'sources-view': '/sources',
    'docs-view': '/docs',
    'favorites-view': '/favorites',
    'usecase-developers-view': '/usecase/developers',
    'usecase-designers-view': '/usecase/designers',
    'usecase-creators-view': '/usecase/creators',
    'usecase-businesses-view': '/usecase/businesses',
    'company-about-view': '/company/about',
    'company-privacy-view': '/company/privacy',
    'company-terms-view': '/company/terms',
};

const SLUG_TO_VIEW = {};
for (const [viewId, slug] of Object.entries(VIEW_SLUGS)) {
    SLUG_TO_VIEW[slug] = viewId;
}

function slugFromView(viewId) {
    return VIEW_SLUGS[viewId] || '#' + viewId;
}

function viewFromSlug(slug) {
    // Убираем ведущий слеш для поиска
    const normalized = slug.startsWith('/') ? slug : '/' + slug;
    return SLUG_TO_VIEW[normalized] || SLUG_TO_VIEW[slug] || 'home-view';
}

function debounce(fn, ms) {
    let t;
    return function() {
        const a = arguments, c = this;
        clearTimeout(t);
        t = setTimeout(() => fn.apply(c, a), ms);
    };
}

function initAuth() {
    const authView = document.getElementById('auth-view');
    const closeBtn = document.getElementById('auth-view-close');
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const avatarText = document.getElementById('user-avatar-text');
    const signupBtn = document.getElementById('nav-signup-btn');
    const loginBtn = document.getElementById('nav-login-btn');

    function getCookie(n) {
        var m = document.cookie.match(new RegExp("(?:^|; )" + n.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
        return m ? decodeURIComponent(m[1]) : undefined;
    }

    var c = getCookie('auth_user');
    if (c) {
        try {
            var u = JSON.parse(c);
            if (authButtons && userProfile && avatarText) {
                authButtons.classList.add('hidden');
                authButtons.classList.remove('md:flex');
                userProfile.classList.remove('hidden');
                userProfile.classList.add('md:flex');
                if (u.avatar) {
                    const skeleton = document.getElementById('user-avatar-skeleton');
                    const avatarImg = document.getElementById('user-avatar-img');

                    if (u.avatar) {
                        avatarImg.src = u.avatar;
                        avatarImg.onload = () => {
                            if (skeleton) skeleton.style.display = 'none';
                            avatarImg.classList.remove('hidden');
                        };
                        avatarImg.onerror = () => {
                            if (skeleton) skeleton.style.display = 'none';
                            avatarText.classList.remove('hidden');
                            avatarText.textContent = u.name.charAt(0).toUpperCase();
                        };
                    } else {
                        if (skeleton) skeleton.style.display = 'none';
                        avatarText.classList.remove('hidden');
                        avatarText.textContent = u.name.charAt(0).toUpperCase();
                    }
                }
            }
        } catch(e) { console.error('Error:', e); }
    }

    function openAuth() {
        authView.classList.remove('hidden');
        authView.classList.add('flex');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                authView.classList.add('active');
            });
        });
        // Prevent layout shift when scrollbar disappears
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = scrollbarWidth + 'px';
        }
        document.body.style.overflow = 'hidden';
    }

    function closeAuth() {
        authView.classList.remove('active');
        setTimeout(() => {
            authView.classList.add('hidden');
            authView.classList.remove('flex');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 300);
    }

    if (signupBtn) signupBtn.addEventListener('click', openAuth);
    if (loginBtn) loginBtn.addEventListener('click', openAuth);
    if (closeBtn) closeBtn.addEventListener('click', closeAuth);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && authView.classList.contains('active')) {
            closeAuth();
        }
    });

    const githubBtn = document.getElementById('oauth-github-btn');
    if (githubBtn) {
        githubBtn.addEventListener('click', () => {
            window.location.href = '/api/auth?provider=github&name=User';
        });
    }

    const termsLink = document.getElementById('signup-terms-link');
    if (termsLink) {
        termsLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeAuth();
            switchView('company-terms-view');
        });
    }

    const privacyLink = document.getElementById('signup-privacy-link');
    if (privacyLink) {
        privacyLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeAuth();
            switchView('company-privacy-view');
        });
    }
}

async function setLanguage(lang, animate) {
    await loadTranslations(lang);
    if (!translations[lang]) return;
    currentLang = lang;
    try { localStorage.setItem('appLang', lang); } catch(e) { console.error('Error:', e); }

    const langBtns = document.querySelectorAll('.lang-btn');
    for (let i = 0; i < langBtns.length; i++) {
        const btn = langBtns[i];
        const isActive = btn.getAttribute('data-lang') === lang;
        btn.className = 'lang-btn w-full text-left px-3 py-2 text-[13px] rounded-md transition-colors ' +
            (isActive ? 'text-white bg-[#2A2A2A]' : 'text-[#EDEDED] hover:bg-[#2A2A2A] hover:text-white');
    }

    const doUpdate = () => {
        const indicator = document.querySelector('#current-lang-indicator');
        if (indicator) indicator.textContent = lang.toUpperCase();

        // Обновляем lang атрибут для скринридеров
        const langMap = { en: 'en', ru: 'ru', zh: 'zh-CN', es: 'es', hi: 'hi', fr: 'fr', de: 'de', it: 'it', pt: 'pt-BR', ja: 'ja', ko: 'ko' };
        document.documentElement.lang = langMap[lang] || 'en';

        const els = document.querySelectorAll('[data-i18n]');
        const t = translations[lang];
        for (let i = 0; i < els.length; i++) {
            const el = els[i];
            const key = el.getAttribute('data-i18n');
            const val = t[key];
            if (!val) continue;
            
            try {
                if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                    el.placeholder = val;
                } else {
                    const icon = el.querySelector('svg') || el.querySelector('i');
                    if (icon) {
                        let topIcon = icon;
                        while (topIcon.parentNode && topIcon.parentNode !== el) {
                            topIcon = topIcon.parentNode;
                        }

                        let hasTextBefore = false;
                        let sib = topIcon.previousSibling;
                        while (sib) {
                            if (sib.nodeType === 3 && sib.textContent.trim()) {
                                hasTextBefore = true;
                                break;
                            }
                            sib = sib.previousSibling;
                        }
                        
                        let child = el.firstChild;
                        while (child) {
                            let next = child.nextSibling;
                            if (child !== topIcon) {
                                el.removeChild(child);
                            }
                            child = next;
                        }
                        
                        if (hasTextBefore) {
                            el.insertBefore(document.createTextNode(val + ' '), topIcon);
                        } else {
                            el.appendChild(document.createTextNode(' ' + val));
                        }
                    } else {
                        if (val.indexOf('<') !== -1) {
                            el.innerHTML = val;
                        } else {
                            el.textContent = val;
                        }
                    }
                }
            } catch(e) { console.error('Error:', e); }
        }

        const dropdowns = document.querySelectorAll('.custom-dropdown');
        for (let i = 0; i < dropdowns.length; i++) {
            const active = dropdowns[i].querySelector('.dropdown-item.active');
            const sel = dropdowns[i].querySelector('.dropdown-selected');
            if (active && sel) {
                sel.textContent = active.textContent;
            }
        }

        updateResultsCounter();
    };

    if (animate) {
        const targets = document.querySelectorAll('[data-i18n], .dropdown-selected, #current-lang-indicator');
        for (let i = 0; i < targets.length; i++) {
            targets[i].style.transition = 'opacity .15s ease-in-out';
            targets[i].style.opacity = '0';
        }
        setTimeout(() => {
            doUpdate();
            for (let i = 0; i < targets.length; i++) {
                targets[i].style.opacity = '1';
            }
            setTimeout(() => {
                for (let i = 0; i < targets.length; i++) {
                    targets[i].style.transition = '';
                    targets[i].style.opacity = '';
                }
            }, 150);
        }, 150);
    } else {
        doUpdate();
    }

    // Обновляем заголовок текущей страницы при смене языка
    const currentView = document.querySelector('[id$="-view"]:not(.hidden)');
    if (currentView) {
        const viewId = currentView.id;
        const slugKey = 'page_slug_' + viewId.replace('-view', '').replace('usecase-', '').replace('company-', '');
        const pageTitle = (translations[currentLang] && translations[currentLang][slugKey]) || 'Datvex Prompt LAB';
        document.title = pageTitle + ' — Datvex Prompt LAB';
    }
}

function switchView(viewId, pushHistory = true) {
    if (pushHistory) {
        try {
            const slug = slugFromView(viewId);
            history.pushState({ view: viewId }, '', slug);
        } catch (e) {}
    }
    
    var views = ['home-view', 'main-view', 'tags-view', 'categories-view', 'sources-view', 'docs-view',
                'favorites-view',
                'usecase-developers-view', 'usecase-designers-view', 'usecase-creators-view', 'usecase-businesses-view',
                'company-about-view', 'company-privacy-view', 'company-terms-view'];

    var targetEl = document.getElementById(viewId);
    if (!targetEl) return;

    var logoMain = document.getElementById('logo-text-main');
    var logoDocs = document.getElementById('logo-text-docs');
    var navRandom = document.getElementById('nav-link-random');

    if (logoMain && logoDocs) {
        if (viewId === 'docs-view') {
            logoMain.classList.add('hidden');
            logoDocs.classList.remove('hidden');
            logoDocs.classList.add('flex');
        } else {
            logoMain.classList.remove('hidden');
            logoDocs.classList.add('hidden');
            logoDocs.classList.remove('flex');
        }
    }

    // Скрываем кнопку "Случайный" на главной странице
    if (navRandom) {
        if (viewId === 'home-view') {
            navRandom.classList.add('hidden');
        } else {
            navRandom.classList.remove('hidden');
        }
    }

    if (viewSwitchTimeout) {
        clearTimeout(viewSwitchTimeout);
    }

    var currentEl = null;
    for (var i = 0; i < views.length; i++) {
        var el = document.getElementById(views[i]);
        if (el && !el.classList.contains('hidden') && el !== targetEl) {
            currentEl = el;
            break;
        }
    }

    function finalizeSwitch() {
        for (var i = 0; i < views.length; i++) {
            var el = document.getElementById(views[i]);
            if (!el) continue;
            if (views[i] === viewId) {
                el.classList.remove('hidden');
                el.classList.add('flex');
                el.style.opacity = '0';
                el.style.transform = 'translateY(15px)';
            } else {
                el.classList.add('hidden');
                el.classList.remove('flex');
                el.style.opacity = '';
                el.style.transform = '';
                el.style.transition = '';
            }
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                targetEl.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                targetEl.style.opacity = '1';
                targetEl.style.transform = 'translateY(0)';
            });
        });
        
        if (viewId === 'main-view') {
            updateResultsCounter();
            updateResetBtn();
        }

        // Обновляем заголовок страницы
        const slugKey = 'page_slug_' + viewId.replace('-view', '').replace('usecase-', '').replace('company-', '');
        const pageTitle = (translations[currentLang] && translations[currentLang][slugKey]) || 'Datvex Prompt LAB';
        document.title = pageTitle + ' — Datvex Prompt LAB';
    }

    if (currentEl) {
        currentEl.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        currentEl.style.opacity = '0';
        currentEl.style.transform = 'translateY(-15px)';
        viewSwitchTimeout = setTimeout(finalizeSwitch, 300);
    } else {
        finalizeSwitch();
    }
}

window.addEventListener('popstate', function(e) {
    let pathname = location.pathname;

    if (pathname.startsWith('/prompt/')) {
        const targetId = pathname.replace('/prompt/', '');
        const index = allPrompts.findIndex(p => String(p.numeric_id) === targetId);
        if (index !== -1) {
            openPromptModal(index);
            return;
        }
    } else if (location.hash && location.hash.startsWith('#/prompt/')) {
        // Fallback для старых закладок с хешем
        const targetId = location.hash.replace('#/prompt/', '');
        const index = allPrompts.findIndex(p => String(p.numeric_id) === targetId);
        if (index !== -1) {
            openPromptModal(index);
            return;
        }
    } else {
        const modal = document.getElementById('prompt-modal');
        if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    let view = e.state && e.state.view ? e.state.view : viewFromSlug(pathname);
    
    if (view.startsWith('doc-')) {
        switchView('docs-view', false);
        return;
    }
    
    const validViews = ['home-view', 'main-view', 'tags-view', 'categories-view', 'sources-view', 'docs-view',
        'usecase-developers-view', 'usecase-designers-view', 'usecase-creators-view', 'usecase-businesses-view',
        'company-about-view', 'company-privacy-view', 'company-terms-view', 'favorites-view'];
    if (!validViews.includes(view)) {
        view = 'home-view';
    }

    switchView(view, false);
});

document.addEventListener('DOMContentLoaded', async function() {
    // Регистрация Service Worker для оффлайн-поддержки
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.error('Service Worker registration failed:', err);
        });
    }

    loadHeroCounter();
    loadPrompts();
    initDropdowns();
    loadCategories();
    initSidebarTags();
    initRadixNav();
    generateCategoriesPage();
    initViewSwitcher();
    initAISelector();
    initAuth();
    initAccountModal();
    await loadTranslations(currentLang);

    const langWrapper = document.querySelector('#current-lang-indicator')?.closest('.relative');
    const langBtn = langWrapper?.querySelector('button');
    if (langBtn && langWrapper) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langWrapper.classList.toggle('lang-menu-open');
        });
        document.addEventListener('click', (e) => {
            if (!langWrapper.contains(e.target)) {
                langWrapper.classList.remove('lang-menu-open');
            }
        });
    }

    setLanguage(currentLang, false);

    $('#lang-buttons').addEventListener('click', async function(e) {
        var btn = e.target.closest('.lang-btn');
        if (!btn) return;
        e.preventDefault();
        var lang = btn.getAttribute('data-lang');
        if (lang !== currentLang) await setLanguage(lang, true);
    });

    const mainSearch = document.getElementById('main-search');
    if (mainSearch) {
        mainSearch.addEventListener('input', debounce(function() {
            updateSidebarFilters();
        }, 300));
    }

    let initialView = viewFromSlug(location.pathname);
    
    if (initialView.startsWith('doc-')) {
        switchView('docs-view', false);
        setTimeout(() => {
            const el = document.getElementById(initialView);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    } else {
        const validViews = ['home-view', 'main-view', 'tags-view', 'categories-view', 'sources-view', 'docs-view',
            'usecase-developers-view', 'usecase-designers-view', 'usecase-creators-view', 'usecase-businesses-view',
            'company-about-view', 'company-privacy-view', 'company-terms-view'];
        if (!validViews.includes(initialView)) {
            initialView = 'home-view';
        }
        switchView(initialView, false);
    }

    // Кнопка «Наверх»
    var scrollTopBtn = document.getElementById('scroll-to-top-btn');
    if (scrollTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 600) {
                scrollTopBtn.style.opacity = '1';
                scrollTopBtn.style.pointerEvents = 'auto';
            } else {
                scrollTopBtn.style.opacity = '0';
                scrollTopBtn.style.pointerEvents = 'none';
            }
        }, { passive: true });

        scrollTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});

function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem('datvex_favorites') || '[]');
    } catch(e) {
        return [];
    }
}

function saveFavorites(favs) {
    try {
        localStorage.setItem('datvex_favorites', JSON.stringify(favs));
    } catch(e) { console.error('Error:', e); }
}

function toggleFavorite(numericId) {
    let favs = getFavorites();
    const idx = favs.indexOf(numericId);
    if (idx === -1) {
        favs.push(numericId);
    } else {
        favs.splice(idx, 1);
    }
    saveFavorites(favs);
    return idx === -1;
}

function isFavorite(numericId) {
    return getFavorites().includes(numericId);
}

function updateFavBtn(btn, isFav, animate = false) {
    const icon = btn.querySelector('i');
    if (!icon) return;
    if (isFav) {
        icon.className = 'ph-fill ph-bookmark icon-lg';
        icon.style.color = '#eab308';
        btn.classList.add('fav-active');
    } else {
        icon.className = 'ph-bold ph-bookmark icon-lg';
        icon.style.color = '';
        btn.classList.remove('fav-active');
    }
    if (animate) {
        btn.classList.remove('heart-pop');
        void btn.offsetWidth;
        btn.classList.add('heart-pop');
    }
}

function renderFavoritesView() {
    const grid = document.getElementById('favorites-grid');
    if (!grid) return;
    
    const favs = getFavorites();
    const favPrompts = allPrompts.filter(p => favs.includes(String(p.numeric_id)));
    const emptyFav = document.getElementById('favorites-empty');
    
    if (favPrompts.length === 0) {
        grid.innerHTML = '';
        if (emptyFav) {
            emptyFav.classList.remove('hidden');
            emptyFav.classList.add('flex', 'flex-col');
        }
        return;
    }
    
    if (emptyFav) {
        emptyFav.classList.add('hidden');
        emptyFav.classList.remove('flex', 'flex-col');
    }
    
    let html = '';
    for (const p of favPrompts) {
        const idx = allPrompts.indexOf(p);
        html += createPromptCardHTML(p, idx);
    }
    grid.innerHTML = html;
}

function fuzzyMatch(text, query) {
    if (!query) return true;
    text = text.toLowerCase();
    query = query.toLowerCase().trim();
    
    if (text.includes(query)) return true;
    
    const words = query.split(/\s+/);
    let allWordsMatch = true;
    
    for (const word of words) {
        if (word.length < 2) continue;
        let wordFound = false;
        
        if (text.includes(word)) {
            wordFound = true;
        } else {
            let ti = 0, wi = 0, errors = 0;
            const maxErrors = Math.floor(word.length / 4);
            while (ti < text.length && wi < word.length) {
                if (text[ti] === word[wi]) {
                    wi++;
                } else {
                    errors++;
                    if (errors > maxErrors) break;
                }
                ti++;
            }
            if (wi === word.length && errors <= maxErrors) wordFound = true;
        }
        
        if (!wordFound) {
            allWordsMatch = false;
            break;
        }
    }
    
    return allWordsMatch;
}

function isAnyFilterActive() {
    const typeItem = document.querySelector('#dropdown-type .dropdown-item.active');
    const typeVal = typeItem ? typeItem.dataset.value : 'all';
    const catItem = document.querySelector('#dropdown-category .dropdown-item.active');
    const catVal = catItem ? catItem.dataset.value : 'all';
    const searchVal = (document.querySelector('#main-search')?.value || '').trim();
    const activeTag = document.querySelector('#tags-container .tag-active');
    
    return typeVal !== 'all' || catVal !== 'all' || searchVal !== '' || activeTag !== null;
}

function updateResetBtn() {
    const btn = document.getElementById('reset-filters-btn');
    if (!btn) return;
    if (isAnyFilterActive()) {
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
    }
}

function updateResultsCounter() {
    const el = document.getElementById('results-counter');
    if (!el) return;
    const t = translations[currentLang] || translations.ru;
    
    if (!isAnyFilterActive()) {
        const total = allPrompts.length;
        el.textContent = (t.counter_total || 'Всего: ') + total.toLocaleString() + ' ' + (t.prompts_word || 'промптов');
    } else {
        const found = filteredPrompts.length;
        el.textContent = (t.counter_found || 'Найдено: ') + found.toLocaleString() + ' ' + (t.prompts_word || 'промптов');
    }
}

function getPromptType(p) {
    const combined = ((p.category_id || '') + ' ' + (p.category || '')).toLowerCase();
    if (combined.includes('image') || combined.includes('photo') || combined.includes('art') || combined.includes('изображ')) return 'image';
    if (combined.includes('video') || combined.includes('film') || combined.includes('видео')) return 'video';
    if (combined.includes('audio') || combined.includes('music') || combined.includes('voice') || combined.includes('sound') || combined.includes('аудио') || combined.includes('музык') || combined.includes('голос')) return 'audio';
    if (combined.includes('presentation') || combined.includes('презентаци') || combined.includes('slide') || combined.includes('powerpoint') || combined.includes('notebooklm') || combined.includes('notebook')) return 'presentation';
    return (p.type || 'text').toLowerCase();
}

function updateSidebarFilters() {
    const typeItem = document.querySelector('#dropdown-type .dropdown-item.active');
    const typeVal = typeItem ? typeItem.dataset.value : 'all';
    
    const catItem = document.querySelector('#dropdown-category .dropdown-item.active');
    const catVal = catItem ? catItem.dataset.value : 'all';
    const catName = catItem ? catItem.textContent : '';

    const sortVal = document.querySelector('#dropdown-sort .dropdown-item.active')?.dataset.value || 'newest';
    const searchInput = document.querySelector('#main-search');
    const searchVal = searchInput ? searchInput.value.trim() : '';
    const activeTag = document.querySelector('#tags-container .tag-active')?.textContent || null;

    filteredPrompts = allPrompts.filter(p => {
        if (typeVal !== 'all' && getPromptType(p) !== typeVal) return false;
        if (catVal !== 'all' && p.category_id !== catVal && p.category !== catVal && p.category !== catName) return false;
        if (activeTag && (!p.tags || !p.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()))) return false;
        
        if (searchVal) {
            const titleMatch = fuzzyMatch(p.title || '', searchVal);
            const descMatch = fuzzyMatch(p.description || '', searchVal);
            const promptMatch = fuzzyMatch(p.prompt || '', searchVal);
            if (!titleMatch && !descMatch && !promptMatch) return false;
        }
        return true;
    });

    if (sortVal === 'oldest') {
        filteredPrompts.reverse();
    } else if (sortVal === 'popular') {
        filteredPrompts.sort((a, b) => (likesCache[b.numeric_id] || 0) - (likesCache[a.numeric_id] || 0));
    }

    currentFilter = { type: 'sidebar', id: 'mixed', displayName: 'Combined' };
    
    currentPromptIndex = 0;
    const grid = document.getElementById('prompts-grid');
    if (grid) grid.innerHTML = '';
    
    updateResetBtn();
    updateResultsCounter();
    loadMorePrompts();
}

function initDropdowns() {
    document.addEventListener('click', e => {
        const trigger = e.target.closest('.dropdown-trigger');
        if (trigger) {
            e.preventDefault();
            const dropdown = trigger.closest('.custom-dropdown');
            const wasOpen = dropdown.classList.contains('open');
            $$('.custom-dropdown').forEach(d => d.classList.remove('open'));
            if (!wasOpen) dropdown.classList.add('open');
            return;
        }

        const item = e.target.closest('.dropdown-item');
        if (item) {
            const dropdown = item.closest('.custom-dropdown');
            const sel = $('.dropdown-selected', dropdown);
            $$('.dropdown-item', dropdown).forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if (sel) sel.textContent = item.textContent;
            dropdown.classList.remove('open');
            updateSidebarFilters();
            return;
        }

        if (!e.target.closest('.custom-dropdown')) {
            $$('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
        }
    });
}

async function loadCategories() {
    try {
        const data = await ensureCategories();

        const list = $('#category-list');
        if (!list) return;

        const allText = translations[currentLang]?.filter_all || 'Все';
        let html = '<li data-i18n="filter_all" class="dropdown-item active px-3 py-2 hover:bg-[#2A2A2A] cursor-pointer transition-colors duration-150 rounded-md" data-value="all">' + allText + '</li>';

        for (let g = 0; g < data.length; g++) {
            html += '<li class="px-3 pt-3 pb-1 text-[#666] font-semibold text-[10px] uppercase tracking-wider select-none">' + data[g].group + '</li>';
            const items = data[g].items;
            for (let i = 0; i < items.length; i++) {
                html += '<li class="dropdown-item px-3 py-2 hover:bg-[#2A2A2A] cursor-pointer transition-colors duration-150 rounded-md" data-value="' + items[i].id + '">' + items[i].name + '</li>';
            }
        }

        list.innerHTML = html;

        const dropdown = $('#dropdown-category');
        const sel = $('.dropdown-selected', dropdown);
        if (sel) sel.textContent = allText;
    } catch (e) {
        console.error('Failed to load categories:', e);
    }
}

function initRadixNav() {
    const root = $('#radix-nav-root');
    if (!root) return;

    const triggers = Array.from(root.querySelectorAll('.nav-trigger'));
    const viewport = $('#radix-viewport');
    const contents = Array.from(viewport.querySelectorAll('.radix-content'));

    let activeIndex = -1;
    let tid;
    let isOpen = false;
    let navLocked = false;

    const panelSizes = {
        categories: [480, 150],
        models: [480, 300],
        tags: [480, 150]
    };

    function open(index) {
        if (navLocked) return;
        const trigger = triggers[index];
        const id = trigger.getAttribute('data-menu');
        const target = $('#content-' + id);
        if (!target) return;

        const size = panelSizes[id] || [480, 220];

        for (let i = 0; i < triggers.length; i++) triggers[i].classList.remove('active');
        trigger.classList.add('active');

        if (!isOpen) {
            viewport.style.transition = 'none';
            viewport.style.width = size[0] + 'px';
            viewport.style.height = size[1] + 'px';
            viewport.style.display = 'block';

            requestAnimationFrame(() => {
                viewport.style.transition = '';
                viewport.setAttribute('data-state', 'open');
                for (let i = 0; i < contents.length; i++) {
                    contents[i].removeAttribute('data-active');
                    contents[i].removeAttribute('data-motion');
                }
                target.setAttribute('data-active', 'true');
                isOpen = true;
                activeIndex = index;
            });
        } else if (activeIndex !== index) {
            viewport.style.width = size[0] + 'px';
            viewport.style.height = size[1] + 'px';

            const right = index > activeIndex;
            const old = contents[activeIndex];
            if (old) {
                old.removeAttribute('data-active');
                old.setAttribute('data-motion', right ? 'to-start' : 'to-end');
            }
            target.setAttribute('data-active', 'true');
            target.setAttribute('data-motion', right ? 'from-end' : 'from-start');
            activeIndex = index;
        }
    }

    function close() {
        if (!isOpen) return;
        viewport.setAttribute('data-state', 'closed');
        for (let i = 0; i < triggers.length; i++) triggers[i].classList.remove('active');
        setTimeout(() => {
            if (viewport.getAttribute('data-state') === 'closed') {
                viewport.style.display = 'none';
                isOpen = false;
                activeIndex = -1;
                for (let i = 0; i < contents.length; i++) {
                    contents[i].removeAttribute('data-active');
                    contents[i].removeAttribute('data-motion');
                }
            }
        }, 150);
    }

    function closeForNav() {
        navLocked = true;
        close();
        setTimeout(() => { navLocked = false; }, 350);
    }

    closeRadixMenu = closeForNav;

    root.addEventListener('mouseleave', () => { tid = setTimeout(close, 150); });
    root.addEventListener('mouseenter', () => { clearTimeout(tid); });

    for (let i = 0; i < triggers.length; i++) {
        triggers[i].addEventListener('mouseenter', () => {
            clearTimeout(tid);
            open(i);
        });
    }

}

async function initSidebarTags() {
    var container = $('#tags-container');
    if (!container) return;

    let data = [];
    try {
        data = await ensureTags();
    } catch (e) {
        return;
    }

    const colors = [
        '#3b82f6', '#ef4444', '#f59e0b', '#22c55e', '#a855f7',
        '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4'
    ];

    const frag = document.createDocumentFragment();

    for (let i = 0; i < data.length; i++) {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        const color = colors[i % colors.length];
        btn.style.color = color;
        btn.style.setProperty('--base-color', color);
        btn.textContent = data[i].name;
        frag.appendChild(btn);
    }

    container.innerHTML = '';
    container.appendChild(frag);

    container.addEventListener('click', function(e) {
        var tag = e.target.closest('.tag-btn');
        if (tag) {
            e.preventDefault();
            if (tag.classList.contains('tag-active')) {
                tag.classList.remove('tag-active');
                updateSidebarFilters();
            } else {
                var allTags = container.querySelectorAll('.tag-btn');
                for (var j = 0; j < allTags.length; j++) {
                    allTags[j].classList.remove('tag-active');
                }
                tag.classList.add('tag-active');
                updateSidebarFilters();
            }
        }
    });

    var searchInput = $('#sidebar-tag-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            var query = this.value.toLowerCase().trim();
            var btns = container.querySelectorAll('.tag-btn');
            for (var i = 0; i < btns.length; i++) {
                btns[i].style.display = (!query || btns[i].textContent.toLowerCase().indexOf(query) !== -1) ? '' : 'none';
            }
        }, 150));
    }
}

async function generateTagsPage() {
    const container = $('#all-tags-container');
    if (!container) return;

    let data = [];
    try {
        data = await ensureTags();
    } catch (e) {
        return;
    }

    const tagCounts = {};
    if (typeof allPrompts !== 'undefined') {
        allPrompts.forEach(p => {
            if (p.tags) {
                p.tags.forEach(t => {
                    const tl = t.toLowerCase();
                    tagCounts[tl] = (tagCounts[tl] || 0) + 1;
                });
            }
        });
    }

    data.sort((a, b) => {
        const ca = tagCounts[a.name.toLowerCase()] || 0;
        const cb = tagCounts[b.name.toLowerCase()] || 0;
        return cb - ca;
    });

    const colors = [
        [59,130,246], [239,68,68], [245,158,11], [34,197,94], [168,85,247],
        [236,72,153], [20,184,166], [249,115,22], [99,102,241], [6,182,212]
    ];

    const frag = document.createDocumentFragment();

    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const c = colors[i % colors.length];
        const a = document.createElement('a');
        const slug = item.name.toLowerCase().replace(/\s+/g, '-');
        a.href = '/tags/' + slug;
        a.className = 'custom-tag-pill';
        a.style.cssText = '--tag-r:' + c[0] + ';--tag-g:' + c[1] + ';--tag-b:' + c[2];

        const dot = document.createElement('span');
        dot.className = 'dot';

        const label = document.createElement('span');
        label.className = 'tag-label';
        label.textContent = item.name;

        const count = document.createElement('span');
        count.className = 'tag-count';
        count.textContent = tagCounts[item.name.toLowerCase()] || 0;

        a.appendChild(dot);
        a.appendChild(label);
        a.appendChild(count);

        a.addEventListener('click', function(e) {
            e.preventDefault();
            applyFilter('tag', item.name, item.name);
        });

        frag.appendChild(a);
    }

    container.innerHTML = '';
    container.appendChild(frag);
}

function pluralThemes(count, lang) {
    if (lang === 'ru') {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (mod100 >= 11 && mod100 <= 14) return count + ' тем';
        if (mod10 === 1) return count + ' тема';
        if (mod10 >= 2 && mod10 <= 4) return count + ' темы';
        return count + ' тем';
    }
    const t = translations[lang]?.themes_count || 'themes';
    return count + ' ' + t;
}

async function generateCategoriesPage() {
    const container = $('#categories-container');
    if (!container) return;

    let categoriesData;
    try {
        categoriesData = await ensureCategories();
    } catch (e) {
        console.error('Failed to load categories for page:', e);
        return;
    }

    const groupIcons = {
        'Text / LLM (Language Models)': 'ph-article',
        'Image Generation': 'ph-image',
        'Video Generation': 'ph-video',
        'Audio / Music Generation': 'ph-music-note',
        'Presentation': 'ph-presentation'
    };

    let html = '';

    categoriesData.forEach(cat => {
        let itemsHtml = '';
        const icon = groupIcons[cat.group] || 'ph-folder';
        
        cat.items.forEach(item => {
            const slug = item.name.toLowerCase().replace(/\s+/g, '-');
            itemsHtml += `
                <a href="/categories/${slug}" data-id="${item.id}" class="group py-3 px-4 -mx-4 hover:bg-[#111] rounded-lg transition-colors flex items-center justify-between">
                    <div>
                        <h3 class="text-[15px] text-[#EDEDED] font-medium group-hover:text-white transition-colors">${item.name}</h3>
                    </div>
                </a>
            `;
        });

        html += `
            <div class="flex flex-col border-b border-[#222] pb-6 last:border-0">
                <div class="flex items-center gap-2 mb-3">
                    <i class="ph-bold ${icon} icon-lg text-[#888]"></i>
                    <h2 class="text-lg font-semibold text-white tracking-tight">${cat.group}</h2>
                    <i class="ph-bold ph-caret-right icon-md text-[#666]"></i>
                    <span class="text-[13px] text-[#888]">${pluralThemes(cat.items.length, currentLang)}</span>
                </div>
                <div class="flex flex-col">
                    ${itemsHtml}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    container.addEventListener('click', function(e) {
        const link = e.target.closest('a[data-id]');
        if (link) {
            e.preventDefault();
            const id = link.getAttribute('data-id');
            const name = link.querySelector('h3').textContent;
            applyFilter('category', id, name);
        }
    });
}

function setTypeFilter(value) {
    var dropdown = $('#dropdown-type');
    if (!dropdown) return;
    var items = $$('.dropdown-item', dropdown);
    var sel = $('.dropdown-selected', dropdown);
    for (var i = 0; i < items.length; i++) {
        if (items[i].dataset.value === value) {
            items[i].classList.add('active');
            if (sel) sel.textContent = items[i].textContent;
        } else {
            items[i].classList.remove('active');
        }
    }
    updateSidebarFilters();
}

function initViewSwitcher() {
    var home = $('#home-link');
    if (home) {
        home.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('home-view');
        });
    }

    var btnExplore = $('#btn-explore');
    if (btnExplore) {
        btnExplore.addEventListener('click', function(e) {
            e.preventDefault();
            if (isAppReady) {
                switchView('main-view');
            } else {
                const btnText = translations[currentLang]?.hero_btn_explore || 'Start Exploring';
                const spinnerSvg = `<svg class="w-5 h-5 animate-spin text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
                this.innerHTML = spinnerSvg + `<span>${btnText}</span>`;
                this.style.display = 'inline-flex';
                this.style.alignItems = 'center';
                this.style.justifyContent = 'center';
                this.style.gap = '8px';
                this.classList.add('opacity-80', 'cursor-not-allowed');
                this.disabled = true;
                pendingViewSwitch = 'main-view';
            }
        });
    }

    var linkCat = $('#nav-link-categories');
    if (linkCat) {
        linkCat.addEventListener('click', function(e) {
            e.preventDefault();
            if (closeRadixMenu) closeRadixMenu();
            switchView('categories-view');
        });
    }

    var linkTags = $('#nav-link-tags');
    if (linkTags) {
        linkTags.addEventListener('click', function(e) {
            e.preventDefault();
            if (closeRadixMenu) closeRadixMenu();
            switchView('tags-view');
        });
    }

    var linkSources = $('#nav-link-sources');
    if (linkSources) {
        linkSources.addEventListener('click', function(e) {
            e.preventDefault();
            if (closeRadixMenu) closeRadixMenu();
            switchView('sources-view');
        });
    }

    var linkFavorites = $('#nav-link-favorites');
    if (linkFavorites) {
        linkFavorites.addEventListener('click', function(e) {
            e.preventDefault();
            if (closeRadixMenu) closeRadixMenu();
            renderFavoritesView();
            switchView('favorites-view');
        });
    }

    var linkRandom = $('#nav-link-random');
    if (linkRandom) {
        linkRandom.addEventListener('click', function(e) {
            e.preventDefault();
            if (closeRadixMenu) closeRadixMenu();
            if (allPrompts.length === 0) return;
            const randomIndex = Math.floor(Math.random() * allPrompts.length);
            openPromptModal(randomIndex);
        });
    }

    var resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            var catDropdown = document.querySelector('#dropdown-category');
            if (catDropdown) {
                catDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                var allItem = catDropdown.querySelector('[data-value="all"]');
                if (allItem) { allItem.classList.add('active'); var sel = catDropdown.querySelector('.dropdown-selected'); if (sel) sel.textContent = allItem.textContent; }
            }
            var typeDropdown = document.querySelector('#dropdown-type');
            if (typeDropdown) {
                typeDropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                var allItem2 = typeDropdown.querySelector('[data-value="all"]');
                if (allItem2) { allItem2.classList.add('active'); var sel2 = typeDropdown.querySelector('.dropdown-selected'); if (sel2) sel2.textContent = allItem2.textContent; }
            }
            var searchInput = document.querySelector('#main-search');
            if (searchInput) searchInput.value = '';
            document.querySelectorAll('#tags-container .tag-btn').forEach(t => t.classList.remove('tag-active'));

            var filterHeader = document.getElementById('filter-header');
            if (filterHeader) { filterHeader.classList.add('hidden'); filterHeader.classList.remove('flex'); }
            var aside = document.querySelector('aside');
            if (aside) aside.style.display = '';

            currentFilter = { type: null, id: null, displayName: null };
            filteredPrompts = allPrompts;
            currentPromptIndex = 0;
            const grid = document.getElementById('prompts-grid');
            if (grid) grid.innerHTML = '';

            updateResetBtn();
            updateResultsCounter();
            loadMorePrompts();
            checkEmptyState();
        });
    }

    var burgerBtn = document.getElementById('burger-btn');
    var mobileMenu = document.getElementById('mobile-menu');
    var mobileMenuClose = document.getElementById('mobile-menu-close');
    var mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop');

    function openMobileMenu() {
        if (!mobileMenu) return;
        mobileMenu.classList.add('active');
        if (mobileMenuBackdrop) mobileMenuBackdrop.classList.add('active');
        // Prevent layout shift when scrollbar disappears
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = scrollbarWidth + 'px';
        }
        document.body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
        if (!mobileMenu) return;
        mobileMenu.classList.remove('active');
        if (mobileMenuBackdrop) mobileMenuBackdrop.classList.remove('active');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    if (burgerBtn) burgerBtn.addEventListener('click', openMobileMenu);
    if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMobileMenu);
    if (mobileMenuBackdrop) mobileMenuBackdrop.addEventListener('click', closeMobileMenu);

    document.querySelectorAll('.mobile-nav-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            closeMobileMenu();
            const view = link.dataset.view;
            const filter = link.dataset.filter;
            if (view) {
                if (view === 'favorites-view') renderFavoritesView();
                switchView(view);
            } else if (filter) {
                applyFilter('model', filter, link.textContent.trim());
            }
        });
    });

    // Мобильный поиск — переход на /prompts и фокус на поиск
    var mobileSearchInput = document.getElementById('mobile-search-input');
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = mobileSearchInput.value.trim();
                closeMobileMenu();
                switchView('main-view');
                setTimeout(() => {
                    const mainSearch = document.getElementById('main-search');
                    if (mainSearch && query) {
                        mainSearch.value = query;
                        updateSidebarFilters();
                    } else if (mainSearch) {
                        mainSearch.focus();
                    }
                }, 400);
            }
        });
    }

    var footerCat = $('#footer-link-categories');
    if (footerCat) {
        footerCat.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('categories-view');
        });
    }

    var footerTags = $('#footer-link-tags');
    if (footerTags) {
        footerTags.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('tags-view');
        });
    }

    var footerSources = $('#footer-link-sources');
    if (footerSources) {
        footerSources.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('sources-view');
        });
    }

    var footerDocs = $('#footer-link-docs');
    if (footerDocs) {
        footerDocs.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('docs-view');
        });
    }

    var footerDevelopers = $('#footer-link-developers');
    if (footerDevelopers) {
        footerDevelopers.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('usecase-developers-view');
        });
    }

    var footerDesigners = $('#footer-link-designers');
    if (footerDesigners) {
        footerDesigners.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('usecase-designers-view');
        });
    }

    var footerCreators = $('#footer-link-creators');
    if (footerCreators) {
        footerCreators.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('usecase-creators-view');
        });
    }

    var footerBusinesses = $('#footer-link-businesses');
    if (footerBusinesses) {
        footerBusinesses.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('usecase-businesses-view');
        });
    }

    var footerAbout = $('#footer-link-about');
    if (footerAbout) {
        footerAbout.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('company-about-view');
        });
    }

    var footerPrivacy = $('#footer-link-privacy');
    if (footerPrivacy) {
        footerPrivacy.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('company-privacy-view');
        });
    }

    var footerTerms = $('#footer-link-terms');
    if (footerTerms) {
        footerTerms.addEventListener('click', function(e) {
            e.preventDefault();
            switchView('company-terms-view');
        });
    }

    document.querySelectorAll('a[data-footer-filter]').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            applyFilter('model', link.dataset.footerFilter, link.textContent.trim());
        });
    });

}

// --- ЛОГИКА МЕНЮ ВЫБОРА ИИ И ЗАПУСКА ПРОМПТОВ ---
function initAISelector() {
    const menu = $('#ai-selector-menu');
    const modal = $('#ai-modal');
    if (!menu || !modal) return;

    const chatTabBtn = $('#ai-tab-btn-chat');
    const codeTabBtn = $('#ai-tab-btn-code');
    const chatTabContent = $('#ai-tab-chat');
    const codeTabContent = $('#ai-tab-code');
    const tabsViewport = $('#ai-tabs-viewport');

    if (!chatTabBtn || !codeTabBtn || !chatTabContent || !codeTabContent || !tabsViewport) return;

    function getTabHeight(el) {
        const maxHeight = parseFloat(getComputedStyle(el).maxHeight);
        if (Number.isFinite(maxHeight)) {
            return Math.min(el.scrollHeight, maxHeight);
        }
        return el.scrollHeight;
    }

    function setActiveTab(tab) {
        const isChat = tab === 'chat';

        chatTabBtn.className = isChat
            ? 'ai-tab-btn flex-1 py-1.5 text-sm font-medium rounded-md bg-[#2A2A2A] text-white transition-colors cursor-pointer'
            : 'ai-tab-btn flex-1 py-1.5 text-sm font-medium rounded-md text-[#888] hover:text-white transition-colors cursor-pointer';

        codeTabBtn.className = isChat
            ? 'ai-tab-btn flex-1 py-1.5 text-sm font-medium rounded-md text-[#888] hover:text-white transition-colors cursor-pointer'
            : 'ai-tab-btn flex-1 py-1.5 text-sm font-medium rounded-md bg-[#2A2A2A] text-white transition-colors cursor-pointer';

        menu.dataset.tab = tab;
    }

    chatTabBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        setActiveTab('chat');
    });

    codeTabBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        setActiveTab('code');
    });

    let currentPromptText = '';

    const webLinks = {
        chatgpt: text => `https://chatgpt.com/?prompt=${encodeURIComponent(text)}`,
        claude: text => `https://claude.ai/new?prompt=${encodeURIComponent(text)}`,
        grok: text => `https://grok.com/chat?prompt=${encodeURIComponent(text)}`,
        manus: text => `https://manus.im/app?q=${encodeURIComponent(text)}`,
        perplexity: text => `https://www.perplexity.ai/search/new?q=${encodeURIComponent(text)}`,
        bolt: text => `https://bolt.new/?prompt=${encodeURIComponent(text)}`,
        v0: text => `https://v0.app/chat?q=${encodeURIComponent(text)}`
    };

    function closeMenu() {
        menu.classList.remove('active');
        setTimeout(() => {
            if (!menu.classList.contains('active')) {
                menu.style.display = 'none';
                menu.activeTriggerBtn = null;
            }
        }, 200);
    }

    function openMenu(triggerBtn) {
        const card = triggerBtn.closest('.group');
        if (!card) return;

        const promptContent = card.querySelector('.prompt-content');
        currentPromptText = promptContent ? promptContent.textContent : '';

        menu.style.display = 'block';
        
        tabsViewport.style.height = getTabHeight(chatTabContent) + 'px';
        setActiveTab('chat');

        const rect = triggerBtn.getBoundingClientRect();
        const menuHeight = menu.offsetHeight;
        const spaceBelow = window.innerHeight - rect.bottom;

        if (spaceBelow < menuHeight + 20) {
            menu.style.top = `${rect.top + window.scrollY - menuHeight - 8}px`;
            menu.style.transformOrigin = 'bottom right';
        } else {
            menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
            menu.style.transformOrigin = 'top right';
        }

        menu.style.left = `${rect.right + window.scrollX - 240}px`;
        menu.activeTriggerBtn = triggerBtn;
        
        requestAnimationFrame(() => menu.classList.add('active'));
    }

    let menuLeaveTimer = null;

    menu.addEventListener('mouseenter', function() {
        if (menuLeaveTimer) {
            clearTimeout(menuLeaveTimer);
            menuLeaveTimer = null;
        }
    });

    menu.addEventListener('mouseleave', function() {
        menuLeaveTimer = setTimeout(function() {
            closeMenu();
            menuLeaveTimer = null;
        }, 200);
    });

    document.addEventListener('click', e => {
        const triggerBtn = e.target.closest('.ai-trigger-btn');
        if (triggerBtn) {
            e.preventDefault();
            e.stopPropagation();
            
            if (menu.classList.contains('active') && menu.activeTriggerBtn === triggerBtn) {
                closeMenu();
            } else {
                openMenu(triggerBtn);
            }
            return;
        }

        const modelBtn = e.target.closest('.ai-model-btn');
        if (modelBtn && menu.contains(modelBtn)) {
            e.preventDefault();
            e.stopPropagation();

            const modelId = modelBtn.dataset.model;
            const type = modelBtn.dataset.type;

            closeMenu();

            if (type === 'web') {
                const linkBuilder = webLinks[modelId];
                if (linkBuilder) {
                    window.open(linkBuilder(currentPromptText), '_blank', 'noopener');
                }
            } else if (type === 'modal') {
                navigator.clipboard.writeText(currentPromptText).then(function() {
                    var aiName = modelBtn.dataset.name;
                    var aiUrl = modelBtn.dataset.url;
                    var t = translations[currentLang] || translations.ru;

                    $('#ai-modal-btn-text').textContent = (t.modal_open || 'Открыть ') + aiName;
                    $('#ai-modal-open').href = aiUrl;

                    var descEl = $('#ai-modal-desc');
                    var descParts = (t.modal_desc || 'Вставьте промпт в {name} после открытия.').split('{name}');
                    descEl.textContent = '';
                    descEl.append(descParts[0]);
                    var nameSpan = document.createElement('span');
                    nameSpan.id = 'ai-modal-name';
                    nameSpan.className = 'text-[#EDEDED] font-medium';
                    nameSpan.textContent = aiName;
                    descEl.appendChild(nameSpan);
                    if (descParts[1]) descEl.append(descParts[1]);

                    modal.classList.add('active');
                });
            } else if (type === 'app') {
                navigator.clipboard.writeText(currentPromptText).then(() => {
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = modelBtn.dataset.protocol;
                    document.body.appendChild(iframe);
                    setTimeout(() => {
                        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                    }, 1000);
                });
            }
            return;
        }

        if (!menu.contains(e.target) && menu.classList.contains('active')) {
            closeMenu();
        }
    });

    const closeModal = () => modal.classList.remove('active');
    $('#ai-modal-close-x').addEventListener('click', closeModal);
    $('#ai-modal-cancel').addEventListener('click', closeModal);
    $('#ai-modal-open').addEventListener('click', closeModal);
    $('#ai-modal-backdrop').addEventListener('click', closeModal);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (modal.classList.contains('active')) {
                closeModal();
            } else if (menu.classList.contains('active')) {
                closeMenu();
            }
        }
    });

    window.addEventListener('resize', function() {
        if (!menu.classList.contains('active') || !menu.activeTriggerBtn) return;
        
        const rect = menu.activeTriggerBtn.getBoundingClientRect();
        const menuHeight = menu.offsetHeight;
        
        if (window.innerHeight - rect.bottom < menuHeight + 20) {
            menu.style.top = `${rect.top + window.scrollY - menuHeight - 8}px`;
            menu.style.transformOrigin = 'bottom right';
        } else {
            menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
            menu.style.transformOrigin = 'top right';
        }
        menu.style.left = `${rect.right + window.scrollX - 240}px`;
    });

    document.addEventListener('scroll', function(e) {
        if (menu.classList.contains('active') && !menu.contains(e.target)) {
            closeMenu();
        }
    }, true);
}

function applyFilter(type, id, displayName) {
    currentFilter = { type, id, displayName };

    const aside = document.querySelector('aside');
    const filterHeader = document.getElementById('filter-header');
    const valueLabel = document.getElementById('filter-value-label');
    const breadcrumbHome = document.getElementById('breadcrumb-home');
    
    if (type !== 'sidebar-tag') {
        const sidebarTags = document.querySelectorAll('#tags-container .tag-btn');
        for (let i = 0; i < sidebarTags.length; i++) {
            sidebarTags[i].classList.remove('tag-active');
        }
    }
    
    if (type) {
        let breadcrumbText = '';
        if (type === 'sidebar-tag') {
            aside.style.display = '';
            breadcrumbText = (translations[currentLang]?.tags_label || 'Тег');
        } else {
            aside.style.display = 'none';
            if (type === 'category') {
                breadcrumbText = (translations[currentLang]?.category_label || 'Категория');
            } else if (type === 'model') {
                breadcrumbText = (translations[currentLang]?.nav_models || 'Модели');
            } else {
                breadcrumbText = (translations[currentLang]?.tags_label || 'Тег');
            }
        }

        filterHeader.classList.remove('hidden');
        filterHeader.classList.add('flex');
        valueLabel.textContent = displayName || id;

        // Обновляем breadcrumb: «Тип: значение»
        if (breadcrumbHome) {
            breadcrumbHome.textContent = breadcrumbText + ':';
            breadcrumbHome.onclick = function(e) {
                e.preventDefault();
                applyFilter(null, null, null);
            };
        }
        
        if (type === 'category') {
            filteredPrompts = allPrompts.filter(p => p.category_id === id || p.category === id || p.category === displayName);
        } else if (type === 'tag' || type === 'sidebar-tag') {
            filteredPrompts = allPrompts.filter(p => p.tags && p.tags.some(t => t.toLowerCase() === id.toLowerCase()));
        } else if (type === 'model') {
            filteredPrompts = allPrompts.filter(p => getPromptType(p) === id);
        }
        
        switchView('main-view');
        
        currentPromptIndex = 0;
        const grid = document.getElementById('prompts-grid');
        if (grid) grid.innerHTML = '';
        
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        
        loadMorePrompts();
    } else {
        aside.style.display = '';
        filterHeader.classList.add('hidden');
        filterHeader.classList.remove('flex');

        var catDropdown = document.querySelector('#dropdown-category');
        if (catDropdown) {
            var catItems = catDropdown.querySelectorAll('.dropdown-item');
            catItems.forEach(item => item.classList.remove('active'));
            var allItem = catDropdown.querySelector('[data-value="all"]');
            if (allItem) {
                allItem.classList.add('active');
                var sel = catDropdown.querySelector('.dropdown-selected');
                if (sel) sel.textContent = allItem.textContent;
            }
        }
        var typeDropdown = document.querySelector('#dropdown-type');
        if (typeDropdown) {
            var tItems = typeDropdown.querySelectorAll('.dropdown-item');
            tItems.forEach(item => item.classList.remove('active'));
            var tAllItem = typeDropdown.querySelector('[data-value="all"]');
            if (tAllItem) {
                tAllItem.classList.add('active');
                var tSel = typeDropdown.querySelector('.dropdown-selected');
                if (tSel) tSel.textContent = tAllItem.textContent;
            }
        }
        var searchInput = document.querySelector('#main-search');
        if (searchInput) searchInput.value = '';

        updateSidebarFilters();
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, function(tag) {
        const charsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };
        return charsToReplace[tag] || tag;
    });
}

function createPromptCardHTML(p, realIndex) {
    const title = escapeHTML(p.title);
    const desc = escapeHTML(p.description);
    const promptText = escapeHTML(p.prompt);
    const type = escapeHTML(p.category || 'Text');

    const imageBlock = p.image ? `
    <div class="relative w-full overflow-hidden rounded-xl mb-1" style="aspect-ratio:16/9;">
        <img src="${escapeHTML(p.image)}" alt="${title}" loading="lazy"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
        <span class="absolute top-2.5 right-2.5 text-[10px] uppercase tracking-wider bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-md font-medium">${type}</span>
    </div>` : '';

    const typeTag = !p.image ? `
        <span class="text-[10px] uppercase tracking-wider border border-[#333] px-2 py-0.5 rounded-md text-[#888] bg-[#111] max-w-[120px] truncate text-right" title="${type}">${type}</span>` : '';

    return `
    <div tabindex="0" role="button" data-index="${realIndex}" class="prompt-card group bg-[#1A1A1A] border border-[#333] rounded-2xl overflow-hidden hover:border-[#555] hover:bg-[#222] transition-all duration-300 flex flex-col cursor-pointer ${p.image ? '' : 'p-5 gap-3'}">
        ${p.image ? `
        ${imageBlock}
        <div class="flex flex-col gap-3 p-5 pt-3">
            <div class="flex justify-between items-start">
                <h3 class="font-semibold text-lg leading-tight text-[#EDEDED] group-hover:text-white transition-colors">${title}</h3>
            </div>
            <p class="text-sm text-[#A0A0A0] line-clamp-2" title="${desc}">${desc}</p>
            <div class="flex flex-col gap-2">
                <pre class="prompt-content bg-[#0A0A0A] border border-[#222] group-hover:border-[#333] rounded-xl p-4 text-xs font-mono text-[#A0A0A0] overflow-hidden whitespace-pre-wrap transition-colors duration-300 line-clamp-4 cursor-text">${promptText}</pre>
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-1.5 text-[#666]">
                        <i class="ph-bold ph-heart icon-sm"></i>
                        <span class="card-likes-count text-[12px] font-medium">0</span>
                    </div>
                    <button class="ai-trigger-btn flex items-center justify-center w-9 h-9 bg-[#1A1A1A] border border-[#333] rounded-xl hover:bg-[#2A2A2A] hover:border-[#555] hover:text-white transition-all duration-200 text-[#888] cursor-pointer shadow-sm">
                        <i class="ph-bold ph-play icon-sm"></i>
                    </button>
                </div>
            </div>
        </div>
        ` : `
        <div class="flex justify-between items-start">
            <h3 class="font-semibold text-lg leading-tight text-[#EDEDED] group-hover:text-white transition-colors">${title}</h3>
            ${typeTag}
        </div>
        <p class="text-sm text-[#A0A0A0] line-clamp-2" title="${desc}">${desc}</p>
        <div class="mt-2 flex flex-col gap-2">
            <pre class="prompt-content bg-[#0A0A0A] border border-[#222] group-hover:border-[#333] rounded-xl p-4 text-xs font-mono text-[#A0A0A0] overflow-hidden whitespace-pre-wrap transition-colors duration-300 line-clamp-4 cursor-text">${promptText}</pre>
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-1.5 text-[#666]">
                    <i class="ph-bold ph-heart icon-sm"></i>
                    <span class="card-likes-count text-[12px] font-medium">0</span>
                </div>
                <button class="ai-trigger-btn flex items-center justify-center w-9 h-9 bg-[#1A1A1A] border border-[#333] rounded-xl hover:bg-[#2A2A2A] hover:border-[#555] hover:text-white transition-all duration-200 text-[#888] cursor-pointer shadow-sm">
                    <i class="ph-bold ph-play icon-sm"></i>
                </button>
            </div>
        </div>
        `}
    </div>`;
}

function shuffleArray(array) {
    let curId = array.length;
    while (0 !== curId) {
        let randId = Math.floor(Math.random() * curId);
        curId -= 1;
        let tmp = array[curId];
        array[curId] = array[randId];
        array[randId] = tmp;
    }
    return array;
}

async function loadHeroCounter() {
    const el = document.getElementById('hero-prompt-count');
    if (!el) return;
    
    try {
        const cacheKey = 'datvex_prompts';
        const cached = sessionStorage.getItem(cacheKey);
        let count = 0;
        
        if (cached) {
            const data = JSON.parse(cached);
            count = Array.isArray(data) ? data.length : 0;
        } else {
            const r = await fetch('https://raw.githubusercontent.com/Datvex/Datvex-prompt-LAB/main/data/prompts.json');
            if (r.ok) {
                const data = await r.json();
                count = Array.isArray(data) ? data.length : 0;
            }
        }
        
        if (count > 0) {
            const duration = 1500;
            let startTime = null;
            function tick(now) {
                if (!startTime) startTime = now;
                const progress = Math.min((now - startTime) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.floor(eased * count).toLocaleString();
                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    el.textContent = count.toLocaleString();
                }
            }
            requestAnimationFrame(tick);
        } else {
            el.textContent = '0';
        }
    } catch(e) {
        const el2 = document.getElementById('hero-prompt-count');
        if (el2) el2.textContent = '0';
    }
}

async function loadPrompts() {
    const grid = document.querySelector('#prompts-grid');
    if (!grid) {
        setAppReady();
        return;
    }

    showSkeletons();

    const LOAD_TIMEOUT = 20000; // 20 секунд
    let loadTimedOut = false;

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            loadTimedOut = true;
            reject(new Error('Load timeout'));
        }, LOAD_TIMEOUT);
    });

    const fetchPromise = (async () => {
        const cacheKey = 'datvex_prompts';
        const cached = sessionStorage.getItem(cacheKey);

        const r = await fetch('https://raw.githubusercontent.com/Datvex/Datvex-prompt-LAB/main/data/prompts.json', { cache: 'no-store' });
        if (r.ok) {
            const remotePrompts = await r.json();
            if (!Array.isArray(remotePrompts)) throw new Error('Invalid remote data');

            const computeId = (p) => {
                if (p.numeric_id !== undefined) return String(p.numeric_id);
                let str = (p.title || '') + (p.prompt || '');
                let hash = 0;
                for (let j = 0; j < str.length; j++) {
                    hash = Math.imul(31, hash) + str.charCodeAt(j) | 0;
                }
                return String(Math.abs(hash));
            };

            if (cached) {
                const localPrompts = JSON.parse(cached);
                const localIds = new Set(localPrompts.map(p => computeId(p)));
                let hasNew = false;
                for (const rp of remotePrompts) {
                    const rid = computeId(rp);
                    rp.numeric_id = rid;
                    if (!localIds.has(rid)) {
                        localPrompts.push(rp);
                        hasNew = true;
                    }
                }
                if (hasNew) {
                    allPrompts = localPrompts;
                    try { sessionStorage.setItem(cacheKey, JSON.stringify(allPrompts)); } catch(e) { console.error('SessionStorage set error:', e); }
                } else {
                    allPrompts = localPrompts;
                }
            } else {
                allPrompts = remotePrompts;
                try { sessionStorage.setItem(cacheKey, JSON.stringify(allPrompts)); } catch(e) { console.error('SessionStorage set error:', e); }
            }
        } else if (cached) {
            allPrompts = JSON.parse(cached);
        } else {
            throw new Error('No data and no cache');
        }
    })();

    try {
        await Promise.race([fetchPromise, timeoutPromise]);
    } catch (e) {
        console.error('Failed to load prompts:', e);

        // Если была загрузка из кеша — показываем то что есть
        if (allPrompts.length > 0) {
            console.warn('Using cached prompts after failed fetch');
        } else if (loadTimedOut) {
            // Таймаут — показываем ошибку с кнопкой перезагрузки
            grid.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 gap-4 text-center" style="grid-column: 1 / -1;">
                    <i class="ph-bold ph-warning-circle icon-2xl text-[#666]"></i>
                    <p class="text-white font-semibold text-[17px]">Не удалось загрузить промпты</p>
                    <p class="text-[#888] text-[14px] max-w-xs">Превышено время ожидания. Проверьте подключение к интернету и перезагрузите страницу.</p>
                    <button onclick="location.reload()" class="mt-2 px-5 py-2.5 bg-[#1A1A1A] border border-[#333] hover:border-[#555] text-white text-[14px] font-medium rounded-xl transition-colors">
                        Перезагрузить страницу
                    </button>
                </div>
            `;
            setAppReady();
            return;
        } else {
            // Полная ошибка — тоже показываем ошибку
            grid.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 gap-4 text-center" style="grid-column: 1 / -1;">
                    <i class="ph-bold ph-warning-circle icon-2xl text-[#666]"></i>
                    <p class="text-white font-semibold text-[17px]">Не удалось загрузить промпты</p>
                    <p class="text-[#888] text-[14px] max-w-xs">Произошла ошибка при загрузке данных. Попробуйте перезагрузить страницу.</p>
                    <button onclick="location.reload()" class="mt-2 px-5 py-2.5 bg-[#1A1A1A] border border-[#333] hover:border-[#555] text-white text-[14px] font-medium rounded-xl transition-colors">
                        Перезагрузить страницу
                    </button>
                </div>
            `;
            setAppReady();
            return;
        }
    }

    if (!Array.isArray(allPrompts)) allPrompts = [];

    for (let i = 0; i < allPrompts.length; i++) {
        let p = allPrompts[i];
        if (p.numeric_id === undefined) {
            let str = (p.title || '') + (p.prompt || '');
            let hash = 0;
            for (let j = 0; j < str.length; j++) {
                hash = Math.imul(31, hash) + str.charCodeAt(j) | 0;
            }
            p.numeric_id = String(Math.abs(hash));
        } else {
            p.numeric_id = String(p.numeric_id);
        }
    }

    try {
        const likesRes = await fetch('/api/likes-all');
        if (likesRes.ok) {
            likesCache = await likesRes.json();
        }
    } catch(e) {
        console.warn('Failed to load likes', e);
    }

    allPrompts = shuffleArray(allPrompts);

    const sidebarTagsContainer = $('#tags-container');
    if (sidebarTagsContainer) {
        const tagCounts = {};
        allPrompts.forEach(p => {
            if (p.tags) p.tags.forEach(t => {
                const tl = t.toLowerCase();
                tagCounts[tl] = (tagCounts[tl] || 0) + 1;
            });
        });
        const btns = Array.from(sidebarTagsContainer.querySelectorAll('.tag-btn'));
        btns.sort((a, b) => {
            const ca = tagCounts[a.textContent.toLowerCase()] || 0;
            const cb = tagCounts[b.textContent.toLowerCase()] || 0;
            return cb - ca;
        });
        btns.forEach(btn => sidebarTagsContainer.appendChild(btn));
    }
    filteredPrompts = allPrompts;
    currentPromptIndex = 0;
    grid.innerHTML = '';

    try {
        await generateTagsPage();
    } catch(e) { console.error('Tags page generation error:', e); }

    setupInfiniteScroll();
    loadMorePrompts(true);

    // Обработка прямых ссылок на промпты (чистые URL + fallback для старых хешей)
    if (location.pathname.startsWith('/prompt/')) {
        setTimeout(() => {
            const targetId = location.pathname.replace('/prompt/', '');
            const index = allPrompts.findIndex(p => String(p.numeric_id) === targetId);
            if (index !== -1) openPromptModal(index);
        }, 100);
    } else if (location.hash && location.hash.startsWith('#/prompt/')) {
        setTimeout(() => {
            const targetId = location.hash.replace('#/prompt/', '');
            const index = allPrompts.findIndex(p => String(p.numeric_id) === targetId);
            if (index !== -1) openPromptModal(index);
        }, 100);
    }
}

function setAppReady() {
    isAppReady = true;

    const count = allPrompts.length;
    const el = document.getElementById('hero-prompt-count');
    if (el) {
        if (count > 0) {
            animateHeroCounter(count);
        } else {
            el.textContent = '0';
        }
    }

    // Инициализируем навигацию стрелками
    try { initArrowKeyNavigation(); } catch(e) { console.error('Arrow key nav init error:', e); }

    if (pendingViewSwitch) {
        const targetView = pendingViewSwitch;
        pendingViewSwitch = null;
        
        const btnExplore = document.getElementById('btn-explore');
        if (btnExplore) {
            btnExplore.innerHTML = translations[currentLang]?.hero_btn_explore || 'Start Exploring';
            btnExplore.classList.remove('opacity-80', 'cursor-not-allowed');
            btnExplore.style.display = '';
            btnExplore.style.alignItems = '';
            btnExplore.style.justifyContent = '';
            btnExplore.style.gap = '';
            btnExplore.disabled = false;
        }
        
        switchView(targetView);
    }
}

function animateHeroCounter(target) {
    const el = document.getElementById('hero-prompt-count');
    if (!el) return;
    if (target <= 0) {
        el.textContent = '0';
        return;
    }
    
    el.textContent = '0';
    
    const duration = 1500;
    let startTime = null;

    function tick(now) {
        if (!startTime) startTime = now;
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            el.textContent = target.toLocaleString();
        }
    }
    
    requestAnimationFrame(tick);
}

function loadMorePrompts(forceInitial) {
    const isInitial = forceInitial === true;
    const sourceArray = currentFilter.type ? filteredPrompts : allPrompts;

    if (isLoadingPrompts || currentPromptIndex >= sourceArray.length) {
        if (isInitial) setAppReady();
        if (!isLoadingPrompts) checkEmptyState();
        return;
    }
    isLoadingPrompts = true;

    const grid = document.querySelector('#prompts-grid');
    const spinner = document.querySelector('#loading-spinner');
    if (!grid) {
        if (isInitial) setAppReady();
        isLoadingPrompts = false;
        return;
    }

    if (spinner && !isInitial) {
        spinner.classList.remove('hidden');
        spinner.classList.add('flex');
    }

    setTimeout(() => {
        try {
            const nextPrompts = sourceArray.slice(currentPromptIndex, currentPromptIndex + PROMPTS_PER_PAGE);
            let html = '';
            
            for (let i = 0; i < nextPrompts.length; i++) {
                const p = nextPrompts[i];
                const realIndex = currentFilter.type ? allPrompts.indexOf(p) : (currentPromptIndex + i);
                html += createPromptCardHTML(p, realIndex);
            }

            grid.insertAdjacentHTML('beforeend', html);
            currentPromptIndex += PROMPTS_PER_PAGE;

            const newCards = grid.querySelectorAll('.prompt-card:not([data-likes-loaded])');
            newCards.forEach(card => {
                card.setAttribute('data-likes-loaded', '1');
                const idx = card.getAttribute('data-index');
                const prompt = allPrompts[idx];
                if (!prompt || !prompt.numeric_id) return;
                const countEl = card.querySelector('.card-likes-count');
                if (likesCache[prompt.numeric_id] !== undefined) {
                    if (countEl) countEl.textContent = likesCache[prompt.numeric_id];
                } else {
                    fetch(`/api/likes?prompt_id=${prompt.numeric_id}`)
                        .then(r => r.json())
                        .then(data => {
                            likesCache[prompt.numeric_id] = data.count;
                            if (countEl) countEl.textContent = data.count;
                        })
                        .catch(() => {});
                }
            });
        } catch (e) {}

        if (spinner) {
            spinner.classList.add('hidden');
            spinner.classList.remove('flex');
        }
        isLoadingPrompts = false;
        if (isInitial) setAppReady();
        
        updateResultsCounter();
        checkEmptyState();

        const sentinel = document.querySelector('#scroll-sentinel');
        if (sentinel && sentinel.offsetParent !== null && currentPromptIndex < sourceArray.length) {
            const rect = sentinel.getBoundingClientRect();
            if (rect.top <= window.innerHeight + 200) {
                loadMorePrompts();
            }
        }
    }, isInitial ? 0 : 400);
}
function checkEmptyState() {
    const grid = document.getElementById('prompts-grid');
    const emptyState = document.getElementById('empty-state');
    if (!grid || !emptyState) return;
    
    if (isLoadingPrompts) return;
    
    const sourceArray = currentFilter.type ? filteredPrompts : allPrompts;
    
    if (sourceArray.length === 0) {
        emptyState.classList.remove('hidden');
        grid.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        grid.classList.remove('hidden');
    }
}

function showSkeletons() {
    const grid = document.getElementById('prompts-grid');
    if (!grid) return;
    
    let html = '';
    for (let i = 0; i < 9; i++) {
        html += `
        <div class="skeleton-card bg-[#1A1A1A] border border-[#333] rounded-2xl p-5 flex flex-col gap-3">
            <div class="flex justify-between items-start gap-3">
                <div class="skeleton-line h-5 w-3/4 rounded-lg"></div>
                <div class="skeleton-line h-4 w-16 rounded-md"></div>
            </div>
            <div class="skeleton-line h-3 w-full rounded-md"></div>
            <div class="skeleton-line h-3 w-4/5 rounded-md"></div>
            <div class="skeleton-line h-32 w-full rounded-xl mt-2"></div>
            <div class="flex justify-end">
                <div class="skeleton-line h-9 w-9 rounded-xl"></div>
            </div>
        </div>`;
    }
    grid.innerHTML = html;
}

function setupInfiniteScroll() {
    const sentinel = document.querySelector('#scroll-sentinel');
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
        const sourceArray = currentFilter.type ? filteredPrompts : allPrompts;
        if (entries[0].isIntersecting && sentinel.offsetParent !== null && !isLoadingPrompts && currentPromptIndex < sourceArray.length) {
            loadMorePrompts();
        }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
}

// Навигация стрелками по карточкам промптов
function initArrowKeyNavigation() {
    const grid = document.querySelector('#prompts-grid');
    if (!grid) return;

    let focusedCardIndex = -1;

    grid.addEventListener('keydown', function(e) {
        const cards = grid.querySelectorAll('.prompt-card');
        if (cards.length === 0) return;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            focusedCardIndex = (focusedCardIndex + 1) % cards.length;
            cards[focusedCardIndex].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            focusedCardIndex = focusedCardIndex <= 0 ? cards.length - 1 : focusedCardIndex - 1;
            cards[focusedCardIndex].focus();
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const activeCard = document.activeElement;
            if (activeCard && activeCard.classList.contains('prompt-card')) {
                const idx = activeCard.getAttribute('data-index');
                openPromptModal(idx);
            }
        }
    });

    // Отслеживаем фокус на карточках
    grid.addEventListener('focusin', function(e) {
        const card = e.target.closest('.prompt-card');
        if (card) {
            const cards = grid.querySelectorAll('.prompt-card');
            cards.forEach((c, i) => { if (c === card) focusedCardIndex = i; });
        }
    });
}

function openPromptModal(index) {
    const prompt = allPrompts[index];
    if (!prompt) return;

    const modal = document.getElementById('prompt-modal');
    const titleEl = document.getElementById('prompt-modal-title');
    const descEl = document.getElementById('prompt-modal-desc');
    const textEl = document.getElementById('prompt-modal-text');
    const tagsEl = document.getElementById('prompt-modal-tags');
    const tokenEl = document.getElementById('prompt-modal-tokens');
    const favBtn = document.getElementById('prompt-modal-fav-btn');
    const copyBtn = document.getElementById('prompt-modal-copy-btn');

    const existingImg = document.getElementById('prompt-modal-image-block');
    if (existingImg) existingImg.remove();

    if (prompt.image) {
        const imgBlock = document.createElement('div');
        imgBlock.id = 'prompt-modal-image-block';
        imgBlock.className = 'w-full overflow-hidden rounded-xl shrink-0';
        imgBlock.style.cssText = 'aspect-ratio:16/9;';
        imgBlock.innerHTML = `<img src="${escapeHTML(prompt.image)}" alt="${escapeHTML(prompt.title)}" class="w-full h-full object-cover">`;
        const scrollArea = document.querySelector('#prompt-modal-content > div.p-5');
        if (scrollArea) scrollArea.insertBefore(imgBlock, scrollArea.firstChild);
    }

    titleEl.textContent = prompt.title;
    descEl.textContent = prompt.description;
    textEl.textContent = prompt.prompt;

    // Copy button handler
    if (copyBtn) {
        copyBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const promptText = textEl?.textContent;
            if (!promptText) return;

            const copyIcon = this.querySelector('.copy-icon');
            const copyText = this.querySelector('.copy-text');

            navigator.clipboard.writeText(promptText).then(() => {
                copyIcon.className = 'ph-bold ph-check icon-sm copy-icon transition-all duration-300';
                copyIcon.style.color = '#4ADE80';
                copyText.textContent = 'Скопировано!';
                copyText.style.color = '#4ADE80';

                setTimeout(() => {
                    copyIcon.className = 'ph-bold ph-copy icon-sm copy-icon transition-all duration-300';
                    copyIcon.style.color = '';
                    copyText.textContent = 'Копировать';
                    copyText.style.color = '';
                }, 2000);
            }).catch(() => {
                const textarea = document.createElement('textarea');
                textarea.value = promptText;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    copyIcon.className = 'ph-bold ph-check icon-sm copy-icon transition-all duration-300';
                    copyIcon.style.color = '#4ADE80';
                    copyText.textContent = 'Скопировано!';
                    copyText.style.color = '#4ADE80';

                    setTimeout(() => {
                        copyIcon.className = 'ph-bold ph-copy icon-sm copy-icon transition-all duration-300';
                        copyIcon.style.color = '';
                        copyText.textContent = 'Копировать';
                        copyText.style.color = '';
                    }, 2000);
                } catch (err) {
                    console.error('Copy failed:', err);
                }
                document.body.removeChild(textarea);
            });
        };
    }

    if (tokenEl) {
        const tokenCount = (prompt.prompt || '').length;
        tokenEl.textContent = 'Tokens: ' + tokenCount.toLocaleString();
    }

    if (favBtn && prompt.numeric_id !== undefined) {
        updateFavBtn(favBtn, isFavorite(prompt.numeric_id));
        favBtn.onclick = () => {
            const nowFav = toggleFavorite(prompt.numeric_id);
            updateFavBtn(favBtn, nowFav, true);
            const favView = document.getElementById('favorites-view');
            if (favView && !favView.classList.contains('hidden')) {
                renderFavoritesView();
            }
        };
    }

    let tagsHtml = `<span class="text-[10px] uppercase tracking-wider border border-[#333] px-2 py-0.5 rounded-md text-[#888] bg-[#111] font-medium">${escapeHTML(prompt.category || 'Text')}</span>`;
    
    if (prompt.tags && prompt.tags.length > 0) {
        const tagColors = ['#60A5FA', '#F87171', '#FBBF24', '#4ADE80', '#C084FC', '#F472B6', '#2DD4BF', '#FB923C', '#818CF8', '#22D3EE'];
        prompt.tags.forEach(tag => {
            const color = tagColors[tag.length % tagColors.length];
            tagsHtml += `<span class="text-[11px] bg-[#1A1A1A] px-2 py-0.5 rounded-md border border-[#222]" style="color: ${color}">#${escapeHTML(tag)}</span>`;
        });
    }
    tagsEl.innerHTML = tagsHtml;

    const numericId = prompt.numeric_id;
    if (numericId) {
        try {
            history.pushState({ view: 'prompt', id: numericId }, '', '/prompt/' + numericId);
        } catch(e) { console.error('History pushState failed:', e); }
    }

    const likeBtn = document.getElementById('prompt-modal-like-btn');
    const likesCount = document.getElementById('prompt-modal-likes-count');
    const likeIcon = likeBtn?.querySelector('i');

    if (likeBtn && prompt.numeric_id) {
        likesCount.textContent = '0';
        likeIcon.className = 'ph-bold ph-heart icon-sm';
        likeIcon.style.color = '';

        if (likesCache[prompt.numeric_id] !== undefined) {
            likesCount.textContent = likesCache[prompt.numeric_id];
        }

        fetch(`/api/likes?prompt_id=${prompt.numeric_id}`)
            .then(r => r.json())
            .then(data => {
                likesCache[prompt.numeric_id] = data.count;
                likesCount.textContent = data.count;
                if (data.liked) {
                    likeIcon.className = 'ph-fill ph-heart icon-sm';
                    likeIcon.style.color = '#ef4444';
                }
            })
            .catch(() => {});

        likeBtn.onclick = () => {
            const authUser = document.cookie.match(/auth_user=([^;]+)/);
            if (!authUser) {
                document.getElementById('nav-login-btn')?.click();
                return;
            }

            likeIcon.classList.remove('like-pop');
            void likeIcon.offsetWidth;
            likeIcon.classList.add('like-pop');

            fetch(`/api/likes?prompt_id=${prompt.numeric_id}`, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    likesCache[prompt.numeric_id] = data.count;
                    likesCount.textContent = data.count;
                    if (data.liked) {
                        likeIcon.className = 'ph-fill ph-heart icon-sm';
                        likeIcon.style.color = '#ef4444';
                    } else {
                        likeIcon.className = 'ph-bold ph-heart icon-sm';
                        likeIcon.style.color = '';
                    }
                    const cardLikes = document.querySelector(`.prompt-card[data-index="${index}"] .card-likes-count`);
                    if (cardLikes) cardLikes.textContent = data.count;
                })
                .catch(() => {});
        };
    }

    modal.classList.add('active');
    // Prevent layout shift when scrollbar disappears
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = scrollbarWidth + 'px';
    }
    document.body.style.overflow = 'hidden';
}

function closePromptModal() {
    const modal = document.getElementById('prompt-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        if (location.pathname.startsWith('/prompt/') || location.hash.startsWith('#/prompt/')) {
            try {
                history.pushState({ view: 'main-view' }, '', '/prompts');
            } catch(e) { console.error('History pushState on close failed:', e); }
        }
    }
}

document.addEventListener('click', function(e) {
    // Ignore clicks inside the prompt modal
    if (e.target.closest('#prompt-modal')) {
        return;
    }

    if (e.target.closest('#clear-filter-btn')) {
        e.preventDefault();
        applyFilter(null, null, null);
        return;
    }

    const docLink = e.target.closest('a[href^="#doc-"]');
    if (docLink) {
        e.preventDefault();
        const targetId = docLink.getAttribute('href').substring(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth' });
            history.replaceState({ view: 'docs-view' }, '', '#' + targetId);
        }
        return;
    }

    if (e.target.closest('.ai-trigger-btn')) return;

    const card = e.target.closest('.prompt-card');
    if (card) {
        e.preventDefault();
        const index = card.getAttribute('data-index');
        openPromptModal(index);
    }
});

// Initialize modal event listeners
document.addEventListener('DOMContentLoaded', function() {
    const modalCloseBtn = document.getElementById('prompt-modal-close');
    const modalBackdrop = document.getElementById('prompt-modal-backdrop');
    
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closePromptModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closePromptModal);
});

document.addEventListener('keydown', function(e) {
    // Escape — закрытие модалок
    if (e.key === 'Escape') {
        const promptModal = document.getElementById('prompt-modal');
        if (promptModal && promptModal.classList.contains('active')) {
            closePromptModal();
            return;
        }
    }

    // / или Ctrl+K — фокус на поиске
    if ((e.key === '/' && !e.ctrlKey && !e.metaKey) || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) {
        const mainSearch = document.getElementById('main-search');
        if (mainSearch) {
            const tag = e.target.tagName;
            const isEditable = e.target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA';
            if (!isEditable) {
                e.preventDefault();
                const mainView = document.getElementById('main-view');
                if (mainView && mainView.classList.contains('hidden')) {
                    switchView('main-view');
                    setTimeout(() => { mainSearch.focus(); }, 400);
                } else {
                    mainSearch.focus();
                }
            }
        }
    }
});

const LEET_MAP = {
    a: '[a@4аА]',
    b: '[b8вВ6]',
    c: '[cсСk]',
    d: '[dddД]',
    e: '[e3еЕ]',
    f: '[fфФ]',
    g: '[g9gg]',
    h: '[hнН]',
    i: '[i1l!|iіІ]',
    j: '[j]',
    k: '[kcкК]',
    l: '[l1|lлЛ]',
    m: '[mmмМ]',
    n: '[nnнН]',
    o: '[o0оО]',
    p: '[ppпП]',
    q: '[q]',
    r: '[rrрР]',
    s: '[s5$sзЗ]',
    t: '[t7+tтТ]',
    u: '[uuuуУ]',
    v: '[vvvвВ]',
    w: '[wwwwш]',
    x: '[xхХ]',
    y: '[yyуУ]',
    z: '[z2zzз]'
};

function buildPattern(word) {
    return word.split('').map(ch => LEET_MAP[ch.toLowerCase()] || ch).join('[^a-z0-9]*');
}

const BANNED_PATTERNS = [
    'fuck', 'fuk', 'fck', 'phuck', 'fock',
    'shit', 'sht',
    'bitch', 'bytch', 'biatch', 'btch',
    'ass', 'arse',
    'cunt', 'kunt',
    'dick', 'dik',
    'cock', 'cok',
    'pussy', 'pussi',
    'nigger', 'nigga', 'nig',
    'whore', 'hore',
    'slut',
    'porn', 'pr0n',
    'sex',
    'rape',
    'nazi',
    'faggot', 'fag',
    'bastard', 'basterd',
    'retard',
    'pedo',
    'nude',
    'penis',
    'vagina',
    'anal',
    'cum',
    'piss',
    'anus',
    'homo',
    'kill',
    'idiot',
    'moron',
    'dildo',
    'sperm',
    'horny',
    'boobs',
    'tits',
    'clit',
    'jizz',
    'milf',
    'wank',
    'twat',
    'skank',
    'pidor', 'pidar', 'peder', 'pedr',
    'cyka', 'suka',
    'blyad', 'blyd', 'bleat',
    'huy', 'hui',
    'pizda', 'pizd',
    'ebat', 'ebal', 'eblan',
    'zalupa', 'zalup',
    'mudak', 'mudila',
    'manda', 'mandet',
    'xyй', 'xuj', 'xuy',
    'pizdec', 'pizdos',
    'chmo', 'shluha', 'shlyuha',
    'gavno', 'govno',
    'urod', 'daun',
    'debil',
    'huylo', 'huilo',
    'ублюдок', 'ubludok',
    'dolgoyob', 'dolboyob',
    'pizdobol', 'pizdabol'
].map(word => new RegExp(buildPattern(word), 'i'));

function isNicknameAllowed(nick) {
    const cleaned = nick.replace(/\s+/g, '');
    for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(cleaned)) return false;
    }
    return true;
}

function initAccountModal() {
    const modal = document.getElementById('account-modal');
    const closeBtn = document.getElementById('account-modal-close');
    const backdrop = document.getElementById('account-modal-backdrop');
    const avatarBtn = document.getElementById('user-avatar-btn');
    const avatarImg = document.getElementById('account-modal-avatar');
    const nicknameInput = document.getElementById('account-nickname-input');
    const nicknameError = document.getElementById('account-nickname-error');
    const saveBtn = document.getElementById('account-save-btn');
    const logoutBtn = document.getElementById('account-logout-btn');

    if (!modal) return;

    function openModal() {
        const match = document.cookie.match(/auth_user=([^;]+)/);
        if (!match) return;
        try {
            const u = JSON.parse(decodeURIComponent(match[1]));
            if (avatarImg) avatarImg.src = u.avatar || '';
            if (nicknameInput) nicknameInput.value = u.name || '';
        } catch(e) { console.error('Error:', e); }

        // Prevent layout shift when scrollbar disappears
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = scrollbarWidth + 'px';
        }
        document.body.style.overflow = 'hidden';
        modal.classList.add('active');
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        if (nicknameError) nicknameError.classList.add('hidden');
    }

    if (avatarBtn) avatarBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const nick = nicknameInput.value.trim();

            if (!/^[a-zA-Z0-9]{3,24}$/.test(nick)) {
                nicknameError.textContent = translations[currentLang]?.account_nickname_error_format || 'Only English letters and numbers, 3-24 characters.';
                nicknameError.classList.remove('hidden');
                return;
            }

            if (!isNicknameAllowed(nick)) {
                nicknameError.textContent = translations[currentLang]?.account_nickname_error_banned || 'This nickname is not allowed.';
                nicknameError.classList.remove('hidden');
                return;
            }

            nicknameError.classList.add('hidden');
            saveBtn.textContent = translations[currentLang]?.account_saving || 'Saving...';
            saveBtn.disabled = true;

            try {
                const res = await fetch('/api/update-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nick })
                });
                const data = await res.json();

                if (res.status === 409) {
                    nicknameError.textContent = translations[currentLang]?.account_nickname_taken || 'This nickname is already taken.';
                    nicknameError.classList.remove('hidden');
                } else if (data.success) {
                    const match = document.cookie.match(/auth_user=([^;]+)/);
                    if (match) {
                        const u = JSON.parse(decodeURIComponent(match[1]));
                        u.name = nick;
                        document.cookie = 'auth_user=' + encodeURIComponent(JSON.stringify(u)) + '; Path=/; Max-Age=2592000; SameSite=Lax';
                    }
                    const avatarText = document.getElementById('user-avatar-text');
                    if (avatarText) avatarText.textContent = nick.charAt(0).toUpperCase();
                    closeModal();
                } else {
                    nicknameError.textContent = data.error || translations[currentLang]?.account_network_error || 'Network error.';
                    nicknameError.classList.remove('hidden');
                }
            } catch(e) {
                nicknameError.textContent = translations[currentLang]?.account_network_error || 'Network error.';
                nicknameError.classList.remove('hidden');
            }

            saveBtn.textContent = translations[currentLang]?.account_save || 'Save';
            saveBtn.disabled = false;
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            document.cookie = 'auth_user=; Path=/; Max-Age=0';
            window.location.reload();
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });
}

// Экспортируем switchView в глобальную область (нужен для inline onclick в HTML)
window.switchView = switchView;

})();