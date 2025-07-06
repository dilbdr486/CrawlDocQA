import vectorStore from "../src/db.js";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { model } from "../src/model.js";

function normalizeUserId(id) {
  return (id ?? "").toString().trim();
}

const retrieve = async ({ query, userId }) => {
  let filter = undefined;
  if (userId) {
    filter = {
      operator: "Equal",
      path: ["userId"],
      valueText: userId,
    };
  }
  const retrievedDocs = await vectorStore.similaritySearch(query, 20, filter);
  console.log(
    "Retrieved docs metadata:",
    retrievedDocs.map((doc) => doc.metadata)
  );
  // Detailed comparison log
  retrievedDocs.forEach((doc) => {
    console.log(
      "[UserId Compare] doc.metadata.userId:",
      doc.metadata.userId,
      "| userId:",
      userId,
      "| equal:",
      normalizeUserId(doc.metadata.userId) === normalizeUserId(userId)
    );
  });
  // Robust comparison
  const mismatched = retrievedDocs.find(
    (doc) => normalizeUserId(doc.metadata.userId) !== normalizeUserId(userId)
  );
  if (mismatched) {
    throw new Error(
      `Unauthorized access: Document with userId ${mismatched.metadata.userId} does not match requested userId ${userId}`
    );
  }
  const serializedDocs = retrievedDocs
    .map((doc) => `source: ${doc.metadata.source}\ncontent: ${doc.pageContent}`)
    .join("\n");
  return [serializedDocs, retrievedDocs];
};

export async function queryOrRespond(state, userId) {
  const query = state.messages[state.messages.length - 1]?.content || "";
  // console.log("Query for ChromaDB retrieval:", query);

  const [retrievedContext] = await retrieve({ query, userId });
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
