const socket = io();

const nombreInput = document.getElementById("nombreJugador");
const salaInput = document.getElementById("salaId");
const unirseBtn = document.getElementById("unirseBtn");

const juegoDiv = document.getElementById("juego");
const cartaActualDiv = document.getElementById("cartaActual");
const siguienteCartaBtn = document.getElementById("siguienteCartaBtn");
const tablaDiv = document.getElementById("tabla");
const jugadoresConectadosDiv = document.getElementById("jugadoresConectados");
const ganadorDiv = document.getElementById("ganador");
const crearSalaBtn = document.getElementById("crearSalaBtn");

let salaId = "";
let tabla = [];
let nombreJugador = "";

const baraja = ["carta1.jpeg","carta2.jpeg","carta3.jpeg","carta4.jpeg","carta5.jpeg","carta6.jpeg","carta7.jpeg","carta8.jpeg"];

crearSalaBtn.addEventListener("click", () => {
  // Generar un ID de sala de 4 dígitos
  const nuevaSala = Math.floor(1000 + Math.random() * 9000).toString();
  salaInput.value = nuevaSala;
  alert("Sala creada: " + nuevaSala + "\nComparte este código con otros jugadores.");
});

unirseBtn.addEventListener("click", () => {
  nombreJugador = nombreInput.value || "Jugador";
  salaId = salaInput.value || "1234";

  tabla = baraja.slice(0,4); // tabla simplificada
  mostrarTabla();

  socket.emit("unirseSala", { salaId, nombre: nombreJugador });

  document.getElementById("formulario").style.display = "none";
  juegoDiv.style.display = "block";
});

siguienteCartaBtn.addEventListener("click", () => {
  socket.emit("siguienteCarta", salaId);
});

function mostrarTabla(){
  tablaDiv.innerHTML = "";
  tabla.forEach(carta => {
    const div = document.createElement("div");
    div.classList.add("carta");

    // Crear imagen
    const img = document.createElement("img");
    img.src = "imagenes/" + carta + ".jpeg"; // ruta de la imagen
    img.alt = carta;
    img.style.width = "100%";
    img.style.height = "100%";
    div.appendChild(img);

    div.dataset.carta = carta;
    div.addEventListener("click", () => {
      div.style.border = div.style.border === "3px solid green" ? "1px solid #333" : "3px solid green";
      socket.emit("marcarCarta", { salaId, carta: div.dataset.carta });
    });
    tablaDiv.appendChild(div);
  });
}


socket.on("cartaActual", (carta) => {
  cartaActualDiv.innerHTML = ""; // limpiar
  const img = document.createElement("img");
  img.src = "imagenes/" + carta + ".jpeg";
  img.alt = carta;
  img.style.width = "120px";
  img.style.height = "170px";
  cartaActualDiv.appendChild(img);
});


socket.on("jugadoresActuales", (jugadores) => {
  jugadoresConectadosDiv.textContent = "Jugadores conectados: " + jugadores.join(", ");
});

socket.on("ganador", (nombre) => {
  ganadorDiv.textContent = "¡Ganador: " + nombre + "!";
});

