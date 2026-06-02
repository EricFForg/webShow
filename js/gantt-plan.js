(function () {
  function initGanttModal() {
    const data = window.GANTT_PLAN;
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
          return `<li class="gantt-avatar-item" title="${tip}">
          <div class="gantt-avatar-wrap">
            <img class="gantt-avatar-img" src="${avatarForRole(p.role)}" alt="${p.role}" width="40" height="40" loading="lazy" />
            ${countBadge}
          </div>
          <span class="gantt-avatar-role">${p.role}</span>
        </li>`;
        })
        .join("");
    }

    function renderSubtasks(list) {
      return list
        .map(
          (s) =>
            `<tr>
            <td>${s.name}</td>
            <td>${s.owner}</td>
            <td class="gantt-subtask-time">${s.schedule}</td>
          </tr>`
        )
        .join("");
    }

    function renderMilestones(list) {
      return list
        .map(
          (m) =>
            `<li class="gantt-milestone-item">
            <time class="gantt-milestone-date">${m.date}</time>
            <span class="gantt-milestone-title">${m.title}</span>
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
      personnelEl.innerHTML = renderPersonnel(task.personnel);
      subtasksEl.innerHTML = renderSubtasks(task.subtasks);
      milestonesEl.innerHTML = renderMilestones(task.milestones);

      accentEl.className = "gantt-modal-accent " + (task.barClass || "");

      modalEl.hidden = false;
      document.body.classList.add("gantt-modal-open");
      modalEl.querySelector(".gantt-modal-close").focus();
    }

    function closeDetail() {
      modalEl.hidden = true;
      document.body.classList.remove("gantt-modal-open");
    }

    document.querySelectorAll(".gantt-bar[data-gantt-id]").forEach((bar) => {
      bar.addEventListener("click", () => openDetail(bar.dataset.ganttId));
    });

    modalEl.querySelector(".gantt-modal-backdrop").addEventListener("click", closeDetail);
    modalEl.querySelector(".gantt-modal-close").addEventListener("click", closeDetail);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modalEl.hidden) closeDetail();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGanttModal);
  } else {
    initGanttModal();
  }
})();
