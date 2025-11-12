const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {}; // { roomId: { players: [{id,name,marks:[]}] } }

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ roomId, name }) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = { players: [] };
    rooms[roomId].players.push({ id: socket.id, name, marks: [] });
    io.to(roomId).emit("roomState", rooms[roomId]);
  });

  socket.on("markCard", ({ roomId, cardName }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player && !player.marks.includes(cardName)) player.marks.push(cardName);
    io.to(roomId).emit("roomState", room);
  });

  socket.on("unmarkCard", ({ roomId, cardName }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player) player.marks = player.marks.filter(c => c !== cardName);
    io.to(roomId).emit("roomState", room);
  });

  // cuando alguien gana
  socket.on("playerWon", ({ roomId, name }) => {
    io.to(roomId).emit("anunciarGanador", name);
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      io.to(roomId).emit("roomState", rooms[roomId]);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor en puerto " + PORT));






