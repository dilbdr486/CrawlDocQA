import express from "express";
import "dotenv/config";
import { upload } from "./src/multer.js";
import { loadPDF, processAndStoreWebContent } from "./src/splitter.js";
import { queryOrRespond } from "./src/tools.js";
import { HumanMessage } from "@langchain/core/messages";
import cors from "cors";
import weaviate from "weaviate-ts-client";

const app = express();
const port = process.env.PORT;
app.use(express.json());

const allowedOrigins = ["http://localhost:5173", "http://localhost:3000"];

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
    const userId = req.body.userId || req.query.userId;
    console.log("Uploaded file path:", filePath);
    const allSplits = await loadPDF(filePath, userId);
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

app.post("/api/load-data", async (req, res) => {
  const { url, userId } = req.body;
  if (!url || !userId) {
    return res.status(400).json({ error: "URL and userId are required" });
  }
  try {
    console.log(`Processing and storing web content from ${url}...`);
    const storedData = await processAndStoreWebContent(url, userId);
    console.log("Stored Data:", storedData);
    res.status(200).json({
      message: "Data successfully loaded into WeaviateDB",
      storedData,
      tagCounts: storedData.tagCounts,
    });
  } catch (error) {
    console.error("Error processing and storing web content:", error);
    res.status(500).json({ error: "Failed to load data into ChromaDB" });
  }
});

app.post("/api/v1/query", async (req, res) => {
  const { message, userId } = req.body;
  if (!message || !userId) {
    return res.status(400).json({ error: "Message and userId are required" });
  }
  try {
    console.log(`User Query: ${message}`);
    const inputs = { messages: [new HumanMessage(message)] };
    const response = await queryOrRespond(inputs, userId);
    const aiMessage = response.messages[0]?.content || "No response from AI";
    console.log(`AI Response: ${aiMessage}`);
    res.status(200).json({ response: aiMessage });
  } catch (error) {
    console.error("Error handling human message query:", error);
    res.status(500).json({ error: "Failed to process the query" });
  }
});

// Clear all data from Weaviate vector DB (dangerous, admin only!)
app.post("/api/clear-vectordb", async (req, res) => {
  try {
    const client = weaviate.client({
      scheme: process.env.WEAVIATE_SCHEME,
      host: process.env.WEAVIATE_HOST,
    });
    // Delete all objects in the class
    await client.schema.classDeleter().withClassName("Langchainjs_test").do();
    res.status(200).json({ message: "All vector DB data cleared." });
  } catch (error) {
    console.error("Error clearing vector DB:", error);
    res.status(500).json({ error: "Failed to clear vector DB." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
