require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");



const connectDB = require("./config/db");
const User = require("./models/User");
const Message = require("./models/Message");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messages");

const app = express();
const server = http.createServer(app);

const clientUrl =
  process.env.CLIENT_URL || "http://localhost:5173";


app.use(cors({ origin: clientUrl }));
app.use(express.json({ limit: "20kb" }));


app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Chat Application Assessment",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST"],
  },
});

const onlineUsers = new Map();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    socket.userId = String(payload.userId);

    next();
  } catch (error) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = String(socket.userId);

  onlineUsers.set(userId, socket.id);

  io.emit("online_users", Array.from(onlineUsers.keys()));

  console.log("User connected:", userId);


  socket.on("send_message", async (payload, callback) => {
    try {
      const receiverId = String(payload?.receiverId || "");
      const text = String(payload?.text || "").trim();

      if (
        !text ||
        text.length > 3000 ||
        !/^[a-f\d]{24}$/i.test(receiverId)
      ) {
        if (typeof callback === "function") {
          callback({
            ok: false,
            message: "Enter a valid message and recipient.",
          });
        }

        return;
      }

      const receiverExists = await User.exists({
        _id: receiverId,
      });

      if (receiverId === userId || !receiverExists) {
        if (typeof callback === "function") {
          callback({
            ok: false,
            message: "Recipient not found.",
          });
        }

        return;
      }

      const message = await Message.create({
        sender: userId,
        receiver: receiverId,
        text: text,
      });

      const result = message.toObject();

    
      socket.emit("receive_message", result);

   
      const receiverSocket = onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit("receive_message", result);
      }

      if (typeof callback === "function") {
        callback({
          ok: true,
          message: result,
        });
      }

      console.log("Message sent:", message._id);
    } catch (error) {
      console.error("Message error:", error.message);

      if (typeof callback === "function") {
        callback({
          ok: false,
          message: "Message could not be sent.",
        });
      }
    }
  });


  socket.on("disconnect", () => {
    if (onlineUsers.get(userId) === socket.id) {
      onlineUsers.delete(userId);
    }

    io.emit("online_users", Array.from(onlineUsers.keys()));

    console.log("User disconnected:", userId);
  });
});

const port = Number(process.env.PORT) || 8000;

async function startServer() {
  try {
    await connectDB();

    server.listen(port, () => {
      console.log(
        `Chat API running on http://localhost:${port}`
      );
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();