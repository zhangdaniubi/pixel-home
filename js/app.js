/* ============================================================
   PIXEL.HOME - 像素复古个人主页 JS 逻辑
   全部数据本地存储 · IndexedDB + LocalStorage · 纯前端
   ============================================================ */

// ===================== 全局状态 =====================
const APP = {
  currentTab: 'home',
  albumSelectionMode: false,
  selectedAlbums: new Set(),
  bookmarkSelectionMode: false,
  selectedBookmarks: new Set(),
  editingNoteId: null,
  editingBookmarkId: null,
  currentPreviewPhotoId: null,
  noteTags: [],
};

// ===================== DOM 缓存 =====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===================== IndexedDB（图片存储） =====================
const DB_NAME = 'PixelHomeDB';
const DB_VERSION = 1;
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains('photos')) {
        database.createObjectStore('photos', { keyPath: 'id' });
      }
    };
  });
}

function dbAdd(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGet(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbDelete(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function dbClear(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ===================== LocalStorage 工具 =====================
const LS = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      showToast('存储空间不足，请清理数据');
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

// ===================== Toast 提示 =====================
let toastTimer = null;
function showToast(msg, duration = 2000) {
  const toast = $('#pixelToast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ===================== 像素冲击动画（V3 短促版） =====================
function pixelShake(el) {
  if (!el) return;
  el.classList.remove('pixel-shake-impact');
  void el.offsetWidth; // 触发 reflow 重置动画
  el.classList.add('pixel-shake-impact');
  el.addEventListener('animationend', () => el.classList.remove('pixel-shake-impact'), { once: true });
}

// ===================== 点击涟漪效果 =====================
document.addEventListener('click', (e) => {
  const target = e.target.closest('.pixel-btn, .album-card, .nav-btn, .theme-color, .pixel-modal-close');
  if (!target) return;

  // 卡片点击波纹（霓虹青色）
  if (target.classList.contains('album-card') || target.classList.contains('note-card') || target.classList.contains('bookmark-card')) {
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position:absolute; width:10px; height:10px;
      background: rgba(34,211,238,0.3); pointer-events:none;
      left:${x}px; top:${y}px; transform:translate(-50%,-50%) scale(0);
      animation: cardRipple 0.5s ease-out forwards;
      z-index:2;
    `;
    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }
});

const style = document.createElement('style');
style.textContent = `
@keyframes cardRipple {
  0%   { opacity: 0.5; transform: translate(-50%, -50%) scale(1);   width: 10px; height: 10px; }
  100% { opacity: 0;   transform: translate(-50%, -50%) scale(25); width: 300px; height: 300px; }
}
`;
document.head.appendChild(style);

// ===================== 弹窗关闭（撕裂动效） =====================
function closeModal(modalEl) {
  const content = modalEl.querySelector('.pixel-modal-content');
  if (content && !content.classList.contains('hiding')) {
    content.classList.add('hiding');
    content.addEventListener('animationend', () => {
      modalEl.classList.remove('active');
      content.classList.remove('hiding');
    }, { once: true });
  } else {
    modalEl.classList.remove('active');
  }
}

// ===================== 故障转场（武士零风格） =====================
function mosaicTransition(callback) {
  const overlay = $('#glitchOverlay');
  overlay.classList.add('active');
  overlay.addEventListener('animationend', () => {
    overlay.classList.remove('active');
    if (callback) callback();
  }, { once: true });
}

// ===================== 导航切换 =====================
function switchTab(tabName) {
  if (APP.currentTab === tabName) return;

  mosaicTransition(() => {
    // 切换 tab-content
    $$('.tab-content').forEach((el) => el.classList.remove('active'));
    const target = $(`#tab-${tabName}`);
    if (target) target.classList.add('active');

    // 切换 nav-btn active
    $$('.nav-btn').forEach((btn) => btn.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
    if (navBtn) navBtn.classList.add('active');

    APP.currentTab = tabName;

    // 关闭移动端菜单
    $('#pixelNav').classList.remove('open');

    // 根据模块刷新数据
    if (tabName === 'home') updateHomeStats();
    if (tabName === 'album') renderAlbum();
    if (tabName === 'notes') renderNotesList();
    if (tabName === 'bookmarks') renderBookmarks();
    if (tabName === 'settings') refreshSettingsUI();
  });
}

// 绑定导航点击
$$('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    pixelShake(btn);
    switchTab(btn.dataset.tab);
  });
});

// 移动端汉堡菜单
$('#hamburgerBtn').addEventListener('click', () => {
  $('#pixelNav').classList.toggle('open');
  pixelShake($('#hamburgerBtn'));
});

// ===================== 首页统计 =====================
function updateHomeStats() {
  const photos = LS.get('pixel_album_meta', []);
  const notes = LS.get('pixel_notes', []);
  const bookmarks = LS.get('pixel_bookmarks', []);
  $('#statPhotos').textContent = photos.length;
  $('#statNotes').textContent = notes.length;
  $('#statBookmarks').textContent = bookmarks.length;

  // 更新头像和昵称
  const avatar = LS.get('pixel_avatar', '');
  const nickname = LS.get('pixel_nickname', '像素旅人');
  $('#homeNickname').textContent = nickname;
  if (avatar) {
    $('#homeAvatarImg').src = avatar;
    $('#homeAvatarImg').style.display = 'block';
    $('#homeAvatarPlaceholder').style.display = 'none';
  } else {
    $('#homeAvatarImg').style.display = 'none';
    $('#homeAvatarPlaceholder').style.display = 'block';
  }
}

// ===================== 图片压缩工具 =====================
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ===================== 相册模块 =====================

// ---- 相册数据管理 ----
function getAlbums() { return LS.get('pixel_albums', []); }
function saveAlbums(albums) { LS.set('pixel_albums', albums); }
function getAlbumName(albumId) {
  const a = getAlbums().find((x) => x.id === albumId);
  return a ? a.name : '未知相册';
}

// 确保默认相册（含旧数据迁移）
function ensureDefaultAlbum() {
  let albums = getAlbums();
  if (!albums.some((a) => a.isDefault)) {
    albums.unshift({ id: 'album_default', name: '默认相册', createdAt: Date.now(), isDefault: true });
    saveAlbums(albums);
  }
  // 迁移旧 category → albumId
  const meta = LS.get('pixel_album_meta', []);
  let m = false;
  meta.forEach((p) => { if (!p.albumId) { p.albumId = 'album_default'; m = true; } });
  if (m) LS.set('pixel_album_meta', meta);
}

let currentAlbumId = 'album_default'; // 当前正在浏览的相册

// ---- 视图切换 ----
function switchToGalleryView() {
  $('#albumGalleryView').style.display = 'block';
  $('#albumPhotoView').style.display = 'none';
  APP.selectedAlbums.clear();
  APP.albumSelectionMode = false;
  renderAlbumGallery();
}

function switchToPhotoView(albumId) {
  currentAlbumId = albumId;
  $('#albumGalleryView').style.display = 'none';
  $('#albumPhotoView').style.display = 'block';
  APP.selectedAlbums.clear();
  APP.albumSelectionMode = false;
  $('#albumPhotoTitle').textContent = getAlbumName(albumId);
  renderAlbumPhotos();
}

// ---- 渲染相册列表（手机相册风格） ----
async function renderAlbumGallery() {
  const grid = $('#albumGalleryGrid');
  const albums = getAlbums();
  const meta = LS.get('pixel_album_meta', []);

  if (albums.length === 0) {
    grid.innerHTML = '<p class="empty-hint">还没有相册，创建一个吧~</p>';
    return;
  }

  grid.innerHTML = albums
    .map((a) => {
      const count = meta.filter((p) => p.albumId === a.id).length;
      return `
    <div class="album-card pixel-card" data-id="${a.id}">
      <div class="album-card-cover">
        <img src="" data-album="${a.id}" alt="${escapeHTML(a.name)}" loading="lazy" style="display:none">
        <span class="cover-placeholder">▣</span>
      </div>
      <div class="album-card-info">
        <div class="album-card-name">${escapeHTML(a.name)}</div>
        <div class="album-card-count">${count} 张照片</div>
      </div>
    </div>`;
    })
    .join('');

  // 异步加载封面（第一张照片）
  albums.forEach(async (a) => {
    const photos = meta.filter((p) => p.albumId === a.id);
    if (photos.length > 0) {
      const record = await dbGet('photos', photos[0].id);
      if (record) {
        const coverImg = grid.querySelector(`img[data-album="${a.id}"]`);
        if (coverImg) {
          coverImg.src = record.dataUrl;
          coverImg.style.display = 'block';
          const placeholder = coverImg.parentElement.querySelector('.cover-placeholder');
          if (placeholder) placeholder.style.display = 'none';
        }
      }
    }
  });

  // 点击进入相册
  grid.querySelectorAll('.album-card').forEach((card) => {
    card.addEventListener('click', () => {
      pixelShake(card);
      switchToPhotoView(card.dataset.id);
    });
  });
}

// ---- 渲染相册内照片 ----
async function renderAlbumPhotos() {
  const grid = $('#albumGrid');
  const meta = LS.get('pixel_album_meta', []);
  const photos = meta.filter((p) => p.albumId === currentAlbumId);

  $('#albumPhotoCount').textContent = photos.length + '张';

  if (photos.length === 0) {
    grid.innerHTML = '<p class="empty-hint">还没有图片，快来上传吧~</p>';
  } else {
    grid.innerHTML = photos
      .map((p) => `
      <div class="album-item ${APP.selectedAlbums.has(p.id) ? 'selected' : ''}" data-id="${p.id}">
        <img src="" data-id="${p.id}" alt="${p.name}" loading="lazy" style="transform:rotate(${p.rotation || 0}deg)">
        <div class="album-item-check">${APP.selectedAlbums.has(p.id) ? '✓' : ''}</div>
        <div class="album-item-overlay">
          <button class="pixel-btn btn-sm preview-btn" data-id="${p.id}">预览</button>
          <button class="pixel-btn btn-sm btn-danger del-btn" data-id="${p.id}">删除</button>
        </div>
      </div>`)
      .join('');
  }

  // 异步加载
  photos.forEach(async (p) => {
    const record = await dbGet('photos', p.id);
    if (record) {
      const img = grid.querySelector(`img[data-id="${p.id}"]`);
      if (img) img.src = record.dataUrl;
    }
  });

  // 事件绑定
  grid.querySelectorAll('.preview-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); pixelShake(btn); previewPhoto(btn.dataset.id); });
  });
  grid.querySelectorAll('.del-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); pixelShake(btn); deletePhoto(btn.dataset.id); });
  });
  grid.querySelectorAll('.album-item').forEach((item) => {
    item.addEventListener('click', () => {
      if (APP.albumSelectionMode) toggleAlbumSelect(item.dataset.id);
    });
  });
  grid.querySelectorAll('.album-item-check').forEach((check) => {
    check.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAlbumSelect(check.parentElement.dataset.id);
    });
  });

  updateAlbumBatchDelBtn();
}

// ---- 重新渲染当前视图 ----
function renderAlbum() {
  if ($('#albumGalleryView').style.display !== 'none') {
    renderAlbumGallery();
  } else {
    renderAlbumPhotos();
  }
}

// ---- 返回按钮 ----
$('#albumBackBtn').addEventListener('click', () => {
  pixelShake($('#albumBackBtn'));
  switchToGalleryView();
});

// ---- 原图上传（不做任何压缩）----
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadPhotos(files) {
  const meta = LS.get('pixel_album_meta', []);
  let count = 0;
  const total = files.length;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith('image/')) continue;
    try {
      showToast(`上传中 ${i + 1}/${total}...`, 1000);
      const dataUrl = await fileToDataURL(file);
      const id = 'photo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      await dbAdd('photos', { id, dataUrl });
      meta.push({ id, name: file.name, albumId: currentAlbumId, createdAt: Date.now(), rotation: 0 });
      count++;
    } catch (e) { console.error('上传失败:', e); }
  }
  LS.set('pixel_album_meta', meta);
  showToast(`上传 ${count} 张原图到「${getAlbumName(currentAlbumId)}」`);
  syncToCloud(true);
  renderAlbumPhotos();
  updateHomeStats();
}

// ---- 拖拽上传 ----
const uploadZone = $('#uploadZone');
const fileInput = $('#albumFileInput');
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault(); uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) uploadPhotos(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) { uploadPhotos(fileInput.files); fileInput.value = ''; }
});
$('#albumUploadBtn').addEventListener('click', () => { pixelShake($('#albumUploadBtn')); fileInput.click(); });

// ---- 批量选择 ----
function toggleAlbumSelect(id) {
  if (APP.selectedAlbums.has(id)) APP.selectedAlbums.delete(id);
  else APP.selectedAlbums.add(id);
  if (APP.selectedAlbums.size === 0) APP.albumSelectionMode = false;
  else APP.albumSelectionMode = true;
  renderAlbumPhotos();
}

function updateAlbumBatchDelBtn() {
  const btn = $('#albumBatchDelBtn');
  const n = APP.selectedAlbums.size;
  btn.disabled = n === 0;
  btn.textContent = n > 0 ? `批量删除(${n})` : '批量删除';
}
$('#albumBatchDelBtn').addEventListener('click', () => {
  if (APP.selectedAlbums.size === 0) return;
  pixelShake($('#albumBatchDelBtn'));
  if (confirm(`确定删除选中的 ${APP.selectedAlbums.size} 张图片吗？`)) {
    batchDeletePhotos([...APP.selectedAlbums]);
  }
});

async function batchDeletePhotos(ids) {
  for (const id of ids) await dbDelete('photos', id);
  const meta = LS.get('pixel_album_meta', []).filter((p) => !ids.includes(p.id));
  LS.set('pixel_album_meta', meta);
  APP.selectedAlbums.clear();
  showToast(`已删除 ${ids.length} 张图片`);
  syncToCloud(true);
  renderAlbumPhotos();
  updateHomeStats();
}

async function deletePhoto(id) {
  await dbDelete('photos', id);
  LS.set('pixel_album_meta', LS.get('pixel_album_meta', []).filter((p) => p.id !== id));
  APP.selectedAlbums.delete(id);
  showToast('图片已删除');
  syncToCloud(true);
  renderAlbumPhotos();
  updateHomeStats();
}

// ---- 新建相册 ----
$('#albumCreateBtn').addEventListener('click', () => {
  pixelShake($('#albumCreateBtn'));
  $('#createAlbumModal').classList.add('active');
  $('#newAlbumNameInput').value = '';
  $('#newAlbumNameInput').focus();
});
$('#createAlbumConfirmBtn').addEventListener('click', () => {
  pixelShake($('#createAlbumConfirmBtn'));
  const name = $('#newAlbumNameInput').value.trim();
  if (!name) { showToast('请输入名称'); return; }
  const albums = getAlbums();
  if (albums.some((a) => a.name === name)) { showToast('名称重复'); return; }
  albums.push({ id: 'album_' + Date.now(), name, createdAt: Date.now(), isDefault: false });
  saveAlbums(albums);
  closeModal($('#createAlbumModal'));
  showToast(`相册「${name}」已创建`);
  syncToCloud(true);
  renderAlbumGallery();
});
$('#createAlbumCancelBtn').addEventListener('click', () => {
  closeModal($('#createAlbumModal'));
});

// ---- 重命名当前相册 ----
$('#albumRenameBtn').addEventListener('click', () => {
  pixelShake($('#albumRenameBtn'));
  const album = getAlbums().find((a) => a.id === currentAlbumId);
  if (!album || album.isDefault) { showToast('默认相册不可重命名'); return; }
  const newName = prompt('重命名：', album.name);
  if (newName && newName.trim() && newName.trim() !== album.name) {
    const albums = getAlbums();
    const a = albums.find((x) => x.id === currentAlbumId);
    if (a) { a.name = newName.trim(); saveAlbums(albums); }
    $('#albumPhotoTitle').textContent = newName.trim();
    showToast('已重命名');
  }
});

// ---- 删除当前相册 ----
$('#albumDeleteAlbumBtn').addEventListener('click', () => {
  pixelShake($('#albumDeleteAlbumBtn'));
  const album = getAlbums().find((a) => a.id === currentAlbumId);
  if (!album || album.isDefault) { showToast('默认相册不可删除'); return; }
  const meta = LS.get('pixel_album_meta', []);
  const count = meta.filter((p) => p.albumId === currentAlbumId).length;
  if (!confirm(`删除相册「${album.name}」？${count > 0 ? count + ' 张照片将移至默认相册。' : ''}`)) return;
  meta.forEach((p) => { if (p.albumId === currentAlbumId) p.albumId = 'album_default'; });
  LS.set('pixel_album_meta', meta);
  saveAlbums(getAlbums().filter((a) => a.id !== currentAlbumId));
  showToast('相册已删除');
  syncToCloud(true);
  switchToGalleryView();
});

// ---- 图片预览 ----
function previewPhoto(id) {
  APP.currentPreviewPhotoId = id;
  $('#albumPreviewModal').classList.add('active');
  const meta = LS.get('pixel_album_meta', []);
  const photo = meta.find((p) => p.id === id);
  dbGet('photos', id).then((record) => {
    if (record) {
      $('#albumPreviewImg').src = record.dataUrl;
      $('#albumPreviewImg').style.transform = `rotate(${photo ? photo.rotation || 0 : 0}deg)`;
    }
  });
}
$('#albumPreviewClose').addEventListener('click', () => closeModal($('#albumPreviewModal')));
$('#albumPreviewDelBtn').addEventListener('click', () => {
  if (APP.currentPreviewPhotoId) { deletePhoto(APP.currentPreviewPhotoId); closeModal($('#albumPreviewModal')); }
});

// ---- 下载原图 ----
$('#albumPreviewDownloadBtn').addEventListener('click', () => {
  if (!APP.currentPreviewPhotoId) return;
  pixelShake($('#albumPreviewDownloadBtn'));
  const img = $('#albumPreviewImg');
  if (!img || !img.src || img.src.startsWith('blob:')) { showToast('图片加载中...'); return; }
  const meta = LS.get('pixel_album_meta', []).find(p => p.id === APP.currentPreviewPhotoId);
  const filename = meta ? meta.name : 'photo.jpg';
  // 对于 dataURL 直接下载
  if (img.src.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = img.src;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('正在下载原图...');
    return;
  }
  // 兜底方案：fetch 转 blob 下载
  fetch(img.src).then(r => r.blob()).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('正在下载原图...');
  });
});

// ---- 旋转90° ----
$('#albumPreviewRotateBtn').addEventListener('click', async () => {
  if (!APP.currentPreviewPhotoId) return;
  pixelShake($('#albumPreviewRotateBtn'));
  const id = APP.currentPreviewPhotoId;
  const record = await dbGet('photos', id);
  if (!record) return;
  const img = new Image();
  img.onload = async () => {
    const c = document.createElement('canvas');
    c.width = img.height; c.height = img.width;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.translate(c.width, 0); ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, 0, 0);
    const newUrl = c.toDataURL('image/jpeg', 0.85);
    await dbAdd('photos', { id, dataUrl: newUrl });
    const meta = LS.get('pixel_album_meta', []);
    const p = meta.find((x) => x.id === id);
    if (p) { p.rotation = ((p.rotation || 0) + 90) % 360; LS.set('pixel_album_meta', meta); }
    $('#albumPreviewImg').src = newUrl;
    $('#albumPreviewImg').style.transform = `rotate(${p ? p.rotation : 0}deg)`;
    showToast('已旋转 90°');
    renderAlbumPhotos();
  };
  img.src = record.dataUrl;
});

// ---- 移动单张照片（从预览弹窗） ----
$('#albumPreviewMoveBtn').addEventListener('click', () => {
  if (!APP.currentPreviewPhotoId) return;
  pixelShake($('#albumPreviewMoveBtn'));
  openMoveToAlbumModal([APP.currentPreviewPhotoId]);
});

// ---- 批量移动照片 ----
$('#albumMoveBtn').addEventListener('click', () => {
  pixelShake($('#albumMoveBtn'));
  const ids = [...APP.selectedAlbums];
  if (ids.length === 0) { showToast('请先在照片上点击勾选要移动的照片'); return; }
  openMoveToAlbumModal(ids);
});

// 移动弹窗
function openMoveToAlbumModal(photoIds) {
  const albums = getAlbums();
  const list = $('#albumMoveList');
  list.innerHTML = albums
    .map((a) => `
    <div class="album-move-item ${a.id === currentAlbumId ? 'current-album' : ''}" data-id="${a.id}">
      <span>${escapeHTML(a.name)}</span>
      <span style="font-family:var(--font-pixel);font-size:0.4rem;color:var(--pixel-text-dim)">
        ${a.id === currentAlbumId ? '当前相册' : '点击移入 →'}
      </span>
    </div>`)
    .join('');

  list.querySelectorAll('.album-move-item:not(.current-album)').forEach((item) => {
    item.addEventListener('click', () => {
      const targetAlbumId = item.dataset.id;
      const meta = LS.get('pixel_album_meta', []);
      photoIds.forEach((pid) => {
        const p = meta.find((x) => x.id === pid);
        if (p) p.albumId = targetAlbumId;
      });
      LS.set('pixel_album_meta', meta);
      APP.selectedAlbums.clear();
      closeModal($('#moveToAlbumModal'));
      showToast(`已移动 ${photoIds.length} 张照片`);
      renderAlbumPhotos();
    });
  });

  $('#moveToAlbumModal').classList.add('active');
}
$('#moveToAlbumCloseBtn').addEventListener('click', () => {
  closeModal($('#moveToAlbumModal'));
});

// ===================== 笔记模块 =====================

// ===================== 笔记模块 =====================
function getNotes() {
  return LS.get('pixel_notes', []);
}
function saveNotes(notes) {
  LS.set('pixel_notes', notes);
}

// 新建笔记
$('#noteNewBtn').addEventListener('click', () => {
  pixelShake($('#noteNewBtn'));
  APP.editingNoteId = null;
  APP.noteTags = [];
  $('#noteTitleInput').value = '';
  $('#noteContentInput').value = '';
  $('#noteTagsDisplay').innerHTML = '';
  $('#notesEditor').style.display = 'block';
  $('#notesList').style.display = 'none';
  $('#noteDeleteBtn').style.display = 'none';
});

// 取消编辑
$('#noteCancelBtn').addEventListener('click', () => {
  APP.editingNoteId = null;
  APP.noteTags = [];
  $('#notesEditor').style.display = 'none';
  $('#notesList').style.display = 'flex';
  renderNotesList();
});

// 保存笔记
$('#noteSaveBtn').addEventListener('click', () => {
  pixelShake($('#noteSaveBtn'));
  const title = $('#noteTitleInput').value.trim();
  const content = $('#noteContentInput').value.trim();
  if (!title && !content) {
    showToast('标题或内容不能为空');
    return;
  }

  const notes = getNotes();
  const noteData = {
    id: APP.editingNoteId || 'note_' + Date.now(),
    title: title || '无标题',
    content,
    tags: APP.noteTags,
    updatedAt: Date.now(),
  };

  if (APP.editingNoteId) {
    const idx = notes.findIndex((n) => n.id === APP.editingNoteId);
    if (idx >= 0) {
      noteData.createdAt = notes[idx].createdAt || noteData.updatedAt;
      notes[idx] = noteData;
    }
  } else {
    noteData.createdAt = Date.now();
    notes.unshift(noteData);
  }

  saveNotes(notes);
  showToast('笔记已保存');
  syncToCloud(true);
  APP.editingNoteId = null;
  APP.noteTags = [];
  $('#notesEditor').style.display = 'none';
  $('#notesList').style.display = 'flex';
  renderNotesList();
  updateHomeStats();
});

// 删除笔记
$('#noteDeleteBtn').addEventListener('click', () => {
  if (!APP.editingNoteId) return;
  pixelShake($('#noteDeleteBtn'));
  if (confirm('确定删除这条笔记吗？')) {
    const notes = getNotes().filter((n) => n.id !== APP.editingNoteId);
    saveNotes(notes);
    showToast('笔记已删除');
    syncToCloud(true);
    APP.editingNoteId = null;
    APP.noteTags = [];
    $('#notesEditor').style.display = 'none';
    $('#notesList').style.display = 'flex';
    renderNotesList();
    updateHomeStats();
  }
});

// 编辑笔记
function editNote(id) {
  const notes = getNotes();
  const note = notes.find((n) => n.id === id);
  if (!note) return;

  APP.editingNoteId = id;
  APP.noteTags = [...note.tags];
  $('#noteTitleInput').value = note.title;
  $('#noteContentInput').value = note.content;
  renderNoteTagsDisplay();
  $('#notesEditor').style.display = 'block';
  $('#notesList').style.display = 'none';
  $('#noteDeleteBtn').style.display = 'inline-block';
}

// 标签管理
$('#noteTagInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const tag = $('#noteTagInput').value.trim();
    if (tag && !APP.noteTags.includes(tag)) {
      APP.noteTags.push(tag);
      renderNoteTagsDisplay();
      $('#noteTagInput').value = '';
    }
  }
});

function renderNoteTagsDisplay() {
  $('#noteTagsDisplay').innerHTML = APP.noteTags
    .map(
      (tag) => `<span class="note-tag">${tag}<span class="tag-remove" data-tag="${tag}">×</span></span>`
    )
    .join('');

  $$('#noteTagsDisplay .tag-remove').forEach((el) => {
    el.addEventListener('click', () => {
      APP.noteTags = APP.noteTags.filter((t) => t !== el.dataset.tag);
      renderNoteTagsDisplay();
    });
  });
}

// 渲染笔记列表
function renderNotesList() {
  const list = $('#notesList');
  const notes = getNotes();
  const search = ($('#noteSearchInput').value || '').toLowerCase();
  const tagFilter = $('#noteTagFilter').value;

  // 更新标签筛选器
  const allTags = [...new Set(notes.flatMap((n) => n.tags))];
  $('#noteTagFilter').innerHTML = '<option value="all">全部标签</option>' +
    allTags.map((t) => `<option value="${t}">${t}</option>`).join('');
  if (tagFilter !== 'all') $('#noteTagFilter').value = tagFilter;

  let filtered = notes;
  if (search) {
    filtered = filtered.filter(
      (n) => n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search)
    );
  }
  if (tagFilter !== 'all') {
    filtered = filtered.filter((n) => n.tags.includes(tagFilter));
  }

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-hint">还没有笔记，创建一个吧~</p>';
  } else {
    list.innerHTML = filtered
      .map(
        (note) => `
      <div class="note-card pixel-card" data-id="${note.id}">
        <div class="note-card-title">${escapeHTML(note.title)}</div>
        <div class="note-card-preview">${escapeHTML(note.content.slice(0, 80))}</div>
        <div class="note-card-tags">
          ${note.tags.map((t) => `<span class="note-tag">${escapeHTML(t)}</span>`).join('')}
        </div>
      </div>`
      )
      .join('');
  }

  list.querySelectorAll('.note-card').forEach((card) => {
    card.addEventListener('click', () => editNote(card.dataset.id));
  });

  list.style.display = 'flex';
}

$('#noteSearchInput').addEventListener('input', renderNotesList);
$('#noteTagFilter').addEventListener('change', renderNotesList);

// ===================== 书签模块 =====================
function getBookmarks() {
  return LS.get('pixel_bookmarks', []);
}
function saveBookmarks(bookmarks) {
  LS.set('pixel_bookmarks', bookmarks);
}

// 渲染书签
function renderBookmarks() {
  const grid = $('#bookmarkGrid');
  const bookmarks = getBookmarks();
  const search = ($('#bookmarkSearchInput').value || '').toLowerCase();
  const groupFilter = $('#bookmarkGroupFilter').value;

  // 更新分组筛选器
  const groups = [...new Set(bookmarks.map((b) => b.group).filter(Boolean))];
  $('#bookmarkGroupFilter').innerHTML = '<option value="all">全部组</option>' +
    groups.map((g) => `<option value="${g}">${g}</option>`).join('');
  if (groupFilter !== 'all') $('#bookmarkGroupFilter').value = groupFilter;

  // 更新书签表单中的分组选择
  $('#bookmarkGroupSelect').innerHTML = '<option value="">默认分组</option>' +
    groups.map((g) => `<option value="${g}">${g}</option>`).join('');

  let filtered = bookmarks;
  if (search) {
    filtered = filtered.filter(
      (b) =>
        b.name.toLowerCase().includes(search) ||
        b.url.toLowerCase().includes(search) ||
        (b.note && b.note.toLowerCase().includes(search))
    );
  }
  if (groupFilter !== 'all') {
    filtered = filtered.filter((b) => b.group === groupFilter);
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="empty-hint">还没有书签，添加你的第一个收藏吧~</p>';
  } else {
    grid.innerHTML = filtered
      .map(
        (bm) => `
      <div class="bookmark-card pixel-card ${APP.selectedBookmarks.has(bm.id) ? 'selected' : ''}" data-id="${bm.id}">
        <div class="bookmark-check">${APP.selectedBookmarks.has(bm.id) ? '✓' : ''}</div>
        ${bm.group ? `<span class="bookmark-group-tag">${escapeHTML(bm.group)}</span>` : ''}
        <div class="bookmark-name">${escapeHTML(bm.name)}</div>
        <div class="bookmark-url">${escapeHTML(bm.url)}</div>
        ${bm.note ? `<div class="bookmark-note">${escapeHTML(bm.note)}</div>` : ''}
        <div class="bookmark-actions">
          <button class="pixel-btn btn-sm visit-btn" data-url="${escapeHTML(bm.url)}">打开</button>
          <button class="pixel-btn btn-sm edit-bm-btn" data-id="${bm.id}">编辑</button>
          <button class="pixel-btn btn-sm btn-danger del-bm-btn" data-id="${bm.id}">删除</button>
        </div>
      </div>`
      )
      .join('');
  }

  // 绑定事件
  grid.querySelectorAll('.visit-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pixelShake(btn);
      window.open(btn.dataset.url, '_blank');
    });
  });
  grid.querySelectorAll('.edit-bm-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pixelShake(btn);
      openBookmarkModal(btn.dataset.id);
    });
  });
  grid.querySelectorAll('.del-bm-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pixelShake(btn);
      deleteBookmark(btn.dataset.id);
    });
  });
  grid.querySelectorAll('.bookmark-card').forEach((card) => {
    card.addEventListener('click', () => {
      if (APP.bookmarkSelectionMode) {
        toggleBookmarkSelect(card.dataset.id, card);
      }
    });
  });
  grid.querySelectorAll('.bookmark-check').forEach((check) => {
    check.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = check.parentElement.dataset.id;
      toggleBookmarkSelect(id, check.parentElement);
    });
  });

  updateBookmarkBatchDelBtn();
}

function toggleBookmarkSelect(id, el) {
  if (APP.selectedBookmarks.has(id)) {
    APP.selectedBookmarks.delete(id);
  } else {
    APP.selectedBookmarks.add(id);
  }
  if (APP.selectedBookmarks.size === 0) {
    APP.bookmarkSelectionMode = false;
  }
  renderBookmarks();
}

function updateBookmarkBatchDelBtn() {
  const btn = $('#bookmarkBatchDelBtn');
  if (APP.selectedBookmarks.size > 0) {
    btn.disabled = false;
    btn.textContent = `批量删除(${APP.selectedBookmarks.size})`;
    APP.bookmarkSelectionMode = true;
  } else {
    btn.disabled = true;
    btn.textContent = '批量删除';
    APP.bookmarkSelectionMode = false;
  }
}

$('#bookmarkBatchDelBtn').addEventListener('click', () => {
  if (APP.selectedBookmarks.size === 0) return;
  pixelShake($('#bookmarkBatchDelBtn'));
  if (confirm(`确定删除选中的 ${APP.selectedBookmarks.size} 个书签吗？`)) {
    const ids = [...APP.selectedBookmarks];
    const bookmarks = getBookmarks().filter((b) => !ids.includes(b.id));
    saveBookmarks(bookmarks);
    APP.selectedBookmarks.clear();
    showToast(`已删除 ${ids.length} 个书签`);
    syncToCloud(true);
    renderBookmarks();
    updateHomeStats();
  }
});

// 打开书签弹窗
function openBookmarkModal(id = null) {
  const modal = $('#bookmarkModal');
  APP.editingBookmarkId = id;

  if (id) {
    $('#bookmarkModalTitle').textContent = '★ 编辑书签';
    const bookmarks = getBookmarks();
    const bm = bookmarks.find((b) => b.id === id);
    if (bm) {
      $('#bookmarkNameInput').value = bm.name;
      $('#bookmarkUrlInput').value = bm.url;
      $('#bookmarkNoteInput').value = bm.note || '';
      $('#bookmarkGroupSelect').value = bm.group || '';
    }
  } else {
    $('#bookmarkModalTitle').textContent = '★ 添加书签';
    $('#bookmarkNameInput').value = '';
    $('#bookmarkUrlInput').value = '';
    $('#bookmarkNoteInput').value = '';
    $('#bookmarkGroupSelect').value = '';
  }
  modal.classList.add('active');
}

$('#bookmarkNewBtn').addEventListener('click', () => {
  pixelShake($('#bookmarkNewBtn'));
  openBookmarkModal();
});

$('#bookmarkModalClose').addEventListener('click', () => {
  closeModal($('#bookmarkModal'));
});

// 保存书签
$('#bookmarkSaveBtn').addEventListener('click', () => {
  pixelShake($('#bookmarkSaveBtn'));
  const name = $('#bookmarkNameInput').value.trim();
  let url = $('#bookmarkUrlInput').value.trim();
  const note = $('#bookmarkNoteInput').value.trim();
  const group = $('#bookmarkGroupSelect').value;

  if (!name || !url) {
    showToast('名称和网址不能为空');
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  const bookmarks = getBookmarks();
  const bmData = {
    id: APP.editingBookmarkId || 'bm_' + Date.now(),
    name,
    url,
    note,
    group,
    updatedAt: Date.now(),
  };

  if (APP.editingBookmarkId) {
    const idx = bookmarks.findIndex((b) => b.id === APP.editingBookmarkId);
    if (idx >= 0) {
      bmData.createdAt = bookmarks[idx].createdAt || bmData.updatedAt;
      bookmarks[idx] = bmData;
    }
  } else {
    bmData.createdAt = Date.now();
    bookmarks.push(bmData);
  }

  saveBookmarks(bookmarks);
  showToast('书签已保存');
  syncToCloud(true);
  closeModal($('#bookmarkModal'));
  APP.editingBookmarkId = null;
  renderBookmarks();
  updateHomeStats();
});

function deleteBookmark(id) {
  if (!confirm('确定删除这个书签吗？')) return;
  const bookmarks = getBookmarks().filter((b) => b.id !== id);
  saveBookmarks(bookmarks);
  APP.selectedBookmarks.delete(id);
  showToast('书签已删除');
  syncToCloud(true);
  renderBookmarks();
  updateHomeStats();
}

$('#bookmarkSearchInput').addEventListener('input', renderBookmarks);
$('#bookmarkGroupFilter').addEventListener('change', renderBookmarks);

// 点击弹窗遮罩关闭
$$('.pixel-modal-backdrop').forEach((backdrop) => {
  backdrop.addEventListener('click', () => {
    const content = backdrop.parentElement.querySelector('.pixel-modal-content');
    if (content && !content.classList.contains('hiding')) {
      content.classList.add('hiding');
      content.addEventListener('animationend', () => {
        backdrop.parentElement.classList.remove('active');
        content.classList.remove('hiding');
      }, { once: true });
    }
  });
});

// ===================== 设置模块 =====================
// 主题色
const accentColor = LS.get('pixel_accent', '#888888');

function applyTheme(color) {
  document.documentElement.style.setProperty('--pixel-accent', color);
  const rgb = hexToRgb(color);
  document.documentElement.style.setProperty('--pixel-accent-rgb', rgb.join(','));
  LS.set('pixel_accent', color);

  // 更新主题选择器
  $$('.theme-color').forEach((el) => el.classList.remove('active'));
  const preset = document.querySelector(`.theme-color[data-theme="${color}"]`);
  if (preset) preset.classList.add('active');
  $('#themeCustomColor').value = color;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [136, 136, 136];
}

$$('.theme-color').forEach((btn) => {
  btn.addEventListener('click', () => {
    applyTheme(btn.dataset.theme);
    showToast('主题已更新');
    syncToCloud(true);
  });
});

$('#themeCustomColor').addEventListener('input', () => {
  applyTheme($('#themeCustomColor').value);
  showToast('主题已更新');
  syncToCloud(true);
});

// 头像
$('#avatarUploadBtn').addEventListener('click', () => $('#avatarFileInput').click());

$('#avatarFileInput').addEventListener('change', async () => {
  const file = $('#avatarFileInput').files[0];
  if (!file || !file.type.startsWith('image/')) return;

  const dataUrl = await compressImage(file, 128, 0.6);
  LS.set('pixel_avatar', dataUrl);
  updateAvatarDisplay(dataUrl);
  showToast('头像已更新');
  syncToCloud(true);
  updateHomeStats();
});

$('#avatarResetBtn').addEventListener('click', () => {
  LS.remove('pixel_avatar');
  updateAvatarDisplay('');
  showToast('头像已重置');
  syncToCloud(true);
  updateHomeStats();
});

function updateAvatarDisplay(dataUrl) {
  if (dataUrl) {
    $('#settingsAvatarImg').src = dataUrl;
    $('#settingsAvatarImg').style.display = 'block';
    $('#settingsAvatarPlaceholder').style.display = 'none';
  } else {
    $('#settingsAvatarImg').style.display = 'none';
    $('#settingsAvatarPlaceholder').style.display = 'block';
  }
}

// 昵称
$('#nicknameSaveBtn').addEventListener('click', () => {
  const nickname = $('#nicknameInput').value.trim();
  if (!nickname) {
    showToast('昵称不能为空');
    return;
  }
  LS.set('pixel_nickname', nickname);
  showToast('昵称已保存');
  syncToCloud(true);
  updateHomeStats();
});

// 数据导出
$('#exportDataBtn').addEventListener('click', async () => {
  pixelShake($('#exportDataBtn'));
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    notes: LS.get('pixel_notes', []),
    bookmarks: LS.get('pixel_bookmarks', []),
    albumMeta: LS.get('pixel_album_meta', []),
    albums: LS.get('pixel_albums', []),
    settings: {
      accent: LS.get('pixel_accent', '#888888'),
      nickname: LS.get('pixel_nickname', '像素旅人'),
      avatar: LS.get('pixel_avatar', ''),
    },
  };

  // 导出照片数据
  exportData.photos = {};
  for (const photo of exportData.albumMeta) {
    const record = await dbGet('photos', photo.id);
    if (record) {
      exportData.photos[photo.id] = record.dataUrl;
    }
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pixel-home-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('数据已导出');
});

// 数据导入
$('#importDataBtn').addEventListener('click', () => {
  pixelShake($('#importDataBtn'));
  $('#importFileInput').click();
});

$('#importFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.version) {
      showToast('无效的备份文件');
      return;
    }

    if (!confirm('导入将覆盖当前数据，确定继续吗？')) return;

    // 恢复设置
    if (data.settings) {
      LS.set('pixel_accent', data.settings.accent || '#888888');
      LS.set('pixel_nickname', data.settings.nickname || '像素旅人');
      LS.set('pixel_avatar', data.settings.avatar || '');
    }
    if (data.notes) LS.set('pixel_notes', data.notes);
    if (data.bookmarks) LS.set('pixel_bookmarks', data.bookmarks);
    if (data.clipboardHistory) LS.set('pixel_clipboard_history', data.clipboardHistory);
    if (data.albums) LS.set('pixel_albums', data.albums);
    else ensureDefaultAlbum(); // 旧版备份无相册数据，创建默认相册

    if (data.albumMeta) {
      LS.set('pixel_album_meta', data.albumMeta);
      // 清除旧照片并导入新照片
      await dbClear('photos');
      if (data.photos) {
        for (const [id, dataUrl] of Object.entries(data.photos)) {
          await dbAdd('photos', { id, dataUrl });
        }
      }
    }

    showToast('数据导入成功，即将刷新');
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    showToast('导入失败：文件格式错误');
  }
});

// 清除全部数据
$('#clearDataBtn').addEventListener('click', () => {
  pixelShake($('#clearDataBtn'));
  if (!confirm('确定清除全部数据吗？此操作不可恢复！')) return;
  if (!confirm('再次确认：真的要删除所有数据吗？')) return;

  // 保留登录状态
  const keepLogin = LS.get('pixel_logged_in', false);
  localStorage.clear();
  if (keepLogin) LS.set('pixel_logged_in', true);

  dbClear('photos').then(() => {
    showToast('所有数据已清除');
    setTimeout(() => location.reload(), 1000);
  });
});

// 设置页退出登录
$('#settingsLogoutBtn').addEventListener('click', () => {
  pixelShake($('#settingsLogoutBtn'));
  if (confirm('确定退出登录吗？退出后需重新输入密码。')) {
    doLogout();
  }
});

// 刷新设置界面
function refreshSettingsUI() {
  const accent = LS.get('pixel_accent', '#888888');
  const nickname = LS.get('pixel_nickname', '像素旅人');
  const avatar = LS.get('pixel_avatar', '');

  applyTheme(accent);
  $('#nicknameInput').value = nickname;
  updateAvatarDisplay(avatar);
}

// ===================== 登录认证（含Cookie持久化 + 云端同步） =====================
const AUTH = {
  username: 'admin',
  passwordHash: 'zhangdaniubi',
};
const SYNC_URL = 'https://pixel-sync.zhangdaniubi.workers.dev';
const SESSION_DAYS = 7;

// Cookie 工具
function setCookie(name, value, days) {
  const d = new Date(); d.setTime(d.getTime() + days * 86400000);
  document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
}
function getCookie(name) {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return m ? decodeURIComponent(m[2]) : null;
}
function delCookie(name) { setCookie(name, '', -1); }

function checkLogin() {
  if (LS.get('pixel_logged_in', false)) {
    // 检查是否过期
    const loginTime = LS.get('pixel_login_time', 0);
    if (Date.now() - loginTime < SESSION_DAYS * 86400000) return true;
  }
  // Cookie 备份
  if (getCookie('pixel_auth') === '1') {
    LS.set('pixel_logged_in', true);
    LS.set('pixel_login_time', Date.now());
    return true;
  }
  return false;
}

function doLogin(username, password) {
  if (username === AUTH.username && password === AUTH.passwordHash) {
    LS.set('pixel_logged_in', true);
    LS.set('pixel_login_time', Date.now());
    setCookie('pixel_auth', '1', SESSION_DAYS);
    LS.set('pixel_sync_user', username);
    LS.set('pixel_sync_pass', password);
    return true;
  }
  return false;
}

function doLogout() {
  LS.remove('pixel_logged_in');
  LS.remove('pixel_login_time');
  LS.remove('pixel_sync_pass');
  delCookie('pixel_auth');
  location.reload();
}

// ===================== 云端数据同步（原图上传） =====================
let syncInProgress = false;

async function syncToCloud(silent = false) {
  if (syncInProgress) { if (!silent) showToast('同步进行中，请稍候...'); return false; }
  syncInProgress = true;
  const user = LS.get('pixel_sync_user', '');
  const pass = LS.get('pixel_sync_pass', '');
  if (!user || !pass) { syncInProgress = false; return false; }

  const syncBtn = $('#manualSyncBtn');
  const updateProgress = (text) => {
    if (syncBtn && !silent) syncBtn.textContent = text;
  };

  try {
    updateProgress('⏳ 打包...');
    const payload = btoa(user + ':' + pass);
    const albumMeta = LS.get('pixel_album_meta', []);

    // 收集文本元数据
    const data = {
      notes: LS.get('pixel_notes', []),
      bookmarks: LS.get('pixel_bookmarks', []),
      albumMeta: albumMeta.map(p => ({
        id: p.id, name: p.name, albumId: p.albumId,
        createdAt: p.createdAt, rotation: p.rotation || 0
      })),
      albums: LS.get('pixel_albums', []),
      settings: {
        accent: LS.get('pixel_accent', '#888888'),
        nickname: LS.get('pixel_nickname', '像素旅人'),
        avatar: LS.get('pixel_avatar', ''),
      },
    };

    // 原图上传（不做二次压缩）
    data.photos = {};
    for (let i = 0; i < albumMeta.length; i++) {
      const p = albumMeta[i];
      const rec = await dbGet('photos', p.id);
      if (rec && rec.dataUrl) data.photos[p.id] = rec.dataUrl;
      if (i % 5 === 0 && !silent) {
        updateProgress('⏳ ' + (i + 1) + '/' + albumMeta.length);
      }
    }

    const body = JSON.stringify(data);
    const sizeMB = (body.length / 1024 / 1024).toFixed(1);
    if (body.length > 18 * 1024 * 1024) {
      if (!silent) showToast('数据过大(' + sizeMB + 'MB)，请删减照片');
      syncInProgress = false;
      updateProgress('☁ 同步');
      return false;
    }

    updateProgress('⏳ 上传 ' + sizeMB + 'MB...');
    const res = await fetch(SYNC_URL + '/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + payload },
      body: body,
    });
    const result = await res.json();
    if (result.ok) {
      if (!silent) showToast('同步完成 ☁ (' + albumMeta.length + '张原图, ' + sizeMB + 'MB)');
    } else {
      if (!silent) showToast('同步失败：' + (result.error || '服务器错误'));
    }
    syncInProgress = false;
    updateProgress('☁ 同步');
    return result.ok;
  } catch (e) {
    if (!silent) showToast('同步失败：请检查网络');
    syncInProgress = false;
    updateProgress('☁ 同步');
    return false;
  }
}

async function syncFromCloud(silent = false) {
  const user = LS.get('pixel_sync_user', '');
  const pass = LS.get('pixel_sync_pass', '');
  if (!user || !pass) return false;

  const syncBtn = $('#manualSyncBtn');
  const updateProgress = (text) => {
    if (syncBtn && !silent) syncBtn.textContent = text;
  };

  try {
    updateProgress('⏬ 下载...');
    const payload = btoa(user + ':' + pass);
    const res = await fetch(SYNC_URL + '/api/sync', {
      headers: { 'Authorization': 'Basic ' + payload },
    });
    if (!res.ok) { if (!silent) showToast('同步失败：服务器错误'); updateProgress('☁ 同步'); return false; }
    const data = await res.json();
    if (!data || (!data.notes && !data.bookmarks && !data.albumMeta)) {
      if (!silent) showToast('云端暂无数据'); updateProgress('☁ 同步'); return false;
    }

    // 覆盖本地文本数据
    if (data.notes) LS.set('pixel_notes', data.notes);
    if (data.bookmarks) LS.set('pixel_bookmarks', data.bookmarks);
    if (data.albums) LS.set('pixel_albums', data.albums);
    if (data.albumMeta) LS.set('pixel_album_meta', data.albumMeta);
    if (data.settings) {
      if (data.settings.accent) LS.set('pixel_accent', data.settings.accent);
      if (data.settings.nickname) LS.set('pixel_nickname', data.settings.nickname);
      if (data.settings.avatar) LS.set('pixel_avatar', data.settings.avatar);
    }

    // 恢复照片
    if (data.photos) {
      const photoIds = Object.keys(data.photos);
      for (let i = 0; i < photoIds.length; i++) {
        const id = photoIds[i];
        const exists = await dbGet('photos', id);
        if (!exists) {
          await dbAdd('photos', { id, dataUrl: data.photos[id] });
        }
        if (i % 3 === 0 && !silent) {
          updateProgress('⏬ ' + (i + 1) + '/' + photoIds.length);
        }
      }
      if (!silent) showToast('已恢复 ' + photoIds.length + ' 张照片 ☁');
    } else {
      if (!silent) showToast('云端数据已加载 ☁');
    }
    updateProgress('☁ 同步');
    return true;
  } catch (e) {
    if (!silent) showToast('同步失败：请检查网络');
    updateProgress('☁ 同步');
    return false;
  }
}

// 手动同步按钮
function addSyncButton() {
  const existing = $('#manualSyncBtn');
  if (existing) existing.remove();
  const btn = document.createElement('button');
  btn.id = 'manualSyncBtn';
  btn.className = 'pixel-btn btn-sm';
  btn.title = '手动同步到云端';
  btn.innerHTML = '☁ 同步';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:500;font-size:0.5rem;box-shadow:0 0 15px var(--z-cyan-glow);';
  btn.addEventListener('click', async () => {
    btn.textContent = '⏳...';
    btn.disabled = true;
    await syncFromCloud(false);
    await syncToCloud(false);
    btn.textContent = '☁ 同步';
    btn.disabled = false;
    updateHomeStats();
    refreshSettingsUI();
    if (APP.currentTab === 'album') renderAlbum();
    if (APP.currentTab === 'notes') renderNotesList();
    if (APP.currentTab === 'bookmarks') renderBookmarks();
  });
  document.body.appendChild(btn);
}

// 登录表单提交
$('#loginSubmitBtn').addEventListener('click', async () => {
  pixelShake($('#loginSubmitBtn'));
  const username = $('#loginUsername').value.trim();
  const password = $('#loginPassword').value.trim();

  if (!username || !password) {
    $('#loginError').textContent = '请输入账号和密码';
    return;
  }

  if (doLogin(username, password)) {
    $('#loginError').textContent = '';
    $('#loginOverlay').classList.add('hidden');
    showToast('登录成功，正在同步...');
    // 先拉云端数据
    const synced = await syncFromCloud(true);
    if (synced) showToast('已同步云端数据 ☁');
    updateHomeStats();
    updateLoginIndicator();
    refreshSettingsUI();
    // 再推本地数据
    syncToCloud(true);
  } else {
    $('#loginError').textContent = '账号或密码错误';
    $('#loginPassword').value = '';
    const card = document.querySelector('.login-card');
    card.classList.add('katana-shake-c');
    card.addEventListener('animationend', () => card.classList.remove('katana-shake-c'), { once: true });
  }
});

// 回车键提交
$('#loginPassword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#loginSubmitBtn').click();
});
$('#loginUsername').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#loginPassword').focus();
});

// 更新登录状态指示
function updateLoginIndicator() {
  const existing = $('#logoutIndicator');
  if (existing) existing.remove();

  if (checkLogin()) {
    const indicator = document.createElement('button');
    indicator.id = 'logoutIndicator';
    indicator.className = 'pixel-btn btn-sm logout-btn';
    indicator.textContent = '⏻ 登出';
    indicator.title = '退出登录';
    indicator.addEventListener('click', () => {
      if (confirm('确定退出登录吗？')) {
        doLogout();
      }
    });
    document.querySelector('.pixel-nav').appendChild(indicator);
  }
}

// ===================== 工具函数 =====================
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===================== 初始化 =====================
async function init() {
  // 打开数据库
  await openDB();

  // 初始化相册（含旧数据迁移）
  ensureDefaultAlbum();
  currentAlbumId = 'album_default';

  // 登录检查
  if (checkLogin()) {
    $('#loginOverlay').classList.add('hidden');
    // 登录后先从云端拉取数据
    showToast('正在同步云端数据...');
    syncFromCloud(true).then((ok) => {
      if (ok) showToast('云端数据已加载 ☁');
      updateHomeStats();
      refreshSettingsUI();
      if (APP.currentTab === 'album') renderAlbum();
      if (APP.currentTab === 'notes') renderNotesList();
      if (APP.currentTab === 'bookmarks') renderBookmarks();
    });
  } else {
    // 显示登录遮罩
    $('#loginOverlay').classList.remove('hidden');
    $('#loginUsername').focus();
  }
  updateLoginIndicator();

  // 添加手动同步按钮
  addSyncButton();

  // 应用保存的主题
  const savedAccent = LS.get('pixel_accent', '#888888');
  applyTheme(savedAccent);

  // 更新首页
  updateHomeStats();

  console.log('◈ PIXEL.HOME v2.0 初始化完成 | 云端同步就绪 ◈');
}

// 启动
init().catch((e) => console.error('初始化失败:', e));
