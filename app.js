/* Digital News Network: renders the whole page from content.json.
   Sections render in the order of content.json "sections"; each one is
   dispatched by its "type" to a renderer below. */
(() => {
  'use strict';

  const VIDEO_RE = /\.(mp4|webm)(\?.*)?$/i;
  const COLUMN_SPANS = { hero: [1, 2, 1], band: [1, 2, 1], wide: [2, 1], grid: [1, 1, 1], morefrom: [3, 2] };
  const THUMB_WIDTH = { hero: '120px', band: '120px', wide: '120px', grid: '45%', morefrom: '160px' };

  const ICON = {
    burger: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
    headphones: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="3" y="14" width="5" height="7" rx="1.5" fill="currentColor"/><rect x="16" y="14" width="5" height="7" rx="1.5" fill="currentColor"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
    gallery: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="14" height="13" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3h14v13" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    caret: '<svg viewBox="0 0 10 6" width="9" height="6" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>'
  };
  // Generic social glyphs: shapes only, no platform marks.
  const SOCIAL_GLYPHS = [
    '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
    '<rect x="8" y="8" width="8" height="8" fill="currentColor"/>',
    '<path d="M12 7l5 9H7z" fill="currentColor"/>',
    '<circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="2" fill="none"/>',
    '<path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="2.4"/>'
  ];

  let C = null;          // content.json
  const cards = [];      // every rendered card, indexed for the story dialog

  /* ---------- helpers ---------- */

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // A headline may be a number: an index into altHeadlines, for quick swapping.
  const text = (h) => (typeof h === 'number' ? (C.altHeadlines || [])[h] ?? '' : h ?? '');

  const ratio = (a) => {
    const [w, h] = String(a || '16:9').split(':').map(Number);
    return w > 0 && h > 0 ? `${w} / ${h}` : '16 / 9';
  };

  const register = (card) => cards.push(card) - 1;

  function href(card) {
    return esc(card.href || '#story');
  }

  function linkAttrs(card) {
    return `href="${href(card)}" data-card="${register(card)}"`;
  }

  function media(m, { aspect, badge = true } = {}) {
    m = m || {};
    const id = m.id || 'slot';
    let inner;
    if (!m.src) {
      inner = `<span class="slot-id">${esc(id)}</span>`;
    } else if (m.video && VIDEO_RE.test(m.src)) {
      inner = `<video src="${esc(m.src)}" muted loop playsinline preload="metadata" aria-label="${esc(m.alt)}"></video>`;
    } else {
      inner = `<img src="${esc(m.src)}" alt="${esc(m.alt)}" loading="lazy">`;
    }
    const vid = m.video && badge
      ? `<span class="vid-badge">${ICON.play}${m.duration ? `<span>${esc(m.duration)}</span>` : ''}</span>`
      : '';
    return `<div class="media${m.src ? '' : ' is-empty'}" style="aspect-ratio:${ratio(m.aspect || aspect)}" data-slot="${esc(id)}">${inner}${vid}</div>`;
  }

  function caption(m) {
    if (!m || (!m.caption && !m.credit)) return '';
    return `<div class="figcap">${m.caption ? `<span>${esc(m.caption)}</span>` : ''}${m.credit ? `<span class="credit" title="${esc(m.credit)}">${esc(m.credit)}</span>` : ''}</div>`;
  }

  function chip(card) {
    if (card.duration) return ` <span class="chip">${ICON.play}${esc(card.duration)}</span>`;
    if (card.gallery) return ` <span class="chip">${ICON.gallery}Gallery</span>`;
    return '';
  }

  function tag(card) {
    if (!card.tag) return '';
    return `<span class="tag${card.tagStyle ? ` tag-${esc(card.tagStyle)}` : ''}">${esc(card.tag)}</span>`;
  }

  function headline(card, size, el = 'h3') {
    return `<${el} class="hl hl-${card.size || size}"><a ${linkAttrs(card)}>${esc(text(card.headline))}</a>${chip(card)}</${el}>`;
  }

  function mediaLink(card, opts) {
    return `<a class="media-link" ${linkAttrs(card)} tabindex="-1" aria-hidden="true">${media(card.media, opts)}</a>`;
  }

  // Logo: an image when nav.logoImage is set, otherwise the dot + text wordmark.
  function logo() {
    const nav = (C.sections || []).find((x) => x.type === 'nav') || {};
    return nav.logoImage
      ? `<a class="logo logo-img" href="#"><img src="${esc(nav.logoImage)}" alt="${esc(nav.logo)}"></a>`
      : `<a class="logo" href="#"><span class="logo-dot"></span>${esc(nav.logo || 'DIGITAL')}</a>`;
  }

  // Related link under the hero: icon disc, headline, meta (duration or "Gallery") on the right.
  function relatedRow(r) {
    const icon = r.gallery ? ICON.gallery : ICON.play;
    const meta = r.duration || (r.gallery ? 'Gallery' : '');
    return `<li><a class="rel" ${linkAttrs(r)}><span class="rel-icon">${icon}</span>` +
      `<span class="rel-hl">${esc(text(r.headline))}</span>${meta ? `<span class="rel-meta">${esc(meta)}</span>` : ''}</a></li>`;
  }

  const label = (t) => (t ? `<h2 class="label">${esc(t)}</h2>` : '');

  /* ---------- column items ---------- */

  const ITEMS = {
    card: (c) =>
      `<article class="card">${c.media ? mediaLink(c, { aspect: c.aspect }) + caption(c.media) : ''}${tag(c)}${headline(c, 'md')}</article>`,

    thumb: (c) =>
      `<article class="thumb">${mediaLink(c, { aspect: c.aspect, badge: false })}<div>${tag(c)}${headline(c, 'sm')}</div></article>`,

    text: (c) => `<article class="textrow">${tag(c)}${headline(c, 'sm')}</article>`,

    overlay: (c) =>
      `<article class="overlay${c.rule ? ' has-rule' : ''}"><a class="ov-link" ${linkAttrs(c)}>${media(c.media, { aspect: c.aspect })}` +
      `<div class="ov-text">${c.rule ? '<span class="ov-rule"></span>' : ''}${tag(c)}<h3 class="hl hl-${c.size || 'xl'}">${esc(text(c.headline))}</h3></div></a>${caption(c.media)}</article>`,

    promo: (c) =>
      `<article class="promo"><a class="ov-link" ${linkAttrs(c)}>${media(c.media, { aspect: c.aspect })}` +
      `<div class="promo-title">${c.kicker ? `<span class="promo-kicker">${esc(c.kicker)}</span>` : ''}<strong>${esc(c.title)}</strong></div></a>${headline(c, 'md')}</article>`,

    lead: (c) =>
      `<article class="lead">${headline(c, 'xxl', 'h1')}${mediaLink(c, { aspect: c.aspect })}${caption(c.media)}` +
      `${c.deck ? `<p class="deck"><a ${linkAttrs(c)}>${esc(c.deck)}</a></p>` : ''}` +
      `${(c.related || []).length ? `<ul class="related">${c.related.map(relatedRow).join('')}</ul>` : ''}</article>`,

    // If any card in the row has a tag, the others get a blank one so headlines line up.
    row: (c) => {
      const items = c.items || [];
      const anyTag = items.some((x) => x.tag);
      return `<div class="row" style="--n:${items.length || 1}">${items.map((x) =>
        ITEMS.card({ size: 'sm', ...x, tag: x.tag || (anyTag ? ' ' : '') })).join('')}</div>`;
    },

    label: (c) => label(c.text)
  };

  function item(it) {
    const fn = ITEMS[it.kind || 'card'];
    if (!fn) {
      console.warn(`Unknown item kind "${it.kind}"`);
      return '';
    }
    return fn(it);
  }

  function columns(cols, variant) {
    const spans = cols.map((c, i) => (c && c.span) || (COLUMN_SPANS[variant] || [])[i] || 1);
    const tpl = spans.map((s) => `minmax(0, ${s}fr)`).join(' ');
    const html = cols.map((c) => {
      if (!c) return '<div class="col col-empty"></div>';
      const thumb = c.thumb || THUMB_WIDTH[variant] || '120px';
      return `<div class="col" style="--thumb:${esc(thumb)}">${label(c.label)}${(c.items || []).map(item).join('')}</div>`;
    }).join('');
    return `<div class="cols cols-${variant}" style="--cols:${tpl}">${html}</div>`;
  }

  /* ---------- section renderers ---------- */

  const SECTIONS = {
    nav(s) {
      const links = (s.links || []).map((l) =>
        `<li><a href="${esc(l.href || '#')}">${esc(l.text)}${l.dropdown ? ` ${ICON.caret}` : ''}</a></li>`).join('');
      return `<header class="nav"><div class="wrap">
        <button class="nav-burger" type="button" aria-label="Menu" aria-expanded="false">${ICON.burger}</button>
        ${logo()}
        <ul class="nav-links">${links}</ul>
        <div class="nav-right">
          <a href="#" class="nav-watch"><span class="live-dot"></span><span class="nav-txt">${esc(s.watch)}</span></a>
          <a href="#" class="nav-listen">${ICON.headphones}<span class="nav-txt">${esc(s.listen)}</span></a>
          <button class="icon-btn" type="button" aria-label="Search">${ICON.search}</button>
          <button class="btn-signin" type="button">${esc(s.signIn)}</button>
        </div>
      </div></header>`;
    },

    breaking(s) {
      if (s.enabled === false) return '';
      return `<div class="breaking"><div class="wrap">
        <span class="pill"><span class="pulse"></span>${esc(s.label || 'Breaking')}</span>
        <a class="breaking-hl" href="${esc(s.href || '#story/lead')}">${esc(text(s.headline))}</a>
        ${s.updated ? `<span class="breaking-time">${esc(s.updated)}</span>` : ''}
      </div></div>`;
    },

    ticker(s) {
      if (s.enabled === false || !(s.items || []).length) return '';
      const run = s.items.map((t) => `<span class="ticker-item">${esc(t)}</span><span class="ticker-sep">•</span>`).join('');
      const dur = s.items.length * (s.secondsPerItem || 9);
      return `<div class="ticker" role="marquee" aria-label="Latest headlines"><div class="ticker-track" style="--dur:${dur}s">${run}<span aria-hidden="true" class="ticker-dupe">${run}</span></div></div>`;
    },

    trending(s) {
      const items = (s.items || []).slice(0, s.max || undefined);
      return `<nav class="trending" aria-label="Trending"><div class="wrap"><ul>${items.map((t) =>
        `<li><a href="${esc(t.href || '#')}">${esc(t.text)}</a></li>`).join('')}</ul></div></nav>`;
    },

    hero: (s) => `<div class="wrap">${columns(s.columns || [], 'hero')}</div>`,
    band: (s) => `<div class="wrap ruled">${columns(s.columns || [], 'band')}</div>`,
    wide: (s) => `<div class="wrap ruled">${columns(s.columns || [], 'wide')}</div>`,

    grid(s) {
      return (s.rows || []).map((row) => {
        const cells = [...row];
        while (cells.length < 3) cells.push(null);
        return `<div class="wrap ruled grid-row">${columns(cells, 'grid')}</div>`;
      }).join('');
    },

    shorts(s) {
      const cardsHtml = (s.cards || []).map((c) => {
        const m = { aspect: '9:16', ...c.media };
        return `<article class="short"><a class="ov-link" ${linkAttrs(c)}>${media(m, { badge: false })}
          <div class="ov-text"><h3 class="hl hl-sm">${esc(text(c.headline))}</h3>${c.duration ? `<span class="short-dur">${ICON.play}${esc(c.duration)}</span>` : ''}</div></a></article>`;
      }).join('');
      return `<div class="wrap ruled"><h2 class="shorts-title">${esc(s.title)}</h2>
        <div class="shorts-viewport"><div class="shorts-track">${cardsHtml}</div>
        <button class="shorts-next" type="button" aria-label="Scroll videos">${ICON.chevron}</button></div></div>`;
    },

    archive(s) {
      return `<div class="wrap ruled">${label(s.label)}<div class="archive-row">${(s.cards || []).map((c) =>
        ITEMS.card({ size: 'sm', ...c, media: { aspect: '4:3', ...c.media } })).join('')}</div></div>`;
    },

    morefrom(s) {
      return `<div class="wrap"><h2 class="shorts-title">${esc(s.title)}</h2>${columns(s.columns || [], 'morefrom')}</div>`;
    },

    footer(s) {
      const rows = (s.directory || []).map((row) => `<div class="f-row">${row.map((g) =>
        `<div class="f-group"><h4><a href="#">${esc(g.heading)}</a></h4><ul>${(g.links || []).map((l) =>
          `<li><a href="#">${esc(l)}</a></li>`).join('')}</ul></div>`).join('')}</div>`).join('');
      const social = Array.from({ length: s.socialCount ?? 5 }, (_, i) =>
        `<a class="soc" href="#" aria-label="Social link ${i + 1}"><svg viewBox="0 0 24 24" width="12" height="12">${SOCIAL_GLYPHS[i % SOCIAL_GLYPHS.length]}</svg></a>`).join('');
      return `<div class="wrap">
        <form class="f-search" role="search" onsubmit="return false"><input type="search" placeholder="${esc(s.searchPlaceholder)}" aria-label="Search"><button type="submit" aria-label="Search">${ICON.search}</button></form>
        <div class="f-dir">${rows}</div>
        <div class="f-bottom">
          ${logo()}
          <ul class="f-links">${(s.bottomLinks || []).map((l) => `<li><a href="#">${esc(l)}</a></li>`).join('')}</ul>
          <div class="f-follow"><span>${esc(s.followLabel)}</span>${social}</div>
        </div>
        <ul class="f-legal">${(s.legal || []).map((l) => `<li><a href="#">${esc(l)}</a></li>`).join('')}</ul>
        <p class="f-copy">${esc(s.copyright)}</p>
      </div>`;
    }
  };

  const TAG = { nav: null, breaking: null, ticker: null, trending: null, footer: 'footer' };

  function renderSection(s, i) {
    const fn = SECTIONS[s.type];
    if (!fn) {
      console.warn(`Unknown section type "${s.type}"`);
      return '';
    }
    const html = fn(s);
    if (!html) return '';
    if (TAG[s.type] === null) return html;
    const el = TAG[s.type] || 'section';
    return `<${el} class="sec sec-${esc(s.type)}" id="${esc(s.id || `${s.type}-${i}`)}">${html}</${el}>`;
  }

  /* ---------- story dialog ---------- */

  const dialog = document.getElementById('story');

  function openStory(id, card) {
    const story = (C.stories || {})[id];
    const body = dialog.querySelector('.story-inner');
    if (story) {
      body.innerHTML =
        `${story.kicker ? `<span class="story-kicker">${esc(story.kicker)}</span>` : ''}
         <h1 id="story-title">${esc(text(story.headline))}</h1>
         <p class="story-meta">${esc([story.byline, story.updated].filter(Boolean).join(' · '))}</p>
         ${story.media ? media(story.media) + caption(story.media) : ''}
         ${(story.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('')}`;
    } else {
      const c = card || {};
      body.innerHTML =
        `<span class="story-kicker">Developing story</span>
         <h1 id="story-title">${esc(text(c.headline))}</h1>
         <p class="story-meta">Digital News Network</p>
         ${c.media ? media(c.media) + caption(c.media) : ''}
         <p>${esc(C.meta?.storyFallback)}</p>`;
    }
    dialog.showModal();
    dialog.scrollTop = 0;
  }

  /* ---------- behavior ---------- */

  function wire() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#story"]');
      if (a) {
        e.preventDefault();
        const id = a.getAttribute('href').split('/')[1];
        openStory(id, cards[a.dataset.card]);
        return;
      }
      const burger = e.target.closest('.nav-burger');
      if (burger) {
        const nav = burger.closest('.nav');
        const open = nav.classList.toggle('open');
        burger.setAttribute('aria-expanded', String(open));
        return;
      }
      const next = e.target.closest('.shorts-next');
      if (next) {
        const track = next.parentElement.querySelector('.shorts-track');
        const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
        track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + track.clientWidth * 0.8, behavior: 'smooth' });
      }
    });

    dialog.querySelector('.story-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

    // Video slots play on hover.
    document.addEventListener('mouseover', (e) => {
      const v = e.target.closest('.media')?.querySelector('video');
      if (v && v.paused) v.play().catch(() => {});
    });
    document.addEventListener('mouseout', (e) => {
      const box = e.target.closest('.media');
      if (box && !box.contains(e.relatedTarget)) box.querySelector('video')?.pause();
    });

    // A src that points at a missing file falls back to the labeled placeholder.
    document.addEventListener('error', (e) => {
      const el = e.target;
      if (!(el instanceof HTMLImageElement || el instanceof HTMLVideoElement)) return;
      const box = el.closest('.media');
      if (!box) return;
      el.remove();
      box.classList.add('is-empty', 'is-missing');
      box.insertAdjacentHTML('afterbegin', `<span class="slot-id">${esc(box.dataset.slot)} · file not found</span>`);
    }, true);
  }

  // Size the main headline so its single line fills the column width.
  function fitLeadHeadline() {
    document.querySelectorAll('.lead > .hl').forEach((h) => {
      h.classList.add('hl-fit');
      const fit = () => {
        const a = h.querySelector('a');
        let size = 100;
        for (let i = 0; i < 3; i++) {
          h.style.fontSize = `${size}px`;
          const w = a.getBoundingClientRect().width;
          if (!w) return;
          size = (size * h.clientWidth) / w;
        }
        h.style.fontSize = `${Math.max(20, size - 0.25).toFixed(2)}px`;
      };
      fit();
      let lastW = h.clientWidth;
      new ResizeObserver(() => {
        if (h.clientWidth !== lastW) { lastW = h.clientWidth; fit(); }
      }).observe(h.parentElement);
      document.fonts?.ready.then(fit);
    });
  }

  /* ---------- boot ---------- */

  fetch('content.json', { cache: 'no-store' })
    .then((r) => {
      if (!r.ok) throw new Error(`content.json: HTTP ${r.status}`);
      return r.json();
    })
    .then((json) => {
      C = json;
      if (C.meta?.title) document.title = C.meta.title;
      document.getElementById('app').innerHTML = `${(C.sections || []).map(renderSection).join('')}`;
      wire();
      fitLeadHeadline();
    })
    .catch((err) => {
      document.getElementById('app').innerHTML =
        `<p class="load-error">Could not load content.json (${esc(err.message)}). Serve this folder over HTTP, e.g. <code>python3 -m http.server 8000</code>.</p>`;
      console.error(err);
    });
})();
