(function () {
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

  window.openImageLightbox = openLightbox;

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

  function initAudienceZoom() {
    document.querySelectorAll(".audience-card-media").forEach((wrap) => {
      const img = wrap.querySelector("img");
      if (!img) return;
      bindImageZoom(wrap, { path: img.getAttribute("src"), name: img.getAttribute("alt") || "" });
    });
  }

  function init() {
    initAudienceZoom();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.bindImageZoom = bindImageZoom;
})();
