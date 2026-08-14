document.addEventListener('DOMContentLoaded', () => {
  const revealEls = document.querySelectorAll('.reveal');
  const processSteps = document.querySelectorAll('.process-step');
  const serviceItems = document.querySelectorAll('.service-item');
  const phoneTabs = document.querySelectorAll('[data-phone-tab]');
  const phonePanels = document.querySelectorAll('.phone-screen-panel');
  const mobileMenuToggle = document.querySelector('#mobile-menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
  const navLinks = document.querySelectorAll('a[href^="#"]');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle('active', entry.isIntersecting);
    });
  }, { threshold: 0.15 });

  revealEls.forEach(el => revealObserver.observe(el));

  const processObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle('is-visible', entry.isIntersecting);
    });
  }, { threshold: 0.35 });

  processSteps.forEach(step => processObserver.observe(step));

  serviceItems.forEach(item => {
    item.addEventListener('mouseenter', () => item.classList.add('is-open'));
    item.addEventListener('mouseleave', () => item.classList.remove('is-open'));
    item.addEventListener('focusin', () => item.classList.add('is-open'));
    item.addEventListener('focusout', () => item.classList.remove('is-open'));
    item.addEventListener('click', (e) => {
      if (window.matchMedia('(max-width: 767px)').matches) {
        if (!e.target.closest('a, button, input, textarea')) {
          item.classList.toggle('is-open');
        }
      }
    });
  });

  const activatePhoneTab = (tab) => {
    const key = tab.dataset.phoneTab;
    phoneTabs.forEach(t => t.classList.toggle('is-active', t === tab));
    phonePanels.forEach(panel => panel.classList.toggle('is-active', panel.dataset.phonePanel === key));
  };

  phoneTabs.forEach(tab => {
    tab.addEventListener('click', () => activatePhoneTab(tab));
  });

  if (phoneTabs[0]) activatePhoneTab(phoneTabs[0]);

  if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('is-open');
      mobileMenuToggle.setAttribute('aria-expanded', String(open));
    });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (mobileMenu && mobileMenu.classList.contains('is-open')) {
        mobileMenu.classList.remove('is-open');
        mobileMenuToggle?.setAttribute('aria-expanded', 'false');
      }
    });
  });

  const progress = document.querySelector('.scroll-progress');
  const updateProgress = () => {
    if (!progress) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progress.style.setProperty('--scroll-progress', `${pct}%`);
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
});