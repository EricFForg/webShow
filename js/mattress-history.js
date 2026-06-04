(function () {
  const mount = document.getElementById("mattress-history-timeline");
  const data = window.MATTRESS_HISTORY;
  if (!mount || !data?.nodes?.length) return;

  function renderList(items, type) {
    if (!items?.length) return "";
    const label = type === "pros" ? "优点" : "缺点";
    return `
      <div class="mattress-timeline-${type}">
        <h4>${label}</h4>
        <ul>${items.map((t) => `<li>${t}</li>`).join("")}</ul>
      </div>`;
  }

  function renderProsCons(node) {
    if (!node.pros?.length && !node.cons?.length) return "";
    return `
      <aside class="mattress-timeline-proscons" aria-label="${node.title}优缺点">
        ${renderList(node.pros, "pros")}
        ${renderList(node.cons, "cons")}
      </aside>`;
  }

  const nodesHtml = data.nodes
    .map(
      (node, i) => `
      <article class="mattress-timeline-node${node.current ? " mattress-timeline-node-current" : ""}">
        <div class="mattress-timeline-marker" aria-hidden="true">
          <span class="mattress-timeline-dot"></span>
        </div>
        <div class="mattress-timeline-card">
          <figure class="mattress-timeline-media gallery-image-zoomable" role="button" tabindex="0" aria-label="放大查看：${node.title}" data-src="${node.image}" data-alt="${node.title}">
            <img src="${node.image}" alt="${node.title}" loading="${i < 2 ? "eager" : "lazy"}" />
            ${node.current ? '<span class="mattress-timeline-badge">当下</span>' : ""}
          </figure>
          <div class="mattress-timeline-body">
            <div class="mattress-timeline-meta">
              <span class="mattress-timeline-era">${node.era}</span>
              <time class="mattress-timeline-period">${node.period}</time>
            </div>
            <h3>${node.title}</h3>
            <p class="mattress-timeline-key">${node.key}</p>
            <p class="mattress-timeline-desc">${node.desc}</p>
            ${node.imageNote ? `<p class="mattress-timeline-img-note">${node.imageNote}</p>` : ""}
          </div>
          ${renderProsCons(node)}
        </div>
      </article>`
    )
    .join("");

  mount.innerHTML = `
    <p class="mattress-timeline-intro">${data.subtitle}。各节点配图为代表性床垫类型、历史阶段示意或渠道商品主图，供内部展示参考。</p>
    <div class="mattress-timeline" role="list">${nodesHtml}</div>
    <p class="background-sources mattress-timeline-sources">
      史实参考：Slumber Sage / Fawcett Mattress / Nectar 等行业床垫发展史整理；James Marshall 独袋弹簧（约 1900）；Heinrich Westphal 内置弹簧（1871）；NASA 记忆棉（1966）。配图：history/straw-bed.jpg（草垫示意）；mattress-types 商品主图；Unsplash（history/innerspring.jpg、electric.jpg）。
    </p>
  `;

  mount.querySelectorAll(".mattress-timeline-media").forEach((el) => {
    const src = el.dataset.src;
    const alt = el.dataset.alt;
    const open = () => {
      if (typeof window.openImageLightbox === "function") {
        window.openImageLightbox(src, alt);
        return;
      }
      const lb = document.querySelector(".image-lightbox");
      if (!lb) return;
      lb.querySelector("img").src = src;
      lb.querySelector("img").alt = alt;
      lb.querySelector("figcaption").textContent = alt;
      lb.hidden = false;
      document.body.classList.add("lightbox-open");
    };
    el.addEventListener("click", open);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
})();
