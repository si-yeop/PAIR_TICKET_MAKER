const canvas = document.getElementById("ticketCanvas");
const ctx = canvas.getContext("2d");

const BASE_WIDTH = 1400;
const BASE_HEIGHT = 760;
const TEMPLATE_STORAGE_KEY = "pairTicketTemplates.v1";
const TEMPLATE_DB_NAME = "pairTicketMaker";
const TEMPLATE_DB_VERSION = 1;
const TEMPLATE_STORE_NAME = "templates";
const TICKET = { x: 64, y: 82, w: 1272, h: 596, r: 34, bite: 30, splitX: 1048 };
const PHOTO_AREA = { x: 480, y: 132, w: 552, h: 500 };
const STUB_PANEL = { x: 1088, y: 120, w: 206, h: 520 };
const BARCODE_RECT = { x: 1158, y: 274, w: 72, h: 142 };
const PHOTO_RECTS = {
  left: { x: 552, y: 178, w: 216, h: 344 },
  right: { x: 802, y: 178, w: 216, h: 344 },
};

const controls = {
  photoLeft: document.getElementById("photoLeft"),
  photoRight: document.getElementById("photoRight"),
  backgroundImage: document.getElementById("backgroundImage"),
  backgroundMode: document.getElementById("backgroundMode"),
  backgroundStartColor: document.getElementById("backgroundStartColor"),
  backgroundEndColor: document.getElementById("backgroundEndColor"),
  backgroundBlur: document.getElementById("backgroundBlur"),
  stubImage: document.getElementById("stubImage"),
  stubImageOpacity: document.getElementById("stubImageOpacity"),
  barcodeImage: document.getElementById("barcodeImage"),
  barcodeSize: document.getElementById("barcodeSize"),
  stickerUpload: document.getElementById("stickerUpload"),
  stickerSize: document.getElementById("stickerSize"),
  clearStickers: document.getElementById("clearStickers"),
  activePhotoLabel: document.getElementById("activePhotoLabel"),
  selectLeft: document.getElementById("selectLeft"),
  selectRight: document.getElementById("selectRight"),
  resetLeftPhoto: document.getElementById("resetLeftPhoto"),
  resetRightPhoto: document.getElementById("resetRightPhoto"),
  resetPhoto: document.getElementById("resetPhoto"),
  downloadBtn: document.getElementById("downloadBtn"),
  titleText: document.getElementById("titleText"),
  bottomText: document.getElementById("bottomText"),
  sideText: document.getElementById("sideText"),
  numberLeftText: document.getElementById("numberLeftText"),
  numberRightText: document.getElementById("numberRightText"),
  photoCaptionText: document.getElementById("photoCaptionText"),
  photoCaptionStyle: document.getElementById("photoCaptionStyle"),
  photoCaptionSize: document.getElementById("photoCaptionSize"),
  photoCaptionColor: document.getElementById("photoCaptionColor"),
  noteText: document.getElementById("noteText"),
  codeText: document.getElementById("codeText"),
  accentColor: document.getElementById("accentColor"),
  textColor: document.getElementById("textColor"),
  bandColor: document.getElementById("bandColor"),
  inkColor: document.getElementById("inkColor"),
  titleSize: document.getElementById("titleSize"),
  bodySize: document.getElementById("bodySize"),
  paperTone: document.getElementById("paperTone"),
  templateName: document.getElementById("templateName"),
  templateStatus: document.getElementById("templateStatus"),
  templateSelect: document.getElementById("templateSelect"),
  saveTemplate: document.getElementById("saveTemplate"),
  loadTemplate: document.getElementById("loadTemplate"),
  deleteTemplate: document.getElementById("deleteTemplate"),
};

const state = {
  activePhoto: "left",
  dragging: false,
  dragStart: null,
  scriptFontReady: false,
  backgroundImage: null,
  backgroundDataUrl: "",
  stubImage: null,
  stubDataUrl: "",
  barcodeImage: null,
  barcodeDataUrl: "",
  activeStickerId: null,
  stickers: [],
  photos: {
    left: createPhotoState(),
    right: createPhotoState(),
  },
};

function createPhotoState() {
  return {
    img: null,
    dataUrl: "",
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    naturalFit: 1,
  };
}

function getDesignState() {
  return {
    title: controls.titleText.value.trim() || "PAIR TICKET",
    bottom: controls.bottomText.value.trim() || "PAIR NAME",
    side: "",
    numberLeft: controls.numberLeftText.value.trim() || "01",
    numberRight: controls.numberRightText.value.trim() || "02",
    photoCaption: controls.photoCaptionText.value.trim() || "TEST",
    photoCaptionStyle: controls.photoCaptionStyle.value,
    photoCaptionSize: Number(controls.photoCaptionSize.value),
    photoCaptionColor: controls.photoCaptionColor.value,
    note: controls.noteText.value.trim() || "MEMORY PASS",
    code: controls.codeText.value.trim() || "NO. 0521",
    accent: controls.accentColor.value,
    textColor: controls.textColor.value,
    band: controls.bandColor.value,
    stubImageOpacity: Number(controls.stubImageOpacity.value) / 100,
    barcodeSize: Number(controls.barcodeSize.value) / 100,
    ticketBg: controls.inkColor.value,
    backgroundMode: controls.backgroundMode.value,
    backgroundStart: controls.backgroundStartColor.value,
    backgroundEnd: controls.backgroundEndColor.value,
    backgroundBlur: Number(controls.backgroundBlur.value),
    titleSize: Number(controls.titleSize.value),
    bodySize: Number(controls.bodySize.value),
    paperTone: Number(controls.paperTone.value),
  };
}

function ticketToCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * BASE_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * BASE_HEIGHT,
  };
}

function photoAtPoint(point) {
  return Object.entries(PHOTO_RECTS).find(([, rect]) =>
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  )?.[0] || null;
}

function stickerAtPoint(point) {
  for (let index = state.stickers.length - 1; index >= 0; index -= 1) {
    const sticker = state.stickers[index];
    if (
      point.x >= sticker.x &&
      point.x <= sticker.x + sticker.w &&
      point.y >= sticker.y &&
      point.y <= sticker.y + sticker.h
    ) {
      return sticker;
    }
  }
  return null;
}

function setActivePhoto(side) {
  state.activePhoto = side;
  controls.activePhotoLabel.textContent = side === "left" ? "선택: 왼쪽 사진" : "선택: 오른쪽 사진";
  controls.selectLeft.classList.toggle("is-active", side === "left");
  controls.selectRight.classList.toggle("is-active", side === "right");
}

function fitImageToRect(side) {
  const photo = state.photos[side];
  const rect = PHOTO_RECTS[side];
  if (!photo.img) return;

  photo.naturalFit = Math.max(rect.w / photo.img.width, rect.h / photo.img.height);
  photo.scale = 1;
  photo.offsetX = 0;
  photo.offsetY = 0;
  clampPhotoTransform(side);
}

function clampPhotoTransform(side) {
  const photo = state.photos[side];
  const rect = PHOTO_RECTS[side];
  if (!photo.img) return;

  photo.scale = Math.max(1, photo.scale);
  const drawW = photo.img.width * photo.naturalFit * photo.scale;
  const drawH = photo.img.height * photo.naturalFit * photo.scale;
  const maxOffsetX = Math.max(0, (drawW - rect.w) / 2);
  const maxOffsetY = Math.max(0, (drawH - rect.h) / 2);

  photo.offsetX = clamp(photo.offsetX, -maxOffsetX, maxOffsetX);
  photo.offsetY = clamp(photo.offsetY, -maxOffsetY, maxOffsetY);
}

function loadImageFromFile(file, onLoad) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => onLoad(img, reader.result);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function loadPhoto(side, file) {
  loadImageFromFile(file, (img, dataUrl) => {
    state.photos[side].img = img;
    state.photos[side].dataUrl = dataUrl;
    fitImageToRect(side);
    setActivePhoto(side);
    render();
  });
}

function loadBackground(file) {
  loadImageFromFile(file, (img, dataUrl) => {
    state.backgroundImage = img;
    state.backgroundDataUrl = dataUrl;
    controls.backgroundMode.value = "image";
    render();
  });
}

function loadStubImage(file) {
  loadImageFromFile(file, (img, dataUrl) => {
    state.stubImage = img;
    state.stubDataUrl = dataUrl;
    render();
  });
}

function loadBarcodeImage(file) {
  loadImageFromFile(file, (img, dataUrl) => {
    state.barcodeImage = img;
    state.barcodeDataUrl = dataUrl;
    render();
  });
}

function addSticker(file) {
  loadImageFromFile(file, (img, dataUrl) => {
    const size = Number(controls.stickerSize.value) || 170;
    const ratio = img.height / img.width || 1;
    const sticker = {
      id: Date.now() + Math.random(),
      img,
      dataUrl,
      x: PHOTO_AREA.x + PHOTO_AREA.w / 2 - size / 2,
      y: PHOTO_AREA.y + PHOTO_AREA.h / 2 - (size * ratio) / 2,
      w: size,
      h: size * ratio,
    };
    state.stickers.push(sticker);
    state.activeStickerId = sticker.id;
    controls.stickerSize.value = Math.round(sticker.w);
    render();
  });
}

function resizeActiveSticker() {
  const sticker = state.stickers.find((item) => item.id === state.activeStickerId);
  if (!sticker) return;
  const nextWidth = Number(controls.stickerSize.value) || sticker.w;
  const centerX = sticker.x + sticker.w / 2;
  const centerY = sticker.y + sticker.h / 2;
  const ratio = sticker.h / sticker.w || 1;
  sticker.w = nextWidth;
  sticker.h = nextWidth * ratio;
  sticker.x = centerX - sticker.w / 2;
  sticker.y = centerY - sticker.h / 2;
  render();
}

function roundedRectPath(context, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + w - radius, y);
  context.quadraticCurveTo(x + w, y, x + w, y + radius);
  context.lineTo(x + w, y + h - radius);
  context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  context.lineTo(x + radius, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function ticketPath(context) {
  const { x, y, w, h, r, bite } = TICKET;
  roundedRectPath(context, x, y, w, h, r);
  [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ].forEach(([cx, cy]) => {
    context.moveTo(cx + bite, cy);
    context.arc(cx, cy, bite, 0, Math.PI * 2);
  });
}

function render(targetContext = ctx, scale = 1) {
  targetContext.save();
  targetContext.setTransform(scale, 0, 0, scale, 0, 0);
  const design = getDesignState();

  drawBackdrop(targetContext, design);
  const ticketLayer = document.createElement("canvas");
  ticketLayer.width = BASE_WIDTH;
  ticketLayer.height = BASE_HEIGHT;
  const ticketContext = ticketLayer.getContext("2d");
  drawTicketElegant(ticketContext, design);
  drawPhotoWindow(ticketContext, "left", design);
  drawPhotoWindow(ticketContext, "right", design);
  drawPhotoCaption(ticketContext, design);
  drawTextsElegant(ticketContext, design);
  punchTicketCutouts(ticketContext);
  drawStickers(ticketContext);
  targetContext.drawImage(ticketLayer, 0, 0);
  targetContext.restore();

  if (targetContext === ctx && scale === 1) {
    lastControlSignature = currentControlSignature();
  }
}

function drawBackdrop(context, design) {
  const blur = Math.max(0, design.backgroundBlur || 0);

  if (design.backgroundMode === "image" && state.backgroundImage) {
    context.save();
    context.filter = blur ? `blur(${blur}px)` : "none";
    const bleed = blur * 4;
    drawCoverImage(context, state.backgroundImage, -bleed, -bleed, BASE_WIDTH + bleed * 2, BASE_HEIGHT + bleed * 2);
    context.restore();
    context.fillStyle = applyAlpha(design.backgroundStart, 0.16);
    context.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  } else {
    const bg = context.createLinearGradient(0, 0, BASE_WIDTH, BASE_HEIGHT);
    bg.addColorStop(0, design.backgroundStart);
    bg.addColorStop(0.52, mix(design.backgroundStart, design.backgroundEnd, 0.46));
    bg.addColorStop(1, design.backgroundEnd);
    context.fillStyle = bg;
    context.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  }

  const gridAlpha = Math.max(0.06, 0.24 - blur * 0.007);
  context.strokeStyle = applyAlpha(contrastColor(design.backgroundEnd), gridAlpha);
  context.lineWidth = 1;
  context.setLineDash([3, 11]);
  for (let x = 0; x <= BASE_WIDTH; x += 56) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, BASE_HEIGHT);
    context.stroke();
  }
  for (let y = 0; y <= BASE_HEIGHT; y += 56) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(BASE_WIDTH, y);
    context.stroke();
  }
  context.setLineDash([]);
}

function drawTicket(context, design) {
  const { x, y, w, h, splitX } = TICKET;
  const ticketText = contrastColor(design.ticketBg);
  const toneOverlay = 1 - design.paperTone / 100;

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.22)";
  context.shadowBlur = 28;
  context.shadowOffsetY = 16;
  ticketPath(context);
  context.fillStyle = "rgba(0, 0, 0, 0.2)";
  context.fill("evenodd");
  context.restore();

  context.save();
  ticketPath(context);
  context.clip("evenodd");
  context.fillStyle = design.ticketBg;
  context.fillRect(x, y, w, h);

  if (toneOverlay > 0) {
    context.fillStyle = `rgba(0, 0, 0, ${toneOverlay * 0.16})`;
    context.fillRect(x, y, w, h);
  }

  context.fillStyle = applyAlpha(design.band, 0.18);
  context.fillRect(splitX, y, x + w - splitX, h);
  context.fillStyle = applyAlpha(design.band, 0.1);
  context.fillRect(x + 52, y + h - 84, splitX - x - 104, 52);

  drawPaperGrain(context, design);

  const accentSoft = applyAlpha(design.accent, 0.82);
  context.strokeStyle = applyAlpha(ticketText, 0.32);
  context.lineWidth = 2;
  context.strokeRect(x + 30, y + 30, w - 60, h - 60);

  context.strokeStyle = accentSoft;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(x + 64, y + 66);
  context.lineTo(x + 220, y + 66);
  context.moveTo(x + 64, y + h - 66);
  context.lineTo(x + 220, y + h - 66);
  context.moveTo(splitX + 46, y + 66);
  context.lineTo(x + w - 64, y + 66);
  context.stroke();

  context.fillStyle = applyAlpha(design.accent, 0.9);
  context.fillRect(x + 62, y + h - 88, 126, 6);
  context.fillRect(splitX + 58, y + 74, 112, 6);

  context.strokeStyle = applyAlpha(ticketText, 0.24);
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(1048, 220);
  context.lineTo(1248, 220);
  context.moveTo(1048, 392);
  context.lineTo(1248, 392);
  context.stroke();

  drawPerforation(context, design);
  context.restore();
}

function drawPaperGrain(context, design) {
  const { x, y, w, h } = TICKET;
  const dot = applyAlpha(contrastColor(design.ticketBg), 0.045);
  context.fillStyle = dot;
  for (let i = 0; i < 240; i += 1) {
    const px = x + 26 + ((i * 73) % (w - 52));
    const py = y + 24 + ((i * 41) % (h - 48));
    context.fillRect(px, py, 1.2, 1.2);
  }
}

function drawPerforation(context, design) {
  const { y, h, splitX } = TICKET;
  const ticketText = contrastColor(design.ticketBg);

  context.strokeStyle = applyAlpha(ticketText, 0.62);
  context.lineWidth = 3;
  context.setLineDash([8, 10]);
  context.beginPath();
  context.moveTo(splitX, y + 34);
  context.lineTo(splitX, y + h - 34);
  context.stroke();
  context.setLineDash([]);
}

function punchTicketCutouts(context) {
  const { x, y, w, h, bite, splitX } = TICKET;
  context.save();
  context.globalCompositeOperation = "destination-out";
  [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
    [splitX, y],
    [splitX, y + h],
  ].forEach(([cx, cy]) => {
    context.beginPath();
    context.arc(cx, cy, bite, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawPhotoFrame(context, side, design) {
  const rect = PHOTO_RECTS[side];
  const photo = state.photos[side];
  const frame = { x: rect.x - 24, y: rect.y - 24, w: rect.w + 48, h: rect.h + 48 };
  const ticketText = contrastColor(design.ticketBg);

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.12)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 5;
  roundedRectPath(context, frame.x, frame.y, frame.w, frame.h, 10);
  context.fillStyle = "#fffdf8";
  context.fill();
  context.shadowColor = "transparent";

  context.strokeStyle = design.accent;
  context.lineWidth = 2;
  context.stroke();

  drawPhotoPerforation(context, frame, design.ticketBg);

  roundedRectPath(context, rect.x, rect.y, rect.w, rect.h, 6);
  context.clip();

  if (photo.img) {
    const drawW = photo.img.width * photo.naturalFit * photo.scale;
    const drawH = photo.img.height * photo.naturalFit * photo.scale;
    const drawX = rect.x + rect.w / 2 - drawW / 2 + photo.offsetX;
    const drawY = rect.y + rect.h / 2 - drawH / 2 + photo.offsetY;
    context.drawImage(photo.img, drawX, drawY, drawW, drawH);
  } else {
    const placeholder = context.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    placeholder.addColorStop(0, "#ffffff");
    placeholder.addColorStop(1, mix(design.accent, "#ffffff", 0.76));
    context.fillStyle = placeholder;
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
    context.fillStyle = applyAlpha(ticketText, 0.58);
    context.font = '900 34px "Pretendard", "Noto Sans KR", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("사진", rect.x + rect.w / 2, rect.y + rect.h / 2);
  }

  context.restore();
}

function drawPhotoPerforation(context, frame, color) {
  context.fillStyle = color;
  const radius = 5;
  for (let x = frame.x + 16; x <= frame.x + frame.w - 16; x += 24) {
    context.beginPath();
    context.arc(x, frame.y, radius, 0, Math.PI * 2);
    context.arc(x, frame.y + frame.h, radius, 0, Math.PI * 2);
    context.fill();
  }
  for (let y = frame.y + 16; y <= frame.y + frame.h - 16; y += 24) {
    context.beginPath();
    context.arc(frame.x, y, radius, 0, Math.PI * 2);
    context.arc(frame.x + frame.w, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawTexts(context, design) {
  const ticketText = contrastColor(design.ticketBg);
  const bandText = contrastColor(design.band);

  context.save();
  context.textBaseline = "alphabetic";

  context.fillStyle = ticketText;
  setFittedFont(context, {
    weight: 900,
    size: design.titleSize,
    minSize: 28,
    family: '"Pretendard", "Noto Sans KR", "Arial Black", sans-serif',
    text: design.title,
    maxWidth: 560,
  });
  context.textAlign = "left";
  context.fillText(design.title, 140, 184);

  context.fillStyle = ticketText;
  setFittedFont(context, {
    weight: 900,
    size: design.bodySize,
    minSize: 17,
    family: '"Pretendard", "Noto Sans KR", sans-serif',
    text: design.bottom,
    maxWidth: 440,
  });
  context.textAlign = "center";
  drawLabelPill(context, 304, 566, 384, 38, design.band, design.bottom, bandText, design.bodySize);

  context.save();
  context.translate(996, 516);
  context.rotate(-Math.PI / 2);
  context.fillStyle = ticketText;
  setFittedFont(context, {
    weight: 900,
    size: 38,
    minSize: 22,
    family: '"Pretendard", "Noto Sans KR", sans-serif',
    text: design.side,
    maxWidth: 310,
  });
  context.textAlign = "left";
  context.fillText(design.side, 0, 0);
  context.restore();

  context.fillStyle = ticketText;
  context.font = '800 17px "Pretendard", "Noto Sans KR", sans-serif';
  context.textAlign = "center";
  wrapText(context, design.note, 1144, 282, 240, 26, 4);

  context.fillStyle = applyAlpha(ticketText, 0.72);
  context.font = '800 13px "Pretendard", "Noto Sans KR", sans-serif';
  context.fillText(design.code, 1144, 508);

  drawBarcode(context, 1072, 540, 150, 48, ticketText);
  context.restore();
}

function drawLabelPill(context, x, y, w, h, fill, text, color, size) {
  context.save();
  roundedRectPath(context, x, y, w, h, h / 2);
  context.fillStyle = applyAlpha(fill, 0.92);
  context.fill();
  context.fillStyle = color;
  setFittedFont(context, {
    weight: 900,
    size,
    minSize: 16,
    family: '"Pretendard", "Noto Sans KR", sans-serif',
    text,
    maxWidth: w - 34,
  });
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x + w / 2, y + h / 2 + 1);
  context.restore();
}

function drawTicketElegant(context, design) {
  const { x, y, w, h, splitX } = TICKET;
  const ticketText = ticketTextColor(design);
  const toneOverlay = 1 - design.paperTone / 100;

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.2)";
  context.shadowBlur = 34;
  context.shadowOffsetY = 18;
  ticketPath(context);
  context.fillStyle = "rgba(0, 0, 0, 0.2)";
  context.fill("evenodd");
  context.restore();

  context.save();
  ticketPath(context);
  context.clip("evenodd");
  context.fillStyle = design.ticketBg;
  context.fillRect(x, y, w, h);

  if (toneOverlay > 0) {
    context.fillStyle = `rgba(0, 0, 0, ${toneOverlay * 0.075})`;
    context.fillRect(x, y, w, h);
  }

  drawPaperGrain(context, design);

  context.fillStyle = mix(design.band, design.ticketBg, 0.18);
  context.fillRect(splitX, y, x + w - splitX, h);

  if (state.stubImage) {
    context.save();
    roundedRectPath(context, STUB_PANEL.x, STUB_PANEL.y, STUB_PANEL.w, STUB_PANEL.h, 8);
    context.clip();
    context.globalAlpha = clamp(design.stubImageOpacity, 0, 1);
    drawCoverImage(context, state.stubImage, STUB_PANEL.x, STUB_PANEL.y, STUB_PANEL.w, STUB_PANEL.h);
    context.restore();
    context.fillStyle = applyAlpha(design.band, 0.18);
    context.fillRect(STUB_PANEL.x, STUB_PANEL.y, STUB_PANEL.w, STUB_PANEL.h);
  }

  context.strokeStyle = applyAlpha(ticketText, 0.2);
  context.lineWidth = 1.25;
  context.strokeRect(x + 28, y + 28, w - 56, h - 56);

  context.strokeStyle = applyAlpha(design.accent, 0.78);
  context.lineWidth = 2.2;
  context.beginPath();
  context.moveTo(x + 78, y + h - 96);
  context.lineTo(x + 338, y + h - 96);
  context.stroke();

  context.fillStyle = applyAlpha(design.band, 0.22);
  context.fillRect(x + 442, y + 36, 1.5, h - 72);
  context.fillRect(splitX + 1, y + 30, 2.5, h - 60);

  const stubCenterX = STUB_PANEL.x + STUB_PANEL.w / 2;

  context.fillStyle = applyAlpha(design.band, 0.92);
  context.fillRect(x + 78, y + h - 112, 120, 6);
  context.fillRect(stubCenterX - 48, y + 128, 96, 5);

  context.strokeStyle = applyAlpha(ticketText, 0.11);
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(stubCenterX - 78, y + 184);
  context.lineTo(stubCenterX + 78, y + 184);
  context.moveTo(stubCenterX - 78, STUB_PANEL.y + 392);
  context.lineTo(stubCenterX + 78, STUB_PANEL.y + 392);
  context.stroke();

  context.strokeStyle = applyAlpha(ticketText, 0.16);
  context.lineWidth = 1;
  [
    [x + 28, y + 28, x + 58, y + 58],
    [x + w - 28, y + 28, x + w - 58, y + 58],
    [x + 28, y + h - 28, x + 58, y + h - 58],
    [x + w - 28, y + h - 28, x + w - 58, y + h - 58],
  ].forEach(([x1, y1, x2, y2]) => {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  });

  drawPerforation(context, design);
  context.restore();
}

function drawPhotoWindow(context, side, design) {
  const rect = PHOTO_RECTS[side];
  const photo = state.photos[side];
  const ticketText = ticketTextColor(design);

  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.14)";
  context.shadowBlur = 20;
  context.shadowOffsetY = 9;
  roundedRectPath(context, rect.x, rect.y, rect.w, rect.h, 18);
  context.fillStyle = applyAlpha(ticketText, 0.07);
  context.fill();
  context.shadowColor = "transparent";

  roundedRectPath(context, rect.x, rect.y, rect.w, rect.h, 18);
  context.clip();

  if (photo.img) {
    const drawW = photo.img.width * photo.naturalFit * photo.scale;
    const drawH = photo.img.height * photo.naturalFit * photo.scale;
    const drawX = rect.x + rect.w / 2 - drawW / 2 + photo.offsetX;
    const drawY = rect.y + rect.h / 2 - drawH / 2 + photo.offsetY;
    context.drawImage(photo.img, drawX, drawY, drawW, drawH);
  } else {
    const placeholder = context.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    placeholder.addColorStop(0, mix(design.ticketBg, "#ffffff", 0.86));
    placeholder.addColorStop(1, mix(design.accent, "#ffffff", 0.84));
    context.fillStyle = placeholder;
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
    context.fillStyle = applyAlpha(ticketText, 0.56);
    context.font = '800 30px "Pretendard", "Noto Sans KR", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("사진", rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
  context.restore();
}

function drawPhotoCaption(context, design) {
  if (!design.photoCaption) return;
  if (design.photoCaptionStyle === "script" && !state.scriptFontReady) return;
  const ticketText = design.photoCaptionColor || ticketTextColor(design);
  const photoLeft = PHOTO_RECTS.left.x;
  const photoRight = PHOTO_RECTS.right.x + PHOTO_RECTS.right.w;
  const centerX = (photoLeft + photoRight) / 2;
  const baseY = PHOTO_RECTS.left.y + PHOTO_RECTS.left.h + 42;
  const style = design.photoCaptionStyle;
  const family = style === "script"
    ? '"SangBleu Empire", "SangBleu Empire Trial", "Canela", "Noe Display", "Didot", "Bodoni 72", "Playfair Display", "Cormorant Garamond", "Eulyoo 1945", "BookkMyungjo", Georgia, serif'
    : style === "bold"
      ? '"Paperlogy", "SUIT", "Pretendard", "Noto Sans KR", sans-serif'
      : '"Playfair Display", "Eulyoo 1945", "BookkMyungjo", "Noto Serif KR", Georgia, serif';
  const weight = style === "script" ? 500 : style === "bold" ? 900 : 500;
  const fontStyle = style === "script" ? "italic" : "normal";

  context.save();
  roundedRectPath(context, photoLeft - 18, PHOTO_RECTS.left.y + PHOTO_RECTS.left.h + 4, photoRight - photoLeft + 36, 86, 16);
  context.clip();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(0, 0, 0, 0.18)";
  context.shadowBlur = style === "script" ? 2 : 5;
  context.shadowOffsetY = 2;
  context.fillStyle = style === "script" ? applyAlpha(ticketText, 0.92) : ticketText;
  setFittedFont(context, {
    style: fontStyle,
    weight,
    size: Math.min(design.photoCaptionSize, 58),
    minSize: 18,
    family,
    text: design.photoCaption,
    maxWidth: photoRight - photoLeft + 4,
  });
  if (style === "script") {
    context.lineWidth = 0.45;
    context.strokeStyle = applyAlpha(design.ticketBg, 0.56);
    context.strokeText(design.photoCaption, centerX, baseY);
  }
  context.fillText(design.photoCaption, centerX, baseY);
  context.restore();
}

async function prepareCaptionFonts() {
  if (!document.fonts?.load) {
    state.scriptFontReady = true;
    render();
    return;
  }

  try {
    await Promise.all([
      document.fonts.load('italic 500 48px "Cormorant Garamond"'),
      document.fonts.load('italic 500 48px "Playfair Display"'),
    ]);
  } finally {
    state.scriptFontReady = true;
    render();
  }
}

function drawStickers(context) {
  state.stickers.forEach((sticker) => {
    if (!sticker.img) return;
    context.save();
    context.shadowColor = "rgba(0, 0, 0, 0.18)";
    context.shadowBlur = 10;
    context.shadowOffsetY = 4;
    context.drawImage(sticker.img, sticker.x, sticker.y, sticker.w, sticker.h);
    context.restore();
  });
}

function drawTextsElegant(context, design) {
  const ticketText = ticketTextColor(design);
  const { x, y, h } = TICKET;
  const stubCenterX = STUB_PANEL.x + STUB_PANEL.w / 2;

  context.save();
  context.textBaseline = "alphabetic";

  context.fillStyle = ticketText;
  setFittedFont(context, {
    weight: 900,
    size: Math.min(66, design.titleSize + 10),
    minSize: 34,
    family: '"Playfair Display", "Eulyoo 1945", "BookkMyungjo", "Noto Serif KR", Georgia, serif',
    text: design.title,
    maxWidth: 340,
  });
  context.textAlign = "left";
  context.fillText(design.title, x + 78, y + 132);

  context.strokeStyle = applyAlpha(ticketText, 0.58);
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(x + 78, y + 176);
  context.lineTo(x + 392, y + 176);
  context.stroke();

  context.fillStyle = applyAlpha(ticketText, 0.76);
  context.font = '500 26px "Playfair Display", "Eulyoo 1945", "Noto Serif KR", serif';
  context.textAlign = "left";
  context.fillText(design.numberLeft, x + 78, y + 222);
  context.strokeStyle = applyAlpha(ticketText, 0.45);
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(x + 128, y + 213);
  context.lineTo(x + 346, y + 213);
  context.stroke();
  context.fillText(design.numberRight, x + 362, y + 222);

  context.fillStyle = ticketText;
  setFittedFont(context, {
    weight: 500,
    size: Math.min(50, design.bodySize + 14),
    minSize: 24,
    family: '"Playfair Display", "Eulyoo 1945", "BookkMyungjo", "Noto Serif KR", Georgia, serif',
    text: design.bottom,
    maxWidth: 340,
  });
  context.fillText(design.bottom, x + 78, y + 360);

  context.strokeStyle = applyAlpha(ticketText, 0.5);
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(x + 78, y + 430);
  context.lineTo(x + 340, y + 430);
  context.stroke();

  context.fillStyle = applyAlpha(ticketText, 0.58);
  context.font = '700 12px "Pretendard", "Noto Sans KR", sans-serif';
  context.textAlign = "left";
  context.fillText(design.code, x + 78, y + 470);

  context.fillStyle = ticketText;
  context.font = '800 13px "Pretendard", "Noto Sans KR", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  wrapText(context, design.note, stubCenterX, STUB_PANEL.y + 158, 150, 18, 2);

  drawBarcodeSlot(context, stubCenterX - BARCODE_RECT.w / 2, BARCODE_RECT.y, BARCODE_RECT.w, BARCODE_RECT.h, ticketText, design.barcodeSize);

  context.fillStyle = applyAlpha(ticketText, 0.64);
  context.font = '500 18px "Playfair Display", "Eulyoo 1945", "Noto Serif KR", serif';
  context.textAlign = "center";
  context.fillText("TICKET", stubCenterX, STUB_PANEL.y + 426);

  context.fillStyle = applyAlpha(ticketText, 0.68);
  context.font = '800 12px "Pretendard", "Noto Sans KR", sans-serif';
  context.fillText(design.code, stubCenterX, STUB_PANEL.y + 474);
  context.restore();
}

function drawBarcodeSlot(context, x, y, w, h, color, sizeScale = 1) {
  const scale = clamp(sizeScale || 1, 0.5, 4.2);
  const maxW = STUB_PANEL.w - 78;
  const maxH = 168;
  const slotW = Math.min(w * scale, maxW);
  const slotH = Math.min(h * scale, maxH);
  const slotX = x + w / 2 - slotW / 2;
  const slotY = STUB_PANEL.y + 206 + (maxH - slotH) / 2;

  context.save();
  roundedRectPath(context, STUB_PANEL.x + 10, STUB_PANEL.y + 18, STUB_PANEL.w - 20, STUB_PANEL.h - 36, 8);
  context.clip();
  roundedRectPath(context, slotX - 10, slotY - 10, slotW + 20, slotH + 20, 6);
  context.clip();
  if (state.barcodeImage) {
    drawCoverImage(context, state.barcodeImage, slotX - 10, slotY - 10, slotW + 20, slotH + 20);
  } else {
    drawBarcode(context, slotX, slotY, slotW, slotH, color);
  }
  context.restore();
}

function drawBarcode(context, x, y, w, h, color) {
  context.save();
  context.fillStyle = color;
  const bars = [2, 3, 1, 5, 3, 2, 7, 2, 1, 4, 2, 6, 1, 3, 5, 2, 8, 1, 4, 2, 6, 3, 1, 5, 2, 7, 1, 3, 4, 2, 6, 1, 5, 3, 2, 8, 1, 4, 2, 5, 1, 7];
  let cursor = x;
  bars.forEach((bar, index) => {
    if (index % 2 === 0 && cursor < x + w) context.fillRect(cursor, y, Math.min(bar, x + w - cursor), h);
    cursor += bar;
  });
  context.fillStyle = applyAlpha(color, 0.42);
  for (let dot = 0; dot < 10; dot += 1) {
    context.fillRect(x + dot * (w / 10) + 2, y + h + 9, 3, 3);
  }
  context.restore();
}

function drawCoverImage(context, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const drawX = x + w / 2 - drawW / 2;
  const drawY = y + h / 2 - drawH / 2;
  context.drawImage(img, drawX, drawY, drawW, drawH);
}

function drawContainImage(context, img, x, y, w, h) {
  const scale = Math.min(w / img.width, h / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const drawX = x + w / 2 - drawW / 2;
  const drawY = y + h / 2 - drawH / 2;
  context.drawImage(img, drawX, drawY, drawW, drawH);
}

function setFittedFont(context, options) {
  let size = options.size;
  const style = options.style ? `${options.style} ` : "";
  context.font = `${style}${options.weight} ${size}px ${options.family}`;

  while (size > options.minSize && context.measureText(options.text).width > options.maxWidth) {
    size -= 1;
    context.font = `${style}${options.weight} ${size}px ${options.family}`;
  }
}

function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const chars = Array.from(text || "CUSTOM MESSAGE");
  const lines = [];
  let line = "";

  chars.forEach((char) => {
    const test = line + char;
    if (context.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = test;
    }
  });
  lines.push(line);

  lines.slice(0, maxLines).forEach((lineText, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? "..." : "";
    context.fillText(lineText + suffix, x, y + index * lineHeight);
  });
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function relativeLuminance(color) {
  const { r, g, b } = hexToRgb(color);
  const values = [r, g, b].map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrastColor(color) {
  return relativeLuminance(color) > 0.54 ? "#151318" : "#ffffff";
}

function ticketTextColor(design) {
  return design.textColor || contrastColor(design.ticketBg);
}

function applyAlpha(color, alpha) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mix(colorA, colorB, amount) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const r = Math.round(a.r + (b.r - a.r) * amount);
  const g = Math.round(a.g + (b.g - a.g) * amount);
  const bl = Math.round(a.b + (b.b - a.b) * amount);
  return `rgb(${r}, ${g}, ${bl})`;
}

function exportPng() {
  const exportScale = 2;
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = BASE_WIDTH * exportScale;
  exportCanvas.height = BASE_HEIGHT * exportScale;
  const exportContext = exportCanvas.getContext("2d");
  render(exportContext, exportScale);

  const link = document.createElement("a");
  link.download = "pair-ticket.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

function getTemplatesLegacy() {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setTemplatesLegacy(templates) {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
}

let templateDbPromise = null;

function openTemplateDatabase() {
  if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB is unavailable."));
  if (templateDbPromise) return templateDbPromise;

  templateDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(TEMPLATE_DB_NAME, TEMPLATE_DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(TEMPLATE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open template storage."));
  });

  return templateDbPromise;
}

async function readTemplatesFromIndexedDb() {
  const db = await openTemplateDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(TEMPLATE_STORE_NAME, "readonly")
      .objectStore(TEMPLATE_STORE_NAME)
      .get(TEMPLATE_STORAGE_KEY);
    request.onsuccess = () => resolve(request.result || {});
    request.onerror = () => reject(request.error || new Error("Could not read templates."));
  });
}

async function writeTemplatesToIndexedDb(templates) {
  const db = await openTemplateDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(TEMPLATE_STORE_NAME, "readwrite")
      .objectStore(TEMPLATE_STORE_NAME)
      .put(templates, TEMPLATE_STORAGE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Could not save templates."));
  });
}

async function getTemplates() {
  try {
    const templates = await readTemplatesFromIndexedDb();
    if (Object.keys(templates).length > 0) return templates;
  } catch {
    return getTemplatesLegacy();
  }

  const localTemplates = getTemplatesLegacy();
  if (Object.keys(localTemplates).length > 0) {
    writeTemplatesToIndexedDb(localTemplates).catch(() => {});
  }
  return localTemplates;
}

async function setTemplates(templates) {
  try {
    await writeTemplatesToIndexedDb(templates);
    return;
  } catch {
    setTemplatesLegacy(templates);
  }
}

function showTemplateStatus(message) {
  if (!controls.templateStatus) return;
  controls.templateStatus.textContent = message;
}

async function refreshTemplateSelect() {
  const templates = await getTemplates();
  const names = Object.keys(templates).sort((a, b) => a.localeCompare(b));
  controls.templateSelect.innerHTML = "";

  if (names.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "저장된 템플릿 없음";
    controls.templateSelect.appendChild(option);
    return;
  }

  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    controls.templateSelect.appendChild(option);
  });
}

function serializePhoto(side) {
  const photo = state.photos[side];
  return {
    dataUrl: photo.dataUrl,
    scale: photo.scale,
    offsetX: photo.offsetX,
    offsetY: photo.offsetY,
  };
}

async function saveTemplate() {
  const name = controls.templateName.value.trim() || "MY TICKET TEMPLATE";
  const templates = await getTemplates();
  templates[name] = {
    controls: {
      titleText: controls.titleText.value,
      bottomText: controls.bottomText.value,
      numberLeftText: controls.numberLeftText.value,
      numberRightText: controls.numberRightText.value,
      sideText: controls.sideText.value,
      photoCaptionText: controls.photoCaptionText.value,
      photoCaptionStyle: controls.photoCaptionStyle.value,
      photoCaptionSize: controls.photoCaptionSize.value,
      photoCaptionColor: controls.photoCaptionColor.value,
      noteText: controls.noteText.value,
      codeText: controls.codeText.value,
      accentColor: controls.accentColor.value,
      textColor: controls.textColor.value,
      bandColor: controls.bandColor.value,
      inkColor: controls.inkColor.value,
      backgroundMode: controls.backgroundMode.value,
      backgroundStartColor: controls.backgroundStartColor.value,
      backgroundEndColor: controls.backgroundEndColor.value,
      backgroundBlur: controls.backgroundBlur.value,
      stubImageOpacity: controls.stubImageOpacity.value,
      barcodeSize: controls.barcodeSize.value,
      titleSize: controls.titleSize.value,
      bodySize: controls.bodySize.value,
      paperTone: controls.paperTone.value,
    },
    backgroundDataUrl: state.backgroundDataUrl || "",
    stubDataUrl: state.stubDataUrl || "",
    barcodeDataUrl: state.barcodeDataUrl || "",
    stickers: state.stickers.map((sticker) => ({
      dataUrl: sticker.dataUrl,
      x: sticker.x,
      y: sticker.y,
      w: sticker.w,
      h: sticker.h,
    })),
    photos: {
      left: serializePhoto("left"),
      right: serializePhoto("right"),
    },
  };
  try {
    await setTemplates(templates);
  } catch (error) {
    showTemplateStatus("이미지가 너무 커서 저장하지 못했습니다.");
    return;
  }
  await refreshTemplateSelect();
  controls.templateSelect.value = name;
  showTemplateStatus(`저장 완료: ${name}`);
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = dataUrl;
  });
}

async function restorePhoto(side, saved) {
  const photo = state.photos[side];
  photo.dataUrl = saved?.dataUrl || "";
  photo.img = await loadImageFromDataUrl(photo.dataUrl);
  if (!photo.img) {
    photo.scale = 1;
    photo.offsetX = 0;
    photo.offsetY = 0;
    photo.naturalFit = 1;
    return;
  }

  photo.naturalFit = Math.max(PHOTO_RECTS[side].w / photo.img.width, PHOTO_RECTS[side].h / photo.img.height);
  photo.scale = Math.max(1, Number(saved.scale) || 1);
  photo.offsetX = Number(saved.offsetX) || 0;
  photo.offsetY = Number(saved.offsetY) || 0;
  clampPhotoTransform(side);
}

async function restoreStickers(savedStickers = []) {
  const restored = await Promise.all((savedStickers || []).map(async (saved) => {
    const img = await loadImageFromDataUrl(saved.dataUrl);
    if (!img) return null;
    return {
      id: Date.now() + Math.random(),
      img,
      dataUrl: saved.dataUrl,
      x: Number(saved.x) || PHOTO_AREA.x + 40,
      y: Number(saved.y) || PHOTO_AREA.y + 40,
      w: Number(saved.w) || 110,
      h: Number(saved.h) || 110,
    };
  }));
  state.stickers = restored.filter(Boolean);
  state.activeStickerId = state.stickers.at(-1)?.id || null;
}

async function loadTemplate() {
  const name = controls.templateSelect.value;
  const template = (await getTemplates())[name];
  if (!template) return;

  Object.entries(template.controls || {}).forEach(([id, value]) => {
    if (controls[id]) controls[id].value = value;
  });

  state.backgroundDataUrl = template.backgroundDataUrl || "";
  state.backgroundImage = await loadImageFromDataUrl(state.backgroundDataUrl);
  state.stubDataUrl = template.stubDataUrl || "";
  state.stubImage = await loadImageFromDataUrl(state.stubDataUrl);
  state.barcodeDataUrl = template.barcodeDataUrl || "";
  state.barcodeImage = await loadImageFromDataUrl(state.barcodeDataUrl);
  await Promise.all([
    restorePhoto("left", template.photos?.left),
    restorePhoto("right", template.photos?.right),
    restoreStickers(template.stickers),
  ]);
  setActivePhoto("left");
  render();
  showTemplateStatus(`불러옴: ${name}`);
}

async function deleteTemplate() {
  const name = controls.templateSelect.value;
  if (!name) return;
  const templates = await getTemplates();
  delete templates[name];
  await setTemplates(templates);
  await refreshTemplateSelect();
  showTemplateStatus("삭제했습니다.");
}

function resetPhotoSide(side) {
  fitImageToRect(side);
  render();
}

function resetSelectedPhoto() {
  resetPhotoSide(state.activePhoto);
}

function bindControls() {
  controls.photoLeft.addEventListener("change", (event) => loadPhoto("left", event.target.files[0]));
  controls.photoRight.addEventListener("change", (event) => loadPhoto("right", event.target.files[0]));
  controls.backgroundImage.addEventListener("change", (event) => loadBackground(event.target.files[0]));
  controls.stubImage.addEventListener("change", (event) => loadStubImage(event.target.files[0]));
  controls.barcodeImage.addEventListener("change", (event) => loadBarcodeImage(event.target.files[0]));
  controls.stickerUpload.addEventListener("change", (event) => addSticker(event.target.files[0]));
  controls.stickerSize.addEventListener("input", resizeActiveSticker);
  controls.stickerSize.addEventListener("change", resizeActiveSticker);
  controls.backgroundMode.addEventListener("input", render);
  controls.backgroundMode.addEventListener("change", render);
  controls.clearStickers.addEventListener("click", () => {
    state.stickers = [];
    state.activeStickerId = null;
    render();
  });
  controls.selectLeft.addEventListener("click", () => {
    setActivePhoto("left");
    render();
  });
  controls.selectRight.addEventListener("click", () => {
    setActivePhoto("right");
    render();
  });
  controls.resetLeftPhoto.addEventListener("click", () => {
    setActivePhoto("left");
    resetPhotoSide("left");
  });
  controls.resetRightPhoto.addEventListener("click", () => {
    setActivePhoto("right");
    resetPhotoSide("right");
  });
  controls.resetPhoto.addEventListener("click", resetSelectedPhoto);
  controls.downloadBtn.addEventListener("click", exportPng);
  controls.saveTemplate.addEventListener("click", saveTemplate);
  controls.loadTemplate.addEventListener("click", loadTemplate);
  controls.deleteTemplate.addEventListener("click", deleteTemplate);

  [
    controls.titleText,
    controls.bottomText,
    controls.numberLeftText,
    controls.numberRightText,
    controls.sideText,
    controls.photoCaptionText,
    controls.photoCaptionStyle,
    controls.photoCaptionSize,
    controls.photoCaptionColor,
    controls.noteText,
    controls.codeText,
    controls.backgroundStartColor,
    controls.backgroundEndColor,
    controls.backgroundBlur,
    controls.stubImageOpacity,
    controls.barcodeSize,
    controls.accentColor,
    controls.textColor,
    controls.bandColor,
    controls.inkColor,
    controls.titleSize,
    controls.bodySize,
    controls.paperTone,
  ].forEach((control) => {
    control.addEventListener("input", render);
    control.addEventListener("change", render);
  });

  canvas.addEventListener("pointerdown", (event) => {
    const point = ticketToCanvasPoint(event);
    const sticker = stickerAtPoint(point);
    if (sticker) {
      state.dragging = true;
      state.activeStickerId = sticker.id;
      controls.stickerSize.value = Math.round(sticker.w);
      state.dragStart = {
        type: "sticker",
        pointerId: event.pointerId,
        x: point.x,
        y: point.y,
        stickerX: sticker.x,
        stickerY: sticker.y,
      };
      canvas.setPointerCapture(event.pointerId);
      render();
      return;
    }

    const side = photoAtPoint(point);
    if (!side) return;

    setActivePhoto(side);
    state.dragging = true;
    state.dragStart = {
      pointerId: event.pointerId,
      type: "photo",
      x: point.x,
      y: point.y,
      offsetX: state.photos[side].offsetX,
      offsetY: state.photos[side].offsetY,
    };
    canvas.setPointerCapture(event.pointerId);
    render();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging || !state.dragStart) return;
    const point = ticketToCanvasPoint(event);
    if (state.dragStart.type === "sticker") {
      const sticker = state.stickers.find((item) => item.id === state.activeStickerId);
      if (!sticker) return;
      sticker.x = state.dragStart.stickerX + point.x - state.dragStart.x;
      sticker.y = state.dragStart.stickerY + point.y - state.dragStart.y;
      render();
      return;
    }

    const photo = state.photos[state.activePhoto];
    photo.offsetX = state.dragStart.offsetX + point.x - state.dragStart.x;
    photo.offsetY = state.dragStart.offsetY + point.y - state.dragStart.y;
    clampPhotoTransform(state.activePhoto);
    render();
  });

  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  canvas.addEventListener("wheel", (event) => {
    const point = ticketToCanvasPoint(event);
    const side = photoAtPoint(point);
    if (!side) return;

    event.preventDefault();
    setActivePhoto(side);
    const photo = state.photos[side];
    const rect = PHOTO_RECTS[side];
    const oldScale = photo.scale;
    const nextScale = clamp(oldScale * (event.deltaY < 0 ? 1.08 : 0.92), 1, 3.8);

    const centerX = rect.x + rect.w / 2;
    const centerY = rect.y + rect.h / 2;
    const focusX = point.x - centerX - photo.offsetX;
    const focusY = point.y - centerY - photo.offsetY;
    const ratio = nextScale / oldScale;

    photo.offsetX -= focusX * (ratio - 1);
    photo.offsetY -= focusY * (ratio - 1);
    photo.scale = nextScale;
    clampPhotoTransform(side);
    render();
  }, { passive: false });
}

function currentControlSignature() {
  return JSON.stringify({
    titleText: controls.titleText.value,
    bottomText: controls.bottomText.value,
    numberLeftText: controls.numberLeftText.value,
    numberRightText: controls.numberRightText.value,
    sideText: controls.sideText.value,
    photoCaptionText: controls.photoCaptionText.value,
    photoCaptionStyle: controls.photoCaptionStyle.value,
    photoCaptionSize: controls.photoCaptionSize.value,
    photoCaptionColor: controls.photoCaptionColor.value,
    noteText: controls.noteText.value,
    codeText: controls.codeText.value,
    accentColor: controls.accentColor.value,
    textColor: controls.textColor.value,
    bandColor: controls.bandColor.value,
    inkColor: controls.inkColor.value,
    backgroundMode: controls.backgroundMode.value,
    backgroundStartColor: controls.backgroundStartColor.value,
    backgroundEndColor: controls.backgroundEndColor.value,
    backgroundBlur: controls.backgroundBlur.value,
    stubImageOpacity: controls.stubImageOpacity.value,
    barcodeSize: controls.barcodeSize.value,
    titleSize: controls.titleSize.value,
    bodySize: controls.bodySize.value,
    paperTone: controls.paperTone.value,
    backgroundDataUrl: state.backgroundDataUrl,
    stubDataUrl: state.stubDataUrl,
    barcodeDataUrl: state.barcodeDataUrl,
    stickers: state.stickers.map((sticker) => [sticker.dataUrl, sticker.x, sticker.y, sticker.w, sticker.h]),
    leftPhoto: state.photos.left.dataUrl,
    rightPhoto: state.photos.right.dataUrl,
    leftTransform: [state.photos.left.scale, state.photos.left.offsetX, state.photos.left.offsetY],
    rightTransform: [state.photos.right.scale, state.photos.right.offsetX, state.photos.right.offsetY],
  });
}

let lastControlSignature = "";

function watchRealtimeControls() {
  const signature = currentControlSignature();
  if (signature !== lastControlSignature) {
    render();
  }
  requestAnimationFrame(watchRealtimeControls);
}

function endDrag(event) {
  if (state.dragStart?.pointerId === event.pointerId) {
    state.dragging = false;
    state.dragStart = null;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

bindControls();
setActivePhoto("left");
refreshTemplateSelect();
render();
watchRealtimeControls();
prepareCaptionFonts();

window.__ticketMaker = {
  render,
  setActivePhoto,
  state,
  loadPhotoFromDataUrl(side, dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        state.photos[side].img = img;
        fitImageToRect(side);
        render();
        resolve(true);
      };
      img.src = dataUrl;
    });
  },
};
