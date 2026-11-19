// editor.js — wires the Cover Studio editor: uploads, panel cropping,
// caption, grades, sizes, live preview and PNG export. Photos are read
// with FileReader on this machine and never uploaded anywhere.

import { COVER_SIZES, coverPanelRects, drawCover, renderCoverCanvas } from './cover.js';

const SAMPLES = ['samples/boulevard.jpg', 'samples/pier.jpg'];

const state = {
  layout: 'triple',
  grade: 'sunset',
  size: 'square',
  title: 'NEON NIGHTS',
  subtitle: 'A COVER BY YOU',
  selected: 0,
  panels: [
    { img: null, src: '', zoom: 1, ox: 0, oy: 0 },
    { img: null, src: '', zoom: 1, ox: 0, oy: 0 },
    { img: null, src: '', zoom: 1, ox: 0, oy: 0 },
  ],
};

const $ = (id) => document.getElementById(id);
const previewCanvas = $('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');

/** Load an image from a URL (local sample or a data: URL from an upload). */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/** Put a photo into one panel and redraw. */
export async function setPanelPhoto(index, src) {
  try {
    const img = await loadImage(src);
    const panel = state.panels[index];
    panel.img = img;
    panel.src = src;
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
    renderPreview();
    syncCropControls();
    return true;
  } catch {
    return false;
  }
}

/** Load the bundled sample photos so the app opens with a finished cover. */
export async function loadSamplePhotos() {
  await setPanelPhoto(0, SAMPLES[0]);
  await setPanelPhoto(1, SAMPLES[1]);
  await setPanelPhoto(2, SAMPLES[0]);
  state.panels[2].zoom = 1.5;
  state.panels[2].ox = 0.25;
  renderPreview();
}

/** Draw the current cover into the preview canvas at its export aspect. */
export function renderPreview() {
  const size = COVER_SIZES[state.size];
  previewCanvas.width = size.width;
  previewCanvas.height = size.height;
  drawCover(previewCtx, size.width, size.height, state);
}

/** Which panel rect (in preview-canvas pixels) holds a point, or -1. */
export function panelAtPoint(x, y) {
  const rects = coverPanelRects(state.layout, previewCanvas.width, previewCanvas.height);
  const visible = state.layout === 'single' ? [0] : [0, 1, 2];
  for (const i of visible) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

/** Highlight the selected panel button and refill the crop sliders. */
export function syncCropControls() {
  document.querySelectorAll('#panelRow button').forEach((b) => {
    b.classList.toggle('picked', Number(b.dataset.panel) === state.selected);
  });
  const panel = state.panels[state.selected];
  $('zoomSlider').value = String(Math.round(panel.zoom * 100));
  $('zoomValue').textContent = `${Math.round(panel.zoom * 100)}%`;
  $('offsetXSlider').value = String(Math.round(panel.ox * 100));
  $('offsetYSlider').value = String(Math.round(panel.oy * 100));
}

/** Select a panel (from a button or a click on the preview). */
export function selectPanel(index) {
  state.selected = index;
  syncCropControls();
}

/** Mark one button in a row as picked and clear the others. */
function pickInRow(rowId, attr, value) {
  document.querySelectorAll(`#${rowId} button`).forEach((b) => {
    b.classList.toggle('picked', b.dataset[attr] === value);
  });
}

/** Read a photo the user picked from their machine into the selected panel. */
export function handlePhotoFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => setPanelPhoto(state.selected, String(reader.result));
  reader.readAsDataURL(file);
}

/** Copy the selected panel's photo into every panel (same photo, new crops). */
export function fillAllPanelsWithSelected() {
  const srcPanel = state.panels[state.selected];
  if (!srcPanel.img) return;
  for (let i = 0; i < state.panels.length; i++) {
    if (i === state.selected) continue;
    state.panels[i].img = srcPanel.img;
    state.panels[i].src = srcPanel.src;
    state.panels[i].zoom = 1 + (i % 2) * 0.4;
    state.panels[i].ox = i === 1 ? -0.3 : 0.3;
    state.panels[i].oy = 0;
  }
  renderPreview();
}

/** Give each panel a fresh random crop of its own photo. */
export function shuffleCrops() {
  for (const panel of state.panels) {
    if (!panel.img) continue;
    panel.zoom = 1.1 + Math.random() * 0.9;
    panel.ox = (Math.random() - 0.5) * 1.2;
    panel.oy = (Math.random() - 0.5) * 1.2;
  }
  renderPreview();
  syncCropControls();
}

/** Reset every control to the opening cover. */
export async function resetCover() {
  state.layout = 'triple';
  state.grade = 'sunset';
  state.size = 'square';
  state.title = 'NEON NIGHTS';
  state.subtitle = 'A COVER BY YOU';
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  pickInRow('layoutRow', 'layout', 'triple');
  pickInRow('gradeRow', 'grade', 'sunset');
  pickInRow('sizeRow', 'size', 'square');
  await loadSamplePhotos();
}

/** Export the cover at the picked size and download it as a PNG. */
export function exportCoverPng() {
  const canvas = renderCoverCanvas(state.size, state);
  const status = $('exportStatus');
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — please try again.';
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-studio-${state.size}-${COVER_SIZES[state.size].width}x${COVER_SIZES[state.size].height}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    status.textContent = `Saved ${COVER_SIZES[state.size].label} PNG — check your downloads.`;
  }, 'image/png');
}

/** Drag on the preview to pan the selected panel's photo; wheel to zoom. */
export function bindPreviewDrag() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const toCanvas = (event) => {
    const box = previewCanvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * previewCanvas.width,
      y: ((event.clientY - box.top) / box.height) * previewCanvas.height,
    };
  };

  previewCanvas.addEventListener('pointerdown', (event) => {
    const p = toCanvas(event);
    const hit = panelAtPoint(p.x, p.y);
    if (hit >= 0) selectPanel(hit);
    dragging = true;
    lastX = p.x;
    lastY = p.y;
    previewCanvas.setPointerCapture(event.pointerId);
  });
  previewCanvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const p = toCanvas(event);
    const panel = state.panels[state.selected];
    panel.ox += ((p.x - lastX) / previewCanvas.width) * 2;
    panel.oy += ((p.y - lastY) / previewCanvas.height) * 2;
    panel.ox = Math.max(-1, Math.min(1, panel.ox));
    panel.oy = Math.max(-1, Math.min(1, panel.oy));
    lastX = p.x;
    lastY = p.y;
    renderPreview();
    syncCropControls();
  });
  const stop = () => { dragging = false; };
  previewCanvas.addEventListener('pointerup', stop);
  previewCanvas.addEventListener('pointercancel', stop);
  previewCanvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[state.selected];
    panel.zoom = Math.max(1, Math.min(3, panel.zoom - Math.sign(event.deltaY) * 0.08));
    renderPreview();
    syncCropControls();
  }, { passive: false });
}

/** Wire every control in the sidebar to the state. */
export function bindControls() {
  document.querySelectorAll('#layoutRow button').forEach((b) => {
    b.addEventListener('click', () => {
      state.layout = b.dataset.layout;
      pickInRow('layoutRow', 'layout', state.layout);
      renderPreview();
    });
  });
  document.querySelectorAll('#gradeRow button').forEach((b) => {
    b.addEventListener('click', () => {
      state.grade = b.dataset.grade;
      pickInRow('gradeRow', 'grade', state.grade);
      renderPreview();
    });
  });
  document.querySelectorAll('#sizeRow button').forEach((b) => {
    b.addEventListener('click', () => {
      state.size = b.dataset.size;
      pickInRow('sizeRow', 'size', state.size);
      renderPreview();
    });
  });
  document.querySelectorAll('#panelRow button').forEach((b) => {
    b.addEventListener('click', () => selectPanel(Number(b.dataset.panel)));
  });
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; renderPreview(); });
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; renderPreview(); });
  $('photoInput').addEventListener('change', (e) => handlePhotoFile(e.target.files[0]));
  $('zoomSlider').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value) / 100;
    $('zoomValue').textContent = `${e.target.value}%`;
    renderPreview();
  });
  $('offsetXSlider').addEventListener('input', (e) => {
    state.panels[state.selected].ox = Number(e.target.value) / 100;
    renderPreview();
  });
  $('offsetYSlider').addEventListener('input', (e) => {
    state.panels[state.selected].oy = Number(e.target.value) / 100;
    renderPreview();
  });
  $('fillAllBtn').addEventListener('click', fillAllPanelsWithSelected);
  $('shuffleBtn').addEventListener('click', shuffleCrops);
  $('resetBtn').addEventListener('click', resetCover);
  $('exportBtn').addEventListener('click', exportCoverPng);
  bindPreviewDrag();
}

/**
 * Screenshot modes (?shot=cover or ?shot=editor): the cover fills the whole
 * window, or the editor opens with the sample photos already loaded.
 * Params: size, layout, grade, title, subtitle, photo (boulevard|pier|both).
 */
export async function applyShotMode() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  const size = params.get('size');
  if (size && COVER_SIZES[size]) state.size = size;
  const layout = params.get('layout');
  if (layout === 'single' || layout === 'triple') state.layout = layout;
  const grade = params.get('grade');
  if (grade === 'sunset' || grade === 'neon' || grade === 'original') state.grade = grade;
  const title = params.get('title');
  if (title) state.title = title;
  const subtitle = params.get('subtitle');
  if (subtitle !== null) state.subtitle = subtitle;
  const photo = params.get('photo') || 'both';
  const first = photo === 'pier' ? SAMPLES[1] : SAMPLES[0];
  const second = photo === 'boulevard' ? SAMPLES[0] : SAMPLES[1];
  await setPanelPhoto(0, first);
  await setPanelPhoto(1, second);
  await setPanelPhoto(2, first);
  state.panels[2].zoom = 1.4;
  state.panels[2].ox = 0.2;
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    $('studio').hidden = true;
    $('topbar').hidden = true;
    const coverCanvas = $('coverCanvas');
    $('coverMode').hidden = false;
    // Screenshot mode: ?cw=1280&ch=720 names the exact bitmap size, so the
    // cover fills the screenshot edge to edge with no CSS stretching.
    // Otherwise size it to the layout viewport.
    const cw = Number(params.get('cw') || 0);
    const ch = Number(params.get('ch') || 0);
    coverCanvas.width = cw > 0 ? cw : document.documentElement.clientWidth;
    coverCanvas.height = ch > 0 ? ch : document.documentElement.clientHeight;
    coverCanvas.style.width = `${coverCanvas.width}px`;
    coverCanvas.style.height = `${coverCanvas.height}px`;
    drawCover(coverCanvas.getContext('2d'), coverCanvas.width, coverCanvas.height, state);
    document.title = `${state.title} — Cover Studio`;
  } else {
    $('titleInput').value = state.title;
    $('subtitleInput').value = state.subtitle;
    pickInRow('layoutRow', 'layout', state.layout);
    pickInRow('gradeRow', 'grade', state.grade);
    pickInRow('sizeRow', 'size', state.size);
    renderPreview();
  }
  window.__coverReady = true;
  return true;
}

/** Boot: controls, samples, preview — or a screenshot mode when asked. */
export async function bootEditor() {
  bindControls();
  const shot = await applyShotMode();
  if (!shot) {
    await loadSamplePhotos();
    syncCropControls();
  }
  window.__coverReady = true;
}

bootEditor();
