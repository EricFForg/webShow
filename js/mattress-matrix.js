(function () {
  const config = window.MATTRESS_MATRIX;
  if (!config?.items?.length) return;

  const chartEl = document.getElementById("mattress-matrix-chart");
  const modalEl = document.getElementById("matrix-detail-modal");
  if (!chartEl || !modalEl) return;

  const pad = { top: 24, right: 28, bottom: 52, left: 58 };
  let plotW = 0;
  let plotH = 0;

  function priceToRatio(price) {
    const min = config.priceMin;
    const max = config.priceMax;
    const clamped = Math.min(Math.max(price, min), max);
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    return (Math.log10(clamped) - logMin) / (logMax - logMin);
  }

  function formatPriceLabel(v) {
    if (v >= 10000) return (v / 10000).toFixed(v % 10000 === 0 ? 0 : 1) + "万";
    if (v >= 1000) return (v / 1000).toFixed(0) + "k";
    return String(v);
  }

  function dotClassName(item) {
    if (item.highlight === "blue") return " matrix-dot-highlight-blue";
    if (item.highlight === "green" || item.id === "ai") return " matrix-dot-highlight";
    return "";
  }

  function buildChart() {
    const w = chartEl.clientWidth || 720;
    const h = Math.max(560, Math.min(680, w * 0.78));
    plotW = w - pad.left - pad.right;
    plotH = h - pad.top - pad.bottom;

    const comfortToX = (c) => pad.left + ((c - config.comfortMin) / (config.comfortMax - config.comfortMin)) * plotW;
    const priceToY = (p) => pad.top + (1 - priceToRatio(p)) * plotH;

    const svgParts = [];
    svgParts.push(
      `<svg class="matrix-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="床垫类型舒适度与价格坐标图">`
    );

    for (let c = 1; c <= 10; c++) {
      const x = comfortToX(c);
      svgParts.push(`<line class="matrix-grid" x1="${x}" y1="${pad.top}" x2="${x}" y2="${pad.top + plotH}" />`);
      if (c % 2 === 0 || c === 1 || c === 10) {
        svgParts.push(`<text class="matrix-tick" x="${x}" y="${h - 18}" text-anchor="middle">${c}</text>`);
      }
    }

    [300, 500, 1000, 2000, 5000, 10000, 25000].forEach((p) => {
      const y = priceToY(p);
      svgParts.push(`<line class="matrix-grid" x1="${pad.left}" y1="${y}" x2="${pad.left + plotW}" y2="${y}" />`);
      svgParts.push(
        `<text class="matrix-tick matrix-tick-y" x="${pad.left - 8}" y="${y + 4}" text-anchor="end">${formatPriceLabel(p)}</text>`
      );
    });

    svgParts.push(`<line class="matrix-axis" x1="${pad.left}" y1="${pad.top + plotH}" x2="${pad.left + plotW}" y2="${pad.top + plotH}" />`);
    svgParts.push(`<line class="matrix-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + plotH}" />`);
    svgParts.push(
      `<text class="matrix-axis-label matrix-axis-x" x="${pad.left + plotW / 2}" y="${h - 2}" text-anchor="middle">舒适度 →（1 最低 · 10 最高）</text>`
    );
    svgParts.push(
      `<text class="matrix-axis-label matrix-axis-y" x="14" y="${pad.top + plotH / 2}" text-anchor="middle" transform="rotate(-90 14 ${pad.top + plotH / 2})">价格 ↑（元）</text>`
    );
    svgParts.push(`</svg>`);

    chartEl.innerHTML = svgParts.join("");

    const plotLayer = document.createElement("div");
    plotLayer.className = "matrix-plot-layer";
    plotLayer.style.left = pad.left + "px";
    plotLayer.style.top = pad.top + "px";
    plotLayer.style.width = plotW + "px";
    plotLayer.style.height = plotH + "px";

    config.items.forEach((item) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "matrix-dot" + dotClassName(item);
      dot.style.left = ((item.comfort - config.comfortMin) / (config.comfortMax - config.comfortMin)) * 100 + "%";
      dot.style.top = (1 - priceToRatio(item.priceMid)) * 100 + "%";
      dot.setAttribute("aria-label", `${item.name}：舒适度 ${item.comfort}，参考价 ${item.priceRange}`);
      dot.innerHTML = `<img src="${item.image}" alt="" /><span class="matrix-dot-label">${item.name}</span>`;
      dot.addEventListener("click", () => openDetail(item));
      plotLayer.appendChild(dot);
    });

    chartEl.appendChild(plotLayer);
  }

  function openDetail(item) {
    modalEl.hidden = false;
    document.body.classList.add("matrix-modal-open");
    modalEl.querySelector(".matrix-modal-img").src = item.image;
    modalEl.querySelector(".matrix-modal-img").alt = item.name;
    modalEl.querySelector(".matrix-modal-title").textContent = item.name;
    modalEl.querySelector(".matrix-modal-comfort").textContent = `舒适度评分：${item.comfort} / 10`;
    modalEl.querySelector(".matrix-modal-price").textContent = `价格区间：${item.priceRange}`;
    modalEl.querySelector(".matrix-modal-hardness").textContent = `软硬度区间：${item.hardnessRange}`;

    const srcEl = modalEl.querySelector(".matrix-modal-source");
    if (srcEl) {
      const src = item.imageSource;
      if (src) {
        const sku = src.sku ? ` · SKU ${src.sku}` : "";
        srcEl.innerHTML = `配图来源：<a href="${src.url}" target="_blank" rel="noopener">${src.platform} · ${src.label}${sku}</a>`;
        srcEl.hidden = false;
      } else {
        srcEl.hidden = true;
      }
    }

    modalEl.querySelector(".matrix-modal-pros").innerHTML = item.pros.map((p) => `<li>${p}</li>`).join("");
    modalEl.querySelector(".matrix-modal-cons").innerHTML = item.cons.map((c) => `<li>${c}</li>`).join("");
  }

  function closeDetail() {
    modalEl.hidden = true;
    document.body.classList.remove("matrix-modal-open");
  }

  modalEl.querySelector(".matrix-modal-backdrop").addEventListener("click", closeDetail);
  modalEl.querySelector(".matrix-modal-close").addEventListener("click", closeDetail);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalEl.hidden) closeDetail();
  });

  buildChart();
  window.addEventListener("resize", () => {
    chartEl.querySelectorAll(".matrix-dot, .matrix-plot-layer").forEach((el) => el.remove());
    chartEl.querySelector(".matrix-svg")?.remove();
    buildChart();
  });
})();
