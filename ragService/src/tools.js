import vectorStore from "../src/db.js";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { model } from "../src/model.js";

const retrieve = async ({ query }) => {
  // console.log("Querying ChromaDB with:", query);
  const retrievedDocs = await vectorStore.similaritySearch(query, 20);
  // console.log("Retrieved Documents from ChromaDB:", retrievedDocs);

  const serializedDocs = retrievedDocs
    .map((doc) => `source: ${doc.metadata.source}\ncontent: ${doc.pageContent}`)
    .join("\n");

  return [serializedDocs, retrievedDocs];
};

export async function queryOrRespond(state) {
  const query = state.messages[state.messages.length - 1]?.content || "";
  // console.log("Query for ChromaDB retrieval:", query);

  const [retrievedContext] = await retrieve({ query });
  // console.log("Retrieved Context from ChromaDB:", retrievedContext);

  const systemMessageContent =
    "You are an assistant for question-answering tasks. " +
    "Use the following pieces of retrieved context to answer " +
    "the question. If you don't know the answer, say that you " +
    "cannot find the answer from ChromaDB. Use three sentences maximum " +
    "and keep the answer concise." +
    "\n\n" +
    `${retrievedContext}`;

  const conversationMessages = state.messages.filter(
    (message) =>
      message instanceof HumanMessage ||
      message instanceof SystemMessage ||
      (message instanceof AIMessage && message.tool_calls.length === 0)
  );

  const prompt = [
    new SystemMessage(systemMessageContent),
    ...conversationMessages,
  ];

  const response = await model.invoke(prompt);
  return { messages: [response] };
}

export async function generate(state) {
  let recentToolMessages = [];
  for (let i = state["messages"].length - 1; i >= 0; i--) {
    let message = state["messages"][i];
    if (message instanceof ToolMessage) {
      recentToolMessages.push(message);
    } else {
      break;
    }
  }
  let toolMessages = recentToolMessages.reverse();

  const docsContent = toolMessages.map((doc) => doc.content).join("\n");
  const systemMessageContent =
    "You are an assistant for question-answering tasks. " +
    "Use the following pieces of retrieved context to answer " +
    "the question. If you don't know the answer, say that you " +
    "if can not find the answer from chromadb then say that i don't know" +
    "don't know. Use three sentences maximum and keep the " +
    "answer concise." +
    "\n\n" +
    `${docsContent}`;

  const conversationMessages = state.messages.filter(
    (message) =>
      message instanceof HumanMessage ||
      message instanceof SystemMessage ||
      (message instanceof AIMessage && message.tool_calls.length === 0)
  );
  const prompt = [
    new SystemMessage(systemMessageContent),
    ...conversationMessages,
  ];
  const response = await model.invoke(prompt);
  return { messages: [response] };
}
