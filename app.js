import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import { PDFParse } from "pdf-parse";

import { askAI } from "./src/services/chat.js";
import {
  ingestDocument,
  replaceDocumentContent,
} from "./src/services/ingest.js";
import { supabase } from "./src/database/supabase.js";
import { loadSchema } from "./src/services/schemaService.js";
import { createProject } from "./src/services/createProjectService.js";

import {
  createSession,
  getSessionMessages,
  listSessions,
} from "./src/services/chatSession.js";

// import projectRoutes from "./src/routes/project.routes.js";


//NEW RESTRUCTURED
import authRoutes from './src/modules/auth/auth.route.js';
import userRoutes from './src/modules/user/user.route.js';
import projectRoutes from './src/modules/project/project.route.js';
import projectUserRoutes from './src/modules/projectUser/projectUser.route.js';
import toolRoutes from './src/modules/tool/tool.route.js';
//END OF NEW RESTRUCTURED

import { db } from "./src/database/db.js";
db.testConnection();

dotenv.config({ path: './config/.env' });

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

app.use(express.json());
app.use(express.static("public"));
app.use(express.static("views"));

app.get("/", (req, res) => {
  res.sendFile("index.html", {
    root: "views",
  });
});

//NEW ROUTES
app.use(
    '/api/auth',
    authRoutes
);

app.use(
    '/api/user',
    userRoutes
);

app.use(
    '/api/project',
    projectRoutes
);

app.use(
    '/api/project_user',
    projectUserRoutes
);

app.use(
    '/api/tool',
    toolRoutes
);
//END OF NEW ROUTES

// app.use("/projects", projectRoutes);

app.post("/ingest", async (req, res) => {
  try {
    const { content, title } = req.body;

    if (!content) {
      return res.status(400).json({
        error: "content is required",
      });
    }

    const document =
      await ingestDocument(
        content,
        title
      );

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error(
      "Ingest Error:",
      error.message
    );

    res.status(500).json({
      error: "Could not ingest knowledge",
    });
  }
});

app.post("/ingest/document", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "document is required",
      });
    }

    const content =
      await extractDocumentText(req.file);

    if (!content.trim()) {
      return res.status(400).json({
        error: "No text could be extracted from this document",
      });
    }

    const document =
      await ingestDocument(
        content,
        req.file.originalname
      );

    res.json({
      success: true,
      filename: req.file.originalname,
      document,
    });
  } catch (error) {
    console.error(
      "Document Ingest Error:",
      error.message
    );

    res.status(500).json({
      error: error.message || "Could not ingest document",
    });
  }
});

async function extractDocumentText(file) {
  const filename =
    file.originalname.toLowerCase();

  if (
    file.mimetype === "application/pdf" ||
    filename.endsWith(".pdf")
  ) {
    const parser =
      new PDFParse({
        data: file.buffer,
      });

    try {
      const result =
        await parser.getText();

      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (
    file.mimetype === "text/plain" ||
    filename.endsWith(".txt") ||
    filename.endsWith(".md")
  ) {
    return file.buffer.toString("utf8");
  }

  throw new Error("Unsupported document type. Upload a PDF, TXT, or MD file.");
}

app.get("/knowledge", async (req, res) => {
  try {
    const { data, error } =
      await supabase
        .from("knowledge_documents")
        .select(`
          id,
          title,
          created_at,
          document_chunks (
            content,
            chunk_index
          )
        `)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      throw error;
    }

    const documents =
      (data ?? []).map((document) => {
        const chunks =
          [...(document.document_chunks ?? [])]
            .sort((a, b) => a.chunk_index - b.chunk_index);

        return {
          id: document.id,
          title: document.title,
          created_at: document.created_at,
          chunk_count: chunks.length,
          preview: chunks[0]?.content ?? "",
        };
      });

    res.json({
      documents,
    });
  } catch (error) {
    console.error(
      "List Knowledge Error:",
      error.message
    );

    res.status(500).json({
      error: "Could not load knowledge documents",
    });
  }
});

app.get("/knowledge/:documentId", async (req, res) => {
  try {
    const document =
      await getKnowledgeDocument(
        req.params.documentId
      );

    res.json({
      document,
    });
  } catch (error) {
    console.error(
      "Get Knowledge Error:",
      error.message
    );

    res.status(500).json({
      error: "Could not load knowledge document",
    });
  }
});

app.put("/knowledge/:documentId", async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title && content === undefined) {
      return res.status(400).json({
        error: "title or content is required",
      });
    }

    if (content !== undefined && !String(content).trim()) {
      return res.status(400).json({
        error: "content is required",
      });
    }

    const document =
      await replaceDocumentContent(
        req.params.documentId,
        {
          title,
          content,
        }
      );

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error(
      "Update Knowledge Error:",
      error.message
    );

    res.status(500).json({
      error: "Could not update knowledge document",
    });
  }
});

app.delete("/knowledge/:documentId", async (req, res) => {
  try {
    const { error: chunksError } =
      await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", req.params.documentId);

    if (chunksError) {
      throw chunksError;
    }

    const { error: documentError } =
      await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", req.params.documentId);

    if (documentError) {
      throw documentError;
    }

    res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Delete Knowledge Error:",
      error.message
    );

    res.status(500).json({
      error: "Could not delete knowledge document",
    });
  }
});

async function getKnowledgeDocument(documentId) {
  const { data, error } =
    await supabase
      .from("knowledge_documents")
      .select(`
        id,
        title,
        created_at,
        document_chunks (
          content,
          chunk_index
        )
      `)
      .eq("id", documentId)
      .single();

  if (error) {
    throw error;
  }

  const chunks =
    [...(data.document_chunks ?? [])]
      .sort((a, b) => a.chunk_index - b.chunk_index);

  return {
    id: data.id,
    title: data.title,
    created_at: data.created_at,
    chunk_count: chunks.length,
    content: joinChunkContent(chunks),
  };
}

function joinChunkContent(chunks) {
  let content = "";

  for (const chunk of chunks) {
    if (!content) {
      content = chunk.content;
      continue;
    }

    const overlap =
      findOverlapLength(
        content,
        chunk.content
      );

    content += chunk.content.slice(overlap);
  }

  return content;
}

function findOverlapLength(left, right) {
  const maxOverlap =
    Math.min(
      220,
      left.length,
      right.length
    );

  for (let size = maxOverlap; size > 0; size -= 1) {
    if (left.endsWith(right.slice(0, size))) {
      return size;
    }
  }

  return 0;
}

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

app.get("/sessions", async (req, res) => {
  try {
    const sessions =
      await listSessions();

    res.json({
      sessions,
    });
  } catch (error) {
    console.error(
      "List Sessions Error:",
      error.message
    );

    res.status(500).json({
      error: "Could not load chat sessions",
    });
  }
});

app.get("/sessions/:sessionId/messages", async (req, res) => {
  try {
    const messages =
      await getSessionMessages(req.params.sessionId);

    res.json({
      messages,
    });
  } catch (error) {
    console.error(
      "Load Messages Error:",
      error.message
    );

    res.status(500).json({
      error: "Could not load chat messages",
    });
  }
});

app.post(
  "/session",
  createSessionHandler
);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      error: error.code === "LIMIT_FILE_SIZE"
        ? "Document must be 10 MB or smaller"
        : "Could not upload document",
    });
  }

  next(error);
});

const PORT = 3000;
const HOST = "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(
    `Server running on http://${HOST}:${PORT}`
  );

  loadSchema()
    .then(() => {
      console.log("Schema service loaded");
    })
    .catch((error) => {
      console.error(
        "Schema service failed to load:",
        error.message
      );
    });
});
