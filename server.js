// server.js (ESM)
import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// ==== Configuración de cartas (ajusta nombres/archivos si tus imágenes son distintas) ====
const ALL_CARDS = [
  "carta1.jpeg","carta2.jpeg","carta3.jpeg","carta4.jpeg",
  "carta5.jpeg","carta6.jpeg","carta7.jpeg","carta8.jpeg",
  "carta9.jpeg","carta10.jpeg","carta11.jpeg","carta12.jpeg",
  "carta13.jpeg","carta14.jpeg","carta15.jpeg","carta16.jpeg"
];

// Estructura rooms:
// rooms[roomId] = {
//   players: { socketId: { id, name, board: [...16 cards], marks: [] } },
//   drawPile: [...cards left to draw],
//   currentCard: "cartaX.jpeg",
//   timer: IntervalOrNull
// }
const rooms = {};

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Start automatic drawing for a room (if not already started)
function startRoomDrawing(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  if (room.timer) return; // already running

  // ensure drawPile exists
  if (!room.drawPile || room.drawPile.length === 0) {
    room.drawPile = shuffleArray(ALL_CARDS);
  }

  // draw first card immediately
  drawNextCard(roomId);

  // then draw every X ms (5s)
  room.timer = setInterval(() => {
    drawNextCard(roomId);
  }, 5000);
}

function stopRoomDrawing(roomId) {
  const room = rooms[roomId];
  if (!room || !room.timer) return;
  clearInterval(room.timer);
  room.timer = null;
}

function drawNextCard(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  if (!room.drawPile || room.drawPile.length === 0) {
    room.drawPile = shuffleArray(ALL_CARDS);
  }

  room.currentCard = room.drawPile.shift();
  // Broadcast updated state and the card
  io.to(roomId).emit("roomState", buildRoomState(roomId));
  io.to(roomId).emit("updateCard", room.currentCard);
}

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on("joinRoom", ({ roomId, name }) => {
    if (!roomId) return;

    // create room if not exists
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: {},
        drawPile: shuffleArray(ALL_CARDS),
        currentCard: null,
        timer: null
      };
    }

    const room = rooms[roomId];
    const playerCount = Object.keys(room.players).length;
    if (playerCount >= 5) {
      socket.emit("roomFull");
      return;
    }

    socket.join(roomId);

    // generate player's board: 16 unique random cards from ALL_CARDS
    const board = shuffleArray(ALL_CARDS).slice(0, 16);

    room.players[socket.id] = {
      id: socket.id,
      name: name || "Jugador",
      board,
      marks: []
    };

    // start drawing automatically for the room if not already
    startRoomDrawing(roomId);

    // emit state to everyone in room
    io.to(roomId).emit("roomState", buildRoomState(roomId));
    console.log(`${name} joined room ${roomId}`);
  });

  socket.on("markCard", ({ roomId, cardName }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;

    // Only allow marking if cardName equals the currentCard for the room
    if (!room.currentCard || cardName !== room.currentCard) {
      socket.emit("invalidMark", { cardName, reason: "La carta en juego no coincide." });
      return;
    }

    // Also ensure the card belongs to the player's board
    if (!player.board.includes(cardName)) {
      socket.emit("invalidMark", { cardName, reason: "La carta no pertenece a tu tablero." });
      return;
    }

    // Only mark if not already marked
    if (!player.marks.includes(cardName)) {
      player.marks.push(cardName);
      io.to(roomId).emit("roomState", buildRoomState(roomId));
    }

    // Check for winner (all 16 marked)
    if (player.marks.length >= player.board.length) {
      io.to(roomId).emit("anunciarGanador", player.name);
      stopRoomDrawing(roomId);
    }
  });

  socket.on("unmarkCard", ({ roomId, cardName }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;
    player.marks = player.marks.filter(c => c !== cardName);
    io.to(roomId).emit("roomState", buildRoomState(roomId));
  });

  socket.on("disconnecting", () => {
    const sRooms = Array.from(socket.rooms); // includes socket.id
    sRooms.forEach(r => {
      if (rooms[r] && rooms[r].players && rooms[r].players[socket.id]) {
        delete rooms[r].players[socket.id];
        // if room empty -> clean up
        if (Object.keys(rooms[r].players).length === 0) {
          stopRoomDrawing(r);
          delete rooms[r];
        } else {
          io.to(r).emit("roomState", buildRoomState(r));
        }
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected:", socket.id);
  });
});

function buildRoomState(roomId) {
  const room = rooms[roomId];
  if (!room) return { players: [], currentCard: null };
  const players = Object.entries(room.players).map(([id, p]) => ({
    id,
    name: p.name,
    marks: p.marks.slice(),
    board: p.board.slice()
  }));
  return { players, currentCard: room.currentCard };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));


