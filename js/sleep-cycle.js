(function () {
  const root = document.getElementById("sleep-cycle-section");
  const stage = document.getElementById("sleep-cycle-stage");
  const curveWrap = document.getElementById("sleep-cycle-curve-wrap");
  if (!root || !stage || !curveWrap) return;

  const pathActive = document.getElementById("sleep-cycle-path-active");
  const pathBg = document.getElementById("sleep-cycle-path-bg");
  const marker = document.getElementById("sleep-cycle-marker");
  const markerGlow = document.getElementById("sleep-cycle-marker-glow");
  const clockTime = document.getElementById("sleep-cycle-clock-time");
  const clockMeridiem = document.getElementById("sleep-cycle-clock-meridiem");
  const phaseTag = document.getElementById("sleep-cycle-phase-tag");
  const phaseRange = document.getElementById("sleep-cycle-phase-range");
  const phaseTitle = document.getElementById("sleep-cycle-phase-title");
  const phaseDesc = document.getElementById("sleep-cycle-phase-desc");

  const PHASES = [
    {
      id: "wind",
      start: 0,
      end: 120,
      label: "放松释压",
      range: "20:00 – 22:00",
      title: "气囊轻微起伏，舒缓身体压力",
      desc: "上床后进入预睡眠模式：各分区气囊以低幅度、低频率缓慢起伏，帮助肩背与臀部释压。电机运行于睡眠模式噪声限值内（<30 dB(A)）。",
    },
    {
      id: "drowse",
      start: 120,
      end: 210,
      label: "入睡过渡",
      range: "22:00 – 23:30",
      title: "睡意开始了，软硬度缓慢锁定",
      desc: "体动减少、呼吸趋缓后，逐步降低气泵与阀体工作频率，起伏幅度收窄；各分区软硬度按记忆 / 自适应目标渐变至稳定值。",
    },
    {
      id: "deep",
      start: 210,
      end: 480,
      label: "深度睡眠",
      range: "23:30 – 04:00",
      title: "微压模式，防止局部压迫",
      desc: "进入深睡后切换微压模式：仅在局部压力持续偏高时，以极慢速、极小步长微调对应分区，防止局部压力集中导致睡眠中断；其余时间保持静止。",
    },
    {
      id: "rem",
      start: 480,
      end: 660,
      label: "快速眼动（REM）",
      range: "04:00 – 07:00",
      title: "停止调节，让身体自然恢复",
      desc: "REM 阶段暂停主动充放气，维持当前支撑面，避免机械扰动打断梦境与记忆巩固；后台记录体动与分期数据。",
    },
    {
      id: "wake",
      start: 660,
      end: 780,
      label: "智能唤醒",
      range: "07:00 – 09:00",
      title: "海浪式起伏，按偏好轻柔叫醒",
      desc: "在起床窗口内结合浅睡检测：气囊起伏由慢到快、由弱到强，模拟海浪轻拍；可在 App 中设定强度与时长，无闹钟铃声自然醒转。",
    },
  ];

  const TOTAL_MIN = 780;
  const START_HOUR = 20;
  const WHEEL_SENSITIVITY = 1 / 1400;
  const CURVE = {
    x0: 48,
    x1: 752,
    centerY: 228,
    amplitude: 36,
    cycles: 1.25,
    samples: 96,
  };
  const TICK_MARKS = [
    { min: 0, label: "20:00" },
    { min: 120, label: "22:00" },
    { min: 210, label: "23:30" },
    { min: 480, label: "04:00" },
    { min: 660, label: "07:00" },
    { min: 780, label: "09:00" },
  ];
  let pathLen = 0;
  let progress = 0;
  let pointerInCurve = false;

  function curvePoint(t) {
    const x = CURVE.x0 + t * (CURVE.x1 - CURVE.x0);
    const y = CURVE.centerY - CURVE.amplitude * Math.sin(2 * Math.PI * CURVE.cycles * t);
    return { x, y };
  }

  function buildCurvePath() {
    const parts = [];
    for (let i = 0; i <= CURVE.samples; i++) {
      const { x, y } = curvePoint(i / CURVE.samples);
      parts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return parts.join(" ");
  }

  function renderTicks() {
    const ticksG = document.querySelector(".sleep-cycle-ticks");
    const labelsG = document.querySelector(".sleep-cycle-time-labels");
    if (!ticksG || !labelsG) return;

    ticksG.innerHTML = "";
    labelsG.innerHTML = "";

    TICK_MARKS.forEach(({ min, label }) => {
      const { x, y } = curvePoint(min / TOTAL_MIN);
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("class", "sleep-cycle-tick");
      circle.setAttribute("cx", String(x));
      circle.setAttribute("cy", String(y));
      circle.setAttribute("r", "4");
      ticksG.appendChild(circle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(x));
      text.setAttribute("y", String(y + 32));
      text.textContent = label;
      if (min === 0) text.setAttribute("text-anchor", "start");
      else if (min === TOTAL_MIN) text.setAttribute("text-anchor", "end");
      else text.setAttribute("text-anchor", "middle");
      labelsG.appendChild(text);
    });
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function minutesToDisplayFixed(totalMin) {
    const minsFromMidnight = (START_HOUR * 60 + totalMin) % (24 * 60);
    const h24 = Math.floor(minsFromMidnight / 60);
    const m = Math.floor(minsFromMidnight % 60);
    const text = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const meridiem = h24 >= 20 ? "PM" : "AM";
    return { text, meridiem };
  }

  function getPhaseAtMinute(min) {
    for (let i = 0; i < PHASES.length; i++) {
      const p = PHASES[i];
      if (min >= p.start && min < p.end) return p;
    }
    return PHASES[PHASES.length - 1];
  }

  function updateUI(p) {
    progress = clamp(p, 0, 1);
    const min = progress * TOTAL_MIN;
    const phase = getPhaseAtMinute(min);
    const t = minutesToDisplayFixed(min);

    root.dataset.activePhase = phase.id;
    root.style.setProperty("--sleep-progress", String(progress));
    stage.classList.toggle("is-scrubbing", pointerInCurve);

    if (pathActive && pathLen > 0) {
      const at = progress * pathLen;
      pathActive.style.strokeDashoffset = String(pathLen - at);
      const pt = pathActive.getPointAtLength(at);
      if (marker) {
        marker.setAttribute("cx", pt.x);
        marker.setAttribute("cy", pt.y);
      }
      if (markerGlow) {
        markerGlow.setAttribute("cx", pt.x);
        markerGlow.setAttribute("cy", pt.y);
      }
    }

    if (clockTime) {
      clockTime.textContent = t.text;
      clockTime.setAttribute("datetime", t.text);
    }
    if (clockMeridiem) clockMeridiem.textContent = t.meridiem;
    if (phaseTag) phaseTag.textContent = phase.label;
    if (phaseRange) phaseRange.textContent = phase.range;
    if (phaseTitle) phaseTitle.textContent = phase.title;
    if (phaseDesc) phaseDesc.textContent = phase.desc;
  }

  function onWheel(e) {
    if (!pointerInCurve) return;

    e.preventDefault();
    e.stopPropagation();
    updateUI(progress + e.deltaY * WHEEL_SENSITIVITY);
  }

  function initPath() {
    if (!pathActive) return;
    const d = buildCurvePath();
    pathActive.setAttribute("d", d);
    if (pathBg) pathBg.setAttribute("d", d);
    renderTicks();
    pathLen = pathActive.getTotalLength();
    pathActive.style.strokeDasharray = String(pathLen);
    pathActive.style.strokeDashoffset = String(pathLen);
    if (pathBg) {
      pathBg.style.strokeDasharray = String(pathLen);
    }
    updateUI(0);
  }

  curveWrap.addEventListener("mouseenter", () => {
    pointerInCurve = true;
    stage.classList.add("is-scrubbing");
  });

  curveWrap.addEventListener("mouseleave", () => {
    pointerInCurve = false;
    stage.classList.remove("is-scrubbing");
  });

  curveWrap.addEventListener("wheel", onWheel, { passive: false });

  curveWrap.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      updateUI(progress + 0.04);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      updateUI(progress - 0.04);
    } else if (e.key === "Home") {
      e.preventDefault();
      updateUI(0);
    } else if (e.key === "End") {
      e.preventDefault();
      updateUI(1);
    }
  });

  window.addEventListener("resize", initPath);

  if (document.fonts?.ready) {
    document.fonts.ready.then(initPath);
  } else {
    initPath();
  }
})();
