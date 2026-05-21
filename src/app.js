import express from "express";
import dotenv from "dotenv";

import { askAI } from "./chat.js";
import { ingestDocument } from "./ingest.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile("index.html", {
    root: "public",
  });
});

app.post("/ingest", async (req, res) => {

  const { content } = req.body;

  await ingestDocument(content);

  res.json({
    success: true,
  });
});

app.post("/chat", async (req, res) => {

  const { message } = req.body;

  const response =
    await askAI(message);

  res.json(response);
});

const PORT = 3000;
const HOST = "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(
    `Server running on http://${HOST}:${PORT}`
  );
});
