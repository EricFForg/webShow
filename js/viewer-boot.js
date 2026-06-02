(function () {
  const container = document.getElementById("viewer-container");
  const loadingEl = document.getElementById("viewer-loading");
  const errorEl = document.getElementById("viewer-error");

  function showError(msg) {
    loadingEl.classList.add("hidden");
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
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
      showError(
        "3D 引擎加载失败：" +
          (err.message || "未知错误") +
          (location.protocol === "file:"
            ? "。双击打开需联网加载 Three.js，或使用「打开展示.bat」离线运行。"
            : "")
      );
      return;
    }

    let scene, camera, renderer, controls;

    function initScene() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf1f5f9);

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

    function fitCamera(model) {
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const dist = (maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 1.4;
      camera.position.set(center.x + dist * 0.6, center.y + dist * 0.4, center.z + dist);
      controls.target.copy(center);
      controls.update();
    }

    function loadModelFromBase64(base64) {
      const binary = atob(base64);
      const buffer = new ArrayBuffer(binary.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
      const loader = new GLTFLoader();
      return new Promise((resolve, reject) => {
        loader.parse(buffer, "", resolve, reject);
      });
    }

    async function loadModelFromUrl(path) {
      const loader = new GLTFLoader();
      return loader.loadAsync(path);
    }

    async function loadModel() {
      loadingEl.classList.remove("hidden");
      errorEl.classList.add("hidden");

      const modelPath = window.ASSETS?.models?.[0]?.path;
      let gltf = null;

      try {
        if (location.protocol === "file:" && window.MODEL_BASE64) {
          gltf = await loadModelFromBase64(window.MODEL_BASE64);
        } else if (modelPath) {
          gltf = await loadModelFromUrl(modelPath);
        }
      } catch (err) {
        console.warn("URL 加载失败，尝试内嵌模型", err);
      }

      if (!gltf && window.MODEL_BASE64) {
        try {
          gltf = await loadModelFromBase64(window.MODEL_BASE64);
        } catch (err) {
          console.error(err);
        }
      }

      if (!gltf) {
        showError("模型加载失败，请确认 models 目录中存在 GLB 文件");
        return;
      }

      scene.add(gltf.scene);
      fitCamera(gltf.scene);
      loadingEl.classList.add("hidden");
      setTimeout(resize, 50);
    }

    initScene();
    await loadModel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
