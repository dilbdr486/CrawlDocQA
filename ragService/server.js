import express from "express";
import "dotenv/config";
import { upload } from "./src/multer.js";
import { loadPDF } from "./src/splitter.js";
import { queryOrRespond } from "./src/tools.js";
import {HumanMessage} from "@langchain/core/messages"
import cors from "cors"

const app = express();
const port = process.env.PORT;
app.use(express.json());

const allowedOrigins = ["http://localhost:5173","http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    // origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);


app.post("/api/v1/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      console.error("No file uploaded.");
      return res
        .status(400)
        .send("No file uploaded. Please upload a PDF file.");
    }

    const filePath = req.file.path;
    console.log("Uploaded file path:", filePath);

    const allSplits = await loadPDF(filePath);

    res.json({
      message: "PDF uploaded and processed successfully.",
      chunks: allSplits.map((doc, i) => ({
        id: i + 1,
        content: doc.pageContent,
        metadata: doc.metadata,
      })),
    });
  } catch (error) {
    console.error("Error processing the PDF:", error);
    res.status(500).send("Error processing the PDF");
  }
});

app.post("/api/v1/query", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    console.log(`User Query: ${message}`);

    const inputs = { messages: [new HumanMessage(message)] };
    const response = await queryOrRespond(inputs);

    // Extract AI's actual text response
    const aiMessage = response.messages[0]?.content || "No response from AI";

    console.log(`AI Response: ${aiMessage}`);

    res.status(200).json({ response: aiMessage });
  } catch (error) {
    console.error("Error handling human message query:", error);
    res.status(500).json({ error: "Failed to process the query" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
