(function () {
  const treeRoot = document.getElementById("sidebar-nav-tree");
  const BRANCH_STORAGE_KEY = "webShow-nav-branches-v2";

  function saveBranchState() {
    if (!treeRoot) return;
    const state = {};
    treeRoot.querySelectorAll(".nav-tree-branch[data-nav-branch]").forEach((branch) => {
      const id = branch.dataset.navBranch;
      if (id) state[id] = branch.open;
    });
    try {
      localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function loadBranchState() {
    try {
      const raw = localStorage.getItem(BRANCH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function initSidebarTree() {
    if (!treeRoot) return;

    const saved = loadBranchState();
    if (saved) {
      treeRoot.querySelectorAll(".nav-tree-branch[data-nav-branch]").forEach((branch) => {
        const id = branch.dataset.navBranch;
        if (id && Object.prototype.hasOwnProperty.call(saved, id)) {
          branch.open = saved[id];
        }
      });
    }

    treeRoot.querySelectorAll(".nav-tree-branch[data-nav-branch]").forEach((branch) => {
      branch.addEventListener("toggle", saveBranchState);
    });
  }

  function initNavSpy() {
    const links = document.querySelectorAll(".sidebar-nav .nav-link");
    const sectionIds = new Set([...links].map((link) => link.getAttribute("href").slice(1)));
    const sections = [...sectionIds].map((id) => document.getElementById(id)).filter(Boolean);

    if (!sections.length) return;

    const setActive = (id) => {
      links.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
      });
      treeRoot?.querySelectorAll(".nav-tree-branch").forEach((branch) => {
        const summary = branch.querySelector("summary.nav-tree-toggle");
        if (!summary) return;
        const hasActive = branch.querySelector(".nav-link.active");
        summary.classList.toggle("nav-tree-toggle-active", Boolean(hasActive));
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setActive(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));

    const hash = location.hash.slice(1);
    if (hash && sectionIds.has(hash)) setActive(hash);
  }

  function init() {
    initSidebarTree();
    initNavSpy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.initNavSpy = initNavSpy;
})();
