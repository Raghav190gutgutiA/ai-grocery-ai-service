const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const { HumanMessage } = require("@langchain/core/messages");

const groceryAgent = require("../agent/groceryAgent");

async function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    path: "/api/socket/socket.io/",
    cors: {
      origin: true,
	  credentials: true,
	}
  });

  io.use((socket, next) => {
    const cookies = socket.handshake.headers?.cookie;

    const { token } = cookies
      ? cookie.parse(cookies)
      : {};

    if (!token) {
      return next(
        new Error("Token not provided")
      );
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      socket.user = decoded;
      socket.token = token;

      next();
    } catch (err) {
		console.log("error",err);
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(
      "Connected User:",
      socket.user
    );

    socket.on("generate-recipe", async (query) => {
  try {
    if (!query) {
      return socket.emit("recipe-error", {
        success: false,
        message: "Query is required",
      });
    }

    socket.emit("recipe-status", {
      step: "GENERATING_RECIPE",
      message: "🍳 Generating recipe...",
    });

    const resultPromise = groceryAgent.invoke({
      messages: [new HumanMessage(query)],
    });

    await new Promise((resolve) =>
      setTimeout(resolve, 1500)
    );

    socket.emit("recipe-status", {
      step: "ALIGNING_PRODUCTS",
      message: "🛒 Aligning products...",
    });

    const result = await resultPromise;

    socket.emit("recipe-status", {
      step: "FINALIZING",
      message: "✨ Finalizing response...",
    });

    const response =
      result.messages[result.messages.length - 1];
    console.log("raghav",response.content)
    socket.emit("recipe-complete", {
      success: true,
      data: JSON.parse(response.content),
    });
  } catch (error) {
    console.error(error);

    socket.emit("recipe-error", {
      success: false,
      message: "Failed to generate recipe",
    });
  }
});
    socket.on(
      "disconnect",
      () => {
        console.log(
          "User disconnected"
        );
      }
    );
  });
}

module.exports = { initSocketServer };