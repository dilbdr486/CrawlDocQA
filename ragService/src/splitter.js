import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { createWorker } from "tesseract.js";
import pdfPoppler from "pdf-poppler";
import vectorStore from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const convertPdfToImages = async (pdfPath, outputDir) => {
  const options = {
    format: "png",
    out_dir: outputDir,
    out_prefix: "page",
    page: null,
  };
  await pdfPoppler.convert(pdfPath, options);
};

const getSortedImageFiles = (dir) => {
  return fsSync
    .readdirSync(dir)
    .filter((file) => /\.(png|jpg|jpeg)$/i.test(file))
    .sort()
    .map((file) => path.join(dir, file));
};

const deleteFiles = async (filePaths) => {
  for (const filePath of filePaths) {
    await fs
      .unlink(filePath)
      .catch((err) =>
        console.warn(`⚠️ Failed to delete ${filePath}:`, err.message)
      );
  }
};

const isPDF = (filePath) => path.extname(filePath).toLowerCase() === ".pdf";

export const loadPDF = async (filePath) => {
  let docs = [];

  // If the file is a PDF
  if (isPDF(filePath)) {
    // For PDFs, use PDFLoader to extract text or convert to images
    const loader = new PDFLoader(filePath);
    docs = await loader.load();
  } else if (/\.(png|jpg|jpeg)$/i.test(filePath)) {
    // For image files, directly use OCR
    console.warn("⚠️ Image file detected. Using OCR...");

    const worker = await createWorker("eng");
    const { data: { text } } = await worker.recognize(filePath);
    console.log(`✅ OCR Processed: ${path.basename(filePath)}`);
    await worker.terminate();

    docs = [{ pageContent: text, metadata: { source: "ocr" } }];
  }

  // If no text is found (PDF or image with no recognizable text), fall back to OCR
  const isEmpty = docs.every((doc) => !doc.pageContent.trim());
  if (isEmpty && isPDF(filePath)) {
    console.warn("⚠️ No extractable text found in PDF. Falling back to OCR...");

    const outputDir = path.join(__dirname, "upload");
    if (!(await fs.stat(outputDir).catch(() => false))) {
      await fs.mkdir(outputDir);
    }

    await convertPdfToImages(filePath, outputDir);
    const imagePaths = getSortedImageFiles(outputDir);

    let fullText = "";
    const worker = await createWorker("eng");

    for (const imagePath of imagePaths) {
      const { data: { text } } = await worker.recognize(imagePath);
      console.log(`✅ OCR Processed: ${path.basename(imagePath)}`);
      fullText += text + "\n";
    }

    await worker.terminate();
    await deleteFiles(imagePaths);

    docs = [{ pageContent: fullText, metadata: { source: "ocr" } }];
  }

  // Split documents into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  const allSplits = await splitter.splitDocuments(docs);
  await vectorStore.addDocuments(allSplits);

  // Delete the PDF file if it was processed
  await fs.unlink(filePath).catch((err) => {
    console.warn(`⚠️ Failed to delete PDF file: ${filePath}`, err.message);
  });

  return allSplits;
};
