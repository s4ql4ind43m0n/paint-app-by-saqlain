const canvas = document.querySelector("#paintCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const canvasWrap = document.querySelector("#canvasWrap");
const toolButtons = [...document.querySelectorAll(".tool-button")];
const colorPicker = document.querySelector("#colorPicker");
const colorLabel = document.querySelector("#colorLabel");
const brushSize = document.querySelector("#brushSize");
const brushSizeValue = document.querySelector("#brushSizeValue");
const opacity = document.querySelector("#opacity");
const opacityValue = document.querySelector("#opacityValue");
const statusText = document.querySelector("#statusText");
const fileInput = document.querySelector("#fileInput");
const textInput = document.querySelector("#textInput");

const state = {
  tool: "brush",
  color: "#1d1d1f",
  size: 12,
  opacity: 1,
  drawing: false,
  start: null,
  last: null,
  snapshot: null,
  undo: [],
  redo: []
};

const swatchColors = [
  "#1d1d1f", "#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#00c7be",
  "#007aff", "#5856d6", "#af52de", "#ff2d55", "#8e8e93", "#ffffff"
];

function setupCanvas() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveHistory();
}

function saveHistory() {
  state.undo.push(canvas.toDataURL("image/png"));
  if (state.undo.length > 30) state.undo.shift();
  state.redo = [];
}

function restore(dataUrl) {
  const image = new Image();
  image.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
  };
  image.src = dataUrl;
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

function applyStrokeStyle() {
  ctx.lineWidth = state.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = state.opacity;
  ctx.strokeStyle = state.tool === "eraser" ? "#ffffff" : state.color;
  ctx.fillStyle = state.color;
}

function beginDraw(event) {
  const point = pointerPosition(event);
  state.drawing = true;
  state.start = point;
  state.last = point;
  state.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.setPointerCapture(event.pointerId);

  if (state.tool === "picker") {
    pickColor(point);
    finishDraw(event);
    return;
  }

  if (state.tool === "text") {
    addText(point);
    finishDraw(event);
    return;
  }

  if (state.tool === "brush" || state.tool === "eraser") {
    applyStrokeStyle();
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x + 0.01, point.y + 0.01);
    ctx.stroke();
  }
}

function moveDraw(event) {
  if (!state.drawing) return;
  const point = pointerPosition(event);
  applyStrokeStyle();

  if (state.tool === "brush" || state.tool === "eraser") {
    ctx.beginPath();
    ctx.moveTo(state.last.x, state.last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    state.last = point;
    return;
  }

  ctx.putImageData(state.snapshot, 0, 0);
  drawShape(state.start, point);
}

function finishDraw(event) {
  if (!state.drawing) return;
  state.drawing = false;
  ctx.globalAlpha = 1;
  saveHistory();
  try {
    canvas.releasePointerCapture(event.pointerId);
  } catch {
    return;
  }
}

function drawShape(from, to) {
  applyStrokeStyle();
  ctx.beginPath();
  if (state.tool === "line") {
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  }
  if (state.tool === "rect") {
    ctx.rect(from.x, from.y, to.x - from.x, to.y - from.y);
  }
  if (state.tool === "circle") {
    const radiusX = Math.abs(to.x - from.x) / 2;
    const radiusY = Math.abs(to.y - from.y) / 2;
    ctx.ellipse((from.x + to.x) / 2, (from.y + to.y) / 2, radiusX, radiusY, 0, 0, Math.PI * 2);
  }
  ctx.stroke();
}

function addText(point) {
  applyStrokeStyle();
  ctx.font = `${Math.max(16, state.size * 2)}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(textInput.value || "Text", point.x, point.y);
  statusText.textContent = "Text placed";
}

function pickColor(point) {
  const pixel = ctx.getImageData(point.x, point.y, 1, 1).data;
  const hex = `#${[pixel[0], pixel[1], pixel[2]].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  setColor(hex);
  statusText.textContent = "Color picked";
}

function setTool(tool) {
  state.tool = tool;
  toolButtons.forEach((button) => button.classList.toggle("active", button.dataset.tool === tool));
  statusText.textContent = `${tool[0].toUpperCase()}${tool.slice(1)} ready`;
}

function setColor(color) {
  state.color = color;
  colorPicker.value = color;
  colorLabel.textContent = color.toUpperCase();
}

function undo() {
  if (state.undo.length <= 1) return;
  state.redo.push(state.undo.pop());
  restore(state.undo[state.undo.length - 1]);
  statusText.textContent = "Undone";
}

function redo() {
  if (!state.redo.length) return;
  const next = state.redo.pop();
  state.undo.push(next);
  restore(next);
  statusText.textContent = "Redone";
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveHistory();
  statusText.textContent = "Canvas cleared";
}

function fillCanvas() {
  ctx.fillStyle = state.color;
  ctx.globalAlpha = state.opacity;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  saveHistory();
  statusText.textContent = "Canvas filled";
}

function downloadImage() {
  const link = document.createElement("a");
  link.download = "paint-for-mac.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function importImage(file) {
  if (!file) return;
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    saveHistory();
    statusText.textContent = "Image imported";
  };
  image.src = URL.createObjectURL(file);
}

function buildSwatches() {
  const container = document.querySelector("#swatches");
  swatchColors.forEach((color) => {
    const button = document.createElement("button");
    button.className = "swatch";
    button.style.background = color;
    button.title = color;
    button.setAttribute("aria-label", color);
    button.addEventListener("click", () => setColor(color));
    container.appendChild(button);
  });
}

toolButtons.forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
canvas.addEventListener("pointerdown", beginDraw);
canvas.addEventListener("pointermove", moveDraw);
canvas.addEventListener("pointerup", finishDraw);
canvas.addEventListener("pointercancel", finishDraw);
colorPicker.addEventListener("input", (event) => setColor(event.target.value));
brushSize.addEventListener("input", (event) => {
  state.size = Number(event.target.value);
  brushSizeValue.textContent = state.size;
});
opacity.addEventListener("input", (event) => {
  state.opacity = Number(event.target.value) / 100;
  opacityValue.textContent = event.target.value;
});
document.querySelector("#undoButton").addEventListener("click", undo);
document.querySelector("#redoButton").addEventListener("click", redo);
document.querySelector("#clearButton").addEventListener("click", clearCanvas);
document.querySelector("#fillButton").addEventListener("click", fillCanvas);
document.querySelector("#downloadButton").addEventListener("click", downloadImage);
document.querySelector("#importButton").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => importImage(event.target.files[0]));

window.addEventListener("keydown", (event) => {
  if (!event.metaKey && !event.ctrlKey) return;
  const key = event.key.toLowerCase();
  if (key === "z" && event.shiftKey) {
    event.preventDefault();
    redo();
  } else if (key === "z") {
    event.preventDefault();
    undo();
  } else if (key === "s") {
    event.preventDefault();
    downloadImage();
  } else if (key === "i") {
    event.preventDefault();
    fileInput.click();
  }
});

buildSwatches();
setupCanvas();
