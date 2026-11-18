import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { decks } from './cards.js';
import './style.css';
const app=document.querySelector('#app'), storageKey='love-cards-progress-v1', favoritesKey='love-cards-favorites-v1';
const backArtwork=new Image();backArtwork.src='/conversation-card-back.png';
let saved={}; try {saved=JSON.parse(localStorage.getItem(storageKey)||'{}');} catch {saved={};}
let cleanup=()=>{};
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}}
function readFavorites(){let value={};try{value=JSON.parse(localStorage.getItem(favoritesKey)||'{}')||{};}catch{}return Object.fromEntries(decks.map(deck=>[deck.id,[...new Set((Array.isArray(value[deck.id])?value[deck.id]:[]).filter(index=>Number.isInteger(index)&&index>=0&&index<deck.questions.length))]]));}
function savedCards(deckFilter=null){const favorites=readFavorites();return decks.filter(deck=>!deckFilter||deck.id===deckFilter.id).flatMap(deck=>[...new Set(favorites[deck.id]||[])].filter(index=>Number.isInteger(index)&&index>=0&&index<deck.questions.length).map(questionIndex=>({deck,questionIndex,question:deck.questions[questionIndex]})));}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function savedCardMarkup(item){return `<button class="saved-card" type="button" data-saved-deck="${item.deck.id}" data-saved-question="${item.questionIndex}"><span class="saved-card-meta"><span>${escapeHTML(item.deck.name)}</span><span>♥ Đã lưu</span></span><span class="saved-card-question">${escapeHTML(item.question)}</span><span class="saved-card-open">Mở thẻ →</span></button>`;}
function bindSavedCards(){app.querySelectorAll('[data-saved-deck]').forEach(button=>button.onclick=()=>{const deck=decks.find(item=>item.id===button.dataset.savedDeck);if(deck)play(deck,Number(button.dataset.savedQuestion),true);});}
function shuffle(n){const a=Array.from({length:n},(_,i)=>i);for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function shell(content){app.innerHTML=`<div class="shell"><header><div class="brand"><span>♡</span> Love Cards</div><small>Một chút thời gian, nhiều điều để hiểu nhau</small></header>${content}</div>`;}
function home(){cleanup();const items=savedCards();shell(`<main class="home"><div class="home-hero"><div class="intro"><span class="eyebrow">Dành thời gian cho nhau</span><h1>Mỗi câu hỏi,<br><em>một câu chuyện.</em></h1><p>Mở lòng qua những câu chuyện nhỏ và khám phá thêm về người bạn yêu thương.</p></div><div class="mascot-canvas" aria-hidden="true"></div></div><h2 class="section-title">Chọn bộ bài của bạn</h2><div class="decks">${decks.map((d,i)=>`<button class="deck" data-deck="${d.id}"><span class="icon">${['♡','✿','∞'][i]}</span><h2>${d.name}</h2><p>${d.description}<span class="count">${d.questions.length} thẻ →</span></p></button>`).join('')}</div><section class="saved-section"><div class="saved-section-heading"><div><span class="eyebrow">Của riêng hai bạn</span><h2>Thẻ đã lưu <span>${items.length}</span></h2></div><small>Chỉ lưu trên thiết bị này</small></div>${items.length?`<div class="saved-grid saved-grid-home">${items.map(savedCardMarkup).join('')}</div>`:'<div class="saved-empty"><span>♡</span><strong>Chưa có thẻ yêu thích</strong><p>Chạm vào biểu tượng tim khi mở thẻ để lưu câu hỏi ở đây.</p></div>'}</section></main>`);cleanup=setupHomeMascot();app.querySelectorAll('[data-deck]').forEach(b=>b.onclick=()=>play(decks.find(d=>d.id===b.dataset.deck)));bindSavedCards();}
function showSavedCards(deckFilter=null,returnTo=home){cleanup();const items=savedCards(deckFilter);shell(`<main class="saved-page"><button class="back saved-back">← ${deckFilter?'Quay lại bộ bài':'Trang chính'}</button><p class="eyebrow">${deckFilter?escapeHTML(deckFilter.name):'Bộ sưu tập của hai bạn'}</p><h1>Thẻ đã lưu${deckFilter?` · ${escapeHTML(deckFilter.name)}`:''}</h1><p class="saved-page-intro">${items.length?`${items.length} câu hỏi được lưu trên thiết bị này.`:'Những thẻ bạn lưu trong bộ bài này sẽ xuất hiện tại đây.'}</p>${items.length?`<div class="saved-grid saved-grid-page">${items.map(savedCardMarkup).join('')}</div>`:'<div class="saved-empty"><span>♡</span><strong>Chưa có thẻ nào được lưu</strong><p>Mở một câu hỏi trong bộ bài này rồi chạm vào tim để thêm thẻ yêu thích.</p></div>'}</main>`);app.querySelector('.saved-back').onclick=returnTo;bindSavedCards();}
function createInPlaceRunClip(animations){const source=animations[0];return source?new THREE.AnimationClip(`${source.name}-in-place`,source.duration,source.tracks.filter(track=>!/Hips\.position$/i.test(track.name))):null;}
function prepareChibi(model){model.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});model.updateMatrixWorld(true);model.position.y-=new THREE.Box3().setFromObject(model).min.y;}
function getGreetingBones(model){return [['LeftArm',2.05,0],['LeftForeArm',-.85,.18],['LeftHand',0,.72]].flatMap(([name,baseAngle,amplitude])=>{const bone=model.getObjectByName(name);if(!bone)return[];const worldRotation=new THREE.Quaternion();bone.getWorldQuaternion(worldRotation);return[{bone,rest:bone.quaternion.clone(),baseAngle,amplitude,axis:new THREE.Vector3(0,0,1).applyQuaternion(worldRotation.invert()).normalize()}];});}
function setupHomeMascot(){
  const mount=app.querySelector('.mascot-canvas');let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{return ()=>{};}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2.5));renderer.outputColorSpace=THREE.SRGBColorSpace;mount.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.01,30);camera.position.set(0,.78,3.7);camera.lookAt(0,.78,0);
  scene.add(new THREE.AmbientLight(0xffffff,2.2));const key=new THREE.DirectionalLight(0xffe5ea,2.4);key.position.set(-2,3,4);scene.add(key);
  const stage=new THREE.Group();stage.scale.setScalar(1.02);scene.add(stage);
  const resize=()=>{const width=mount.clientWidth,height=mount.clientHeight;if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);};
  const observer=new ResizeObserver(resize);observer.observe(mount);resize();
  let disposed=false,runner,mixer,waveBones=[];const clock=new THREE.Clock();let elapsed=0;
  new GLTFLoader().load('/chibi-shaded-rigged.glb',gltf=>{if(disposed)return;prepareChibi(gltf.scene);waveBones=getGreetingBones(gltf.scene);runner=new THREE.Group();runner.add(gltf.scene);stage.add(runner);const clip=createInPlaceRunClip(gltf.animations);if(clip){mixer=new THREE.AnimationMixer(gltf.scene);mixer.clipAction(clip).play();mixer.timeScale=1.2;}},undefined,()=>{if(!disposed)mount.classList.add('load-error');});
  renderer.setAnimationLoop(()=>{const delta=clock.getDelta();elapsed+=delta;mixer?.update(delta);if(runner){const range=Math.max(.16,(camera.position.z*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect-.52)/stage.scale.x),phase=(elapsed*.32)%2,amount=phase<=1?phase:2-phase,direction=phase<1?1:-1,greeting=phase>0.88&&phase<1.12;runner.position.x=THREE.MathUtils.lerp(-range,range,amount);runner.rotation.y=greeting?0:direction*Math.PI/2;if(greeting){if(mixer)mixer.timeScale=.35;const wave=Math.sin(elapsed*8);for(const item of waveBones){item.bone.quaternion.copy(item.rest).multiply(new THREE.Quaternion().setFromAxisAngle(item.axis,item.baseAngle+wave*item.amplitude));}}else if(mixer)mixer.timeScale=1.2;}renderer.render(scene,camera);});
  return ()=>{disposed=true;observer.disconnect();renderer.setAnimationLoop(null);mixer?.stopAllAction();scene.traverse(object=>{if(object.isMesh){object.geometry.dispose();for(const material of(Array.isArray(object.material)?object.material:[object.material])){material.map?.dispose();material.dispose();}}});renderer.dispose();};
}
function texture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 3072;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.textRendering = 'optimizeLegibility';
  ctx.fontKerning = 'normal';
  ctx.scale(2, 2);
  const background = ctx.createLinearGradient(0, 0, 1024, 1536);
  background.addColorStop(0, '#fff8f8');
  background.addColorStop(0.52, '#fff1f4');
  background.addColorStop(1, '#f9e5eb');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1024, 1536);
  const glow = ctx.createRadialGradient(210, 250, 10, 210, 250, 520);
  glow.addColorStop(0, 'rgba(255,255,255,.72)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1024, 1536);
  const lowerGlow = ctx.createRadialGradient(870, 1320, 10, 870, 1320, 430);
  lowerGlow.addColorStop(0, 'rgba(233,165,181,.20)'); lowerGlow.addColorStop(1, 'rgba(233,165,181,0)');
  ctx.fillStyle = lowerGlow; ctx.fillRect(0, 0, 1024, 1536);
  ctx.strokeStyle = 'rgba(192, 116, 136, 0.42)';
  ctx.lineWidth = 2;
  ctx.roundRect(42, 42, 940, 1452, 58);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = 2;
  ctx.roundRect(55, 55, 914, 1426, 48); ctx.stroke();
  ctx.save(); ctx.globalAlpha = .68;
  ctx.fillStyle = '#d78398'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '500 28px sans-serif';
  for (const [x,y,glyph,size] of [[108,112,'✦',28],[916,112,'✦',28],[512,290,'·',36],[512,1248,'·',36]]) { ctx.font = `500 ${size}px sans-serif`; ctx.fillText(glyph,x,y); }
  ctx.restore();
  ctx.fillStyle = '#d28b9b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '500 34px "Be Vietnam Pro", sans-serif';
  ctx.fillText('love cards', 512, 170);
  ctx.strokeStyle = 'rgba(210, 139, 155, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(380, 222);
  ctx.lineTo(644, 222);
  ctx.stroke();

  ctx.fillStyle = '#482633';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 94;
  let lines = [];
  do {
    ctx.font = `700 ${size}px "Be Vietnam Pro", sans-serif`;
    lines = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > 810) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    if (lines.length * size * 1.12 <= 700) break;
    size -= 2;
  } while (size > 40);
  const spacing = size * 1.12;
  lines.forEach((line, index) => {
    ctx.fillText(line, 512, 790 + (index - (lines.length - 1) / 2) * spacing);
  });
  ctx.fillStyle = '#bd7186';
  ctx.font = '500 28px "Be Vietnam Pro", sans-serif';
  ctx.fillText('✦  made with love  ✦', 512, 1402);
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.flipY = false;
  result.anisotropy = 16;
  result.magFilter = THREE.LinearFilter;
  result.minFilter = THREE.LinearMipmapLinearFilter;
  return result;
}
function backTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 3072;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.textRendering = 'optimizeLegibility';
  ctx.fontKerning = 'normal';
  ctx.scale(2, 2);
  const background = ctx.createLinearGradient(0, 0, 1024, 1536);
  background.addColorStop(0, '#fff4f5');
  background.addColorStop(0.5, '#fce9ed');
  background.addColorStop(1, '#f8dfe6');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1024, 1536);

  let result;
  const drawArtwork = () => {
    if (!backArtwork.naturalWidth) return;
    ctx.clearRect(0, 0, 1024, 1536);
    // Keep the reference card frame intact; the blank bubble is already removed from this artwork.
    ctx.drawImage(backArtwork, 0, 0, 1024, 1536);
    if (result) result.needsUpdate = true;
  };
  if (backArtwork.complete && backArtwork.naturalWidth) drawArtwork();
  else backArtwork.addEventListener('load', drawArtwork, { once: true });

  result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.flipY = false;
  result.anisotropy = 16;
  result.magFilter = THREE.LinearFilter;
  result.minFilter = THREE.LinearMipmapLinearFilter;
  return result;
}
function play(deck, questionIndex=null, openSavedCard=false) {
  cleanup();
  let state = saved[deck.id];
  const isValid = state && Array.isArray(state.order)
    && state.order.length === deck.questions.length
    && new Set(state.order).size === deck.questions.length
    && state.order.every(index => Number.isInteger(index) && index >= 0 && index < deck.questions.length)
    && Number.isInteger(state.index) && state.index >= 0 && state.index < deck.questions.length;
  if (!isValid) state = { order: shuffle(deck.questions.length), index: 0 };
  if(Number.isInteger(questionIndex)&&questionIndex>=0&&questionIndex<deck.questions.length){state.index=Math.max(0,state.order.indexOf(questionIndex));}
  saved[deck.id] = state;
  persist();
  const favorites=readFavorites();

  shell(`<main class="play"><section class="play-info"><button class="back">← Các bộ bài</button><p class="eyebrow">${deck.description}</p><h1>${deck.name}</h1><p>Vuốt trái để xem câu tiếp · Vuốt phải để quay lại câu trước.</p><div class="progress"></div><div class="track"><div></div></div><button class="deck-saved-link" type="button">♥ Thẻ đã lưu trong bộ này (0)</button><p class="notice" aria-live="polite"></p></section><section class="canvas-wrap"><div class="canvas"><div class="card-pet-layer" aria-hidden="true"></div><div class="card-hud"><div class="focused-progress"><span class="focused-progress-label"></span><div class="focused-progress-track" role="progressbar" aria-label="Tiến độ bộ thẻ" aria-valuemin="1" aria-valuemax="${deck.questions.length}" aria-valuenow="1"><div></div></div></div></div><button class="card-favorite" type="button" aria-label="Đánh dấu thẻ yêu thích" aria-pressed="false"><span aria-hidden="true">♡</span></button></div><p class="hint">Vuốt trái: câu tiếp theo · Vuốt phải: câu trước</p><div class="actions"><button class="previous">← Câu trước</button><button class="reveal">Mở thẻ</button><button class="next">Câu tiếp →</button></div><button class="close" aria-label="Đóng thẻ">Đóng ×</button></section></main><div class="screen-dim" aria-hidden="true"></div>`);
  app.querySelector('.back').onclick = home;
  const mount = app.querySelector('.canvas');
  const petMount=mount.querySelector('.card-pet-layer');
  let renderer,petRenderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); petRenderer = new THREE.WebGLRenderer({antialias:true,alpha:true}); }
  catch { app.querySelector('.notice').textContent = 'Trình duyệt không hỗ trợ hiển thị 3D.'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2.5));
  petRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  petRenderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', 'Thẻ câu hỏi 3D. Nhấn Enter để mở thẻ và dùng phím mũi tên để chuyển câu.');
  renderer.domElement.tabIndex = 0;
  mount.append(renderer.domElement);
  petMount.append(petRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .001, 10);
  camera.position.set(0, 0, .23);
  const petScene=new THREE.Scene();petScene.add(new THREE.AmbientLight(0xffffff,2.2));const petKey=new THREE.DirectionalLight(0xffe5ea,2.4);petKey.position.set(-2,3,4);petScene.add(petKey);
  const petCamera=new THREE.OrthographicCamera(-.4,.4,.4,-.4,.01,20);petCamera.position.set(0,.4,4);petCamera.lookAt(0,.4,0);
  let petRunner,petMixer,petWaveBones=[];
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
  let card, front, back, fontReady = false, originalTexture, originalBackTexture, activeTexture, activeBackTexture;
  let disposed = false, pointer = null, navigation = null, lift = null, focused = false;
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
    petCamera.left=-width/height*.4;petCamera.right=width/height*.4;petCamera.updateProjectionMatrix();petRenderer.setSize(width,height,false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(mount);
  resize();
  const petStart=performance.now();let petElapsed=0,lastPetFrame=petStart;
  new GLTFLoader().load('/chibi-shaded-rigged.glb',gltf=>{
    if(disposed)return;
    prepareChibi(gltf.scene);
    petRunner=new THREE.Group();petRunner.scale.setScalar(.05);petRunner.add(gltf.scene);petScene.add(petRunner);
    const runClip=createInPlaceRunClip(gltf.animations);if(runClip){petMixer=new THREE.AnimationMixer(gltf.scene);petMixer.clipAction(runClip).play();petMixer.timeScale=1.25;}
    petWaveBones=getGreetingBones(gltf.scene);
  },undefined,()=>{});

  function update() {
    app.querySelector('.progress').textContent = `Thẻ ${state.index + 1} / ${deck.questions.length}`;
    app.querySelector('.track div').style.width = `${(state.index + 1) / deck.questions.length * 100}%`;
    const currentQuestion = state.order[state.index];
    const favorite = (favorites[deck.id] || []).includes(currentQuestion);
    const favoriteButton = app.querySelector('.card-favorite');
    favoriteButton?.setAttribute('aria-pressed', String(favorite));
    favoriteButton?.setAttribute('aria-label', favorite ? 'Bỏ thẻ khỏi yêu thích' : 'Đánh dấu thẻ yêu thích');
    if (favoriteButton) favoriteButton.querySelector('span').textContent = '♥';
    app.querySelector('.deck-saved-link').textContent = `♥ Thẻ đã lưu trong bộ này (${savedCards(deck).length})`;
    const label = app.querySelector('.focused-progress-label');
    if (label) label.textContent = `Thẻ ${state.index + 1} / ${deck.questions.length}`;
    const focusedTrack = app.querySelector('.focused-progress-track');
    if (focusedTrack) {
      focusedTrack.setAttribute('aria-valuemax', String(deck.questions.length));
      focusedTrack.setAttribute('aria-valuenow', String(state.index + 1));
      focusedTrack.querySelector('div').style.width = `${(state.index + 1) / deck.questions.length * 100}%`;
    }
    if (front && fontReady) {
      const nextTexture = texture(deck.questions[state.order[state.index]]);
      front.map = nextTexture;
      front.needsUpdate = true;
      activeTexture?.dispose();
      activeTexture = nextTexture;
      if (back && !activeBackTexture) {
        activeBackTexture = backTexture();
        stack.traverse(object => {
          if (object.isMesh && object.material.name === 'BackTitle') {
            object.material.map = activeBackTexture;
            object.material.needsUpdate = true;
          }
        });
      }
    }
  }
  function revealCard() {
    if (!card || !fontReady || navigation || lift || focused) return;
    stack.updateMatrixWorld(true);
    scene.attach(card);
    card.rotation.set(0, 0, 0);
    startPosition.copy(card.position);
    focused = true;
    wrapper.classList.add('is-focused');
    dim.classList.add('is-visible');
    app.querySelector('.reveal').disabled = true;
    lift = { start: performance.now(), duration: 320 };
  }
  function moveQuestion(direction) {
    if (!card || navigation || lift || !focused) return;
    const nextIndex = state.index + direction;
    if (nextIndex < 0 || nextIndex >= deck.questions.length) {
      app.querySelector('.notice').textContent = direction < 0 ? 'Đây là câu đầu tiên trong bộ bài.' : 'Đây là câu cuối cùng trong bộ bài.';
      navigation = { direction: 0, phase: 'return', start: performance.now(), fromX: card.position.x, fromZ: card.rotation.z };
      return;
    }
    app.querySelector('.notice').textContent = '';
    const swipeDirection = -direction;
    navigation = { direction, swipeDirection, exitX: swipeDirection * 0.2, enterX: -swipeDirection * 0.2, phase: 'out', start: performance.now(), fromX: card.position.x, fromZ: card.rotation.z, fromY: card.position.y };
  }
  function closeFocused() {
    if (!card || !focused || navigation || lift) return;
    stack.add(card);
    stack.visible = true;
    card.position.set(0, 0, 0.006);
    card.rotation.set(0, Math.PI, 0);
    focused = false;
    wrapper.classList.remove('is-focused');
    dim.classList.remove('is-visible');
    app.querySelector('.reveal').disabled = false;
  }
  app.querySelector('.reveal').onclick = revealCard;
  app.querySelector('.deck-saved-link').onclick = () => showSavedCards(deck,()=>play(deck));
  app.querySelector('.card-favorite').onclick = () => {
    const current = new Set(favorites[deck.id] || []), questionIndex = state.order[state.index];
    if (current.has(questionIndex)) current.delete(questionIndex); else current.add(questionIndex);
    favorites[deck.id] = [...current];
    try { localStorage.setItem(favoritesKey, JSON.stringify(favorites)); } catch {}
    update();
  };
  app.querySelector('.previous').onclick = () => moveQuestion(-1);
  app.querySelector('.next').onclick = () => moveQuestion(1);
  app.querySelector('.close').onclick = closeFocused;
  dim.onclick = closeFocused;
  update();

  new GLTFLoader().load('/conversation-card-reference.glb', gltf => {
    if (disposed) return;
    const model = gltf.scene;
    model.traverse(object => {
      if (object.isMesh && object.material.name === 'FrontQuestion') {
        front = object.material;
        originalTexture = front.map;
      } else if (object.isMesh && object.material.name === 'BackTitle') {
        back = object.material;
        originalBackTexture = back.map;
      }
    });
    // The cards under the top card share their geometry and artwork.
    for (let i = 8; i >= 1; i--) {
      const underneath = model.clone();
      underneath.rotation.set(0, Math.PI, 0.006 * (i % 3 - 1));
      underneath.position.set(-i * 0.00015, i * 0.00055, 0.006 - i * 0.0003);
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
    document.fonts.load('700 94px "Be Vietnam Pro"', 'Hôm nay điều gì khiến bạn mỉm cười?').catch(() => {}).then(() => {
      if (disposed) return;
      fontReady = true;
      update();
      if(openSavedCard)requestAnimationFrame(revealCard);
    });
  }, undefined, () => {
    if (!disposed) app.querySelector('.notice').textContent = 'Không tải được bộ bài 3D.';
  });

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', event => {
    if (!card || navigation || lift || pointer) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId || navigation || !focused) return;
    const delta = event.clientX - pointer.x;
    card.position.x = delta / Math.max(mount.clientWidth, 1) * 0.15;
    card.rotation.z = -delta / Math.max(mount.clientWidth, 1) * 0.12;
  });
  function endPointer(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer = null;
    if (event.type === 'pointercancel') return;
    if (focused && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) moveQuestion(dx < 0 ? 1 : -1);
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) revealCard();
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (focused) moveQuestion(1); else revealCard(); }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveQuestion(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  renderer.setAnimationLoop(() => {
    const now=performance.now(),petDelta=Math.min((now-lastPetFrame)/1000,.1);lastPetFrame=now;petElapsed=(now-petStart)/1000;petMixer?.update(petDelta);
    if (card) {
      if (lift) {
        const t = Math.min((performance.now() - lift.start) / lift.duration, 1);
        const eased = 1 - (1 - t) ** 3;
        card.position.lerpVectors(startPosition, focusedPosition, eased);
        card.position.z += Math.sin(Math.PI * t) * 0.008;
        if (t === 1) lift = null;
      } else if (navigation) {
        const t = Math.min((performance.now() - navigation.start) / (navigation.phase === 'out' ? 190 : 260), 1);
        const eased = t * t * (3 - 2 * t);
        if (navigation.phase === 'out') {
          card.position.x = navigation.fromX + (navigation.exitX - navigation.fromX) * eased;
          card.position.y = navigation.fromY + 0.012 * Math.sin(Math.PI * eased);
          card.rotation.z = navigation.fromZ + (navigation.swipeDirection * 0.1 - navigation.fromZ) * eased;
          if (t === 1) {
            state.index += navigation.direction;
            persist();
            update();
            card.position.x = navigation.enterX;
            card.position.y = 0;
            card.rotation.z = -navigation.swipeDirection * 0.1;
            navigation = { ...navigation, phase: 'in', start: performance.now() };
          }
        } else if (navigation.phase === 'in') {
          card.position.x = navigation.enterX * (1 - eased);
          card.position.y = 0.012 * Math.sin(Math.PI * eased);
          card.rotation.z = -navigation.swipeDirection * 0.1 * (1 - eased);
          if (t === 1) {
            card.position.set(0, 0, focusedPosition.z);
            navigation = null;
          }
        } else {
          card.position.x = navigation.fromX * (1 - eased);
          card.rotation.z = navigation.fromZ * (1 - eased);
          if (t === 1) navigation = null;
        }
      } else if (focused && !pointer) {
        card.position.x *= .8;
        card.rotation.z *= .8;
      }
    }
    if(petRunner){
      if(focused){
        const modelHeight=1.623*.03,halfHeight=modelHeight/2,moveDuration=1.35,greetDuration=.85,range=Math.min(.15,petCamera.right*.38),laneY=.4-.255-modelHeight-.01;
        const segments=[
          {from:-range,to:0,duration:moveDuration,direction:1},
          {greet:true,duration:greetDuration},
          {from:0,to:range,duration:moveDuration,direction:1},
          {from:range,to:0,duration:moveDuration,direction:-1},
          {greet:true,duration:greetDuration},
          {from:0,to:-range,duration:moveDuration,direction:-1}
        ];
        const cycle=segments.reduce((sum,segment)=>sum+segment.duration,0);
        let phase=petElapsed%cycle,segment=segments[0];
        for(const item of segments){if(phase<item.duration){segment=item;break;}phase-=item.duration;}
        petRunner.scale.setScalar(.03);
        const ease=t=>(1-Math.cos(Math.PI*t))*.5;
        const t=phase/segment.duration,greeting=Boolean(segment.greet),x=greeting?0:THREE.MathUtils.lerp(segment.from,segment.to,ease(t));
        petRunner.position.set(x,laneY,0);
        const edge=THREE.MathUtils.clamp(Math.min(t/.2,(1-t)/.2),0,1),turnBlend=edge*edge*(3-2*edge);
        petRunner.rotation.y=greeting?0:segment.direction*Math.PI/2*turnBlend;
        if(petMixer)petMixer.timeScale=greeting ? .2 : .3+.85*turnBlend;
        if(greeting){const greetBlend=Math.sin(Math.PI*t),wave=Math.sin(petElapsed*7);for(const item of petWaveBones){const angle=item.baseAngle+wave*item.amplitude,target=item.rest.clone().multiply(new THREE.Quaternion().setFromAxisAngle(item.axis,angle));item.bone.quaternion.slerp(target,greetBlend);}}
      }else{
        const moveDuration=2,greetDuration=.9,cycle=moveDuration*4+greetDuration*2,phase=petElapsed%cycle,range=Math.max(.1,petCamera.right*.6);
        let x=0,direction=1,greeting=false;
        if(phase<moveDuration){x=-range+range*phase/moveDuration;}
        else if(phase<moveDuration+greetDuration){greeting=true;}
        else if(phase<moveDuration*2+greetDuration){x=range*(phase-moveDuration-greetDuration)/moveDuration;}
        else if(phase<moveDuration*3+greetDuration){direction=-1;x=range*(1-(phase-moveDuration*2-greetDuration)/moveDuration);}
        else if(phase<moveDuration*3+greetDuration*2){direction=-1;greeting=true;}
        else{x=-range*(phase-moveDuration*3-greetDuration*2)/moveDuration;}
        petRunner.scale.setScalar(.05);petRunner.position.set(x,.42,0);petRunner.rotation.y=greeting?0:direction*Math.PI/2;
        if(petMixer)petMixer.timeScale=greeting ? 0.35 : 1.25;
        if(greeting){const wave=Math.sin(petElapsed*8);for(const item of petWaveBones){const angle=item.baseAngle+wave*item.amplitude;item.bone.quaternion.copy(item.rest).multiply(new THREE.Quaternion().setFromAxisAngle(item.axis,angle));}}
      }
    }
    renderer.render(scene, camera);
    petRenderer.render(petScene,petCamera);
  });
  cleanup = () => {
    disposed = true;
    observer.disconnect();
    renderer.setAnimationLoop(null);
    petMixer?.stopAllAction();
    const geometries = new Set(), materials = new Set();
    stack.traverse(object => {
      if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); }
    });
    if (card && card.parent === scene) card.traverse(object => {
      if (object.isMesh) { geometries.add(object.geometry); materials.add(object.material); }
    });
    petScene.traverse(object=>{if(object.isMesh){geometries.add(object.geometry);for(const material of(Array.isArray(object.material)?object.material:[object.material]))materials.add(material);}});
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => { material.map?.dispose(); material.dispose(); });
    originalTexture?.dispose();
    originalBackTexture?.dispose();
    activeTexture?.dispose();
    activeBackTexture?.dispose();
    renderer.dispose();
    petRenderer.dispose();
    cleanup = () => {};
  };
}
home();
