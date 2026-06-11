/* Smarter Estágios — comportamento compartilhado */
(function () {
  // ===== Apply persisted theme/tweaks ASAP =====
  try {
    const t = localStorage.getItem('smt:tweaks');
    if (t) {
      const data = JSON.parse(t);
      if (data.theme) document.documentElement.dataset.theme = data.theme;
      if (data.primary) document.documentElement.style.setProperty('--blue', data.primary);
      if (data.primaryDeep) document.documentElement.style.setProperty('--blue-deep', data.primaryDeep);
      if (data.accent) document.documentElement.style.setProperty('--yellow', data.accent);
      if (data.accentDeep) document.documentElement.style.setProperty('--yellow-deep', data.accentDeep);
    }
  } catch (e) {}

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  onReady(function () {
    // ===== Login dropdown =====
    const loginMenus = document.querySelectorAll('.login-menu');
    loginMenus.forEach(menu => {
      const trigger = menu.querySelector('.login-menu__trigger');
      if (!trigger) return;
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        loginMenus.forEach(m => { if (m !== menu) m.classList.remove('is-open'); });
        menu.classList.toggle('is-open');
      });
    });
    document.addEventListener('click', () => {
      loginMenus.forEach(m => m.classList.remove('is-open'));
    });

    // ===== Mobile menu =====
    const toggle = document.querySelector('.mobile-toggle');
    const menu = document.querySelector('.mobile-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => menu.classList.toggle('is-open'));
      menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('is-open')));
    }

    // ===== Reveal on scroll =====
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

    // ===== Counters =====
    const counters = document.querySelectorAll('[data-counter]');
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseFloat(el.dataset.counter);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';
        const duration = 1600;
        const start = performance.now();
        function frame(t) {
          const p = Math.min(1, (t - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = target * eased;
          el.textContent = prefix + val.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
          if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
        cio.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach(el => cio.observe(el));

    // ===== Tabs (audience switcher) =====
    document.querySelectorAll('[data-tabs]').forEach(group => {
      const tabs = group.querySelectorAll('.aud-tab');
      const panels = group.querySelectorAll('.aud-panel');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('is-active'));
          panels.forEach(p => p.classList.remove('is-active'));
          tab.classList.add('is-active');
          const id = tab.dataset.target;
          const target = group.querySelector('#' + id);
          if (target) target.classList.add('is-active');
        });
      });
    });

    // ===== Parallax light =====
    const parx = document.querySelectorAll('[data-parallax]');
    if (parx.length) {
      window.addEventListener('scroll', () => {
        const y = window.scrollY;
        parx.forEach(el => {
          const s = parseFloat(el.dataset.parallax) || 0.1;
          el.style.transform = `translateY(${y * s}px)`;
        });
      }, { passive: true });
    }

    // ===== Header shadow on scroll =====
    const header = document.querySelector('.site-header__inner');
    if (header) {
      const onScroll = () => {
        if (window.scrollY > 8) header.classList.add('is-scrolled');
        else header.classList.remove('is-scrolled');
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // ===== Tweaks panel =====
    const TWEAKS_DEFAULTS = {
      primary: '#102657', primaryDeep: '#0A1A40',
      accent: '#FAA419', accentDeep: '#D08609',
      theme: 'light'
    };
    let tweaks = Object.assign({}, TWEAKS_DEFAULTS);
    try {
      const stored = localStorage.getItem('smt:tweaks');
      if (stored) tweaks = Object.assign(tweaks, JSON.parse(stored));
    } catch (e) {}

    function applyTweaks() {
      document.documentElement.style.setProperty('--blue', tweaks.primary);
      document.documentElement.style.setProperty('--blue-deep', tweaks.primaryDeep);
      document.documentElement.style.setProperty('--yellow', tweaks.accent);
      document.documentElement.style.setProperty('--yellow-deep', tweaks.accentDeep);
      document.documentElement.dataset.theme = tweaks.theme;
      localStorage.setItem('smt:tweaks', JSON.stringify(tweaks));
    }
    applyTweaks();

    const panel = document.querySelector('.tweaks-panel');
    if (!panel) return;

    // Build swatches
    const primaries = [
      { c: '#102657', d: '#0A1A40', name: 'smarter navy' },
      { c: '#1E3A8A', d: '#0F2462', name: 'navy' },
      { c: '#2240F0', d: '#0F1FB8', name: 'electric' },
      { c: '#1F2937', d: '#0B0F1A', name: 'ink' }
    ];
    const accents = [
      { c: '#FAA419', d: '#D08609', name: 'smarter amber' },
      { c: '#F59E0B', d: '#C77A05', name: 'gold' },
      { c: '#FFD60A', d: '#E5B800', name: 'sun' }
    ];

    const primRow = panel.querySelector('[data-tweaks="primary"]');
    const accRow = panel.querySelector('[data-tweaks="accent"]');
    primaries.forEach(p => {
      const b = document.createElement('button');
      b.className = 'swatch' + (p.c === tweaks.primary ? ' is-on' : '');
      b.style.background = p.c;
      b.title = p.name;
      b.addEventListener('click', () => {
        tweaks.primary = p.c; tweaks.primaryDeep = p.d;
        primRow.querySelectorAll('.swatch').forEach(s => s.classList.remove('is-on'));
        b.classList.add('is-on');
        applyTweaks();
      });
      primRow.appendChild(b);
    });
    accents.forEach(p => {
      const b = document.createElement('button');
      b.className = 'swatch' + (p.c === tweaks.accent ? ' is-on' : '');
      b.style.background = p.c;
      b.title = p.name;
      b.addEventListener('click', () => {
        tweaks.accent = p.c; tweaks.accentDeep = p.d;
        accRow.querySelectorAll('.swatch').forEach(s => s.classList.remove('is-on'));
        b.classList.add('is-on');
        applyTweaks();
      });
      accRow.appendChild(b);
    });

    const themeBtn = panel.querySelector('[data-tweaks="theme"]');
    if (themeBtn) {
      themeBtn.textContent = tweaks.theme === 'dark' ? 'modo claro' : 'modo escuro';
      themeBtn.addEventListener('click', () => {
        tweaks.theme = tweaks.theme === 'dark' ? 'light' : 'dark';
        themeBtn.textContent = tweaks.theme === 'dark' ? 'modo claro' : 'modo escuro';
        applyTweaks();
      });
    }

    // Edit mode integration
    window.addEventListener('message', (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') panel.classList.add('is-open');
      if (e.data.type === '__deactivate_edit_mode') panel.classList.remove('is-open');
    });
    panel.querySelector('.tweaks-panel__close').addEventListener('click', () => {
      panel.classList.remove('is-open');
      try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {}
    });
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}
  });
})();
