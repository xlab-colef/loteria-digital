// script.js
document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  // elementos DOM
  const cartContainer = document.getElementById("cartas");
  const frijolEl = document.getElementById("frijol");
  const cartaActualImg = document.getElementById("carta-actual");
  const miniTableros = Array.from(document.querySelectorAll(".mini-tablero"));
  const ganadorBanner = document.getElementById("ganador-banner");

  // baraja (16 cartas)
  const cartas = [
    "carta1.jpeg","carta2.jpeg","carta3.jpeg","carta4.jpeg",
    "carta5.jpeg","carta6.jpeg","carta7.jpeg","carta8.jpeg",
    "carta9.jpeg","carta10.jpeg","carta11.jpeg","carta12.jpeg",
    "carta13.jpeg","carta14.jpeg","carta15.jpeg","carta16.jpeg"
  ];

  // obtener nombre y sala
  let urlParams = new URLSearchParams(window.location.search);
  let playerName = urlParams.get("name") || prompt("Tu nombre:") || ("Jugador" + Math.floor(Math.random()*1000));
  let roomId = urlParams.get("sala") || prompt("Código de sala (o deja vacío para generar):") || null;
  if (!roomId) {
    roomId = Math.floor(1000 + Math.random() * 9000).toString();
    alert("Sala creada: " + roomId + "\nComparte esta URL: " + window.location.href.split("?")[0] + "?sala=" + roomId + "&name=" + encodeURIComponent(playerName));
    const newUrl = window.location.origin + window.location.pathname + "?sala=" + roomId + "&name=" + encodeURIComponent(playerName);
    window.history.replaceState({}, "", newUrl);
  } else {
    if (!urlParams.get("name")) {
      const newUrl = window.location.origin + window.location.pathname + "?sala=" + roomId + "&name=" + encodeURIComponent(playerName);
      window.history.replaceState({}, "", newUrl);
    }
  }

  // unirse a la sala
  socket.emit("joinRoom", { roomId, name: playerName });

  // crear tablero (4x4)
  function crearTablero() {
    cartContainer.innerHTML = "";
    cartas.forEach(name => {
      const div = document.createElement("div");
      div.className = "carta";
      div.dataset.nombre = name;
      const img = document.createElement("img");
      img.src = `imagenes/${name}`;
      img.alt = name;
      div.appendChild(img);

      // habilitar drop (para el frijol)
      div.addEventListener("dragover", e => e.preventDefault());
      div.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!div.classList.contains("marcada")) {
          div.classList.add("marcada");
          socket.emit("markCard", { roomId, cardName: name });
          verificarGanador();
        }
        devolverFrijol();
      });

      cartContainer.appendChild(div);
    });
  }
  crearTablero();

  // mostrar carta actual cada 2.5s
  let idx = 0;
  setInterval(() => {
    cartaActualImg.src = `imagenes/${cartas[idx]}`;
    idx = (idx + 1) % cartas.length;
  }, 2500);

  // ===== Frijol (arrastre) =====
  const frijolOrig = { left: frijolEl.style.left || "18px", top: frijolEl.style.top || "18px" };

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
    devolverFrijol();
  });

  function devolverFrijol() {
    frijolEl.style.left = frijolOrig.left;
    frijolEl.style.top = frijolOrig.top;
  }

  // ===== Verificar si el jugador ganó =====
  function verificarGanador() {
    const marcadas = document.querySelectorAll(".carta.marcada").length;
    if (marcadas === 16) {
      socket.emit("playerWon", { roomId, name: playerName });
    }
  }

  // ===== Mostrar ganador global =====
  socket.on("anunciarGanador", (name) => {
    ganadorBanner.textContent = `🏆 ${name} ha ganado la LOTERÍA COMPLETA 🏆`;
    ganadorBanner.style.display = "block";
  });

  // ===== Actualizar mini tableros de oponentes =====
  socket.on("roomState", (state) => {
    const others = state.players.filter(p => p.name !== playerName);
    const slots = 4;
    for (let i = 0; i < slots; i++) {
      const container = miniTableros[i];
      container.innerHTML = "";
      if (others[i]) {
        const nameEl = document.createElement("div");
        nameEl.textContent = others[i].name;
        nameEl.className = "nombre-oponente";
        container.appendChild(nameEl);

        for (let c = 0; c < 16; c++) {
          const cell = document.createElement("div");
          cell.className = "mini-cell";
          if (others[i].marks && others[i].marks.length > c) {
            const bean = document.createElement("div");
            bean.className = "mini-frijol";
            cell.appendChild(bean);
          }
          container.appendChild(cell);
        }
      }
    }
  });
});












