import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { createWorker } from "tesseract.js";
import pdfPoppler from "pdf-poppler";
import axios from "axios";
import { load } from "cheerio";
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
    const {
      data: { text },
    } = await worker.recognize(filePath);
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
      const {
        data: { text },
      } = await worker.recognize(imagePath);
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

// Function to extract links from a webpage
async function extractLinksFromHomePage(url) {
  try {
    const response = await axios.get(url);
    const $ = load(response.data);
    const links = [];
    $("li a").each((_, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim();
      if (href && !href.startsWith("#")) {
        links.push({ text, href: new URL(href, url).href });
      }
    });
    return links.slice(0, 10); // Limit to 10 links
  } catch (error) {
    throw new Error(`Failed to extract links from ${url}: ${error.message}`);
  }
}

export async function processAndStoreWebContent(url) {
  try {
    console.log(`Fetching all content from: ${url}`);
    const links = await extractLinksFromHomePage(url);
    const allStoredDocs = [];
    for (const { href } of links) {
      console.log(`Processing content from link: ${href}`);
      const selector =
        "p, li, a, span, h1, h2, h3, h4, h5, h6, ul, ol, form, div, section, article, footer, header, aside, *";
      const cheerioLoader = new CheerioWebBaseLoader(href, { selector });
      const docs = await cheerioLoader.load();

      if (docs.length === 0) {
        console.error(`No content found on the page: ${href}`);
        continue;
      }

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      console.log("Splitting content into manageable chunks...");
      const splitDocs = await textSplitter.splitDocuments(docs);
      console.log(`Generated ${splitDocs.length} document chunks.`);

      // Count the number of tags and extract text
      const tagCounts = {};
      docs.forEach((doc) => {
        const content = doc.pageContent || "";
        const matches = content.match(/<\s*\/?\s*([a-zA-Z0-9]+)[^>]*>/g) || [];
        matches.forEach((tag) => {
          const tagName = tag.replace(/<\/?|\/?>/g, "").split(" ")[0];
          tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
        });
      });

      console.log("Tag Counts:", tagCounts);

      await vectorStore.addDocuments(splitDocs);
      console.log(`Documents from ${href} stored in ChromaDB.`);
      allStoredDocs.push(...splitDocs);
    }

    return allStoredDocs;
  } catch (error) {
    console.error("Error processing and storing web content:", error);
    throw error;
  }
}
