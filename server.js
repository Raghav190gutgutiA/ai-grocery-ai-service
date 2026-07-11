require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");

const aiRoutes = require("./routes/ai.routes");
const {
  initSocketServer,
} = require("./socket/socket.server");

const app = express();
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message:
      "AI Grocery Service Running 🚀",
  });
});

app.use("/api/ai", aiRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message:
      "Internal Server Error",
  });
});

const httpServer =
  http.createServer(app);

initSocketServer(httpServer);

const PORT =
  process.env.PORT || 5010;

httpServer.listen(PORT, () => {
  console.log(
    `🚀 AI Service running on port ${PORT}`
  );
});