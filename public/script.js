// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  // DOM
  const cartContainer = document.getElementById("cartas");
  const frijolEl = document.getElementById("frijol");
  const cartaActualImg = document.getElementById("carta-actual");
  const miniTableros = Array.from(document.querySelectorAll(".mini-tablero"));
  const ganadorBanner = document.getElementById("ganador-banner");

  let myBoard = [];
  let myMarks = new Set();
  let roomId = null;
  let playerName = null;
  let currentCard = null;

  // get name/sala from URL or prompt
  const urlParams = new URLSearchParams(window.location.search);
  playerName = urlParams.get("name") || prompt("Tu nombre:") || ("Jugador" + Math.floor(Math.random()*1000));
  roomId = urlParams.get("sala") || prompt("Código de sala (deja vacío para generar):") || null;

  if (!roomId) {
    roomId = Math.floor(1000 + Math.random() * 9000).toString();
    alert("Sala creada: " + roomId + "\nComparte esta URL: " + window.location.origin + window.location.pathname + "?sala=" + roomId + "&name=" + encodeURIComponent(playerName));
    const newUrl = window.location.origin + window.location.pathname + "?sala=" + roomId + "&name=" + encodeURIComponent(playerName);
    window.history.replaceState({}, "", newUrl);
  } else {
    if (!urlParams.get("name")) {
      const newUrl = window.location.origin + window.location.pathname + "?sala=" + roomId + "&name=" + encodeURIComponent(playerName);
      window.history.replaceState({}, "", newUrl);
    }
  }

  socket.emit("joinRoom", { roomId, name: playerName });

  socket.on("roomFull", () => {
    alert("La sala ya tiene 5 jugadores. Intenta otra sala.");
  });

  function renderMyBoard() {
    cartContainer.innerHTML = "";
    myBoard.forEach(cardName => {
      const div = document.createElement("div");
      div.className = "carta";
      div.dataset.nombre = cardName;
      const img = document.createElement("img");
      img.src = `imagenes/${cardName}`;
      img.alt = cardName;
      div.appendChild(img);

      div.addEventListener("dragover", e => {
        if (currentCard === cardName && !div.classList.contains("marcada")) {
          e.preventDefault();
        }
      });

      div.addEventListener("drop", (e) => {
        e.preventDefault();
        if (currentCard !== cardName) {
          flashInvalid(div);
          return;
        }
        if (!div.classList.contains("marcada")) {
          div.classList.add("marcada");
          myMarks.add(cardName);
          socket.emit("markCard", { roomId, cardName });
        }
      });

      cartContainer.appendChild(div);
    });
  }

  function flashInvalid(el) {
    el.style.transition = "box-shadow 0.12s ease";
    el.style.boxShadow = "0 0 0 3px rgba(255,0,0,0.5)";
    setTimeout(() => { el.style.boxShadow = ""; }, 300);
  }

  function markCardVisually(cardName) {
    const cardEls = Array.from(document.querySelectorAll(".carta"));
    const target = cardEls.find(c => c.dataset.nombre === cardName);
    if (target && !target.classList.contains("marcada")) {
      target.classList.add("marcada");
    }
  }

  function updateMiniTableros(players) {
    const others = players.filter(p => p.name !== playerName);
    for (let i = 0; i < 4; i++) {
      const container = miniTableros[i];
      container.innerHTML = "";
      if (others[i]) {
        const nameEl = document.createElement("div");
        nameEl.textContent = others[i].name;
        nameEl.className = "nombre-oponente";
        container.appendChild(nameEl);

        for (let c = 0; c < 16; c++) {
          const cell = document.createElement("div");
          cell.style.width = "100%";
          cell.style.height = "100%";
          cell.style.display = "flex";
          cell.style.alignItems = "center";
          cell.style.justifyContent = "center";
          const theirBoard = others[i].board || [];
          const markedSet = new Set(others[i].marks || []);
          if (theirBoard[c] && markedSet.has(theirBoard[c])) {
            const bean = document.createElement("div");
            bean.className = "mini-frijol";
            cell.appendChild(bean);
          }
          container.appendChild(cell);
        }
      } else {
        for (let c = 0; c < 16; c++) {
          const cell = document.createElement("div");
          cell.style.width = "100%";
          cell.style.height = "100%";
          container.appendChild(cell);
        }
      }
    }
  }

  socket.on("roomState", (state) => {
    if (!state) return;
    currentCard = state.currentCard || null;
    if (currentCard) {
      cartaActualImg.src = `imagenes/${currentCard}`;
    }
    const me = state.players.find(p => p.name === playerName && p.board);
    if (me) {
      myBoard = me.board.slice();
      myMarks = new Set(me.marks || []);
      renderMyBoard();
      myMarks.forEach(cardName => markCardVisually(cardName));
    }
    updateMiniTableros(state.players);
  });

  socket.on("updateCard", (cardName) => {
    currentCard = cardName;
    if (currentCard) cartaActualImg.src = `imagenes/${currentCard}`;
  });

  socket.on("invalidMark", ({ cardName, reason }) => {
    console.warn("Marca inválida:", cardName, reason);
  });

  socket.on("anunciarGanador", (winnerName) => {
    ganadorBanner.textContent = `🏆 ${winnerName} ha ganado la LOTERÍA COMPLETA 🏆`;
    ganadorBanner.style.display = "block";
    setTimeout(() => {
      ganadorBanner.style.display = "none";
    }, 10000);
  });

  /* === ARRÁSTRE DEL FRIJOL (PC + TÁCTIL) === */
  let touchActive = false;
  let offsetX = 0, offsetY = 0;

  // Desktop drag
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

  // Touch support (mobile)
  frijolEl.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    const rect = frijolEl.getBoundingClientRect();
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;
    touchActive = true;
    frijolEl.style.transition = "none";
  });

  document.addEventListener("touchmove", (e) => {
    if (!touchActive) return;
    const touch = e.touches[0];
    frijolEl.style.position = "absolute";
    frijolEl.style.left = (touch.clientX - offsetX) + "px";
    frijolEl.style.top = (touch.clientY - offsetY) + "px";
  });

  document.addEventListener("touchend", (e) => {
    if (!touchActive) return;
    touchActive = false;
    const touch = e.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    const cartaDiv = dropTarget?.closest(".carta");
    if (cartaDiv) {
      const cardName = cartaDiv.dataset.nombre;
      if (currentCard === cardName && !cartaDiv.classList.contains("marcada")) {
        cartaDiv.classList.add("marcada");
        myMarks.add(cardName);
        socket.emit("markCard", { roomId, cardName });
      } else {
        flashInvalid(cartaDiv);
      }
    }
    // return frijol to base
    frijolEl.style.left = "18px";
    frijolEl.style.top = "18px";
  });

});
























