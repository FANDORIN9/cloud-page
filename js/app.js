/**
 * app.js
 * Точка входа клиентской логики: тема, шапка при скролле, мобильное меню,
 * scroll-анимации (в том числе двусторонние — для блока «Этапы»),
 * переключение демо-экранов телефона и тост-уведомления.
 * Подключается последним — после api-client.js и form-handler.js.
 */

/* ==========================================================================
   Тост-уведомления
   ========================================================================== */
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

    // Задержка в один кадр нужна, иначе CSS-переход не сработает
    requestAnimationFrame(() => el.classList.add('is-visible'));

    setTimeout(() => {
      el.classList.remove('is-visible');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, duration);
  }

  return { show };
})();

/* ==========================================================================
   Тема: светлая / тёмная
   ========================================================================== */
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  const sun = document.getElementById('icon-sun');
  const moon = document.getElementById('icon-moon');
  if (!btn) return;

  const STORAGE_KEY = 'cloudpage:theme';

  // Класс .dark уже проставлен инлайн-скриптом в <head> — здесь только иконки
  function syncIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    sun.classList.toggle('hidden', !isDark);   // в тёмной теме предлагаем светлую
    moon.classList.toggle('hidden', isDark);
  }

  btn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    syncIcons();
  });

  syncIcons();
}

/* ==========================================================================
   Шапка: прозрачная сверху, плотная после скролла + подсветка активного пункта
   ========================================================================== */
function initHeader() {
  const header = document.getElementById('header');
  const toTop = document.getElementById('to-top');
  const links = Array.from(document.querySelectorAll('.nav__link'));
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  let ticking = false;

  function onScroll() {
    const y = window.scrollY;

    if (header) header.classList.toggle('is-stuck', y > 20);
    if (toTop) toTop.classList.toggle('is-visible', y > 700);

    // Активным считаем последнюю секцию, чей верх прошёл середину экрана
    const line = y + window.innerHeight * 0.35;
    let activeIndex = -1;
    sections.forEach((section, i) => {
      if (section.offsetTop <= line) activeIndex = i;
    });
    links.forEach((link, i) => link.classList.toggle('is-active', i === activeIndex));

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  onScroll();

  if (toTop) {
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}

/* ==========================================================================
   Мобильное меню
   ========================================================================== */
function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  function close() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
  window.addEventListener('resize', () => { if (window.innerWidth >= 900) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ==========================================================================
   Появление блоков при скролле (одноразовое, для общего контента)
   ========================================================================== */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  // Без поддержки IntersectionObserver просто показываем всё сразу
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);   // анимируем один раз
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  items.forEach((el) => observer.observe(el));
}

/* ==========================================================================
   Этапы: ДВУСТОРОННЯЯ scroll-анимация
   При скролле вниз пункт активируется, при обратном скролле — гаснет.
   Наблюдатель не отключается, класс снимается при выходе из зоны видимости.
   ========================================================================== */
function initTimeline() {
  const steps = Array.from(document.querySelectorAll('[data-step]'));
  const progress = document.getElementById('timeline-progress');
  const timeline = document.getElementById('timeline');
  if (!steps.length) return;

  if (!('IntersectionObserver' in window)) {
    steps.forEach((el) => el.classList.add('is-in'));
    return;
  }

  function updateProgress() {
    if (!progress || !timeline) return;
    const active = steps.filter((s) => s.classList.contains('is-in'));
    if (!active.length) {
      progress.style.height = '0px';
      return;
    }
    const last = active[active.length - 1];
    const height = last.offsetTop + 44;   // до центра кружка последнего активного шага
    progress.style.height = `${Math.min(height, timeline.offsetHeight - 16)}px`;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // Ключевой момент: и добавление, и снятие класса — поэтому анимация обратима
      entry.target.classList.toggle('is-in', entry.isIntersecting);
    });
    updateProgress();
  }, {
    threshold: 0.35,
    rootMargin: '-10% 0px -15% 0px',   // срабатывает ближе к центру экрана
  });

  steps.forEach((el) => observer.observe(el));
  window.addEventListener('resize', updateProgress);
}

/* ==========================================================================
   Демо-телефон: переключение экранов
   ========================================================================== */
function initPhoneDemo() {
  const tabs = Array.from(document.querySelectorAll('.demo-tab'));
  const panels = Array.from(document.querySelectorAll('.phone__panel'));
  if (!tabs.length || !panels.length) return;

  function activate(name) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.demo === name;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    panels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panel === name);
    });
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => activate(tab.dataset.demo)));
}

/* ==========================================================================
   Услуги: раскрытие по наведению делает CSS, здесь — поддержка тача.
   На тач-устройствах hover не работает, поэтому тап переключает .is-open.
   ========================================================================== */
function initServices() {
  const services = Array.from(document.querySelectorAll('.service'));
  if (!services.length) return;

  const isTouch = window.matchMedia('(hover: none)').matches;
  if (!isTouch) return;

  services.forEach((service) => {
    service.addEventListener('click', () => {
      const willOpen = !service.classList.contains('is-open');
      services.forEach((s) => s.classList.remove('is-open'));   // открыт только один
      service.classList.toggle('is-open', willOpen);
    });
  });
}

/* ==========================================================================
   Плавный переход по якорям с учётом высоты фиксированной шапки
   ========================================================================== */
function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      const offset = document.getElementById('header')?.offsetHeight || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - offset - 12;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ==========================================================================
   Инициализация
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHeader();
  initMobileMenu();
  initReveal();
  initTimeline();
  initPhoneDemo();
  initServices();
  initSmoothAnchors();

  if (typeof FormHandler !== 'undefined') FormHandler.init();
});
