// server.js (ES modules)
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

// Configuración de cartas (asegúrate de tener estas imágenes)
const ALL_CARDS = [
  "carta1.jpeg","carta2.jpeg","carta3.jpeg","carta4.jpeg",
  "carta5.jpeg","carta6.jpeg","carta7.jpeg","carta8.jpeg",
  "carta9.jpeg","carta10.jpeg","carta11.jpeg","carta12.jpeg",
  "carta13.jpeg","carta14.jpeg","carta15.jpeg","carta16.jpeg"
];

// Estructura rooms:
// rooms[roomId] = {
//   players: { socketId: { id, name, marks: [], board: [] } },
//   drawPile: [...cards not yet drawn],
//   currentCard: null,
//   timer: IntervalObject (optional)
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

function startRoomDrawing(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  // If a timer already exists, don't start another
  if (room.timer) return;

  // draw first immediately
  drawNextCard(roomId);

  // then draw each 5 seconds (you can change interval here if needed)
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
    // refill drawPile with a shuffled copy (allows repeats across rounds)
    room.drawPile = shuffleArray(ALL_CARDS);
  }
  const next = room.drawPile.shift();
  room.currentCard = next;
  // Broadcast state to clients
  io.to(roomId).emit("roomState", buildRoomState(roomId));
  io.to(roomId).emit("updateCard", room.currentCard);
}

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on("joinRoom", ({ roomId, name }) => {
    if (!roomId) return;
    // ensure room exists
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
      // room full
      socket.emit("roomFull");
      return;
    }

    socket.join(roomId);

    // create player's board: a random permutation of ALL_CARDS (16 unique entries)
    const board = shuffleArray(ALL_CARDS).slice(0, 16);

    room.players[socket.id] = {
      id: socket.id,
      name: name || "Jugador",
      marks: [],     // marked cardNames
      board         // player's personal board (array of 16 card filenames)
    };

    // start drawing if not started
    startRoomDrawing(roomId);

    // send updated state to room
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
      // invalid mark attempt -> ignore (optionally could emit a warning)
      socket.emit("invalidMark", { cardName, reason: "La carta en juego no coincide." });
      return;
    }

    // Only mark if not already marked
    if (!player.marks.includes(cardName)) {
      player.marks.push(cardName);
      // Broadcast updated state
      io.to(roomId).emit("roomState", buildRoomState(roomId));
    }

    // Check for winner (16 marks)
    if (player.marks.length >= 16) {
      io.to(roomId).emit("anunciarGanador", player.name);
      // stop drawing for this room
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
        // if room empty, clean up
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











