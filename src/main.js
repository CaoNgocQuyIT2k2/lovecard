import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { decks } from './cards.js';
import './style.css';
const app=document.querySelector('#app'), storageKey='love-cards-progress-v1';
let saved={}; try {saved=JSON.parse(localStorage.getItem(storageKey)||'{}');} catch {saved={};}
let cleanup=()=>{};
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}}
function shuffle(n){const a=Array.from({length:n},(_,i)=>i);for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function shell(content){app.innerHTML=`<div class="shell"><header><div class="brand"><span>♡</span> Love Cards</div><small>Một chút thời gian, nhiều điều để hiểu nhau</small></header>${content}</div>`;}
function home(){cleanup();shell(`<main class="home"><div class="intro"><span class="eyebrow">Dành thời gian cho nhau</span><h1>Mỗi câu hỏi,<br><em>một câu chuyện.</em></h1><p>Mở lòng qua những câu chuyện nhỏ và khám phá thêm về người bạn yêu thương.</p></div><h2 class="section-title">Chọn bộ bài của bạn</h2><div class="decks">${decks.map((d,i)=>`<button class="deck" data-deck="${d.id}"><span class="icon">${['♡','✿','∞'][i]}</span><h2>${d.name}</h2><p>${d.description}<span class="count">${d.questions.length} thẻ →</span></p></button>`).join('')}</div></main>`);app.querySelectorAll('[data-deck]').forEach(b=>b.onclick=()=>play(decks.find(d=>d.id===b.dataset.deck)));}
function texture(text, artwork) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(artwork, 0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#221d1d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 54;
  let lines = [];
  do {
    ctx.font = `700 ${size}px "DM Sans", sans-serif`;
    lines = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > 690) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    if (lines.length * size * 1.22 <= 285) break;
    size -= 2;
  } while (size > 24);
  const spacing = size * 1.22;
  lines.forEach((line, index) => {
    ctx.fillText(line, 512, 1107 + (index - (lines.length - 1) / 2) * spacing);
  });
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.flipY = false;
  return result;
}
function play(deck) {
  cleanup();
  let state = saved[deck.id];
  const isValid = state && Array.isArray(state.order)
    && state.order.length === deck.questions.length
    && new Set(state.order).size === deck.questions.length
    && state.order.every(index => Number.isInteger(index) && index >= 0 && index < deck.questions.length)
    && Number.isInteger(state.index) && state.index >= 0 && state.index < deck.questions.length;
  if (!isValid) state = { order: shuffle(deck.questions.length), index: 0 };
  saved[deck.id] = state;
  persist();

  shell(`<main class="play"><section class="play-info"><button class="back">← Các bộ bài</button><p class="eyebrow">${deck.description}</p><h1>${deck.name}</h1><p>Chạm vào lá trên cùng để lật. Vuốt lá bài sang một bên để tiếp tục.</p><div class="progress"></div><div class="track"><div></div></div><p class="notice" aria-live="polite"></p></section><section class="canvas-wrap"><div class="canvas"></div><p class="hint">Chạm để lật · Kéo sang trái hoặc phải để bỏ lá bài</p><div class="actions"><button class="flip">Lật thẻ</button><button class="dismiss">Bỏ thẻ →</button></div></section></main><div class="screen-dim" aria-hidden="true"></div>`);
  app.querySelector('.back').onclick = home;
  const mount = app.querySelector('.canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { app.querySelector('.notice').textContent = 'Trình duyệt không hỗ trợ hiển thị 3D.'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', 'Chồng bài 3D. Nhấn Enter để lật và phím mũi tên để bỏ thẻ.');
  renderer.domElement.tabIndex = 0;
  mount.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .001, 10);
  camera.position.set(0, 0, .23);
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  for (const side of [1, -1]) {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(side, 2, side * 3);
    scene.add(light);
  }
  const stack = new THREE.Group();
  stack.rotation.set(0, 0, 0);
  stack.position.set(0, 0, 0);
  scene.add(stack);
  let card, front, frontArtwork, originalTexture, activeTexture;
  let disposed = false, pointer = null, dismissal = null, lift = null, focused = false;
  const faceRotation = new THREE.Quaternion();
  const startRotation = new THREE.Quaternion();
  const startPosition = new THREE.Vector3();
  const focusedPosition = new THREE.Vector3(0, 0, 0.015);
  const wrapper = app.querySelector('.canvas-wrap');
  const dim = app.querySelector('.screen-dim');
  const resize = () => {
    const width = mount.clientWidth, height = mount.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    if (focused && width <= 700) {
      const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const heightDistance = 0.09 / (2 * halfFov * 0.60);
      const widthDistance = 0.06 / (2 * halfFov * camera.aspect * 0.88);
      camera.position.z = 0.015 + Math.max(heightDistance, widthDistance);
    } else if (width <= 700) {
      const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const heightDistance = 0.09 / (2 * halfFov * 0.82);
      const widthDistance = 0.06 / (2 * halfFov * camera.aspect * 0.88);
      camera.position.z = 0.006 + Math.max(heightDistance, widthDistance);
    } else {
      camera.position.z = 0.23;
    }
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(mount);
  resize();

  function update() {
    app.querySelector('.progress').textContent = `Thẻ ${state.index + 1} / ${deck.questions.length}`;
    app.querySelector('.track div').style.width = `${(state.index + 1) / deck.questions.length * 100}%`;
    if (front && frontArtwork) {
      const nextTexture = texture(deck.questions[state.order[state.index]], frontArtwork);
      front.map = nextTexture;
      front.needsUpdate = true;
      activeTexture?.dispose();
      activeTexture = nextTexture;
    }
  }
  function flip() {
    if (!card || !frontArtwork || dismissal || lift || focused) return;
    stack.updateMatrixWorld(true);
    scene.attach(card);
    stack.visible = false;
    startPosition.copy(card.position);
    startRotation.copy(card.quaternion);
    focused = true;
    wrapper.classList.add('is-focused');
    dim.classList.add('is-visible');
    app.querySelector('.flip').disabled = true;
    lift = { start: performance.now() };
  }
  function dismiss(direction) {
    if (!card || dismissal || lift || !focused) return;
    dismissal = { direction, start: performance.now(), fromX: card.position.x, fromZ: card.rotation.z };
  }
  function nextCard() {
    if (state.index === deck.questions.length - 1) {
      state.order = shuffle(deck.questions.length);
      state.index = 0;
      app.querySelector('.notice').textContent = 'Đã hết bộ bài. Bộ bài được xáo lại.';
    } else {
      state.index++;
      app.querySelector('.notice').textContent = '';
    }
    stack.add(card);
    stack.visible = true;
    card.position.set(0, 0, 0.006);
    card.rotation.set(0, Math.PI, 0);
    focused = false;
    wrapper.classList.remove('is-focused');
    dim.classList.remove('is-visible');
    app.querySelector('.flip').disabled = false;
    dismissal = null;
    persist();
    update();
  }
  app.querySelector('.flip').onclick = flip;
  app.querySelector('.dismiss').onclick = () => dismiss(1);
  update();

  new GLTFLoader().load('/conversation-card-reference.glb', gltf => {
    if (disposed) return;
    const model = gltf.scene;
    model.traverse(object => {
      if (object.isMesh && object.material.name === 'FrontQuestion') {
        front = object.material;
        originalTexture = front.map;

      }
    });
    // The cards under the top card share their geometry and artwork.
    for (let i = 8; i >= 1; i--) {
      const underneath = model.clone();
      underneath.rotation.set(0, Math.PI, 0.006 * (i % 3 - 1));
      underneath.position.set(-i * 0.00035, -i * 0.00045, 0.006 - i * 0.00075);
      stack.add(underneath);
    }
    model.traverse(object => {
      if (!object.isMesh) return;
      object.material = object.material.clone();
      object.material.depthTest = false;
      object.material.depthWrite = false;
      object.renderOrder = 10;
      if (object.material.name === 'FrontQuestion') front = object.material;
    });
    card = model;
    card.rotation.y = Math.PI;
    card.position.z = 0.006;
    stack.add(card);
    const image = new Image();
    image.onload = () => {
      if (disposed) return;
      frontArtwork = image;
      update();
    };
    image.onerror = () => {
      if (!disposed) app.querySelector('.notice').textContent = 'Không tải được mặt trước của lá bài.';
    };
    image.src = '/card-front-blank.png';
  }, undefined, () => {
    if (!disposed) app.querySelector('.notice').textContent = 'Không tải được bộ bài 3D.';
  });

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', event => {
    if (!card || dismissal || lift || pointer) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId || dismissal || !focused) return;
    const delta = event.clientX - pointer.x;
    card.position.x = delta / Math.max(mount.clientWidth, 1) * 0.15;
    card.rotation.z = -delta / Math.max(mount.clientWidth, 1) * 0.35;
  });
  function endPointer(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer = null;
    if (event.type === 'pointercancel') return;
    if (focused && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) dismiss(Math.sign(dx));
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) flip();
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      dismiss(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  renderer.setAnimationLoop(() => {
    if (card) {
      if (lift) {
        const t = Math.min((performance.now() - lift.start) / 750, 1);
        const eased = 1 - (1 - t) ** 3;
        card.position.lerpVectors(startPosition, focusedPosition, eased);
        card.position.z += Math.sin(Math.PI * t) * 0.018;
        card.quaternion.slerpQuaternions(startRotation, faceRotation, eased);
        if (t === 1) lift = null;
      } else if (dismissal) {
        const t = Math.min((performance.now() - dismissal.start) / 450, 1);
        const eased = 1 - (1 - t) ** 3;
        card.position.x = dismissal.fromX + dismissal.direction * 0.24 * eased;
        card.rotation.z = dismissal.fromZ - dismissal.direction * 0.35 * eased;
        if (t === 1) nextCard();
      } else if (focused && !pointer) {
        card.position.x *= .8;
        card.rotation.z *= .8;
      }
    }
    renderer.render(scene, camera);
  });
  cleanup = () => {
    disposed = true;
    observer.disconnect();
    renderer.setAnimationLoop(null);
    const geometries = new Set(), materials = new Set();
    stack.traverse(object => {
      if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); }
    });
    if (card && card.parent === scene) card.traverse(object => {
      if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => { material.map?.dispose(); material.dispose(); });
    originalTexture?.dispose();
    renderer.dispose();
    cleanup = () => {};
  };
}
home();
