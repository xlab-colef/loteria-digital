// script.js
document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  // elementos DOM
  const cartContainer = document.getElementById("cartas");
  const frijolEl = document.getElementById("frijol");
  const cartaActualImg = document.getElementById("carta-actual");
  const miniTableros = Array.from(document.querySelectorAll(".mini-tablero"));

  // ====== GENERAR LAS CELDAS DE LOS MINI-TABLERO ======
document.querySelectorAll('.mini-tablero').forEach(tablero => {
  for (let i = 0; i < 16; i++) {
    const celda = document.createElement('div');
    celda.classList.add('celda');
    tablero.appendChild(celda);
  }
});

  // baraja (asegúrate de tener estas imágenes en public/imagenes)
  const cartas = [
    "carta1.jpeg","carta2.jpeg","carta3.jpeg","carta4.jpeg",
    "carta5.jpeg","carta6.jpeg","carta7.jpeg","carta8.jpeg",
    "carta9.jpeg","carta10.jpeg","carta11.jpeg","carta12.jpeg",
    "carta13.jpeg","carta14.jpeg","carta15.jpeg","carta16.jpeg"
  ];

  // obtener nombre y sala (prompt si no está en URL)
  let urlParams = new URLSearchParams(window.location.search);
  let playerName = urlParams.get("name") || prompt("Tu nombre:") || ("Jugador" + Math.floor(Math.random()*1000));
  let roomId = urlParams.get("sala") || prompt("Código de sala (o deja vacío para generar):") || null;
  if (!roomId) {
    roomId = Math.floor(1000 + Math.random() * 9000).toString();
    alert("Sala creada: " + roomId + "\nComparte esta URL: " + window.location.href.split("?")[0] + "?sala=" + roomId + "&name=" + encodeURIComponent(playerName));
    // update URL without reload
    const newUrl = window.location.origin + window.location.pathname + "?sala=" + roomId + "&name=" + encodeURIComponent(playerName);
    window.history.replaceState({}, "", newUrl);
  } else {
    // ensure url includes name param too
    if (!urlParams.get("name")) {
      const newUrl = window.location.origin + window.location.pathname + "?sala=" + roomId + "&name=" + encodeURIComponent(playerName);
      window.history.replaceState({}, "", newUrl);
    }
  }

  // join the room
  socket.emit("joinRoom", { roomId, name: playerName });

  // crear tablero (cada carta como <div.carta><img/></div>)
  function crearTablero() {
    cartContainer.innerHTML = "";
    cartas.forEach(name => {
      const div = document.createElement("div");
      div.className = "carta";
      div.dataset.nombre = name;
      const img = document.createElement("img");
      img.src = `imagenes/${name}`;
      img.alt = name;
      img.onerror = () => {
        img.style.objectFit = "contain";
        img.style.background = "#eee";
      };
      div.appendChild(img);

      // habilitar drop
      div.addEventListener("dragover", e => e.preventDefault());
      div.addEventListener("drop", (e) => {
        e.preventDefault();
        // marcar localmente y avisar al servidor
        if (!div.classList.contains("marcada")) {
          div.classList.add("marcada");
          socket.emit("markCard", { roomId, cardName: name });
        }
        // devolver frijol
        devolverFrijol();
      });

      cartContainer.appendChild(div);
    });
  }
  crearTablero();

  // carta actual rotativa (simulada)
  let idx = 0;
  setInterval(() => {
    cartaActualImg.src = `imagenes/${cartas[idx]}`;
    idx = (idx + 1) % cartas.length;
  }, 2500);

  /* ===== Drag & Drop frijol (native drag) ===== */
  const frijolOrig = { left: frijolEl.style.left || "18px", top: frijolEl.style.top || "18px" };

  frijolEl.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", "frijol");
    // custom drag image (clone)
    const crt = frijolEl.cloneNode(true);
    crt.style.position = "absolute";
    crt.style.top = "-9999px";
    document.body.appendChild(crt);
    e.dataTransfer.setDragImage(crt, 20, 20);
    setTimeout(() => crt.remove(), 0);
  });

  document.addEventListener("dragend", () => {
    devolverFrijol();
  });

  function devolverFrijol() {
    frijolEl.style.left = frijolOrig.left;
    frijolEl.style.top = frijolOrig.top;
  }

  /* ===== Recibir estado de sala y actualizar mini-tableros ===== */
  socket.on("roomState", (state) => {
    // state.players = [{id,name,marks:[]}, ...]
    // remove self from opponents list and map up to 4 slots for others
    const others = state.players.filter(p => p.name !== playerName);
    // ensure at most 4
    const slots = 4;
    for (let i = 0; i < slots; i++) {
      const container = miniTableros[i];
      container.innerHTML = ""; // clear
      if (others[i]) {
        // show player name small
        const nameEl = document.createElement("div");
        nameEl.textContent = others[i].name;
        nameEl.style.fontSize = "10px";
        nameEl.style.color = "#333";
        nameEl.style.textAlign = "center";
        nameEl.style.gridColumn = "1 / -1";
        nameEl.style.alignSelf = "start";
        container.appendChild(nameEl);

        // Place frijoles according to their marked cards.
        // Map each cardName deterministically to a cell 0..3
        const placed = new Set();
        others[i].marks.forEach(cardName => {
          const pos = hashStringToIndex(cardName, 4); // 0..3
          if (placed.has(pos)) return; // one frijol per cell
          placed.add(pos);
          const bean = document.createElement("div");
          bean.className = "mini-frijol";
          // position via grid: put bean in appropriate cell
          // each cell is implicit; we create placeholder cells to position correctly
          // We'll create invisible placeholders so the bean falls into the correct cell
          // create filler elements up to pos
          // easier: create a 4-cell array and append in order placing beans where needed
        });

        // Build 4 cells and place beans in correct cell
        for (let c = 0; c < 4; c++) {
          const cell = document.createElement("div");
          cell.style.width = "100%";
          cell.style.height = "100%";
          cell.style.display = "flex";
          cell.style.justifyContent = "center";
          cell.style.alignItems = "center";
          if (placed.has(c)) {
            const bean = document.createElement("div");
            bean.className = "mini-frijol";
            cell.appendChild(bean);
          }
          container.appendChild(cell);
        }

      } else {
        // empty mini-tablero: draw 4 empty cells
        for (let c = 0; c < 4; c++) {
          const cell = document.createElement("div");
          cell.style.width = "100%";
          cell.style.height = "100%";
          container.appendChild(cell);
        }
      }
    }
  });

  // helper: deterministic map string -> 0..(n-1)
  function hashStringToIndex(s, n) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h) % n;
  }

  /* double click on center to clear your marks (for testing) */
  cartContainer.addEventListener("dblclick", () => {
    // remove local marks
    document.querySelectorAll(".carta.marcada").forEach(c => c.classList.remove("marcada"));
    // notify server to clear all of this player's marks: easiest to unmark individually
    // (in production you may implement a clear endpoint).
    // Here we emit unmark for all known cards
    cartas.forEach(name => {
      socket.emit("unmarkCard", { roomId, cardName: name });
    });
  });

  // optional: click on a marked card to unmark (and notify server)
  cartContainer.addEventListener("click", (e) => {
    const tarjeta = e.target.closest(".carta");
    if (!tarjeta) return;
    const name = tarjeta.dataset.nombre;
    if (tarjeta.classList.contains("marcada")) {
      tarjeta.classList.remove("marcada");
      socket.emit("unmarkCard", { roomId, cardName: name });
    }
  });

});










