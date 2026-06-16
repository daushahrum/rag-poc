import express from "express";
import dotenv from "dotenv";

import authRoutes from "./src/modules/auth/auth.route.js";
import userRoutes from "./src/modules/user/user.route.js";
import projectRoutes from "./src/modules/project/project.route.js";
import chatRoutes from "./src/modules/chat/chat.route.js";
import toolRoutes from "./src/modules/tool/tool.route.js";
import documentChunkRoutes from "./src/modules/knowledge/documentChunk/documentChunk.route.js";
import knowledgeDocumentRoutes from "./src/modules/knowledge/knowledgeDocument/knowledgeDocument.route.js";
import ragRoutes from "./src/modules/rag/rag.route.js";

import { db } from "./src/database/db.js";

dotenv.config({ path: "./config/.env" });
db.testConnection();

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(express.static("views"));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "views" });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/tool", toolRoutes);
app.use("/api/documentChunk", documentChunkRoutes);
app.use("/api/knowledge_document", knowledgeDocumentRoutes);
app.use("/api/rag", ragRoutes);

const PORT = 3000;
const HOST = "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
