/**
 * app.js
 * Точка входа клиентской логики: переключение темы, scroll-анимации,
 * мобильное меню и система тост-уведомлений. Подключается последним
 * (после api-client.js и form-handler.js).
 */

/* ---------- Тост-уведомления ---------- */
const Notifications = (() => {
  let container;

  function ensureContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type = 'info', duration = 5000) {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'status');
    el.textContent = message;

    ensureContainer().appendChild(el);

    // Небольшая задержка нужна, чтобы CSS-переход сработал (иначе элемент появится мгновенно)
    requestAnimationFrame(() => el.classList.add('is-visible'));

    setTimeout(() => {
      el.classList.remove('is-visible');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, duration);
  }

  return { show };
})();

/* ---------- Тема сайта (светлая/тёмная) ---------- */
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  const darkIcon = document.getElementById('theme-toggle-dark-icon');
  const lightIcon = document.getElementById('theme-toggle-light-icon');
  if (!toggleBtn) return;

  const STORAGE_KEY = 'cloudpage:theme';
  const saved = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Применяем сохранённую тему, либо системную по умолчанию
  const isDark = saved ? saved === 'dark' : prefersDark;
  document.documentElement.classList.toggle('dark', isDark);

  function updateIcons() {
    const dark = document.documentElement.classList.contains('dark');
    lightIcon.classList.toggle('hidden', !dark);
    darkIcon.classList.toggle('hidden', dark);
  }
  updateIcons();

  toggleBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem(STORAGE_KEY, document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    updateIcons();
  });
}

/* ---------- Появление элементов при скролле ---------- */
function initRevealAnimations() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // анимация должна проиграться один раз
      }
    });
  }, { threshold: 0.1 });

  elements.forEach((el) => observer.observe(el));
}

/* ---------- Индикатор прогресса скролла ---------- */
function initScrollProgress() {
  let bar = document.querySelector('.scroll-progress');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.prepend(bar);
  }

  function update() {
    const scrollTop = window.scrollY;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const progress = height > 0 ? (scrollTop / height) * 100 : 0;
    document.documentElement.style.setProperty('--scroll-progress', `${progress}%`);
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ---------- Курсор-«атмосфера» в hero: мягкое свечение следует за мышью ---------- */
function initHeroGlow() {
  const hero = document.querySelector('.hero-glow');
  if (!hero || window.matchMedia('(pointer: coarse)').matches) return; // на тач-устройствах не нужно

  hero.parentElement.addEventListener('mousemove', (e) => {
    const rect = hero.parentElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    hero.style.setProperty('--mx', `${x}%`);
    hero.style.setProperty('--my', `${y}%`);
  });
}

/* ---------- Лёгкий 3D-наклон карточек вслед за курсором ---------- */
function initCardTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // на тач-устройствах не нужно

  document.querySelectorAll('.glass-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--tilt-x', `${(-py * 6).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(px * 6).toFixed(2)}deg`);
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  });
}

/* ---------- Прелоадер: технологичная загрузка с "Cloud Page" в облаках ---------- */
function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  document.documentElement.classList.add('is-loading');
  const percentEl = document.getElementById('preloader-percent');
  const barEl = document.getElementById('preloader-bar');

  let progress = 0;
  const duration = 1800; // мс — ощущается быстро, но достаточно, чтобы показать анимацию
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    // Нелинейная кривая — быстрый старт, замедление к 100%, как настоящая загрузка
    progress = Math.min(100, Math.round((1 - Math.pow(1 - Math.min(elapsed / duration, 1), 3)) * 100));
    if (percentEl) percentEl.textContent = `${String(progress).padStart(2, '0')}%`;
    if (barEl) barEl.style.width = `${progress}%`;

    if (progress < 100) {
      requestAnimationFrame(tick);
    } else {
      finish();
    }
  }

  function finish() {
    setTimeout(() => {
      preloader.classList.add('is-hidden');
      document.documentElement.classList.remove('is-loading');
      setTimeout(() => preloader.remove(), 800);
    }, 250);
  }

  requestAnimationFrame(tick);
}

/* ---------- Точечная навигация по секциям + wipe-переход при клике ---------- */
function initDotNav() {
  const nav = document.getElementById('dot-nav');
  const transitionEl = document.getElementById('page-transition');
  if (!nav) return;

  const sections = Array.from(document.querySelectorAll('section[id][data-nav-label]'));
  if (!sections.length) return;

  sections.forEach((section) => {
    const dot = document.createElement('button');
    dot.className = 'dot-nav-item';
    dot.type = 'button';
    dot.setAttribute('aria-label', `Перейти к разделу «${section.dataset.navLabel}»`);
    dot.dataset.label = section.dataset.navLabel;
    dot.dataset.target = section.id;
    nav.appendChild(dot);
  });

  const dots = Array.from(nav.querySelectorAll('.dot-nav-item'));

  function setActive(id) {
    dots.forEach((d) => d.classList.toggle('is-active', d.dataset.target === id));
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { threshold: 0.5 });
  sections.forEach((s) => observer.observe(s));

  dots.forEach((dot) => {
    dot.addEventListener('click', (e) => {
      triggerPageWipe(e.clientX, e.clientY);
      document.getElementById(dot.dataset.target)?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* Красивый wipe-переход поверх страницы — запускается из точки клика */
  function triggerPageWipe(x, y) {
    if (!transitionEl) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    transitionEl.style.setProperty('--tx', `${(x / vw) * 100}%`);
    transitionEl.style.setProperty('--ty', `${(y / vh) * 100}%`);
    transitionEl.classList.remove('is-active');
    void transitionEl.offsetWidth; // форсируем reflow, чтобы анимация перезапустилась
    transitionEl.classList.add('is-active');
  }

  // Тот же красивый переход — на клики по обычным навигационным ссылкам (шапка, меню)
  document.querySelectorAll('nav a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const rect = link.getBoundingClientRect();
      triggerPageWipe(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  });
}

/* ---------- Демо мини-приложений на смартфоне: переключение вкладок ---------- */
function initPhoneDemo() {
  const tabs = document.querySelectorAll('.demo-tab');
  const panels = document.querySelectorAll('.phone-screen-panel');
  if (!tabs.length || !panels.length) return;

  let autoRotateTimer;

  function activate(name) {
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.demo === name));
    panels.forEach((p) => p.classList.toggle('is-active', p.dataset.demoPanel === name));
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activate(tab.dataset.demo);
      resetAutoRotate();
    });
  });

  // Лёгкая авто-смена вкладок раз в 5 секунд — демонстрирует переходы без участия пользователя
  function resetAutoRotate() {
    clearInterval(autoRotateTimer);
    autoRotateTimer = setInterval(() => {
      const names = Array.from(tabs).map((t) => t.dataset.demo);
      const current = Array.from(tabs).findIndex((t) => t.classList.contains('is-active'));
      activate(names[(current + 1) % names.length]);
    }, 5000);
  }
  resetAutoRotate();

  // Останавливаем авто-ротацию, если пользователь взаимодействует с демо-блоком
  document.getElementById('demo-tabs')?.addEventListener('mouseenter', () => clearInterval(autoRotateTimer));
}

/* ---------- Мобильное меню ---------- */
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  // Закрываем меню при переходе по ссылке
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => menu.classList.remove('is-open'));
  });
}

/* ---------- Инициализация всего приложения ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initTheme();
  initRevealAnimations();
  initScrollProgress();
  initHeroGlow();
  initCardTilt();
  initDotNav();
  initPhoneDemo();
  initMobileMenu();
  if (typeof FormHandler !== 'undefined') FormHandler.init();
});
