(() => {
  'use strict';

  const CONTENT = window.QS_CONTENT;
  const LABS = window.QS_LABS || [];
  const itemsById = new Map(CONTENT.items.map(item => [item.id, item]));
  const lessonsById = new Map(CONTENT.lessons.map(item => [item.id, item]));

  const STORAGE = {
    theme: 'quant-stats-site.theme.v1',
    completed: 'quant-stats-site.completed.v1',
    notes: 'quant-stats-site.notes.v1',
    labs: 'quant-stats-site.labs.v1',
    lastRoute: 'quant-stats-site.last-route.v1',
  };

  const moduleDescriptions = {
    '课前预备知识': '把初中数学中的比例、代数、函数、平方、指数、求和与概率语言，接到统计公式和量化研究。',
    '基础与收益分布': '从收益率、均值、波动率、相关性和厚尾入手，建立金融数据的统计直觉。',
    '抽样与统计推断': '理解样本误差、标准误、置信区间、假设检验和统计功效。',
    '回归与因子处理': '掌握 OLS、控制变量、稳健标准误、残差化和因子中性化。',
    '时间序列': '识别平稳性、自相关、长期方差、有效样本量与信号衰减。',
    '重采样与研究偏差': '用 Bootstrap、Block Bootstrap、多重检验和研究治理控制误判。',
    '因子研究': '完整评估 IC、Rank IC、ICIR、分层收益、衰减和 Fama–MacBeth。',
    '回测与机器学习': '建立样本外验证、过拟合审计、Purging、Embargo 与模型治理。',
  };

  function lessonCode(item) {
    return item?.id === 'p00' ? 'P00' : `L${String(item?.order ?? 0).padStart(2, '0')}`;
  }

  function moduleCode(module) {
    return module?.name === '课前预备知识' ? 'PREP' : String(module?.order ?? 0).padStart(2, '0');
  }

  function moduleRangeLabel(module) {
    return module?.name === '课前预备知识' ? 'P00' : `L${String(module.start).padStart(2, '0')}–L${String(module.end).padStart(2, '0')}`;
  }

  const escapeHTML = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }

  function readJSON(key, fallback) {
    try {
      const raw = storageGet(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  const state = {
    completed: new Set(readJSON(STORAGE.completed, [])),
    notes: readJSON(STORAGE.notes, {}),
    labsViewed: new Set(readJSON(STORAGE.labs, [])),
    searchResults: [],
    searchIndex: -1,
    toastTimer: null,
  };

  function persist() {
    storageSet(STORAGE.completed, JSON.stringify([...state.completed]));
    storageSet(STORAGE.notes, JSON.stringify(state.notes));
    storageSet(STORAGE.labs, JSON.stringify([...state.labsViewed]));
  }

  function icon(name) {
    const icons = {
      home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9 20v-6h6v6"/>',
      book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5a2.5 2.5 0 0 1 2.5 2.5z"/>',
      flask: '<path d="M9 3h6"/><path d="M10 3v6l-5.5 9.2A1.8 1.8 0 0 0 6 21h12a1.8 1.8 0 0 0 1.5-2.8L14 9V3"/><path d="M7.5 15h9"/>',
      project: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/>',
      formula: '<path d="M6 4h12M6 20h12"/><path d="m8 8 3.5 4L8 16M16 8l-3.5 4L16 16"/>',
      progress: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
      folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>',
      moon: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/>',
      print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      arrow: '<path d="m9 18 6-6-6-6"/>',
      download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
      upload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
  }

  function routeForItem(item) {
    if (!item) return '#/home';
    if (item.kind === 'lesson') return `#/lesson/${item.id}`;
    if (item.kind === 'project') return `#/project/${item.id}`;
    return `#/content/${item.id}`;
  }

  function parseRoute() {
    const raw = (location.hash || '#/home').replace(/^#\/?/, '');
    const [pathPart, queryPart = ''] = raw.split('?');
    const parts = pathPart.split('/').filter(Boolean);
    const query = new URLSearchParams(queryPart);
    return { raw, page: parts[0] || 'home', id: parts[1] || '', query };
  }

  function progressStats() {
    const total = CONTENT.lessons.length;
    const complete = CONTENT.lessons.filter(l => state.completed.has(l.id)).length;
    return { total, complete, pct: total ? Math.round(complete / total * 100) : 0 };
  }

  function firstIncompleteLesson() {
    return CONTENT.lessons.find(l => !state.completed.has(l.id)) || CONTENT.lessons[0];
  }

  function buildShell() {
    document.body.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar" id="sidebar" aria-label="主导航">
          <a class="sidebar-brand" href="#/home">
            <span class="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none"><path d="M8 30 15.5 10l6.2 13.1L26.5 13 33 30" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 30h28" stroke="currentColor" stroke-width="1.4" opacity=".55"/><circle cx="15.5" cy="10" r="2.2" fill="currentColor"/><circle cx="21.7" cy="23.1" r="2.2" fill="currentColor"/><circle cx="26.5" cy="13" r="2.2" fill="currentColor"/></svg>
            </span>
            <span class="brand-copy"><strong>量化统计学</strong><span>Interactive Lab</span></span>
          </a>
          <div class="sidebar-search">
            <button class="search-trigger" id="sidebar-search" type="button">${icon('search')}<span>搜索课程与实验</span><kbd>⌘ K</kbd></button>
          </div>
          <nav class="sidebar-nav" id="sidebar-nav"></nav>
          <footer class="sidebar-footer">
            <div class="sidebar-progress-head"><span>学习进度</span><strong id="sidebar-progress-label">0 / ${CONTENT.lessons.length}</strong></div>
            <div class="sidebar-progress-track"><div class="sidebar-progress-bar" id="sidebar-progress-bar"></div></div>
            <a href="#/progress">查看学习记录与本地笔记</a>
          </footer>
        </aside>
        <div class="mobile-backdrop" id="mobile-backdrop" aria-hidden="true"></div>
        <div class="main-shell">
          <header class="topbar">
            <button class="icon-button mobile-menu-button" id="mobile-menu" type="button" aria-label="打开导航">${icon('menu')}</button>
            <div class="topbar-title"><span id="topbar-section">量化统计学交互学习系统</span><strong id="topbar-title">首页</strong></div>
            <div class="topbar-actions">
              <button class="icon-button" id="top-search" type="button" aria-label="搜索">${icon('search')}</button>
              <button class="icon-button" id="theme-toggle" type="button" aria-label="切换主题"></button>
              <button class="icon-button" id="print-page" type="button" aria-label="打印当前页面">${icon('print')}</button>
            </div>
          </header>
          <div class="reading-progress" aria-hidden="true"><div id="reading-progress-bar"></div></div>
          <main class="content-view" id="content-view" tabindex="-1"></main>
        </div>
      </div>
      <div class="modal-backdrop" id="search-backdrop" role="dialog" aria-modal="true" aria-label="搜索课程">
        <div class="search-modal">
          <div class="search-box">${icon('search')}<input id="search-input" type="search" autocomplete="off" placeholder="输入概念、公式、课程或实验名称…"><button id="search-close" type="button">Esc</button></div>
          <div class="search-results" id="search-results"></div>
        </div>
      </div>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
  }

  function navLink(href, iconName, label, extra = '') {
    return `<a class="nav-link" href="${href}" data-route="${href.slice(2).split('/')[0]}"><span class="nav-icon">${icon(iconName)}</span><span class="nav-title">${label}</span>${extra}</a>`;
  }

  function renderSidebar() {
    const nav = document.querySelector('#sidebar-nav');
    nav.innerHTML = `
      <section class="nav-section">
        <div class="nav-section-title">学习系统</div>
        ${navLink('#/home', 'home', '首页')}
        ${navLink('#/lessons', 'book', '课前预备 + 30 课')}
        ${navLink('#/labs', 'flask', `${LABS.length} 个交互实验`)}
        ${navLink('#/projects', 'project', '6 个综合项目')}
        ${navLink('#/formula', 'formula', '公式速查')}
        ${navLink('#/progress', 'progress', '学习进度')}
        ${navLink('#/resources', 'folder', '研究资源')}
      </section>
      ${CONTENT.modules.map(module => {
        const lessons = module.lessonIds.map(id => lessonsById.get(id)).filter(Boolean);
        return `<section class="nav-section">
          <div class="nav-section-title"><span>${module.name === '课前预备知识' ? '课前预备' : `模块 ${moduleCode(module)}`}</span><span>${moduleRangeLabel(module)}</span></div>
          ${lessons.map(item => `<a class="nav-link ${state.completed.has(item.id) ? 'completed' : ''}" href="#/lesson/${item.id}" data-item-id="${item.id}"><span class="lesson-no">${lessonCode(item)}</span><span class="nav-title">${escapeHTML(item.title)}</span><span class="done-dot" aria-label="已完成"></span></a>`).join('')}
        </section>`;
      }).join('')}`;
    updateSidebarProgress();
    setActiveNavigation();
  }

  function updateSidebarProgress() {
    const stats = progressStats();
    const label = document.querySelector('#sidebar-progress-label');
    const bar = document.querySelector('#sidebar-progress-bar');
    if (label) label.textContent = `${stats.complete} / ${stats.total}`;
    if (bar) bar.style.width = `${stats.pct}%`;
    document.querySelectorAll('.nav-link[data-item-id]').forEach(el => {
      el.classList.toggle('completed', state.completed.has(el.dataset.itemId));
    });
  }

  function setActiveNavigation() {
    const route = parseRoute();
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    let selector = '';
    if (route.page === 'lesson') selector = `.nav-link[data-item-id="${CSS.escape(route.id)}"]`;
    else selector = `.nav-link[href="#/${CSS.escape(route.page)}"]`;
    document.querySelector(selector)?.classList.add('active');
  }

  function setTopbar(section, title) {
    document.querySelector('#topbar-section').textContent = section;
    document.querySelector('#topbar-title').textContent = title;
    document.title = `${title} · 量化统计学交互学习系统`;
  }

  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
  }

  function showToast(message) {
    const toast = document.querySelector('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function nextLessonRoute() {
    const next = firstIncompleteLesson();
    return next ? `#/lesson/${next.id}` : '#/lessons';
  }

  function moduleProgress(module) {
    const ids = module.lessonIds;
    const done = ids.filter(id => state.completed.has(id)).length;
    return { done, total: ids.length, pct: ids.length ? Math.round(done / ids.length * 100) : 0 };
  }

  function renderHome() {
    const stats = progressStats();
    const next = firstIncompleteLesson();
    const labPreview = LABS.slice(0, 8);
    const content = document.querySelector('#content-view');
    content.innerHTML = `<div class="page home-page">
      <section class="hero">
        <div class="hero-copy">
          <span class="hero-kicker">Quantitative Statistics · Offline</span>
          <h1>把统计学变成<em>可操作的量化研究工具</em></h1>
          <p>完整收录 1 个课前数学衔接章、30 课核心课程、${LABS.length} 个交互实验和 6 个综合项目。先把初中数学接到统计符号，再把公式放回因子研究、回测与机器学习场景中验证。</p>
          <div class="hero-actions">
            <a class="button" href="${nextLessonRoute()}">${stats.complete ? '继续下一单元' : (next?.id === 'p00' ? '从课前预备开始' : '从第 01 课开始')}</a>
            <a class="button ghost" href="#/labs">进入交互实验室</a>
          </div>
        </div>
        <div class="hero-side">
          <div class="hero-stat-grid">
            <div class="hero-stat"><strong>1 + 30</strong><span>预备章 + 系统课</span></div>
            <div class="hero-stat"><strong>${LABS.length}</strong><span>动态实验</span></div>
            <div class="hero-stat"><strong>6</strong><span>综合项目</span></div>
            <div class="hero-stat"><strong>100%</strong><span>离线计算</span></div>
          </div>
          <div class="hero-progress"><div class="hero-progress-head"><span>当前学习进度</span><strong>${stats.pct}% · ${stats.complete}/${stats.total}</strong></div><div class="hero-progress-track"><div style="width:${stats.pct}%"></div></div></div>
        </div>
      </section>

      <div class="section-heading"><div><h2>八个学习模块</h2><p>先完成数学衔接，再从分布直觉逐步推进到因子验证与回测治理。</p></div><a href="#/lessons">查看全部课程 →</a></div>
      <section class="module-grid">
        ${CONTENT.modules.map(module => {
          const p = moduleProgress(module);
          return `<a class="module-card" href="#/lessons?module=${encodeURIComponent(module.name)}">
            <span class="module-no">${moduleCode(module)}</span>
            <h3>${escapeHTML(module.name)}</h3>
            <p>${escapeHTML(moduleDescriptions[module.name] || '')}</p>
            <div class="module-card-foot"><span>${moduleRangeLabel(module)} · ${p.done}/${p.total}</span><span class="mini-progress"><span style="display:block;height:100%;width:${p.pct}%;background:var(--accent);border-radius:inherit"></span></span></div>
          </a>`;
        }).join('')}
      </section>

      <div class="section-heading"><div><h2>交互实验室</h2><p>所有模拟在浏览器本机运行；参数变化会即时重算。</p></div><a href="#/labs">全部 ${LABS.length} 个实验 →</a></div>
      <section class="lab-preview-grid">${labPreview.map(labCard).join('')}</section>

      <div class="section-heading"><div><h2>研究判断原则</h2><p>每次看到“高收益、高 IC、高 Sharpe”时先执行四项审问。</p></div></div>
      <section class="principle-strip">
        <div class="principle"><strong>估计不确定性</strong><span>点估计之外，标准误和区间是多少？</span></div>
        <div class="principle"><strong>依赖结构</strong><span>数据是否 IID？自相关是否压低了标准误？</span></div>
        <div class="principle"><strong>选择过程</strong><span>测试过多少候选？当前结果是否只是赢家？</span></div>
        <div class="principle"><strong>经济可交易性</strong><span>成本、换手、容量和样本外表现是否成立？</span></div>
      </section>
    </div>`;
    setTopbar('课程总览', '首页');
  }

  function lessonCard(item) {
    const complete = state.completed.has(item.id);
    return `<a class="catalog-card" href="#/lesson/${item.id}" data-module-card="${escapeHTML(item.module)}">
      <span class="eyebrow">${lessonCode(item)} · ${escapeHTML(item.module)}</span>
      <h2>${escapeHTML(item.title)}</h2>
      <p>${escapeHTML(item.description.slice(0, 150))}</p>
      <div class="card-foot"><span>${complete ? '✓ 已完成' : (item.difficulty || '系统课程')}</span><span class="go">开始学习 →</span></div>
    </a>`;
  }

  function labCard(lab) {
    return `<a class="lab-card" href="#/lab/${lab.id}" data-module-card="${escapeHTML(lab.module)}">
      <div class="lab-card-top"><span class="lab-number">LAB ${lab.no}</span><span class="lab-level">${escapeHTML(lab.level)}</span></div>
      <h3>${escapeHTML(lab.title)}</h3><p>${escapeHTML(lab.summary)}</p><span class="lab-card-arrow">运行实验 →</span>
    </a>`;
  }

  function filterCatalog(buttons, cards, initial = '全部') {
    let active = initial;
    const apply = value => {
      active = value;
      buttons.forEach(b => b.classList.toggle('active', b.dataset.filter === value));
      cards.forEach(card => {
        card.hidden = value !== '全部' && card.dataset.moduleCard !== value;
      });
    };
    buttons.forEach(button => button.addEventListener('click', () => apply(button.dataset.filter)));
    apply(active);
  }

  function renderLessons(route) {
    const content = document.querySelector('#content-view');
    const modules = ['全部', ...CONTENT.modules.map(x => x.name)];
    content.innerHTML = `<div class="page">
      <header class="page-header"><div><span class="eyebrow">Structured Curriculum</span><h1>课前预备 + 30 课量化统计学课程</h1><p>先用 P00 把初中数学接到统计符号，再按顺序建立完整推理链。每个单元均包含公式、量化场景、Python 示例、陷阱、练习和验收标准。</p></div><a class="button" href="${nextLessonRoute()}">继续学习</a></header>
      <div class="catalog-filter">${modules.map((m, i) => `<button class="filter-chip ${i === 0 ? 'active' : ''}" type="button" data-filter="${escapeHTML(m)}">${escapeHTML(m)}</button>`).join('')}</div>
      <section class="catalog-grid">${CONTENT.lessons.map(lessonCard).join('')}</section>
    </div>`;
    const initial = decodeURIComponent(route.query.get('module') || '全部');
    filterCatalog([...content.querySelectorAll('[data-filter]')], [...content.querySelectorAll('[data-module-card]')], modules.includes(initial) ? initial : '全部');
    setTopbar('课程', '课前预备与 30 课目录');
  }

  function renderLabs(route) {
    const content = document.querySelector('#content-view');
    const modules = ['全部', ...new Set(LABS.map(x => x.module))];
    content.innerHTML = `<div class="page">
      <header class="page-header"><div><span class="eyebrow">Interactive Laboratory</span><h1>${LABS.length} 个动态数学与统计实验</h1><p>无需安装 Python。先用四个预备实验掌握百分数、斜率、指数对数和标准差，再观察分布、推断、回归、Bootstrap、因子检验和回测过拟合。所有数据都留在本机。</p></div><a class="button secondary" href="#/lab/${LABS[0].id}">运行第一个实验</a></header>
      <div class="catalog-filter">${modules.map((m, i) => `<button class="filter-chip ${i === 0 ? 'active' : ''}" type="button" data-filter="${escapeHTML(m)}">${escapeHTML(m)}</button>`).join('')}</div>
      <section class="catalog-grid">${LABS.map(lab => `<a class="catalog-card" href="#/lab/${lab.id}" data-module-card="${escapeHTML(lab.module)}"><span class="eyebrow">LAB ${lab.no} · ${escapeHTML(lab.module)} · ${escapeHTML(lab.level)}</span><h2>${escapeHTML(lab.title)}</h2><p>${escapeHTML(lab.summary)}</p><div class="card-foot"><span>${lab.lessons.length} 个关联课程</span><span class="go">运行实验 →</span></div></a>`).join('')}</section>
    </div>`;
    const initial = decodeURIComponent(route.query.get('module') || '全部');
    filterCatalog([...content.querySelectorAll('[data-filter]')], [...content.querySelectorAll('[data-module-card]')], modules.includes(initial) ? initial : '全部');
    setTopbar('实验室', `${LABS.length} 个交互实验`);
  }

  function renderProjects() {
    const content = document.querySelector('#content-view');
    content.innerHTML = `<div class="page"><header class="page-header"><div><span class="eyebrow">Capstone Projects</span><h1>6 个综合实战项目</h1><p>每个项目都把多节课程串联为一条完整研究流程，从数据审计、推断、中性化、因子研究，推进到回测过拟合和机器学习验证。</p></div></header>
      <section class="catalog-grid" style="margin-top:24px">${CONTENT.projects.map(item => `<a class="catalog-card" href="#/project/${item.id}"><span class="eyebrow">P${String(item.order).padStart(2, '0')} · 综合项目</span><h2>${escapeHTML(item.title)}</h2><p>${escapeHTML(item.description.slice(0, 170))}</p><div class="card-foot"><span>研究交付物与验收标准</span><span class="go">查看项目 →</span></div></a>`).join('')}</section>
    </div>`;
    setTopbar('综合项目', '六个项目');
  }

  function renderResources() {
    const content = document.querySelector('#content-view');
    const resources = CONTENT.resources.filter(x => !['course-home', 'formula-sheet', 'progress-source'].includes(x.id));
    content.innerHTML = `<div class="page"><header class="page-header"><div><span class="eyebrow">Research Resources</span><h1>学习指南、清单与研究模板</h1><p>这些页面用于建立研究登记、实验留痕、统计审计和模型治理，而不是只保存“最好看”的结果。</p></div><a class="button secondary" href="#/formula">打开公式速查</a></header>
      <section class="catalog-grid" style="margin-top:24px">${resources.map(item => `<a class="catalog-card" href="${routeForItem(item)}"><span class="eyebrow">${escapeHTML(item.module)} · ${item.kind === 'template' ? '模板' : '指南'}</span><h2>${escapeHTML(item.title)}</h2><p>${escapeHTML(item.description.slice(0, 165))}</p><div class="card-foot"><span>${item.tags?.slice(0, 2).map(escapeHTML).join(' · ') || '本地资源'}</span><span class="go">打开 →</span></div></a>`).join('')}</section>
    </div>`;
    setTopbar('研究资源', '指南与模板');
  }

  function documentSequence(item) {
    if (item.kind === 'lesson') return CONTENT.lessons;
    if (item.kind === 'project') return CONTENT.projects;
    return CONTENT.resources;
  }

  function relatedLabs(item) {
    return LABS.filter(lab => lab.lessons.includes(item.id));
  }

  function renderDocument(item, route) {
    if (!item) return renderNotFound();
    const seq = documentSequence(item);
    const index = seq.findIndex(x => x.id === item.id);
    const prev = index > 0 ? seq[index - 1] : null;
    const next = index >= 0 && index < seq.length - 1 ? seq[index + 1] : null;
    const isLesson = item.kind === 'lesson';
    const isDone = state.completed.has(item.id);
    const labs = relatedLabs(item);
    const noteValue = state.notes[item.id] || '';
    const content = document.querySelector('#content-view');
    content.innerHTML = `<article class="document-page">
      <div class="crumbs"><a href="#/home">首页</a><span>/</span><a href="${isLesson ? '#/lessons' : item.kind === 'project' ? '#/projects' : '#/resources'}">${isLesson ? '课程' : item.kind === 'project' ? '综合项目' : '研究资源'}</a><span>/</span><span>${escapeHTML(isLesson ? lessonCode(item) : item.id.toUpperCase())}</span></div>
      <div class="document-layout">
        <main class="document-main">
          <header class="document-header">
            <span class="eyebrow">${isLesson ? `${lessonCode(item)} · ${escapeHTML(item.module)}` : item.kind === 'project' ? `P${String(item.order).padStart(2, '0')} · 综合项目` : escapeHTML(item.module)}</span>
            <h1>${escapeHTML(item.title)}</h1>
            <p>${isLesson ? '概念、公式、量化应用、实现与统计边界的一体化学习单元。' : '保留自 Obsidian 课程包的完整内容，并支持本地笔记与打印。'}</p>
            <div class="document-meta">
              ${item.difficulty ? `<span class="meta-pill accent">难度：${escapeHTML(item.difficulty)}</span>` : ''}
              ${Array.isArray(item.prerequisites) && item.prerequisites.length ? `<span class="meta-pill">前置：${escapeHTML(item.prerequisites.join('、'))}</span>` : ''}
              ${labs.length ? `<span class="meta-pill">关联实验：${labs.length}</span>` : ''}
              <span class="meta-pill">离线内容</span>
            </div>
            <div class="document-actions">
              ${isLesson ? `<button class="button ${isDone ? 'secondary' : ''}" id="toggle-complete" type="button">${icon('check')}${isDone ? '已完成，点击取消' : '标记本课已完成'}</button>` : ''}
              ${labs.map(lab => `<a class="button secondary" href="#/lab/${lab.id}">运行 LAB ${lab.no}</a>`).join('')}
              <button class="button ghost" type="button" id="doc-print">${icon('print')}打印/存为 PDF</button>
            </div>
          </header>
          <section class="article-body" id="article-body">${item.html}</section>
          <nav class="document-pager" aria-label="上一页与下一页">
            ${prev ? `<a class="pager-link" href="${routeForItem(prev)}"><span>上一页</span><strong>← ${escapeHTML(prev.title)}</strong></a>` : '<span></span>'}
            ${next ? `<a class="pager-link next" href="${routeForItem(next)}"><span>下一页</span><strong>${escapeHTML(next.title)} →</strong></a>` : '<span></span>'}
          </nav>
        </main>
        <aside class="document-sidebar">
          <div class="toc-card"><h2>本页目录</h2><nav class="toc-list">${item.toc.length ? item.toc.map(t => `<a class="toc-link ${t.level === 'h3' ? 'sub' : ''}" href="#${t.id}" data-toc-link="${t.id}">${escapeHTML(t.text)}</a>`).join('') : '<span class="notes-status">本页没有二级标题。</span>'}</nav></div>
          <div class="notes-card"><h2>本地学习笔记</h2><textarea id="local-note" placeholder="记录理解、疑问、实验结果或下一步行动……">${escapeHTML(noteValue)}</textarea><div class="notes-status" id="notes-status">自动保存在当前浏览器，不上传网络。</div></div>
        </aside>
      </div>
    </article>`;

    if (isLesson) {
      content.querySelector('#toggle-complete')?.addEventListener('click', () => {
        if (state.completed.has(item.id)) state.completed.delete(item.id); else state.completed.add(item.id);
        persist();
        renderSidebar();
        renderDocument(item, route);
        showToast(state.completed.has(item.id) ? '本课已标记为完成。' : '已取消完成标记。');
      });
    }
    content.querySelector('#doc-print')?.addEventListener('click', () => window.print());
    const note = content.querySelector('#local-note');
    let noteTimer = null;
    note?.addEventListener('input', () => {
      const status = content.querySelector('#notes-status');
      if (status) status.textContent = '正在保存…';
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => {
        state.notes[item.id] = note.value;
        persist();
        if (status) status.textContent = `已保存于 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
      }, 350);
    });
    content.querySelectorAll('[data-toc-link]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      document.getElementById(link.dataset.tocLink)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    enhanceArticle(content.querySelector('#article-body'));
    setTopbar(item.module, item.title);

    const section = route.query.get('section');
    if (section) {
      const target = item.toc.find(t => t.text === decodeURIComponent(section) || t.id === section);
      setTimeout(() => document.getElementById(target?.id || section)?.scrollIntoView({ block: 'start' }), 50);
    }
  }

  function enhanceArticle(root) {
    if (!root) return;
    if (window.Prism?.highlightAllUnder) window.Prism.highlightAllUnder(root);
    root.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.code-copy')) return;
      const button = document.createElement('button');
      button.className = 'code-copy';
      button.type = 'button';
      button.textContent = '复制';
      button.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.textContent || pre.textContent || '';
        try {
          await navigator.clipboard.writeText(code);
          button.textContent = '已复制';
        } catch (_) {
          const area = document.createElement('textarea');
          area.value = code;
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
          button.textContent = '已复制';
        }
        setTimeout(() => { button.textContent = '复制'; }, 1300);
      });
      pre.appendChild(button);
    });
  }

  function renderLab(id) {
    const content = document.querySelector('#content-view');
    content.innerHTML = '<div id="active-lab"></div>';
    const meta = window.QSDemos.render(id || 'returns', content.querySelector('#active-lab'));
    state.labsViewed.add(meta.id);
    persist();
    setTopbar(`交互实验 · LAB ${meta.no}`, meta.title);
  }

  function renderFormula(route) {
    const item = itemsById.get('formula-sheet');
    renderDocument(item, { ...route, page: 'content', id: 'formula-sheet' });
    setTopbar('研究资源', '公式速查表');
  }

  function renderProgress() {
    const stats = progressStats();
    const content = document.querySelector('#content-view');
    content.innerHTML = `<div class="page">
      <header class="page-header"><div><span class="eyebrow">Local Learning Record</span><h1>学习进度与本地记录</h1><p>完成状态和每页笔记只保存在当前浏览器的 LocalStorage 中。导出 JSON 可用于备份或在另一台电脑导入。</p></div></header>
      <section class="progress-summary">
        <div class="progress-ring-card"><div class="ring-wrap"><div class="progress-ring" style="--value:${stats.pct * 3.6}deg"><strong>${stats.pct}%</strong></div><div class="progress-ring-copy"><h2>${stats.complete} / ${stats.total} 课</h2><p>${stats.complete === stats.total ? '课程主体已完成。继续完成实验与项目复盘。' : `下一课：${escapeHTML(firstIncompleteLesson()?.title || '全部完成')}`}</p></div></div></div>
        <div class="progress-detail-card"><h2 style="margin:0 0 13px;font-size:16px">模块进度</h2>${CONTENT.modules.map(module => { const p = moduleProgress(module); return `<div class="module-progress-row"><span>${escapeHTML(module.name)}</span><span class="track"><span style="display:block;height:100%;width:${p.pct}%;background:var(--accent);border-radius:inherit"></span></span><span class="count">${p.done}/${p.total}</span></div>`; }).join('')}</div>
      </section>
      <div class="section-heading"><div><h2>逐课状态</h2><p>点击方框可直接标记或取消完成。</p></div></div>
      <section class="progress-lessons">${CONTENT.lessons.map(item => `<div class="progress-lesson ${state.completed.has(item.id) ? 'completed' : ''}" data-progress-id="${item.id}"><button class="progress-check" type="button" aria-label="切换 ${escapeHTML(item.title)} 完成状态">${state.completed.has(item.id) ? '✓' : ''}</button><div class="progress-lesson-copy"><span>${lessonCode(item)} · ${escapeHTML(item.module)}</span><a href="#/lesson/${item.id}">${escapeHTML(item.title)}</a></div></div>`).join('')}</section>
      <div class="progress-tools">
        <button class="button secondary" id="export-progress" type="button">${icon('download')}导出进度与笔记</button>
        <label class="button ghost import-label">${icon('upload')}导入备份<input id="import-progress" type="file" accept="application/json,.json"></label>
        <button class="button ghost" id="reset-progress" type="button">${icon('trash')}清空本地记录</button>
      </div>
    </div>`;

    content.querySelectorAll('[data-progress-id]').forEach(card => card.querySelector('.progress-check')?.addEventListener('click', () => {
      const id = card.dataset.progressId;
      if (state.completed.has(id)) state.completed.delete(id); else state.completed.add(id);
      persist(); renderSidebar(); renderProgress(); showToast('学习进度已更新。');
    }));
    content.querySelector('#export-progress')?.addEventListener('click', exportProgress);
    content.querySelector('#import-progress')?.addEventListener('change', importProgress);
    content.querySelector('#reset-progress')?.addEventListener('click', () => {
      if (!confirm('确定清空所有课程完成状态、本地笔记和实验访问记录吗？此操作不可撤销。')) return;
      state.completed.clear(); state.notes = {}; state.labsViewed.clear(); persist(); renderSidebar(); renderProgress(); showToast('本地学习记录已清空。');
    });
    setTopbar('学习记录', '进度与笔记');
  }

  function exportProgress() {
    const payload = {
      schema: 'quant-stats-local-site-progress',
      version: 1,
      exportedAt: new Date().toISOString(),
      completed: [...state.completed],
      notes: state.notes,
      labsViewed: [...state.labsViewed],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `量化统计学学习记录_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('已导出学习进度和本地笔记。');
  }

  async function importProgress(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload.schema !== 'quant-stats-local-site-progress' || payload.version !== 1) throw new Error('不是受支持的学习记录文件');
      const lessonIds = new Set(CONTENT.lessons.map(x => x.id));
      state.completed = new Set((payload.completed || []).filter(id => lessonIds.has(id)));
      state.notes = payload.notes && typeof payload.notes === 'object' ? payload.notes : {};
      state.labsViewed = new Set((payload.labsViewed || []).filter(id => LABS.some(lab => lab.id === id)));
      persist(); renderSidebar(); renderProgress(); showToast('学习记录已导入。');
    } catch (error) {
      showToast(`导入失败：${error.message}`);
    } finally {
      event.target.value = '';
    }
  }

  function renderNotFound() {
    document.querySelector('#content-view').innerHTML = `<div class="empty-state"><h1>页面不存在</h1><p>请求的课程或实验没有找到。</p><a class="button" href="#/home">返回首页</a></div>`;
    setTopbar('错误', '页面不存在');
  }

  function searchRoute(entry) {
    return entry.kind === 'lab' ? `#/lab/${entry.id}` : routeForItem(entry);
  }

  function scoreSearch(query, entry) {
    const q = query.toLowerCase();
    const title = (entry.title || '').toLowerCase();
    const module = (entry.module || '').toLowerCase();
    const text = (entry.searchText || entry.summary || '').toLowerCase();
    let score = 0;
    if (title === q) score += 200;
    if (title.startsWith(q)) score += 100;
    if (title.includes(q)) score += 70;
    if (module.includes(q)) score += 20;
    const first = text.indexOf(q);
    if (first >= 0) score += Math.max(5, 30 - first / 400);
    for (const token of q.split(/\s+/).filter(Boolean)) {
      if (title.includes(token)) score += 16;
      else if (text.includes(token)) score += 4;
    }
    return score;
  }

  function highlight(text, query) {
    const safe = escapeHTML(text);
    const terms = query.trim().split(/\s+/).filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!terms.length) return safe;
    return safe.replace(new RegExp(`(${terms.join('|')})`, 'ig'), '<mark>$1</mark>');
  }

  function getSnippet(entry, query) {
    const raw = entry.searchText || entry.summary || entry.description || '';
    const pos = raw.toLowerCase().indexOf(query.toLowerCase());
    const start = Math.max(0, pos >= 0 ? pos - 55 : 0);
    return `${start > 0 ? '…' : ''}${raw.slice(start, start + 145)}${raw.length > start + 145 ? '…' : ''}`.replace(/\s+/g, ' ');
  }

  function updateSearch(query) {
    const resultsEl = document.querySelector('#search-results');
    const q = query.trim();
    if (!q) {
      state.searchResults = [
        ...CONTENT.lessons.slice(0, 5),
        ...LABS.slice(0, 3).map(lab => ({ ...lab, kind: 'lab', searchText: lab.summary })),
      ];
      resultsEl.innerHTML = `<div class="search-empty" style="padding:13px 18px;text-align:left">常用入口</div>${state.searchResults.map((entry, i) => searchResultHTML(entry, '', i)).join('')}`;
      state.searchIndex = 0;
      setSearchActive();
      return;
    }
    const corpus = [...CONTENT.items, ...LABS.map(lab => ({ ...lab, kind: 'lab', searchText: lab.summary }))];
    state.searchResults = corpus.map(entry => ({ entry, score: scoreSearch(q, entry) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 22).map(x => x.entry);
    state.searchIndex = state.searchResults.length ? 0 : -1;
    resultsEl.innerHTML = state.searchResults.length
      ? state.searchResults.map((entry, i) => searchResultHTML(entry, q, i)).join('')
      : '<div class="search-empty">没有匹配结果。尝试“标准误”“IC”“Bootstrap”“过拟合”等关键词。</div>';
    setSearchActive();
  }

  function searchResultHTML(entry, query, index) {
    const kindLabel = entry.kind === 'lab' ? `LAB ${entry.no}` : entry.kind === 'lesson' ? lessonCode(entry) : entry.kind === 'project' ? `P${String(entry.order).padStart(2, '0')}` : '资源';
    const snippet = getSnippet(entry, query);
    return `<a class="search-result" data-search-index="${index}" href="${searchRoute(entry)}"><div class="search-result-top"><strong>${highlight(entry.title, query)}</strong><span>${kindLabel} · ${escapeHTML(entry.module || '')}</span></div><p>${highlight(snippet, query)}</p></a>`;
  }

  function setSearchActive() {
    document.querySelectorAll('[data-search-index]').forEach(el => el.classList.toggle('active', Number(el.dataset.searchIndex) === state.searchIndex));
    document.querySelector(`[data-search-index="${state.searchIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  function openSearch() {
    const backdrop = document.querySelector('#search-backdrop');
    backdrop.classList.add('open');
    const input = document.querySelector('#search-input');
    input.value = '';
    updateSearch('');
    setTimeout(() => input.focus(), 20);
  }

  function closeSearch() {
    document.querySelector('#search-backdrop').classList.remove('open');
  }

  function installSearch() {
    const input = document.querySelector('#search-input');
    document.querySelector('#sidebar-search').addEventListener('click', openSearch);
    document.querySelector('#top-search').addEventListener('click', openSearch);
    document.querySelector('#search-close').addEventListener('click', closeSearch);
    document.querySelector('#search-backdrop').addEventListener('mousedown', event => { if (event.target.id === 'search-backdrop') closeSearch(); });
    input.addEventListener('input', () => updateSearch(input.value));
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); state.searchIndex = Math.min(state.searchResults.length - 1, state.searchIndex + 1); setSearchActive(); }
      if (event.key === 'ArrowUp') { event.preventDefault(); state.searchIndex = Math.max(0, state.searchIndex - 1); setSearchActive(); }
      if (event.key === 'Enter' && state.searchIndex >= 0) {
        event.preventDefault();
        location.hash = searchRoute(state.searchResults[state.searchIndex]);
        closeSearch();
      }
    });
    document.querySelector('#search-results').addEventListener('click', closeSearch);
    document.addEventListener('keydown', event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
      if (event.key === 'Escape') closeSearch();
    });
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const button = document.querySelector('#theme-toggle');
    const dark = theme === 'dark';
    button.innerHTML = icon(dark ? 'sun' : 'moon');
    button.setAttribute('aria-label', dark ? '切换到浅色主题' : '切换到深色主题');
    storageSet(STORAGE.theme, theme);
    window.dispatchEvent(new Event('resize'));
  }

  function installGlobalEvents() {
    const saved = storageGet(STORAGE.theme);
    const preferred = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(saved || preferred);
    document.querySelector('#theme-toggle').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    document.querySelector('#print-page').addEventListener('click', () => window.print());
    document.querySelector('#mobile-menu').addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
    document.querySelector('#mobile-backdrop').addEventListener('click', closeSidebar);
    document.querySelector('#sidebar').addEventListener('click', event => { if (event.target.closest('a')) closeSidebar(); });
    window.addEventListener('scroll', updateReadingProgress, { passive: true });
    window.addEventListener('resize', updateReadingProgress, { passive: true });
    window.addEventListener('hashchange', renderRoute);
  }

  function updateReadingProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0;
    const bar = document.querySelector('#reading-progress-bar');
    if (bar) bar.style.width = `${pct}%`;
  }

  async function typesetCurrent() {
    const root = document.querySelector('#content-view');
    if (!root || !window.MathJax?.typesetPromise) return;
    try { await window.MathJax.typesetPromise([root]); } catch (error) { console.warn('MathJax typeset warning', error); }
  }

  function renderRoute() {
    const route = parseRoute();
    const content = document.querySelector('#content-view');
    window.QSDemos?.cleanup?.();
    if (window.MathJax?.typesetClear && content) {
      try { window.MathJax.typesetClear([content]); } catch (_) {}
    }
    window.scrollTo(0, 0);
    closeSidebar();
    storageSet(STORAGE.lastRoute, location.hash || '#/home');

    if (route.page === 'home') renderHome();
    else if (route.page === 'lessons') renderLessons(route);
    else if (route.page === 'labs') renderLabs(route);
    else if (route.page === 'projects') renderProjects();
    else if (route.page === 'resources') renderResources();
    else if (route.page === 'formula') renderFormula(route);
    else if (route.page === 'progress') renderProgress();
    else if (route.page === 'lesson' || route.page === 'project' || route.page === 'content') renderDocument(itemsById.get(route.id), route);
    else if (route.page === 'lab') renderLab(route.id);
    else renderNotFound();

    setActiveNavigation();
    updateSidebarProgress();
    updateReadingProgress();
    document.querySelector('#content-view')?.focus({ preventScroll: true });
    typesetCurrent();
  }

  function init() {
    buildShell();
    renderSidebar();
    installSearch();
    installGlobalEvents();
    if (!location.hash || location.hash === '#') history.replaceState(null, '', '#/home');
    renderRoute();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
