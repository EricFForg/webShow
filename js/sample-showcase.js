(function () {
  const sectionEl = document.getElementById("sample-section");
  if (!sectionEl) return;

  const config = window.SAMPLE_SHOWCASE;
  if (!config?.items?.length) {
    console.error("未找到样件展示配置，请确认 assets/sample-showcase.js 已加载");
    return;
  }

  let state = { index: 0, total: 0, track: null, dots: [], thumbs: [] };

  function ensureLightbox() {
    if (window.__sampleLightbox) return window.__sampleLightbox;

    const lb = document.createElement("div");
    lb.className = "image-lightbox";
    lb.hidden = true;
    lb.innerHTML = `
      <div class="image-lightbox-backdrop" data-lightbox-close></div>
      <figure class="image-lightbox-content">
        <button type="button" class="image-lightbox-close" aria-label="关闭">×</button>
        <img src="" alt="" />
        <figcaption></figcaption>
      </figure>
    `;
    document.body.appendChild(lb);

    const close = () => {
      lb.hidden = true;
      document.body.classList.remove("lightbox-open");
    };
    lb.querySelectorAll("[data-lightbox-close], .image-lightbox-close").forEach((el) => {
      el.addEventListener("click", close);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !lb.hidden) close();
    });

    window.__sampleLightbox = lb;
    return lb;
  }

  function openLightbox(src, alt) {
    const lb = ensureLightbox();
    lb.querySelector("img").src = src;
    lb.querySelector("img").alt = alt;
    lb.querySelector("figcaption").textContent = alt;
    lb.hidden = false;
    document.body.classList.add("lightbox-open");
  }

  function bindImageZoom(wrap, item) {
    wrap.classList.add("gallery-image-zoomable");
    wrap.setAttribute("role", "button");
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("aria-label", `放大查看：${item.name}`);
    const open = () => openLightbox(item.path, item.name);
    wrap.addEventListener("click", open);
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  }

  function goToSlide(index) {
    const total = state.total;
    if (!total) return;

    const next = ((index % total) + total) % total;
    state.index = next;

    if (state.track) {
      state.track.style.transform = `translateX(-${next * 100}%)`;
    }

    state.dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === next);
      dot.setAttribute("aria-selected", String(i === next));
    });

    state.thumbs.forEach((thumb, i) => {
      thumb.classList.toggle("active", i === next);
      thumb.setAttribute("aria-selected", String(i === next));
      if (i === next) {
        thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    });

    if (state.track) {
      [...state.track.children].forEach((panel, i) => {
        panel.setAttribute("aria-hidden", String(i !== next));
      });
    }

    const counter = sectionEl.querySelector(".gallery-carousel-counter");
    if (counter) counter.textContent = `${next + 1} / ${total}`;

    const live = sectionEl.querySelector(".gallery-carousel-live");
    if (live) {
      const panel = state.track?.children[next];
      const title = panel?.querySelector(".gallery-text h2")?.textContent || "";
      live.textContent = `第 ${next + 1} 张：${title}`;
    }
  }

  function bindCarouselControls() {
    sectionEl.querySelector(".gallery-carousel-prev")?.addEventListener("click", () => goToSlide(state.index - 1));
    sectionEl.querySelector(".gallery-carousel-next")?.addEventListener("click", () => goToSlide(state.index + 1));

    state.dots.forEach((dot, i) => dot.addEventListener("click", () => goToSlide(i)));
    state.thumbs.forEach((thumb, i) => thumb.addEventListener("click", () => goToSlide(i)));

    const viewport = sectionEl.querySelector(".gallery-carousel-viewport");
    if (!viewport) return;

    viewport.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToSlide(state.index - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goToSlide(state.index + 1);
      }
    });

    let touchStartX = 0;
    viewport.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    viewport.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) < 48) return;
      goToSlide(state.index + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  function buildShowcase() {
    const items = config.items;

    const panelsHtml = items
      .map(
        (item, index) => `
        <article class="gallery-panel" data-slide="${index}" aria-hidden="${index === 0 ? "false" : "true"}">
          <div class="gallery-image">
            <img src="${item.path}" alt="${item.name}" loading="${index === 0 ? "eager" : "lazy"}" />
          </div>
          <div class="gallery-text">
            <h2>${item.name}</h2>
            <p>${item.desc}</p>
          </div>
        </article>`
      )
      .join("");

    const dotsHtml = items
      .map(
        (_, i) =>
          `<button type="button" class="gallery-carousel-dot${i === 0 ? " active" : ""}" aria-label="第 ${i + 1} 张" aria-selected="${i === 0}"></button>`
      )
      .join("");

    const thumbsHtml = items
      .map(
        (item, i) => `
        <button type="button" class="gallery-thumb${i === 0 ? " active" : ""}" aria-label="${item.name}" aria-selected="${i === 0}" title="${item.name}">
          <img src="${item.path}" alt="" loading="lazy" />
        </button>`
      )
      .join("");

    sectionEl.className = "content-card gallery-carousel-section sample-showcase-section";
    sectionEl.innerHTML = `
      <header class="section-header">
        <h1>${config.name}</h1>
        <p>${config.subtitle} · 点击预览图或左右按钮切换 · 点击图片可放大 · 共 ${items.length} 张</p>
      </header>
      <p class="sample-showcase-intro">
        以下为项目打样阶段实物照片，对应结构概念图中的气囊分层、气路布管与电控集成方案，便于对照设计图纸理解从概念到样件的落地过程。
      </p>
      <div class="gallery-carousel" aria-roledescription="carousel">
        <p class="gallery-carousel-live visually-hidden" aria-live="polite"></p>
        <div class="gallery-thumbs-wrap">
          <div class="gallery-thumbs" role="tablist" aria-label="样件预览">${thumbsHtml}</div>
        </div>
        <div class="gallery-carousel-viewport" tabindex="0">
          <div class="gallery-carousel-track">${panelsHtml}</div>
        </div>
        <div class="gallery-carousel-controls">
          <button type="button" class="gallery-carousel-btn gallery-carousel-prev" aria-label="上一张">‹</button>
          <div class="gallery-carousel-dots" role="tablist" aria-label="样件轮播">${dotsHtml}</div>
          <span class="gallery-carousel-counter">1 / ${items.length}</span>
          <button type="button" class="gallery-carousel-btn gallery-carousel-next" aria-label="下一张">›</button>
        </div>
      </div>
    `;

    state.total = items.length;
    state.track = sectionEl.querySelector(".gallery-carousel-track");
    state.dots = [...sectionEl.querySelectorAll(".gallery-carousel-dot")];
    state.thumbs = [...sectionEl.querySelectorAll(".gallery-thumb")];
    state.index = 0;

    items.forEach((item, index) => {
      bindImageZoom(state.track.children[index].querySelector(".gallery-image"), item);
    });

    bindCarouselControls();
    goToSlide(0);

    if (typeof window.initNavSpy === "function") window.initNavSpy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildShowcase);
  } else {
    buildShowcase();
  }
})();
