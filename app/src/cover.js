// cover.js — draws GTA-style multi-panel cover art onto a canvas.
// Pure drawing: no DOM, no network. The editor and the exporter share it,
// so the live preview and the exported PNG are the same picture.

export const COVER_SIZES = {
  square: { width: 1080, height: 1080, label: '1080 × 1080' },
  portrait: { width: 1080, height: 1350, label: '1080 × 1350' },
  landscape: { width: 1920, height: 1080, label: '1920 × 1080' },
};

export const COVER_GRADES = {
  sunset: 'Sunset',
  neon: 'Neon',
  original: 'Original',
};

/** Poster-paper colour used for the outer frame and the panel gutters. */
const PAPER = '#f4ecdd';

/**
 * The rectangles of the photo panels for a layout inside a cover of w × h.
 * triple: one big panel plus two small ones (top + bottom row on square and
 * portrait, left column + right column on landscape). single: one full-bleed.
 */
export function coverPanelRects(layout, w, h) {
  const m = Math.round(Math.min(w, h) * 0.022);
  const g = Math.round(Math.min(w, h) * 0.013);
  const cw = w - 2 * m;
  const ch = h - 2 * m;
  if (layout === 'single') return [{ x: 0, y: 0, w, h }];
  if (w >= h) {
    const leftW = Math.round(cw * 0.56);
    const rightW = cw - leftW - g;
    const topH = Math.round((ch - g) / 2);
    return [
      { x: m, y: m, w: leftW, h: ch },
      { x: m + leftW + g, y: m, w: rightW, h: topH },
      { x: m + leftW + g, y: m + topH + g, w: rightW, h: ch - topH - g },
    ];
  }
  const topH = Math.round(ch * 0.55);
  const botH = ch - topH - g;
  const halfW = Math.round((cw - g) / 2);
  return [
    { x: m, y: m, w: cw, h: topH },
    { x: m, y: m + topH + g, w: halfW, h: botH },
    { x: m + halfW + g, y: m + topH + g, w: cw - halfW - g, h: botH },
  ];
}

/** The canvas filter string that gives a photo its colour grade. */
export function gradePhotoFilter(grade) {
  if (grade === 'sunset') return 'saturate(1.35) sepia(0.28) hue-rotate(-14deg) brightness(1.04) contrast(1.06)';
  if (grade === 'neon') return 'saturate(1.7) hue-rotate(18deg) contrast(1.12) brightness(1.02)';
  return 'none';
}

/** Draw one photo cover-fit inside a panel rect, honouring zoom and offsets. */
export function drawPanelPhoto(ctx, img, rect, panel, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (img && img.naturalWidth > 0) {
    const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
    const scale = base * panel.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const cx = rect.x + rect.w / 2 + panel.ox * rect.w * 0.45;
    const cy = rect.y + rect.h / 2 + panel.oy * rect.h * 0.45;
    ctx.filter = gradePhotoFilter(grade);
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.filter = 'none';
  } else {
    drawEmptyPanel(ctx, rect);
  }
  drawGradeWash(ctx, rect, grade);
  drawVignette(ctx, rect);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(2, Math.round(Math.min(rect.w, rect.h) * 0.006));
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

/** Placeholder art for a panel with no photo yet: a warm sky gradient. */
export function drawEmptyPanel(ctx, rect) {
  const sky = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  sky.addColorStop(0, '#ff9a5c');
  sky.addColorStop(0.55, '#ff5e8a');
  sky.addColorStop(1, '#5b2a86');
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const sun = ctx.createRadialGradient(
    rect.x + rect.w * 0.5, rect.y + rect.h * 0.42, 4,
    rect.x + rect.w * 0.5, rect.y + rect.h * 0.42, rect.w * 0.22,
  );
  sun.addColorStop(0, 'rgba(255,236,180,0.95)');
  sun.addColorStop(1, 'rgba(255,236,180,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `900 ${Math.round(rect.w * 0.055)}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h * 0.72);
}

/** A translucent colour wash over a panel: warm dusk or magenta/cyan neon. */
export function drawGradeWash(ctx, rect, grade) {
  let wash;
  if (grade === 'sunset') {
    wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    wash.addColorStop(0, 'rgba(255,170,80,0.05)');
    wash.addColorStop(1, 'rgba(255,110,40,0.20)');
  } else if (grade === 'neon') {
    wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    wash.addColorStop(0, 'rgba(255,45,149,0.16)');
    wash.addColorStop(0.55, 'rgba(120,40,255,0.05)');
    wash.addColorStop(1, 'rgba(0,229,255,0.16)');
  } else {
    return;
  }
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** Darken a panel's corners so the photo feels printed, not pasted. */
export function drawVignette(ctx, rect) {
  const v = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
  );
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(10,5,20,0.28)');
  ctx.fillStyle = v;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** Thin neon scanlines across the whole cover, neon grade only. */
export function drawScanlines(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 2);
  ctx.restore();
}

/**
 * Bold poster lettering: subtitle in spaced capitals, then the big title in
 * heavy system type with a thick dark outline, warm fill and a drop shadow,
 * tilted a touch like a printed poster. No game font is used anywhere.
 */
export function drawCaptionBlock(ctx, w, h, title, subtitle) {
  const scrimH = Math.round(h * 0.34);
  const scrim = ctx.createLinearGradient(0, h - scrimH, 0, h);
  scrim.addColorStop(0, 'rgba(12,4,18,0)');
  scrim.addColorStop(0.55, 'rgba(12,4,18,0.55)');
  scrim.addColorStop(1, 'rgba(12,4,18,0.82)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h - scrimH, w, h);

  const cx = w / 2;
  const titleText = (title || 'UNTITLED').toUpperCase().trim() || 'UNTITLED';
  const subText = (subtitle || '').toUpperCase().trim();

  // Size the title first: it decides where the subtitle sits above it.
  let size = Math.round(w * 0.125);
  ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  const maxW = w * 0.94;
  while (size > 20 && ctx.measureText(titleText).width > maxW) {
    size = Math.round(size * 0.92);
    ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  }
  const subSize = Math.max(14, Math.round(w * 0.026));
  const subY = -Math.round(size * 1.18);

  ctx.save();
  ctx.translate(cx, h - Math.round(h * 0.075));
  ctx.rotate(-0.026);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (subText) {
    ctx.font = `700 ${subSize}px "Segoe UI", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.42)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = '#ffd9a0';
    ctx.fillText(subText, 0, subY);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    const ruleW = Math.min(w * 0.3, subText.length * subSize * 0.62);
    ctx.strokeStyle = 'rgba(255,217,160,0.8)';
    ctx.lineWidth = Math.max(2, Math.round(w * 0.002));
    ctx.beginPath();
    ctx.moveTo(-ruleW / 2, subY + subSize * 0.75);
    ctx.lineTo(ruleW / 2, subY + subSize * 0.75);
    ctx.stroke();
  }

  // Re-assert the title font: the subtitle block above replaced it.
  ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(size * 0.015)}px`; } catch { /* older canvas */ }
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = Math.round(size * 0.09);
  ctx.shadowOffsetY = Math.round(size * 0.05);
  ctx.strokeStyle = '#14090f';
  ctx.lineWidth = Math.max(4, Math.round(size * 0.17));
  ctx.strokeText(titleText, 0, 0);
  const fill = ctx.createLinearGradient(0, -size, 0, size * 0.2);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(1, '#ffe3b8');
  ctx.fillStyle = fill;
  ctx.fillText(titleText, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.font = `700 ${Math.max(11, Math.round(w * 0.013))}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('COVER STUDIO · FAN-MADE', w - Math.round(w * 0.02), h - Math.round(h * 0.012));
  ctx.restore();
}

/**
 * Draw the whole cover: paper frame, photo panels, caption. `cover` holds
 * layout, grade, title, subtitle and a panels array of {img, zoom, ox, oy}.
 */
export function drawCover(ctx, w, h, cover) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  const rects = coverPanelRects(cover.layout, w, h);
  const visible = cover.layout === 'single' ? [0] : [0, 1, 2];
  for (const i of visible) {
    const panel = cover.panels[i];
    if (!panel) continue;
    drawPanelPhoto(ctx, panel.img || null, rects[i], panel, cover.grade);
  }
  if (cover.grade === 'neon') drawScanlines(ctx, w, h);
  drawCaptionBlock(ctx, w, h, cover.title, cover.subtitle);
  ctx.strokeStyle = 'rgba(20,9,15,0.35)';
  ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * 0.004));
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.restore();
}

/** Render a cover to an offscreen canvas at an export size and return it. */
export function renderCoverCanvas(sizeKey, cover) {
  const size = COVER_SIZES[sizeKey] || COVER_SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  drawCover(canvas.getContext('2d'), size.width, size.height, cover);
  return canvas;
}
