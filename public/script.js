// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  // DOM
  const cartContainer = document.getElementById("cartas");
  const cartaActualImg = document.getElementById("carta-actual");
  const miniTableros = Array.from(document.querySelectorAll(".mini-tablero"));
  const ganadorBanner = document.getElementById("ganador-banner");

  let myBoard = [];      // player's 16 cards
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

  // join room
  socket.emit("joinRoom", { roomId, name: playerName });

  // room full
  socket.on("roomFull", () => {
    alert("La sala ya tiene 5 jugadores. Intenta otra sala.");
  });

  // Render player's board (4x4)
  function renderMyBoard() {
    cartContainer.innerHTML = "";
    // grid CSS is handled by style.css; we insert 16 .carta elements
    myBoard.forEach(cardName => {
      const div = document.createElement("div");
      div.className = "carta";
      div.dataset.nombre = cardName;

      const img = document.createElement("img");
      img.src = `imagenes/${cardName}`;
      img.alt = cardName;
      div.appendChild(img);

      // Click / tap to attempt mark
      div.addEventListener("click", () => {
        attemptMark(div, cardName);
      });

      // keyboard accessibility (Enter)
      div.tabIndex = 0;
      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          attemptMark(div, cardName);
        }
      });

      cartContainer.appendChild(div);
    });

    // apply local marks visually
    myMarks.forEach(name => markCardVisually(name));
  }

  function attemptMark(div, cardName) {
    // Only allow marking if the card equals currentCard
    if (!currentCard) {
      flashInvalid(div);
      return;
    }
    if (cardName !== currentCard) {
      flashInvalid(div);
      return;
    }
    // if already marked, ignore
    if (div.classList.contains("marcada")) return;

    // mark locally immediately for snappy UX, server will validate
    div.classList.add("marcada");
    myMarks.add(cardName);
    socket.emit("markCard", { roomId, cardName });
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

  // Update mini-tableros to reflect others' progress (4 slots)
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

        // show 4x4 visual grid (we'll append 16 small cells)
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
        // empty placeholder grid (16 cells)
        for (let c = 0; c < 16; c++) {
          const cell = document.createElement("div");
          cell.style.width = "100%";
          cell.style.height = "100%";
          container.appendChild(cell);
        }
      }
    }
  }

  // Handle roomState from server (includes players + currentCard)
  socket.on("roomState", (state) => {
    if (!state) return;
    currentCard = state.currentCard || null;
    if (currentCard) {
      cartaActualImg.src = `imagenes/${currentCard}`;
    }

    // find my entry by socket id or name
    const me = state.players.find(p => p.name === playerName && p.board);
    if (me) {
      // update board & marks
      myBoard = me.board.slice();
      myMarks = new Set(me.marks || []);
      renderMyBoard();
    } else {
      // if my board not present yet, wait
    }

    // update mini-tableros with other players (first 4)
    updateMiniTableros(state.players);
  });

  socket.on("updateCard", (cardName) => {
    currentCard = cardName;
    if (currentCard) cartaActualImg.src = `imagenes/${currentCard}`;
  });

  // server says mark invalid -> revert local mark (if any)
  socket.on("invalidMark", ({ cardName, reason }) => {
    // remove visual mark if we optimistically added it
    const cardEls = Array.from(document.querySelectorAll(".carta"));
    const target = cardEls.find(c => c.dataset.nombre === cardName);
    if (target && target.classList.contains("marcada")) {
      target.classList.remove("marcada");
    }
    myMarks.delete(cardName);
    // optional: show small toast; for now, console
    console.warn("Marca inválida:", reason);
  });

  // when someone wins
  socket.on("anunciarGanador", (winnerName) => {
    ganadorBanner.textContent = `🏆 ${winnerName} ha ganado la LOTERÍA COMPLETA 🏆`;
    ganadorBanner.style.display = "block";
    setTimeout(() => { ganadorBanner.style.display = "none"; }, 10000);
  });

  // Accessibility: ensure images load fallback
  document.addEventListener("error", (e) => {
    if (e.target && e.target.tagName === "IMG") {
      e.target.style.objectFit = "contain";
      e.target.style.background = "#eee";
    }
  }, true);

});






























