// === script.js ===

// Conexión con el servidor
const socket = io();

// Elementos principales
const cartasDiv = document.getElementById("cartas");
const cartaActualImg = document.getElementById("carta-actual");
const frijolEl = document.getElementById("frijol");

// Variables del tablero
const totalCartas = 16;
let misCartas = [];
let cartasMarcadas = new Set();
let cartaActual = null;

// --- Generar tablero aleatorio ---
function generarTablero() {
  const cartasDisponibles = [];
  for (let i = 1; i <= 54; i++) {
    cartasDisponibles.push(`imagenes/carta${i}.jpeg`);
  }

  // Barajar y tomar 16
  misCartas = cartasDisponibles.sort(() => 0.5 - Math.random()).slice(0, totalCartas);

  cartasDiv.innerHTML = "";
  misCartas.forEach((src, index) => {
    const carta = document.createElement("div");
    carta.classList.add("carta");
    carta.dataset.index = index;

    const img = document.createElement("img");
    img.src = src;
    img.alt = `Carta ${index + 1}`;

    carta.appendChild(img);
    cartasDiv.appendChild(carta);
  });
}

// --- Escuchar carta actual del servidor ---
socket.on("carta-en-juego", (carta) => {
  cartaActual = carta;
  cartaActualImg.src = carta;
});

// --- Manejar ganador global ---
socket.on("ganador", (nombre) => {
  alert(`🎉 ${nombre} ha ganado la LOTERÍA 🎉`);
});

// --- Enviar ganador ---
function verificarGanador() {
  if (cartasMarcadas.size === totalCartas) {
    socket.emit("ganador");
  }
}

// --- Soporte de frijol (mouse + táctil) ---
function enableBeanDrag() {
  let offsetX = 0;
  let offsetY = 0;
  let active = false;

  // MOUSE
  frijolEl.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", "frijol");
    const crt = frijolEl.cloneNode(true);
    crt.style.position = "absolute";
    crt.style.top = "-9999px";
    document.body.appendChild(crt);
    e.dataTransfer.setDragImage(crt, 20, 20);
    setTimeout(() => crt.remove(), 0);
  });

  document.addEventListener("dragend", () => {
    frijolEl.style.left = "18px";
    frijolEl.style.top = "18px";
  });

  // TÁCTIL
  frijolEl.addEventListener("touchstart", (e) => {
    active = true;
    const touch = e.touches[0];
    offsetX = touch.clientX - frijolEl.getBoundingClientRect().left;
    offsetY = touch.clientY - frijolEl.getBoundingClientRect().top;
    frijolEl.style.transition = "none";
  });

  document.addEventListener("touchmove", (e) => {
    if (!active) return;
    const touch = e.touches[0];
    frijolEl.style.position = "absolute";
    frijolEl.style.left = `${touch.clientX - offsetX}px`;
    frijolEl.style.top = `${touch.clientY - offsetY}px`;
  });

  document.addEventListener("touchend", (e) => {
    if (!active) return;
    active = false;
    const touch = e.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);

    if (dropTarget && dropTarget.closest(".carta")) {
      const cartaEl = dropTarget.closest(".carta");
      marcarCarta(cartaEl);
    }

    // Regresa frijol a su lugar
    frijolEl.style.transition = "0.3s";
    frijolEl.style.left = "18px";
    frijolEl.style.top = "18px";
  });
}

// --- Marcar carta ---
function marcarCarta(cartaEl) {
  const index = cartaEl.dataset.index;
  const src = misCartas[index];

  if (src === cartaActual && !cartasMarcadas.has(index)) {
    cartasMarcadas.add(index);

    const frijol = document.createElement("img");
    frijol.src = "imagenes/frijol.png";
    frijol.classList.add("frijol-tablero");
    cartaEl.appendChild(frijol);

    verificarGanador();
  }
}

// --- Permitir drop con mouse ---
cartasDiv.addEventListener("dragover", (e) => e.preventDefault());
cartasDiv.addEventListener("drop", (e) => {
  e.preventDefault();
  const cartaEl = e.target.closest(".carta");
  if (cartaEl) marcarCarta(cartaEl);
});

// --- Inicializar todo ---
document.addEventListener("DOMContentLoaded", () => {
  generarTablero();
  enableBeanDrag();
});






















