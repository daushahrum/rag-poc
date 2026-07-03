import express from "express";
import dotenv from "dotenv";

import authRoutes from "./src/modules/auth/auth.route.js";
import userRoutes from "./src/modules/user/user.route.js";
import projectRoutes from "./src/modules/project/project.route.js";
import appRoutes from "./src/modules/apps/app.route.js";
import chatRoutes from "./src/modules/chat/chat.route.js";
import chatSessionRoutes from "./src/modules/chat/chatSession/chatSession.route.js";
import chatMessageRoutes from "./src/modules/chat/chatMessages/chatMessage.route.js";
import chatResponseAuditRoutes from "./src/modules/chat/chatResponseAudits/chatResponseAudit.route.js";
import toolRoutes from "./src/modules/tool/tool.route.js";
import documentChunkRoutes from "./src/modules/knowledge/documentChunk/documentChunk.route.js";
import knowledgeDocumentRoutes from "./src/modules/knowledge/knowledgeDocument/knowledgeDocument.route.js";
import ragRoutes from "./src/modules/rag/rag.route.js";
import jiraRoutes from "./src/modules/jira/jira.route.js";

import * as chatSessionController from "./src/modules/chat/chatSession/chatSession.controller.js";
import * as chatMessageController from "./src/modules/chat/chatMessages/chatMessage.controller.js";
import * as chatController from "./src/modules/chat/chat.controller.js";
import * as knowledgeDocumentController from "./src/modules/knowledge/knowledgeDocument/knowledgeDocument.controller.js";
import * as projectController from "./src/modules/project/project.controller.js";

import * as auth from "./src/middleware/authenticate.js";

import { db } from "./src/database/db.js";

dotenv.config({ path: "./config/.env" });
db.testConnection();
try {
  await db.ensureChatMessageConfidenceColumns();
  await db.ensureProjectTopicProjectIdColumn();
  await db.ensureJiraConnectionsTable();
} catch (error) {
  console.error("Unable to ensure database compatibility columns:", error);
}

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(express.static("views"));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "views" });
});

app.get("/login", (req, res) => {
  res.sendFile("login.html", { root: "views" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/apps", appRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/chat/sessions", chatSessionRoutes);
app.use("/api/chat/messages", chatMessageRoutes);
app.use("/api/chat/response-audits", chatResponseAuditRoutes);
app.use("/api/tool", toolRoutes);
app.use("/api/documentChunk", documentChunkRoutes);
app.use("/api/knowledge_document", knowledgeDocumentRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/jira", jiraRoutes);

// Legacy UI endpoints - forward to new API routes
app.post("/sessions", auth.authenticate, chatSessionController.createChatSession);
app.get("/sessions", auth.authenticate, chatSessionController.listChatSession);
app.get("/sessions/:id", auth.authenticate, chatSessionController.getChatSession);
app.get("/sessions/:id/messages", auth.authenticate, async (req, res, next) => {
  req.query = { session_id: req.params.id };
  return chatMessageController.listChatMessage(req, res);
});

// Chat endpoint - use portal/send for authenticated users
app.post("/chat", auth.authenticate, async (req, res) => {
  const TAG = '[auth.authenticate]';
  const { sessionId, message } = req.body;
  req.body = {
    session_id: sessionId,
    message: message
  };
  // console.log(TAG, 'body: ', body)
  // Set routeSource to indicate this is from portal (authenticated user)
  req.routeSource = 'portal';
  return chatController.sendMessage(req, res);
});

app.post("/ingest", auth.authenticate, async (req, res) => {
  return knowledgeDocumentController.createKnowledgeDocument(req, res);
});
app.post("/ingest/document", auth.authenticate, async (req, res) => {
  return knowledgeDocumentController.createKnowledgeDocument(req, res);
});
app.get("/knowledge", auth.authenticate, knowledgeDocumentController.listKnowledgeDocument);
app.get("/knowledge/:id", auth.authenticate, knowledgeDocumentController.getKnowledgeDocument);
app.put("/knowledge/:id", auth.authenticate, async (req, res) => {
  return knowledgeDocumentController.updateKnowledgeDocument(req, res);
});
app.delete("/knowledge/:id", auth.authenticate, async (req, res) => {
  return knowledgeDocumentController.deleteKnowledgeDocument(req, res);
});

app.post("/projects", auth.authenticate, projectController.createProject);
app.get("/projects", auth.authenticate, projectController.listProject);

const PORT = 3000;
const HOST = "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
