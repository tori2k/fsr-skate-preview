(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const dialog = $('#search-dialog');
  const input = $('#search-input');
  const results = $('#search-results');
  const menuButton = $('.menu-toggle');
  const menu = $('#mobile-menu');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1200px)');
  const video = $('#hero-video');
  const staticPreview = new URLSearchParams(location.search).get('motion') === 'off';
  if (staticPreview) document.documentElement.classList.add('motion-static');
  const partners = $('.partners');
  const partnerTrack = document.createElement('div');
  partnerTrack.className = 'partner-track';
  partnerTrack.append(...partners.children);
  const duplicateTrack = partnerTrack.cloneNode(true);
  duplicateTrack.setAttribute('aria-hidden', 'true');
  duplicateTrack.inert = true;
  const partnerBelt = document.createElement('div');
  partnerBelt.className = 'partner-belt';
  partnerBelt.append(partnerTrack, duplicateTrack);
  partners.append(partnerBelt);
  const items = [
    ...[...document.querySelectorAll('.news-card')].map((link) => ({ title: link.querySelector('h3').textContent, type: 'Новость', url: link.href })),
    ...[...document.querySelectorAll('.event-row')].map((link) => ({ title: link.querySelector('h3').textContent, type: 'Соревнование', url: link.href })),
    ...(window.SITE_CONTENT?.search || []),
  ];
  function search() {
    const query = input.value.trim().toLocaleLowerCase('ru');
    const matches = items.filter((item) => `${item.title} ${item.keywords || ''}`.toLocaleLowerCase('ru').includes(query));
    results.replaceChildren();
    $('#search-status').textContent = matches.length ? (query ? `Найдено: ${matches.length}` : 'Разделы и материалы') : 'Ничего не найдено. Попробуйте другое слово.';
    matches.forEach((item) => {
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const type = document.createElement('small');
      type.textContent = item.type;
      link.append(type, document.createTextNode(item.title));
      results.append(link);
    });
  }
  function closeMenu() {
    menu.hidden = true;
    document.body.classList.remove('menu-open');
    $('.page-shell').inert = false;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
  }
  $('.search-open').addEventListener('click', () => {
    closeMenu();
    dialog.showModal();
    search();
    input.focus();
  });
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (event.target === dialog && outside) dialog.close();
  });
  input.addEventListener('input', search);
  menuButton.addEventListener('click', () => {
    const open = menu.hidden;
    if (!open) { closeMenu(); return; }
    menu.hidden = !open;
    document.body.classList.add('menu-open');
    $('.page-shell').inert = true;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (!reduced.matches && !staticPreview) {
      menu.animate([{ opacity: .6, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: 300, easing: 'cubic-bezier(.16,1,.3,1)',
      });
    }
  });
  menu.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
  $('.brand').addEventListener('click', closeMenu);
  document.addEventListener('keydown', (event) => {
    if (menu.hidden) return;
    if (event.key === 'Escape') { closeMenu(); menuButton.focus(); }
    if (event.key === 'Tab') {
      const controls = [...$('.site-header').querySelectorAll('a,button')].filter((node) => node.getClientRects().length);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  desktop.addEventListener('change', () => {
    closeMenu();
    if (!desktop.matches && dialog.open) dialog.close();
    syncVideo();
  });

  // Play the original Figma film once. Keep its final frame; no looping or pause UI.
  let heroVisible = true;
  // Keep the opening tricks in view; later shots use a centered crop.
  const mobileFraming = [
    [0, 100], [.35, 100], [.65, 45], [1.05, 0], [1.7, 0],
    [1.95, 50], [2.95, 50], [3.15, 20], [3.55, 100],
    [4, 0], [4.55, 0], [5, 50], [30, 50],
  ];
  let framingFrame;
  function frameRider() {
    if (desktop.matches) { video.style.removeProperty('object-position'); return; }
    const t = video.currentTime;
    const end = mobileFraming.findIndex(([time]) => time > t);
    const next = mobileFraming[end < 0 ? mobileFraming.length - 1 : end];
    const prev = mobileFraming[end < 0 ? mobileFraming.length - 1 : Math.max(0, end - 1)];
    const amount = next[0] === prev[0] ? 0 : Math.min(1, (t - prev[0]) / (next[0] - prev[0]));
    video.style.objectPosition = `${prev[1] + (next[1] - prev[1]) * amount}% center`;
  }
  function trackFrame() {
    frameRider();
    if (!video.paused && !video.ended && video.requestVideoFrameCallback) framingFrame = video.requestVideoFrameCallback(trackFrame);
  }
  video.addEventListener('play', trackFrame);
  video.addEventListener('pause', () => { if (framingFrame !== undefined) video.cancelVideoFrameCallback?.(framingFrame); });
  video.addEventListener('timeupdate', frameRider);
  function syncVideo() {
    if (staticPreview || reduced.matches || navigator.connection?.saveData || document.hidden || !heroVisible) video.pause();
    else if (!video.ended) {
      const source = video.querySelector('source');
      const selected = desktop.matches ? source.dataset.src : source.dataset.mobileSrc;
      if (source.getAttribute('src') !== selected) { source.src = selected; video.load(); }
      video.play().catch(() => {}); // Poster remains when autoplay is unavailable.
    }
  }
  new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; syncVideo(); }, { threshold: 0.05 }).observe(video);
  document.addEventListener('visibilitychange', syncVideo);
  reduced.addEventListener('change', syncVideo);

  // Motion is authored for this implementation: the Figma file contains no motion tracks.
  // Every final pose is the untransformed Figma layout, and content is visible without JS.
  if (staticPreview || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add('(min-width: 1200px) and (prefers-reduced-motion: no-preference)', () => {
    const hero = gsap.timeline({ defaults: { ease: 'expo.out' } });
    if (window.scrollY < 100) {
      hero.from('.hero h1 span', { y: 35, clipPath: 'inset(0 0 100% 0)', duration: 1.15, stagger: 0.11, clearProps: 'transform,clipPath' }, 0.1)
        .from('.hero-intro', { opacity: 0.35, y: 9, duration: 0.9, clearProps: 'transform,opacity' }, 0.45)
        .from('.sport-link', { x: 18, opacity: 0.4, duration: 0.85, stagger: 0.08, clearProps: 'transform,opacity' }, 0.3);
    }
    const revealTargets = document.querySelectorAll('.news-photo, .project-photo');
    const reveals = [...revealTargets].map((photo) => {
      const tween = gsap.from(photo.querySelector('.image-motion'), {
        scale: 1.07, clipPath: 'inset(0 0 16% 0)', duration: 1.2, ease: 'expo.out',
        clearProps: 'transform,clipPath',
        scrollTrigger: { trigger: photo, start: 'top 90%', once: true },
      });
      const link = photo.closest('a');
      const onFocus = () => tween.progress(1);
      link.addEventListener('focus', onFocus);
      return { link, onFocus };
    });
    // A small, single scroll-driven lift of the actual cutout, with no scroll pinning.
    const board = gsap.from('.footer-board', {
      y: 54, rotation: -5, transformOrigin: '50% 85%', ease: 'none',
      scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'top 28%', scrub: 0.65 },
    });
    // Rows unfold from beneath the first one, then settle into the Figma layout.
    // Native scrolling drives the stack; no pinning or added spacer height.
    const rows = [...document.querySelectorAll('.event-row')];
    gsap.set(rows, { zIndex: (index) => rows.length - index });
    const stack = gsap.from(rows.slice(1), {
      y: (index, row) => -(index + 1) * row.offsetHeight,
      rotation: (index) => -(index + 1) * 3,
      ease: 'power1.out',
      scrollTrigger: {
        trigger: '.event-list', start: 'top 80%', end: 'top 14%',
        scrub: 0.65, invalidateOnRefresh: true,
      },
    });
    const showCalendar = () => { stack.scrollTrigger.disable(false); stack.progress(1); };
    rows.forEach((row) => row.addEventListener('focus', showCalendar));
    // Finite hover response preserves all crops and lets the lettering remain still.
    const hovers = [];
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.querySelectorAll('.news-card, .project-card, .event-row').forEach((card) => {
        const photo = card.querySelector('.image-motion');
        const enter = () => gsap.to(photo, { scale: 1.035, duration: 0.65, ease: 'power3.out', overwrite: 'auto' });
        const leave = () => gsap.to(photo, { scale: 1, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
        card.addEventListener('mouseenter', enter);
        card.addEventListener('mouseleave', leave);
        hovers.push({ card, enter, leave });
      });
    }
    return () => {
      hero.kill(); board.kill(); stack.kill();
      rows.forEach((row) => row.removeEventListener('focus', showCalendar));
      reveals.forEach(({ link, onFocus }) => link.removeEventListener('focus', onFocus));
      hovers.forEach(({ card, enter, leave }) => { card.removeEventListener('mouseenter', enter); card.removeEventListener('mouseleave', leave); });
    };
  });
  media.add('(max-width: 1199px) and (prefers-reduced-motion: no-preference)', () => {
    if (window.scrollY < 100) {
      gsap.from('.hero h1 span', {
        y: 32, clipPath: 'inset(0 0 100% 0)', duration: 1.1, stagger: .14, ease: 'power3.out',
        clearProps: 'transform,clipPath',
      });
    }
    // Carry the desktop's mask reveals and unfolding calendar onto touch screens.
    document.querySelectorAll('.mobile-news-title, .projects h2, .calendar h2').forEach((heading) => {
      gsap.from(heading, {
        clipPath: 'inset(0 0 90% 0)', y: 24, duration: .85, ease: 'expo.out',
        clearProps: 'transform,clipPath',
        scrollTrigger: { trigger: heading, start: 'top 90%', once: true },
      });
    });
    const focuses = [];
    const finishOnFocus = (link, tween) => {
      const onFocus = () => { tween.scrollTrigger?.disable(false); tween.progress(1); };
      link.addEventListener('focus', onFocus);
      focuses.push({ link, onFocus });
    };
    const sports = gsap.from('.sport-link', {
      x: 24, opacity: .4, duration: .85, stagger: .08, ease: 'expo.out',
      clearProps: 'transform,opacity',
      scrollTrigger: { trigger: '.hero-sports', start: 'top 92%', once: true },
    });
    document.querySelectorAll('.sport-link').forEach((link) => finishOnFocus(link, sports));
    document.querySelectorAll('.news-photo, .project-photo').forEach((photo) => {
      const tween = gsap.from(photo.querySelector('.image-motion'), {
        scale: 1.07, clipPath: 'inset(0 0 16% 0)', duration: 1.2, ease: 'expo.out',
        clearProps: 'transform,clipPath',
        scrollTrigger: { trigger: photo, start: 'top 90%', once: true },
      });
      finishOnFocus(photo.closest('a'), tween);
    });
    const rows = [...document.querySelectorAll('.event-row')];
    gsap.set(rows, { zIndex: (index) => rows.length - index });
    const stack = gsap.from(rows.slice(1), {
      y: (index) => -rows.slice(0, index + 1).reduce((height, row) => height + row.offsetHeight, 0),
      rotation: (index) => -(index + 1) * .75,
      duration: 1, stagger: .08, ease: 'sine.inOut',
      scrollTrigger: {
        trigger: '.event-list', start: 'top 120%', end: 'top 45%',
        scrub: .9, invalidateOnRefresh: true,
      },
    });
    rows.forEach((row) => finishOnFocus(row, stack));
    gsap.from('.footer-board', {
      y: 60, rotation: -5, transformOrigin: '50% 100%', ease: 'none',
      scrollTrigger: { trigger: '.footer-art', start: 'top 95%', end: 'bottom bottom', scrub: .7 },
    });
    return () => focuses.forEach(({ link, onFocus }) => link.removeEventListener('focus', onFocus));
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
