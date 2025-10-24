const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// Manejo de salas
const salas = {};

// Baraja ejemplo (puedes reemplazar con tus imágenes)
const baraja = [
  "carta1.png", "carta2.png", "carta3.png", "carta4.png",
  "carta5.png", "carta6.png", "carta7.png", "carta8.png"
];

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  socket.on("unirseSala", ({ salaId, nombre }) => {
    socket.join(salaId);
    if (!salas[salaId]) {
      salas[salaId] = {
        jugadores: {},
        cartaActualIndex: 0,
        ganador: null
      };
    }

    salas[salaId].jugadores[socket.id] = { nombre, tabla: [], marcadas: [] };

    io.to(salaId).emit("jugadoresActuales", Object.values(salas[salaId].jugadores).map(j => j.nombre));
    socket.emit("cartaActual", baraja[salas[salaId].cartaActualIndex]);
  });

  socket.on("siguienteCarta", (salaId) => {
    const sala = salas[salaId];
    if (!sala) return;
    sala.cartaActualIndex = (sala.cartaActualIndex + 1) % baraja.length;
    io.to(salaId).emit("cartaActual", baraja[sala.cartaActualIndex]);
  });

  socket.on("marcarCarta", ({ salaId, carta }) => {
    const sala = salas[salaId];
    if (!sala) return;
    sala.jugadores[socket.id].marcadas.push(carta);

    // Verificar victoria (tabla llena)
    if (sala.jugadores[socket.id].marcadas.length === baraja.length) {
      sala.ganador = sala.jugadores[socket.id].nombre;
      io.to(salaId).emit("ganador", sala.ganador);
    }
  });

  socket.on("disconnecting", () => {
    for (const salaId of socket.rooms) {
      if (salas[salaId]) {
        delete salas[salaId].jugadores[socket.id];
        io.to(salaId).emit("jugadoresActuales", Object.values(salas[salaId].jugadores).map(j => j.nombre));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
