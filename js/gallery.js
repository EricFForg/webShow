const galleryEl = document.getElementById("gallery-section");

let carouselState = {
  index: 0,
  total: 0,
  track: null,
  dots: [],
  thumbs: [],
};

function flattenStructure(structure) {
  const items = [];
  structure.groups.forEach((group) => {
    group.items.forEach((item) => items.push({ ...item, group: group.name }));
  });
  return items;
}

let lightboxEl = null;

function ensureLightbox() {
  if (lightboxEl) return lightboxEl;

  lightboxEl = document.createElement("div");
  lightboxEl.className = "image-lightbox";
  lightboxEl.hidden = true;
  lightboxEl.innerHTML = `
    <div class="image-lightbox-backdrop" data-lightbox-close></div>
    <figure class="image-lightbox-content">
      <button type="button" class="image-lightbox-close" aria-label="关闭">×</button>
      <img src="" alt="" />
      <figcaption></figcaption>
    </figure>
  `;
  document.body.appendChild(lightboxEl);

  const closeLightbox = () => {
    lightboxEl.hidden = true;
    document.body.classList.remove("lightbox-open");
  };

  lightboxEl.querySelectorAll("[data-lightbox-close], .image-lightbox-close").forEach((el) => {
    el.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightboxEl.hidden) closeLightbox();
  });

  return lightboxEl;
}

function openLightbox(src, alt) {
  const lb = ensureLightbox();
  const img = lb.querySelector("img");
  const caption = lb.querySelector("figcaption");
  img.src = src;
  img.alt = alt;
  caption.textContent = alt;
  lb.hidden = false;
  document.body.classList.add("lightbox-open");
  lb.querySelector(".image-lightbox-close").focus();
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
  const total = carouselState.total;
  if (!total) return;

  const next = ((index % total) + total) % total;
  carouselState.index = next;

  if (carouselState.track) {
    carouselState.track.style.transform = `translateX(-${next * 100}%)`;
  }

  carouselState.dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === next);
    dot.setAttribute("aria-selected", String(i === next));
  });

  carouselState.thumbs.forEach((thumb, i) => {
    thumb.classList.toggle("active", i === next);
    thumb.setAttribute("aria-selected", String(i === next));
    if (i === next) {
      thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  });

  if (carouselState.track) {
    [...carouselState.track.children].forEach((panel, i) => {
      panel.setAttribute("aria-hidden", String(i !== next));
    });
  }

  const counter = galleryEl.querySelector(".gallery-carousel-counter");
  if (counter) counter.textContent = `${next + 1} / ${total}`;

  const live = galleryEl.querySelector(".gallery-carousel-live");
  if (live) {
    const panel = carouselState.track?.children[next];
    const title = panel?.querySelector(".gallery-text h2")?.textContent || "";
    live.textContent = `第 ${next + 1} 张：${title}`;
  }
}

function bindCarouselControls() {
  const prevBtn = galleryEl.querySelector(".gallery-carousel-prev");
  const nextBtn = galleryEl.querySelector(".gallery-carousel-next");

  prevBtn?.addEventListener("click", () => goToSlide(carouselState.index - 1));
  nextBtn?.addEventListener("click", () => goToSlide(carouselState.index + 1));

  carouselState.dots.forEach((dot, i) => {
    dot.addEventListener("click", () => goToSlide(i));
  });

  carouselState.thumbs.forEach((thumb, i) => {
    thumb.addEventListener("click", () => goToSlide(i));
  });

  const viewport = galleryEl.querySelector(".gallery-carousel-viewport");
  if (!viewport) return;

  viewport.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToSlide(carouselState.index - 1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goToSlide(carouselState.index + 1);
    }
  });

  let touchStartX = 0;
  viewport.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].clientX;
    },
    { passive: true }
  );
  viewport.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) < 48) return;
      goToSlide(carouselState.index + (dx < 0 ? 1 : -1));
    },
    { passive: true }
  );
}

function buildGallery(structure, images) {
  galleryEl.innerHTML = "";
  galleryEl.className = "content-card gallery-carousel-section";
  galleryEl.id = "gallery-section";

  const panelsHtml = images
    .map((item, index) => {
      const groupTag = item.group ? `<span class="gallery-group">${item.group}</span>` : "";
      return `
        <article class="gallery-panel" data-slide="${index}" aria-hidden="${index === 0 ? "false" : "true"}">
          <div class="gallery-image">
            <img src="${item.path}" alt="${item.name}" loading="${index === 0 ? "eager" : "lazy"}" />
          </div>
          <div class="gallery-text">
            ${groupTag}
            <h2>${item.name}</h2>
            <p>${item.desc || ""}</p>
          </div>
        </article>
      `;
    })
    .join("");

  const dotsHtml = images
    .map(
      (_, i) =>
        `<button type="button" class="gallery-carousel-dot${i === 0 ? " active" : ""}" aria-label="第 ${i + 1} 张" aria-selected="${i === 0}"></button>`
    )
    .join("");

  const thumbsHtml = images
    .map(
      (item, i) => `
        <button type="button" class="gallery-thumb${i === 0 ? " active" : ""}" aria-label="${item.name}" aria-selected="${i === 0}" title="${item.name}">
          <img src="${item.path}" alt="" loading="lazy" />
        </button>
      `
    )
    .join("");

  galleryEl.innerHTML = `
    <header class="section-header">
      <h1>${structure.name}</h1>
      <p>点击上方预览图或左右按钮切换 · 点击图片可放大 · 共 ${images.length} 张结构示意</p>
    </header>
    <div class="gallery-carousel" aria-roledescription="carousel">
      <p class="gallery-carousel-live visually-hidden" aria-live="polite"></p>
      <div class="gallery-thumbs-wrap">
        <div class="gallery-thumbs" role="tablist" aria-label="结构概念图预览">${thumbsHtml}</div>
      </div>
      <div class="gallery-carousel-viewport" tabindex="0">
        <div class="gallery-carousel-track">${panelsHtml}</div>
      </div>
      <div class="gallery-carousel-controls">
        <button type="button" class="gallery-carousel-btn gallery-carousel-prev" aria-label="上一张">‹</button>
        <div class="gallery-carousel-dots" role="tablist" aria-label="结构概念图轮播">${dotsHtml}</div>
        <span class="gallery-carousel-counter">1 / ${images.length}</span>
        <button type="button" class="gallery-carousel-btn gallery-carousel-next" aria-label="下一张">›</button>
      </div>
    </div>
  `;

  carouselState.total = images.length;
  carouselState.track = galleryEl.querySelector(".gallery-carousel-track");
  carouselState.dots = [...galleryEl.querySelectorAll(".gallery-carousel-dot")];
  carouselState.thumbs = [...galleryEl.querySelectorAll(".gallery-thumb")];
  carouselState.index = 0;

  images.forEach((item, index) => {
    const panel = carouselState.track.children[index];
    bindImageZoom(panel.querySelector(".gallery-image"), item);
  });

  bindCarouselControls();
  goToSlide(0);
  initNavSpy();
}

function initNavSpy() {
  const links = document.querySelectorAll(".sidebar-nav .nav-link");
  const sectionIds = new Set([...links].map((link) => link.getAttribute("href").slice(1)));
  const sections = [...sectionIds].map((id) => document.getElementById(id)).filter(Boolean);

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
        });
      });
    },
    { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
}

function initAudienceZoom() {
  document.querySelectorAll(".audience-card-media").forEach((wrap) => {
    const img = wrap.querySelector("img");
    if (!img) return;
    bindImageZoom(wrap, { path: img.getAttribute("src"), name: img.getAttribute("alt") || "" });
  });
}

function initGallery() {
  const structure = window.ASSETS?.structureAnalysis;
  if (!structure?.groups?.length) {
    console.error("未找到结构概念图配置，请确认 assets/config.js 已正确加载");
    return;
  }

  const images = flattenStructure(structure);
  window.ASSETS.images = images;
  buildGallery(structure, images);
  initAudienceZoom();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGallery);
} else {
  initGallery();
}
