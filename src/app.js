import express from "express";
import dotenv from "dotenv";

import { askAI } from "./chat.js";
import { ingestDocument } from "./ingest.js";

import { createSession } from "./chatSession.js";

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

  if (!content) {
    return res.status(400).json({
      error: "content is required",
    });
  }

  await ingestDocument(content);

  res.json({
    success: true,
  });
});

app.post("/chat", async (
    req,
    res
  ) => {

    const {
      sessionId,
      message
    } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        error: "sessionId and message are required",
      });
    }

    const answer =
      await askAI(
        sessionId,
        message
      );

    res.json({
      answer
    });
});

async function createSessionHandler(req, res) {
  try {

    const sessionId =
      await createSession();

    res.json({
      sessionId
    });

  } catch (error) {

    console.error(
      "Create Session Error:",
      error.message
    );

    res.status(500).json({
      error: "Could not create chat session",
    });
  }
}

app.post(
  "/sessions",
  createSessionHandler
);

app.post(
  "/session",
  createSessionHandler
);

const PORT = 3000;
const HOST = "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(
    `Server running on http://${HOST}:${PORT}`
  );
});
