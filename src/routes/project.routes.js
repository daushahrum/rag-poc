import express from "express";
import { createProject } from "../services/createProjectService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "name is required",
      });
    }

    if (!code) {
      return res.status(400).json({
        error: "code is required",
      });
    }

    const project = await createProject({
      name,
      code,
    });

    res.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error(
      "Create Project Error:",
      error.message
    );

    res.status(500).json({
      error: "Could not create project",
    });
  }
});

export default router;