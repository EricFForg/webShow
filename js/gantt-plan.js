(function () {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parsePersonCount(name) {
    const match = String(name).match(/(\d+)/);
    return match ? Number(match[1]) : 1;
  }

  function parseBudgetWan(budget) {
    const text = String(budget);
    const range = text.match(/([\d.]+)\s*[–-]\s*([\d.]+)\s*万/);
    if (range) {
      const min = parseFloat(range[1]);
      const max = parseFloat(range[2]);
      return { min, max, mid: (min + max) / 2, isRange: true };
    }
    const single = text.match(/([\d.]+)\s*万/);
    if (single) {
      const val = parseFloat(single[1]);
      return { min: val, max: val, mid: val, isRange: false };
    }
    return null;
  }

  function formatProjectDate(iso, dayOffset) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + dayOffset);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }

  function computeSummary(data) {
    const meta = data.meta || {};
    const order = data.taskOrder || Object.keys(data.tasks);
    const totalDays = meta.totalDays || 210;
    const projectStart = meta.projectStart || "2025-07-01";

    let budgetMin = 0;
    let budgetMax = 0;
    let hasBudget = false;
    const budgetItems = [];
    const extraBudgetNotes = [];
    const rolePeak = {};

    order.forEach((id) => {
      const task = data.tasks[id];
      if (!task) return;

      const parsed = parseBudgetWan(task.budget);
      if (parsed) {
        hasBudget = true;
        budgetMin += parsed.min;
        budgetMax += parsed.max;
        budgetItems.push(`${task.title} ${task.budget}`);
      } else if (task.budget && task.budget !== "—") {
        extraBudgetNotes.push(`${task.title}：${task.budget}`);
      }

      (task.personnel || []).forEach((p) => {
        const count = parsePersonCount(p.name);
        rolePeak[p.role] = Math.max(rolePeak[p.role] || 0, count);
      });
    });

    const roles = Object.entries(rolePeak)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
      .map(([role, count]) => ({ role, count }));

    const peakHeadcount = roles.reduce((sum, r) => sum + r.count, 0);

    const budgetDetail = budgetItems.length
      ? budgetItems.join("、")
      : "各阶段按 WBS 明细填报";
    const budgetExtra =
      extraBudgetNotes.length > 0 ? `${extraBudgetNotes.join("；")}；试产与市场物料按实际另计` : "试产与市场物料按实际另计";

    const budgetDisplay = hasBudget
      ? budgetMin === budgetMax
        ? `${budgetMin} 万元`
        : `${budgetMin}–${budgetMax} 万元`
      : "—";

    return {
      budgetWan: budgetMin,
      budgetDisplay,
      budgetDetail,
      budgetExtra,
      roles,
      roleCount: roles.length,
      peakHeadcount,
      totalDays,
      periodDisplay: `${formatProjectDate(projectStart, 0)} — ${formatProjectDate(projectStart, totalDays - 1)}`,
      monthsApprox: Math.round(totalDays / 30),
    };
  }

  function renderGanttSummary(data) {
    const root = document.getElementById("gantt-summary-root");
    if (!root || !data) return;

    const s = computeSummary(data);
    const roleTags = s.roles
      .map((r) => `<span class="gantt-summary-role">${escapeHtml(r.role)} ×${r.count}</span>`)
      .join("");

    root.innerHTML = `
      <article class="gantt-summary-card">
        <h3>预算金额</h3>
        <p class="gantt-summary-value">${escapeHtml(s.budgetDisplay)}</p>
        <p class="gantt-summary-note">${escapeHtml(s.budgetDetail)}。${escapeHtml(s.budgetExtra)}</p>
      </article>
      <article class="gantt-summary-card">
        <h3>人员需求</h3>
        <p class="gantt-summary-value">${s.roleCount} 类 · 峰值 ${s.peakHeadcount} 人</p>
        <div class="gantt-summary-roles">${roleTags}</div>
        <p class="gantt-summary-note">按各阶段岗位峰值汇总（含并行软件团队）</p>
      </article>
      <article class="gantt-summary-card">
        <h3>时间总计</h3>
        <p class="gantt-summary-value">${s.totalDays} 天</p>
        <p class="gantt-summary-note">${escapeHtml(s.periodDisplay)} · 约 ${s.monthsApprox} 个月（WBS 主线 ${s.totalDays} 天闭环）</p>
      </article>`;
  }

  function renderGanttChart(data) {
    const root = document.getElementById("gantt-chart-root");
    if (!root || !data) return;

    const meta = data.meta || {};
    const totalDays = meta.totalDays || 210;
    const months = meta.months || ["7 月", "8 月", "9 月", "10 月", "11 月", "12 月", "1 月"];
    const order = data.taskOrder || Object.keys(data.tasks);

    const monthHeaders = months
      .map((m) => `<div class="gantt-month" role="columnheader">${escapeHtml(m)}</div>`)
      .join("");

    const rows = order
      .map((id) => {
        const task = data.tasks[id];
        if (!task) return "";
        const label = task.barLabel || "";
        const parallel = task.id === "software" ? " gantt-row-parallel" : "";
        return `<div class="gantt-row${parallel}" role="row">
          <div class="gantt-task" role="rowheader">${escapeHtml(task.title)}</div>
          <div class="gantt-track" role="cell" style="--timeline-days: ${totalDays}">
            <div class="gantt-grid-lines" aria-hidden="true"></div>
            <button type="button" class="gantt-bar ${task.barClass || ""}"
              style="--start-day: ${task.startDay}; --duration-day: ${task.durationDays}"
              data-gantt-id="${escapeHtml(task.id)}"
              aria-label="查看任务详情：${escapeHtml(task.title)}，${escapeHtml(task.period)}">${escapeHtml(label)}</button>
          </div>
        </div>`;
      })
      .join("");

    root.innerHTML = `<div class="gantt-chart" role="table" aria-label="项目计划甘特图，2025年7月至2026年1月，共 ${totalDays} 天">
      <div class="gantt-head" role="row">
        <div class="gantt-corner" role="columnheader">WBS 阶段</div>
        ${monthHeaders}
      </div>
      ${rows}
    </div>`;
  }

  function initGanttModal(data) {
    const modalEl = document.getElementById("gantt-detail-modal");
    if (!data || !modalEl) {
      console.error("甘特图弹窗初始化失败：缺少 GANTT_PLAN 数据或 modal 节点");
      return;
    }

    const titleEl = modalEl.querySelector(".gantt-modal-title");
    const periodEl = modalEl.querySelector(".gantt-modal-period");
    const budgetEl = modalEl.querySelector(".gantt-modal-budget");
    const budgetNoteEl = modalEl.querySelector(".gantt-modal-budget-note");
    const personnelEl = modalEl.querySelector(".gantt-modal-personnel");
    const subtasksEl = modalEl.querySelector(".gantt-modal-subtasks");
    const milestonesEl = modalEl.querySelector(".gantt-modal-milestones");
    const accentEl = modalEl.querySelector(".gantt-modal-accent");

    function parseCount(name) {
      const match = String(name).match(/(\d+)/);
      return match ? Number(match[1]) : 1;
    }

    function avatarForRole(role) {
      return (data.roleAvatars && data.roleAvatars[role]) || "images/avatars/manager.png";
    }

    function renderPersonnel(list) {
      return list
        .map((p) => {
          const count = parseCount(p.name);
          const countBadge = count > 1 ? `<span class="gantt-avatar-count">×${count}</span>` : "";
          const tip = `${p.role} · ${p.name} · ${p.duty}`;
          return `<li class="gantt-avatar-item" title="${escapeHtml(tip)}">
          <div class="gantt-avatar-wrap">
            <img class="gantt-avatar-img" src="${avatarForRole(p.role)}" alt="${escapeHtml(p.role)}" width="40" height="40" loading="lazy" />
            ${countBadge}
          </div>
          <span class="gantt-avatar-role">${escapeHtml(p.role)}</span>
        </li>`;
        })
        .join("");
    }

    function renderSubtasks(list) {
      return list
        .map(
          (s) =>
            `<tr>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.owner)}</td>
            <td class="gantt-subtask-time">${escapeHtml(s.schedule)}</td>
          </tr>`
        )
        .join("");
    }

    function renderMilestones(list) {
      return list
        .map(
          (m) =>
            `<li class="gantt-milestone-item">
            <time class="gantt-milestone-date">${escapeHtml(m.date)}</time>
            <span class="gantt-milestone-title">${escapeHtml(m.title)}</span>
          </li>`
        )
        .join("");
    }

    function openDetail(taskId) {
      const task = data.tasks[taskId];
      if (!task) return;

      titleEl.textContent = task.title;
      periodEl.textContent = task.period;
      budgetEl.textContent = task.budget;
      budgetNoteEl.textContent = task.budgetNote ? `（${task.budgetNote}）` : "";
      personnelEl.innerHTML = renderPersonnel(task.personnel || []);
      subtasksEl.innerHTML = renderSubtasks(task.subtasks || []);
      milestonesEl.innerHTML = renderMilestones(task.milestones || []);

      accentEl.className = "gantt-modal-accent " + (task.barClass || "");

      modalEl.hidden = false;
      document.body.classList.add("gantt-modal-open");
      modalEl.querySelector(".gantt-modal-close").focus();
    }

    function closeDetail() {
      modalEl.hidden = true;
      document.body.classList.remove("gantt-modal-open");
    }

    document.getElementById("gantt-chart-root")?.addEventListener("click", (e) => {
      const bar = e.target.closest(".gantt-bar[data-gantt-id]");
      if (bar) openDetail(bar.dataset.ganttId);
    });

    modalEl.querySelector(".gantt-modal-backdrop").addEventListener("click", closeDetail);
    modalEl.querySelector(".gantt-modal-close").addEventListener("click", closeDetail);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modalEl.hidden) closeDetail();
    });
  }

  function init() {
    const data = window.GANTT_PLAN;
    renderGanttChart(data);
    renderGanttSummary(data);
    initGanttModal(data);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
