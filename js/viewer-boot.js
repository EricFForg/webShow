(function () {
  const container = document.getElementById("viewer-container");
  const carouselEl = document.getElementById("viewer-model-carousel");
  const statusEl = document.getElementById("viewer-model-status");
  const loadingEl = document.getElementById("viewer-loading");
  const errorEl = document.getElementById("viewer-error");

  const MODEL_TABS = [
    { path: "models/model2.glb", label: "基础配件结构" },
    { path: "models/mattress.glb", label: "床垫整体" },
  ];

  if (!container) return;

  function showError(msg) {
    loadingEl?.classList.add("hidden");
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove("hidden");
    }
  }

  function hideError() {
    errorEl?.classList.add("hidden");
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function setActiveTab(path) {
    carouselEl?.querySelectorAll(".viewer-model-tab").forEach((btn) => {
      const active = btn.dataset.modelPath === path;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  function resolveModelUrl(path) {
    return new URL(path, window.location.href).href;
  }

  function loadScriptOnce(src) {
    const key = `__loaded_${src}`;
    if (window[key]) return window[key];
    window[key] = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = new URL(src, window.location.href).href;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error(`脚本加载失败: ${src}`));
      document.head.appendChild(el);
    });
    return window[key];
  }

  function waitImportShim() {
    return new Promise((resolve, reject) => {
      let n = 0;
      const tick = () => {
        if (typeof window.importShim === "function") return resolve(window.importShim);
        if (++n > 100) return reject(new Error("es-module-shims 未就绪"));
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  async function boot() {
    let importModule;
    try {
      importModule = await waitImportShim();
    } catch (err) {
      console.error(err);
      showError("3D 引擎加载失败：es-module-shims 未加载");
      return;
    }

    let THREE, OrbitControls, GLTFLoader;
    try {
      THREE = await importModule("three");
      ({ OrbitControls } = await importModule("three/addons/controls/OrbitControls.js"));
      ({ GLTFLoader } = await importModule("three/addons/loaders/GLTFLoader.js"));
    } catch (err) {
      console.error(err);
      showError("3D 引擎加载失败：" + (err.message || "未知错误"));
      return;
    }

    let scene, camera, renderer, controls;
    const modelHolder = new THREE.Group();
    const sceneCache = new Map();
    let currentPath = "";
    let currentObject = null;
    let loadToken = 0;

    function initScene() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf1f5f9);
      scene.add(modelHolder);

      camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      camera.position.set(2, 1.5, 3);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(5, 8, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.4);
      fill.position.set(-4, 2, -3);
      scene.add(fill);

      const grid = new THREE.GridHelper(10, 20, 0xdbe4ee, 0xe8edf2);
      grid.position.y = -0.001;
      scene.add(grid);

      resize();
      window.addEventListener("resize", resize);
      animate();
    }

    function resize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, true);
    }

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    function fitCamera(target) {
      const box = new THREE.Box3().setFromObject(target);
      if (box.isEmpty()) return;
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const dist = (maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 1.4;
      camera.position.set(center.x + dist * 0.6, center.y + dist * 0.4, center.z + dist);
      controls.target.copy(center);
      controls.update();
    }

    function parseBase64(base64) {
      const binary = atob(base64);
      const buffer = new ArrayBuffer(binary.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
      const loader = new GLTFLoader();
      return new Promise((resolve, reject) => {
        loader.parse(buffer, "", resolve, reject);
      });
    }

    async function getEmbeddedBase64(path) {
      if (window.MODELS_BASE64?.[path]) return window.MODELS_BASE64[path];
      if (path === "models/model2.glb" && window.MODEL_BASE64) return window.MODEL_BASE64;
      if (path === "models/mattress.glb") {
        if (window.MATTRESS_BASE64) return window.MATTRESS_BASE64;
        if (!window.MODELS_BASE64?.[path]) {
          await loadScriptOnce("js/model-data-mattress.js");
        }
        return window.MODELS_BASE64?.[path] || window.MATTRESS_BASE64 || null;
      }
      return null;
    }

    async function loadGltf(path) {
      const loader = new GLTFLoader();
      const url = resolveModelUrl(path);

      try {
        return await loader.loadAsync(url);
      } catch (urlErr) {
        console.warn("URL 加载失败，尝试内嵌:", path, urlErr);
        const embedded = await getEmbeddedBase64(path);
        if (embedded) return parseBase64(embedded);
        throw urlErr;
      }
    }

    async function getSceneObject(path) {
      if (sceneCache.has(path)) return sceneCache.get(path);
      const gltf = await loadGltf(path);
      const root = gltf.scene;
      root.updateMatrixWorld(true);
      sceneCache.set(path, root);
      return root;
    }

    function mountSceneObject(obj) {
      if (currentObject && currentObject.parent === modelHolder) {
        modelHolder.remove(currentObject);
      }
      currentObject = obj;
      modelHolder.add(obj);
      fitCamera(modelHolder);
    }

    async function switchModel(path) {
      if (path === currentPath && currentObject) return;

      const tab = MODEL_TABS.find((m) => m.path === path);
      const label = tab?.label || path;
      const token = ++loadToken;

      setActiveTab(path);
      loadingEl?.classList.remove("hidden");
      hideError();
      if (loadingEl) loadingEl.textContent = `正在加载 ${path}…`;
      setStatus(`加载中：${path}`);

      try {
        const sceneObj = await getSceneObject(path);
        if (token !== loadToken) return;

        mountSceneObject(sceneObj);
        currentPath = path;
        loadingEl?.classList.add("hidden");
        if (loadingEl) loadingEl.textContent = "模型加载中…";
        setStatus(`当前：${path}（${label}）`);
        setTimeout(resize, 50);
      } catch (err) {
        console.error("模型加载失败:", path, err);
        if (token !== loadToken) return;
        setActiveTab(currentPath || MODEL_TABS[0].path);
        showError(`加载失败：${path}。请用「打开展示.bat」启动本地服务，或确认 models 目录存在该文件。`);
        setStatus(currentPath ? `当前：${currentPath}` : "加载失败");
      }
    }

    initScene();

    carouselEl?.querySelectorAll(".viewer-model-tab").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const path = btn.dataset.modelPath;
        if (!path) return;
        switchModel(path);
      });
    });

    await switchModel(MODEL_TABS[0].path);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
