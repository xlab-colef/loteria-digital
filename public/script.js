// public/script.js
document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  // DOM
  const cartContainer = document.getElementById("cartas");
  const frijolEl = document.getElementById("frijol");
  const cartaActualImg = document.getElementById("carta-actual");
  const miniTableros = Array.from(document.querySelectorAll(".mini-tablero"));
  const ganadorBanner = document.getElementById("ganador-banner");

  let myBoard = [];      // this player's board (array of 16 filenames)
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
    // ensure name in URL
    if (!urlParams.get("name")) {
      const newUrl = window.location.origin + window.location.pathname + "?sala=" + roomId + "&name=" + encodeURIComponent(playerName);
      window.history.replaceState({}, "", newUrl);
    }
  }

  // join room
  socket.emit("joinRoom", { roomId, name: playerName });

  // handle room full
  socket.on("roomFull", () => {
    alert("La sala ya tiene 5 jugadores. Intenta otra sala.");
    // optional: redirect or disable UI
  });

  // render player's board (myBoard)
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

      // enable drop only if this card equals currentCard
      div.addEventListener("dragover", e => {
        // allow drop only when currentCard matches this card and not yet marked
        if (currentCard === cardName && !div.classList.contains("marcada")) {
          e.preventDefault();
        }
      });

      div.addEventListener("drop", (e) => {
        e.preventDefault();
        // only allow if currentCard matches this card
        if (currentCard !== cardName) {
          // silently ignore (or show small feedback)
          flashInvalid(div);
          return;
        }
        if (!div.classList.contains("marcada")) {
          // mark locally and inform server
          div.classList.add("marcada");
          myMarks.add(cardName);
          socket.emit("markCard", { roomId, cardName });
        }
      });

      cartContainer.appendChild(div);
    });
  }

  // small feedback for invalid drop
  function flashInvalid(el) {
    el.style.transition = "box-shadow 0.12s ease";
    el.style.boxShadow = "0 0 0 3px rgba(255,0,0,0.5)";
    setTimeout(() => {
      el.style.boxShadow = "";
    }, 300);
  }

  // mark a card visually by name (used when roomState tells us someone marked)
  function markCardVisually(cardName, byMe = false) {
    const cardEls = Array.from(document.querySelectorAll(".carta"));
    const target = cardEls.find(c => c.dataset.nombre === cardName);
    if (target && !target.classList.contains("marcada")) {
      target.classList.add("marcada");
    }
  }

  // update mini-tableros (others' progress)
  function updateMiniTableros(players) {
    // players: array of {id, name, marks:[], board:[]}
    const others = players.filter(p => p.name !== playerName);
    // ensure 4 slots
    for (let i = 0; i < 4; i++) {
      const container = miniTableros[i];
      container.innerHTML = "";
      if (others[i]) {
        // small name label
        const nameEl = document.createElement("div");
        nameEl.textContent = others[i].name;
        nameEl.className = "nombre-oponente";
        container.appendChild(nameEl);

        // build 16 cells showing marks: we'll show a 4x4 visual (no images)
        for (let c = 0; c < 16; c++) {
          const cell = document.createElement("div");
          cell.style.width = "100%";
          cell.style.height = "100%";
          cell.style.display = "flex";
          cell.style.alignItems = "center";
          cell.style.justifyContent = "center";
          // if the other player has marked the card at index c of their board, show frijol
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

  // listen for roomState from server
  socket.on("roomState", (state) => {
    // state = { players: [{id,name,marks,board}], currentCard }
    if (!state) return;
    currentCard = state.currentCard || null;
    if (currentCard) {
      cartaActualImg.src = `imagenes/${currentCard}`;
    }
    // find my player entry
    const me = state.players.find(p => p.name === playerName && p.board);
    if (me) {
      // update my board if changed
      myBoard = me.board.slice();
      // re-render board preserving marks where possible
      // reset myMarks to server value
      myMarks = new Set(me.marks || []);
      renderMyBoard();
      // apply marks visually
      myMarks.forEach(cardName => markCardVisually(cardName, true));
    } else {
      // my board not present yet (maybe join pending)
      // do nothing until server provides board
    }

    // update mini-tableros for first 4 others
    updateMiniTableros(state.players);
  });

  // updateCard event (optional)
  socket.on("updateCard", (cardName) => {
    currentCard = cardName;
    if (currentCard) {
      cartaActualImg.src = `imagenes/${currentCard}`;
    }
  });

  // invalid mark feedback (server-side)
  socket.on("invalidMark", ({ cardName, reason }) => {
    // optional: visual or toast
    console.warn("Marca inválida:", cardName, reason);
  });

  // when someone wins, show banner to all
  socket.on("anunciarGanador", (winnerName) => {
    ganadorBanner.textContent = `🏆 ${winnerName} ha ganado la LOTERÍA COMPLETA 🏆`;
    ganadorBanner.style.display = "block";
    // optionally, flash then hide after a while
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




























