tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
            },
            colors: {
                vercel: {
                    black: '#000000',
                    dark: '#0A0A0A',
                    border: '#333333',
                    gray: '#888888',
                }
            }
        }
    }
};

// Словарь переводов
const translations = {
    en: {
        lang_menu: "Interface Language",
        main_title: "Welcome to the Datvex prompt LAB.",
        main_desc: "This is a professional, structured repository containing high-quality English-language prompts designed for specialized tasks across multiple AI systems.",
        nav_categories: "Categories",
        nav_models: "Models",
        nav_repo: "Repository",
        search_label: "Search",
        search_placeholder: "Search prompts...",
        ai_search: "AI Search",
        type_label: "Type",
        category_label: "Category",
        sort_label: "Sort by",
        tags_label: "Tags",
        tags_placeholder: "Search tags...",
        filter_all: "All",
        type_text: "Text",
        type_image: "Image",
        type_video: "Video",
        type_audio: "Audio",
        sort_newest: "Newest",
        sort_popular: "Popular",
        sort_oldest: "Oldest",
        all_categories: "All categories"
    },
    ru: {
        lang_menu: "Язык интерфейса",
        main_title: "Добро пожаловать в Datvex prompt LAB.",
        main_desc: "Это профессиональный структурированный репозиторий, содержащий высококачественные промпты, предназначенные для специализированных задач в различных ИИ-системах.",
        nav_categories: "Категории",
        nav_models: "Модели",
        nav_repo: "Репозиторий",
        search_label: "Поиск",
        search_placeholder: "Поиск промптов...",
        ai_search: "AI Поиск",
        type_label: "Тип",
        category_label: "Категория",
        sort_label: "Сортировать по",
        tags_label: "Теги",
        tags_placeholder: "Поиск тегов...",
        filter_all: "Все",
        type_text: "Текст",
        type_image: "Изображение",
        type_video: "Видео",
        type_audio: "Аудио",
        sort_newest: "Новые",
        sort_popular: "Популярные",
        sort_oldest: "Старые",
        all_categories: "Все категории"
    },
    zh: {
        lang_menu: "界面语言",
        main_title: "欢迎来到 Datvex 提示词实验室。",
        main_desc: "这是一个专业、结构化的提示词库，包含适用于多种AI系统的高质量英语提示词。",
        nav_categories: "类别",
        nav_models: "模型",
        nav_repo: "代码库",
        search_label: "搜索",
        search_placeholder: "搜索提示词...",
        ai_search: "AI 搜索",
        type_label: "类型",
        category_label: "类别",
        sort_label: "排序方式",
        tags_label: "标签",
        tags_placeholder: "搜索标签...",
        filter_all: "全部",
        type_text: "文本",
        type_image: "图像",
        type_video: "视频",
        type_audio: "音频",
        sort_newest: "最新",
        sort_popular: "最热",
        sort_oldest: "最旧",
        all_categories: "全部分类"
    },
    es: {
        lang_menu: "Idioma de la interfaz",
        main_title: "Bienvenido a Datvex prompt LAB.",
        main_desc: "Este es un repositorio profesional y estructurado que contiene prompts de alta calidad diseñados para tareas especializadas.",
        nav_categories: "Categorías",
        nav_models: "Modelos",
        nav_repo: "Repositorio",
        search_label: "Buscar",
        search_placeholder: "Buscar prompts...",
        ai_search: "Búsqueda AI",
        type_label: "Tipo",
        category_label: "Categoría",
        sort_label: "Ordenar por",
        tags_label: "Etiquetas",
        tags_placeholder: "Buscar etiquetas...",
        filter_all: "Todos",
        type_text: "Texto",
        type_image: "Imagen",
        type_video: "Video",
        type_audio: "Audio",
        sort_newest: "Más nuevos",
        sort_popular: "Populares",
        sort_oldest: "Más antiguos",
        all_categories: "Todas las categorías"
    },
    de: {
        lang_menu: "Oberflächensprache",
        main_title: "Willkommen im Datvex prompt LAB.",
        main_desc: "Dies ist ein professionelles, strukturiertes Repository mit hochwertigen Prompts für spezialisierte Aufgaben.",
        nav_categories: "Kategorien",
        nav_models: "Modelle",
        nav_repo: "Repository",
        search_label: "Suche",
        search_placeholder: "Prompts suchen...",
        ai_search: "KI-Suche",
        type_label: "Typ",
        category_label: "Kategorie",
        sort_label: "Sortieren nach",
        tags_label: "Tags",
        tags_placeholder: "Tags suchen...",
        filter_all: "Alle",
        type_text: "Text",
        type_image: "Bild",
        type_video: "Video",
        type_audio: "Audio",
        sort_newest: "Neueste",
        sort_popular: "Beliebt",
        sort_oldest: "Älteste",
        all_categories: "Alle Kategorien"
    },
    hi: {
        lang_menu: "इंटरफ़ेस भाषा",
        main_title: "Datvex prompt LAB में आपका स्वागत है।",
        main_desc: "यह एक पेशेवर, संरचित रिपॉजिटरी है जिसमें कई AI सिस्टम में विशेष कार्यों के लिए उच्च-गुणवत्ता वाले अंग्रेजी-भाषा के प्रॉम्ट्स शामिल हैं।",
        nav_categories: "श्रेणियाँ",
        nav_models: "मॉडल",
        nav_repo: "रिपॉजिटरी",
        search_label: "खोजें",
        search_placeholder: "प्रॉम्ट्स खोजें...",
        ai_search: "AI खोज",
        type_label: "प्रकार",
        category_label: "श्रेणी",
        sort_label: "क्रमबद्ध करें",
        tags_label: "टैग",
        tags_placeholder: "टैग खोजें...",
        filter_all: "सभी",
        type_text: "टेक्स्ट",
        type_image: "छवि",
        type_video: "वीडियो",
        type_audio: "ऑडियो",
        sort_newest: "नवीनतम",
        sort_popular: "लोकप्रिय",
        sort_oldest: "सबसे पुराना",
        all_categories: "सभी श्रेणियाँ"
    },
    fr: {
        lang_menu: "Langue de l'interface",
        main_title: "Bienvenue sur Datvex prompt LAB.",
        main_desc: "Il s'agit d'un référentiel structuré et professionnel contenant des prompts de haute qualité conçus pour des tâches spécialisées.",
        nav_categories: "Catégories",
        nav_models: "Modèles",
        nav_repo: "Dépôt",
        search_label: "Recherche",
        search_placeholder: "Rechercher des prompts...",
        ai_search: "Recherche IA",
        type_label: "Type",
        category_label: "Catégorie",
        sort_label: "Trier par",
        tags_label: "Balises",
        tags_placeholder: "Rechercher des balises...",
        filter_all: "Tout",
        type_text: "Texte",
        type_image: "Image",
        type_video: "Vidéo",
        type_audio: "Audio",
        sort_newest: "Le plus récent",
        sort_popular: "Populaire",
        sort_oldest: "Le plus ancien",
        all_categories: "Toutes les catégories"
    },
    it: {
        lang_menu: "Lingua dell'interfaccia",
        main_title: "Benvenuti nel Datvex prompt LAB.",
        main_desc: "Questo è un repository professionale e strutturato contenente prompt di alta qualità progettati per attività specializzate.",
        nav_categories: "Categorie",
        nav_models: "Modelli",
        nav_repo: "Repository",
        search_label: "Cerca",
        search_placeholder: "Cerca prompt...",
        ai_search: "Ricerca IA",
        type_label: "Tipo",
        category_label: "Categoria",
        sort_label: "Ordina per",
        tags_label: "Tag",
        tags_placeholder: "Cerca tag...",
        filter_all: "Tutti",
        type_text: "Testo",
        type_image: "Immagine",
        type_video: "Video",
        type_audio: "Audio",
        sort_newest: "Più recenti",
        sort_popular: "Popolari",
        sort_oldest: "Più vecchi",
        all_categories: "Tutte le categorie"
    },
    pt: {
        lang_menu: "Idioma da interface",
        main_title: "Bem-vindo ao Datvex prompt LAB.",
        main_desc: "Este é um repositório profissional e estruturado contendo prompts de alta qualidade desenvolvidos para tarefas especializadas.",
        nav_categories: "Categorias",
        nav_models: "Modelos",
        nav_repo: "Repositório",
        search_label: "Buscar",
        search_placeholder: "Buscar prompts...",
        ai_search: "Busca com IA",
        type_label: "Tipo",
        category_label: "Categoria",
        sort_label: "Ordenar por",
        tags_label: "Tags",
        tags_placeholder: "Buscar tags...",
        filter_all: "Todos",
        type_text: "Texto",
        type_image: "Imagem",
        type_video: "Vídeo",
        type_audio: "Áudio",
        sort_newest: "Mais recentes",
        sort_popular: "Populares",
        sort_oldest: "Mais antigos",
        all_categories: "Todas as categorias"
    },
    ja: {
        lang_menu: "インターフェース言語",
        main_title: "Datvex prompt LAB へようこそ。",
        main_desc: "これは、複数のAIシステムにおける専門的なタスク向けに設計された、高品質なプロンプトを含むプロフェッショナルで構造化されたリポジトリです。",
        nav_categories: "カテゴリー",
        nav_models: "モデル",
        nav_repo: "リポジトリ",
        search_label: "検索",
        search_placeholder: "プロンプトを検索...",
        ai_search: "AI検索",
        type_label: "タイプ",
        category_label: "カテゴリー",
        sort_label: "並べ替え",
        tags_label: "タグ",
        tags_placeholder: "タグを検索...",
        filter_all: "すべて",
        type_text: "テキスト",
        type_image: "画像",
        type_video: "動画",
        type_audio: "音声",
        sort_newest: "新着順",
        sort_popular: "人気順",
        sort_oldest: "古い順",
        all_categories: "すべてのカテゴリ"
    },
    ko: {
        lang_menu: "인터페이스 언어",
        main_title: "Datvex prompt LAB에 오신 것을 환영합니다.",
        main_desc: "이곳은 다양한 AI 시스템에서 전문적인 작업을 수행하도록 설계된 고품질 프롬프트를 포함하는 전문적이고 체계적인 저장소입니다.",
        nav_categories: "카테고리",
        nav_models: "모델",
        nav_repo: "저장소",
        search_label: "검색",
        search_placeholder: "프롬프트 검색...",
        ai_search: "AI 검색",
        type_label: "유형",
        category_label: "카테고리",
        sort_label: "정렬 기준",
        tags_label: "태그",
        tags_placeholder: "태그 검색...",
        filter_all: "전체",
        type_text: "텍스트",
        type_image: "이미지",
        type_video: "비디오",
        type_audio: "오디오",
        sort_newest: "최신순",
        sort_popular: "인기순",
        sort_oldest: "오래된순",
        all_categories: "모든 카테고리"
    }
};

let currentLang = localStorage.getItem('appLang') || 'ru';

function setLanguage(lang, animate = true) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('appLang', lang);

    // Меняем стили активной кнопки в выпадающем меню (без анимации)
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.className = 'lang-btn w-full text-left px-3 py-2 text-[13px] text-white bg-[#111] rounded-md transition-colors';
        } else {
            btn.className = 'lang-btn w-full text-left px-3 py-2 text-[13px] text-[#EDEDED] rounded-md hover:bg-[#111] hover:text-white transition-colors';
        }
    });

    // Функция, которая непосредственно заменяет текст
    const updateTexts = () => {
        const indicator = document.getElementById('current-lang-indicator');
        if (indicator) indicator.textContent = lang.toUpperCase();

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang][key]) {
                if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                    el.placeholder = translations[lang][key];
                } else {
                    const icon = el.querySelector('i');
                    if (icon) {
                        el.innerHTML = '';
                        el.appendChild(icon);
                        el.appendChild(document.createTextNode(' ' + translations[lang][key]));
                    } else {
                        el.textContent = translations[lang][key];
                    }
                }
            }
        });

        document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
            const activeItem = dropdown.querySelector('.dropdown-item.active');
            const selectedText = dropdown.querySelector('.dropdown-selected');
            if (activeItem && selectedText) {
                selectedText.textContent = activeItem.textContent;
            }
        });
    };

    if (animate) {
        // Собираем все элементы, где будет меняться текст
        const elementsToAnimate = [
            document.getElementById('current-lang-indicator'),
            ...document.querySelectorAll('[data-i18n]'),
            ...Array.from(document.querySelectorAll('.custom-dropdown .dropdown-selected'))
        ].filter(Boolean);

        // 1. Плавно скрываем текст (opacity 0)
        elementsToAnimate.forEach(el => {
            el.style.transition = 'opacity 0.15s ease-in-out';
            el.style.opacity = '0';
        });

        // 2. Ждем 150мс, меняем текст и плавно показываем обратно (opacity 1)
        setTimeout(() => {
            updateTexts();
            elementsToAnimate.forEach(el => el.style.opacity = '1');
            
            // 3. Убираем inline-стили после завершения анимации, чтобы не ломать hover-эффекты
            setTimeout(() => {
                elementsToAnimate.forEach(el => {
                    el.style.transition = '';
                    el.style.opacity = '';
                });
            }, 150);
        }, 150);
    } else {
        // Если анимация не нужна (при первой загрузке страницы), просто меняем текст
        updateTexts();
    }
}

// Инициализация языка при загрузке
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initCustomDropdowns();
    loadCategories();
    setupHorizontalScroll();
    initTags();
    // При первой загрузке меняем язык без анимации (false)
    setLanguage(currentLang, false);
    
    // Обработчики для кнопок выбора языка
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = btn.getAttribute('data-lang');
            // Если выбран тот же язык, ничего не делаем
            if (lang !== currentLang) {
                // При клике меняем язык с анимацией (true)
                setLanguage(lang, true);
            }
        });
    });
});

function initCustomDropdowns() {
    const dropdowns = document.querySelectorAll('.custom-dropdown');
    
    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const selectedText = dropdown.querySelector('.dropdown-selected');
        const items = dropdown.querySelectorAll('.dropdown-item');

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = dropdown.classList.contains('open');
            document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
            if (!isOpen) dropdown.classList.add('open');
        });

        setupDropdownItems(dropdown, items, selectedText);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
        }
    });
}

function setupDropdownItems(dropdown, items, selectedText) {
    items.forEach(item => {
        item.addEventListener('click', () => {
            dropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            selectedText.textContent = item.textContent;
            dropdown.classList.remove('open');
        });
    });
}

async function loadCategories() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/Datvex/Datvex-prompt-LAB/main/data/categories.json');
        if (!response.ok) throw new Error('Network error');
        
        const data = await response.json();
        const categoryList = document.getElementById('category-list');
        const dropdown = document.getElementById('dropdown-category');
        const selectedText = dropdown.querySelector('.dropdown-selected');

        // Получаем правильный перевод для слова "Все" на текущем языке
        const translatedAll = translations[currentLang]?.filter_all || "Все";

        // Добавили data-i18n="filter_all" и переменную translatedAll
        categoryList.innerHTML = `<li data-i18n="filter_all" class="dropdown-item active px-3 py-2 cursor-pointer transition-colors duration-150" data-value="all">${translatedAll}</li>`;

        data.forEach(groupData => {
            categoryList.innerHTML += `<li class="px-3 pt-3 pb-1 text-[#666] font-semibold text-[10px] uppercase tracking-wider select-none">${groupData.group}</li>`;
            
            groupData.items.forEach(item => {
                categoryList.innerHTML += `<li class="dropdown-item px-3 py-2 hover:bg-[#111] cursor-pointer transition-colors duration-150" data-value="${item.id}">${item.name}</li>`;
            });
        });

        const newItems = categoryList.querySelectorAll('.dropdown-item');
        setupDropdownItems(dropdown, newItems, selectedText);

        // Сразу обновляем текст кнопки выпадающего списка
        selectedText.textContent = translatedAll;

    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

function setupHorizontalScroll() {
    const scrollContainer = document.getElementById('category-scroll');
    const gradLeft = document.getElementById('grad-left');
    const gradRight = document.getElementById('grad-right');
    
    if (!scrollContainer) return;

    scrollContainer.addEventListener('wheel', (evt) => {
        evt.preventDefault();
        // Добавлено плавное поведение (smooth) для прокрутки
        scrollContainer.scrollBy({
            left: evt.deltaY * 2,
            behavior: 'smooth'
        });
    });

    const handleScroll = () => {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
        
        if (scrollLeft > 5) {
            gradLeft.style.opacity = '1';
        } else {
            gradLeft.style.opacity = '0';
        }

        if (Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 5) {
            gradRight.style.opacity = '0';
        } else {
            gradRight.style.opacity = '1';
        }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    setTimeout(handleScroll, 100); 
}

function initTags() {
    const tags = document.querySelectorAll('.tag-btn');
    
    tags.forEach(tag => {
        // Вычисляем и сохраняем исходный цвет кнопки в CSS-переменную
        const color = window.getComputedStyle(tag).color;
        tag.style.setProperty('--base-color', color);

        tag.addEventListener('click', () => {
            tag.classList.toggle('tag-active');
        });
    });
}
