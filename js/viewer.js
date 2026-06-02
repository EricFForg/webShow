import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const container = document.getElementById("viewer-container");
const loadingEl = document.getElementById("viewer-loading");
const errorEl = document.getElementById("viewer-error");
const animControlsEl = document.getElementById("anim-controls");
const animPlayBtn = document.getElementById("anim-play");
const animPauseBtn = document.getElementById("anim-pause");
const animStopBtn = document.getElementById("anim-stop");

const clock = new THREE.Clock();

let scene, camera, renderer, controls;
let mixer = null;
let activeAction = null;
let animations = [];

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
  window.addEventListener("load", () => setTimeout(resize, 100));
  animate();
}

function resize() {
  const { clientWidth, clientHeight } = container;
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight, true);
}

function animate() {
  requestAnimationFrame(animate);
  if (mixer) mixer.update(clock.getDelta());
  controls.update();
  renderer.render(scene, camera);
}

function fitCamera(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = (maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 1.4;
  camera.position.set(center.x + dist * 0.6, center.y + dist * 0.4, center.z + dist);
  controls.target.copy(center);
  controls.update();
}

function setupAnimations(gltf) {
  mixer = null;
  activeAction = null;
  animations = gltf.animations || [];
  animControlsEl.hidden = animations.length === 0;
  animPlayBtn.disabled = animations.length === 0;
  animPauseBtn.disabled = true;
  animStopBtn.disabled = true;
  if (!animations.length) return;
  mixer = new THREE.AnimationMixer(gltf.scene);
}

function playAnimation() {
  if (!mixer || !animations[0]) return;
  if (activeAction?.paused) {
    activeAction.paused = false;
    return;
  }
  if (activeAction) activeAction.stop();
  activeAction = mixer.clipAction(animations[0]);
  activeAction.reset().play();
  animPauseBtn.disabled = false;
  animStopBtn.disabled = false;
}

function pauseAnimation() {
  if (activeAction) activeAction.paused = true;
}

function stopAnimation() {
  if (!mixer) return;
  mixer.stopAllAction();
  activeAction = null;
  animPauseBtn.disabled = true;
  animStopBtn.disabled = true;
}

async function loadModelFromUrl(path) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(path);
  return gltf;
}

async function loadModelFromBase64(base64) {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(buffer, "", resolve, reject);
  });
}

async function loadModel() {
  loadingEl.classList.remove("hidden");
  errorEl.classList.add("hidden");

  const modelPath = window.ASSETS?.models?.[0]?.path;
  let gltf = null;

  const useEmbedded = location.protocol === "file:" && window.MODEL_BASE64;

  try {
    if (useEmbedded) {
      gltf = await loadModelFromBase64(window.MODEL_BASE64);
    } else {
      gltf = await loadModelFromUrl(modelPath);
    }
  } catch {
    if (window.MODEL_BASE64) {
      try {
        gltf = await loadModelFromBase64(window.MODEL_BASE64);
      } catch (err) {
        console.error(err);
      }
    }
  }

  if (!gltf) {
    loadingEl.classList.add("hidden");
    errorEl.classList.remove("hidden");
    return;
  }

  scene.add(gltf.scene);
  setupAnimations(gltf);
  fitCamera(gltf.scene);
  loadingEl.classList.add("hidden");
}

animPlayBtn.addEventListener("click", playAnimation);
animPauseBtn.addEventListener("click", pauseAnimation);
animStopBtn.addEventListener("click", stopAnimation);

initScene();
loadModel();
