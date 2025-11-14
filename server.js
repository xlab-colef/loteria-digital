// server.js
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

/*
rooms = {
   [roomId]: {
       players: {
           [socket.id]: { name, marks: ["carta3.jpeg", "carta9.jpeg"] }
       }
   }
}
*/
const rooms = {};

io.on("connection", (socket) => {
    console.log("socket connected:", socket.id);

    socket.on("joinRoom", ({ roomId, name }) => {
        if (!roomId) return;

        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: {}
            };
        }

        rooms[roomId].players[socket.id] = {
            name: name || "Jugador",
            marks: []
        };

        io.to(roomId).emit("roomState", buildRoomState(roomId));

        console.log(`${name} joined room ${roomId}`);
    });

    socket.on("markCard", ({ roomId, cardName }) => {
        if (!rooms[roomId] || !rooms[roomId].players[socket.id]) return;

        const player = rooms[roomId].players[socket.id];

        if (!player.marks.includes(cardName)) {
            player.marks.push(cardName);
        }

        io.to(roomId).emit("roomState", buildRoomState(roomId));
    });

    socket.on("unmarkCard", ({ roomId, cardName }) => {
        if (!rooms[roomId] || !rooms[roomId].players[socket.id]) return;

        const player = rooms[roomId].players[socket.id];
        player.marks = player.marks.filter(c => c !== cardName);

        io.to(roomId).emit("roomState", buildRoomState(roomId));
    });

    socket.on("disconnecting", () => {
        const sRooms = Array.from(socket.rooms);

        sRooms.forEach(r => {
            if (rooms[r] && rooms[r].players && rooms[r].players[socket.id]) {
                delete rooms[r].players[socket.id];
                io.to(r).emit("roomState", buildRoomState(r));
            }
        });
    });

    socket.on("disconnect", () => {
        console.log("socket disconnected:", socket.id);
    });
});

function buildRoomState(roomId) {
    const room = rooms[roomId];
    if (!room) return { players: [] };

    const players = Object.entries(room.players).map(([id, p]) => ({
        id,
        name: p.name,
        marks: [...p.marks]
    }));

    return { players };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
