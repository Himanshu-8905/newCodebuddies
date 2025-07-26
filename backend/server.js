import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://codebuddies.onrender.com", // Set specific domain in production
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 4000;

// Room structure: { roomId: { code, input, output, canvas, selectedLanguage } }
const roomState = {};

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId);
    console.log(`${userName} joined room ${roomId}`);
    socket.to(roomId).emit("user-connected", userId, userName);

    // Initialize room if not exist
    if (!roomState[roomId]) {
      roomState[roomId] = {
        code: "",
        input: "",
        output: "",
        canvas: [],
        selectedLanguage: "java",
      };
    }

    // Send current state to newly joined user
    const current = roomState[roomId];
    socket.emit("load-code", current.code);
    socket.emit("receive input", current.input);
    socket.emit("receive output", current.output);
    socket.emit("mode-change-receive", current.selectedLanguage);
    socket.emit("load-canvas", current.canvas);

    // Disconnect handling
    socket.on("disconnect", () => {
      console.log(`${userName} left room ${roomId}`);
      socket.to(roomId).emit("user-disconnected", userId, userName);
    });

    // Data push from another user to sync new user (optional but useful)
    socket.on("data-for-new-user", (data) => {
      roomState[roomId] = {
        ...roomState[roomId],
        ...data,
      };
      socket.emit("receive-data-for-new-user", roomState[roomId]);
    });
  });

  // ------------------- Editor Events ------------------- //
  socket.on("code change", (code) => {
    const roomId = getRoomId(socket);
    if (roomId) {
      roomState[roomId].code = code;
      socket.to(roomId).emit("receive code", code);
    }
  });

  socket.on("input change", (input) => {
    const roomId = getRoomId(socket);
    if (roomId) {
      roomState[roomId].input = input;
      socket.to(roomId).emit("receive input", input);
    }
  });

  socket.on("output change", (output) => {
    const roomId = getRoomId(socket);
    if (roomId) {
      roomState[roomId].output = output;
      socket.to(roomId).emit("receive output", output);
    }
  });

  socket.on("mode-change-send", (lang) => {
    const roomId = getRoomId(socket);
    if (roomId) {
      roomState[roomId].selectedLanguage = lang;
      socket.to(roomId).emit("mode-change-receive", lang);
    }
  });

  // ------------------- Canvas Events ------------------- //
  socket.on("canvas-update", ({ roomId, elements }) => {
    if (roomState[roomId]) {
      roomState[roomId].canvas = elements;
      socket.to(roomId).emit("canvas-update", elements);
    }
  });

  socket.on("canvas-message", ({ roomId, message, userName }) => {
    socket.to(roomId).emit("canvas-message", { message, userName });
  });
});






// Helper to get roomId for a socket
function getRoomId(socket) {
  const rooms = Array.from(socket.rooms);
  return rooms.find((r) => r !== socket.id) || null;
}

app.get("/",(req,res)=>{
  res.send("Hello from chiCoding");
})


server.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(`Server listening on port ${process.env.PORT || 3000}`);
});

