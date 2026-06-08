(function () {
  const config = window.SKU_COMPETITION_MAP;
  if (!config?.items?.length) return;

  const chartEl = document.getElementById("sku-competition-chart");
  const modalEl = document.getElementById("sku-map-detail-modal");
  if (!chartEl || !modalEl) return;

  const pad = { top: 32, right: 40, bottom: 62, left: 76 };
  const smartMin = 1;
  const smartMax = 4;
  const spineMin = 1;
  const spineMax = 4;
  const plotInset = 0.07;
  const minSep = 0.11;

  function levelLabel(list, level) {
    return list.find((x) => x.level === level)?.label || String(level);
  }

  function scoreToRatio(score, min, max) {
    const t = (score - min) / (max - min);
    return plotInset + t * (1 - 2 * plotInset);
  }

  function dotClassName(item) {
    if (item.highlight === "ours") return " matrix-dot-highlight-blue";
    return "";
  }

  function resolvePositions(items, plotW, plotH) {
    const dotPx = 44;
    const minPx = dotPx * 1.35;
    const pts = items.map((item) => ({
      item,
      x: scoreToRatio(item.smartScore ?? item.smartLevel, smartMin, smartMax),
      y: 1 - scoreToRatio(item.spineScore ?? item.spineLevel, spineMin, spineMax),
    }));

    const minNorm = minPx / Math.min(plotW, plotH);
    for (let iter = 0; iter < 80; iter++) {
      let moved = false;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[j].x - pts[i].x;
          const dy = pts[j].y - pts[i].y;
          const dist = Math.hypot(dx, dy) || 0.001;
          if (dist >= minNorm) continue;
          const push = (minNorm - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          pts[i].x -= ux * push;
          pts[i].y -= uy * push;
          pts[j].x += ux * push;
          pts[j].y += uy * push;
          moved = true;
        }
      }
      pts.forEach((p) => {
        p.x = Math.min(1 - plotInset, Math.max(plotInset, p.x));
        p.y = Math.min(1 - plotInset, Math.max(plotInset, p.y));
      });
      if (!moved) break;
    }
    return pts;
  }

  function buildChart() {
    chartEl.querySelectorAll(".matrix-dot, .matrix-plot-layer, .matrix-svg").forEach((el) => el.remove());

    const w = chartEl.clientWidth || 760;
    const h = Math.max(540, Math.min(680, w * 0.85));
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    const smartToX = (s) => pad.left + scoreToRatio(s, smartMin, smartMax) * plotW;
    const spineToY = (s) => pad.top + (1 - scoreToRatio(s, spineMin, spineMax)) * plotH;

    const svgParts = [
      `<svg class="matrix-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="5000至12000元床垫竞品智能与护脊坐标图">`,
    ];

    for (let i = smartMin; i <= smartMax; i++) {
      const x = smartToX(i);
      svgParts.push(`<line class="matrix-grid" x1="${x}" y1="${pad.top}" x2="${x}" y2="${pad.top + plotH}" />`);
      const meta = config.smartLevels[i - 1];
      svgParts.push(
        `<text class="matrix-tick" x="${x}" y="${h - 28}" text-anchor="middle">${i} ${meta?.label || ""}</text>`
      );
    }

    for (let i = spineMin; i <= spineMax; i++) {
      const y = spineToY(i);
      svgParts.push(`<line class="matrix-grid" x1="${pad.left}" y1="${y}" x2="${pad.left + plotW}" y2="${y}" />`);
      const meta = config.spineLevels[i - 1];
      svgParts.push(
        `<text class="matrix-tick matrix-tick-y" x="${pad.left - 10}" y="${y + 4}" text-anchor="end">${i} ${meta?.label || ""}</text>`
      );
    }

    svgParts.push(
      `<rect class="sku-map-plot-bg" x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" rx="4" />`
    );
    svgParts.push(
      `<line class="matrix-axis" x1="${pad.left}" y1="${pad.top + plotH}" x2="${pad.left + plotW}" y2="${pad.top + plotH}" />`
    );
    svgParts.push(
      `<line class="matrix-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + plotH}" />`
    );
    svgParts.push(
      `<text class="matrix-axis-label matrix-axis-x" x="${pad.left + plotW / 2}" y="${h - 4}" text-anchor="middle">智能等级 →（1 无 · 2 电动抬升 · 3 智能软硬度 · 4 AI+报告）</text>`
    );
    svgParts.push(
      `<text class="matrix-axis-label matrix-axis-y" x="16" y="${pad.top + plotH / 2}" text-anchor="middle" transform="rotate(-90 16 ${pad.top + plotH / 2})">护脊等级 ↑（1 无分区 · 4 自适应分区）</text>`
    );
    svgParts.push("</svg>");

    chartEl.insertAdjacentHTML("afterbegin", svgParts.join(""));

    const plotLayer = document.createElement("div");
    plotLayer.className = "matrix-plot-layer";
    plotLayer.style.left = pad.left + "px";
    plotLayer.style.top = pad.top + "px";
    plotLayer.style.width = plotW + "px";
    plotLayer.style.height = plotH + "px";

    const positioned = resolvePositions(config.items, plotW, plotH);

    positioned.forEach(({ item, x, y }) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "matrix-dot sku-map-dot" + dotClassName(item);
      dot.style.left = x * 100 + "%";
      dot.style.top = y * 100 + "%";
      dot.setAttribute(
        "aria-label",
        `销量第 ${item.rank}：${item.brand} ${item.name}，智能 ${item.smartLevel} 护脊 ${item.spineLevel}`
      );

      const imgSrc = item.image || "";
      dot.innerHTML = imgSrc
        ? `<img src="${imgSrc}" alt="" loading="lazy" decoding="async" /><span class="matrix-dot-rank">#${item.rank}</span>`
        : `<span class="sku-map-fallback">${item.brand.slice(0, 1)}</span><span class="matrix-dot-rank">#${item.rank}</span>`;

      const img = dot.querySelector("img");
      if (img) {
        img.addEventListener("error", () => {
          img.remove();
          const fb = document.createElement("span");
          fb.className = "sku-map-fallback";
          fb.textContent = item.brand.slice(0, 1);
          dot.insertBefore(fb, dot.firstChild);
        });
      }

      dot.addEventListener("click", () => openDetail(item));
      plotLayer.appendChild(dot);
    });

    chartEl.appendChild(plotLayer);
  }

  function openDetail(item) {
    modalEl.hidden = false;
    document.body.classList.add("matrix-modal-open");

    const imgEl = modalEl.querySelector(".matrix-modal-img");
    if (item.image) {
      imgEl.src = item.image;
      imgEl.hidden = false;
    } else {
      imgEl.hidden = true;
    }
    imgEl.alt = item.name;

    modalEl.querySelector(".matrix-modal-title").textContent = `#${item.rank} · ${item.brand} ${item.name}`;
    modalEl.querySelector(".sku-map-modal-rank").textContent = `销量排序：第 ${item.rank} 位（${config.priceMin.toLocaleString()}–${config.priceMax.toLocaleString()} 元档）`;
    modalEl.querySelector(".sku-map-modal-price").textContent = `参考价：¥${item.price.toLocaleString()}（${item.priceNote || "主流规格"}）`;
    modalEl.querySelector(".sku-map-modal-platform").textContent = `采集平台：${item.platform}`;
    modalEl.querySelector(".sku-map-modal-sales").textContent = item.salesNote || "—";
    modalEl.querySelector(".sku-map-modal-smart").textContent =
      `智能等级 ${item.smartLevel}：${levelLabel(config.smartLevels, item.smartLevel)}`;
    modalEl.querySelector(".sku-map-modal-spine").textContent =
      `护脊等级 ${item.spineLevel}：${levelLabel(config.spineLevels, item.spineLevel)}`;
    modalEl.querySelector(".sku-map-modal-specs").textContent = item.specs || "—";

    const linkEl = modalEl.querySelector(".sku-map-modal-link");
    if (item.url && item.url.startsWith("#")) {
      linkEl.href = item.url;
      linkEl.removeAttribute("target");
      linkEl.textContent = item.highlight === "ours" ? "查看本品定义" : "页面内跳转";
      linkEl.hidden = false;
    } else if (item.url) {
      linkEl.href = item.url;
      linkEl.target = "_blank";
      linkEl.rel = "noopener";
      linkEl.textContent = item.sku ? `查看来源（SKU ${item.sku}）` : "查看商品页";
      linkEl.hidden = false;
    } else {
      linkEl.hidden = true;
    }
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
  window.addEventListener("resize", buildChart);
})();
