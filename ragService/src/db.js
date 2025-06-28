import { embeddingModel } from "../src/emddingModel.js";
import { WeaviateStore } from "@langchain/weaviate";
import "dotenv/config";
import weaviate from "weaviate-ts-client"

const client = weaviate.client({
    scheme: process.env.WEAVIATE_SCHEME,    
    host: process.env.WEAVIATE_HOST
});

// Set up the vector store with Weaviate
const vectorStore = new WeaviateStore(embeddingModel, {
  client,
  indexName: "Langchainjs_test",
  textKey: "text",
  metadataKeys: ["source"],
});

export default vectorStore;