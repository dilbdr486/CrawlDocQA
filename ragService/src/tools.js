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

  // Check if the query is a greeting
  const greetingPattern =
    /^(hi|hello|hey|good morning|good afternoon|good evening|greetings|sup|yo|what's up|howdy|hi there|hello there|hey there)\s*$/i;
  const isGreeting = greetingPattern.test(query.trim());

  let retrievedContext = "";

  // Only retrieve documents if it's not a greeting
  if (!isGreeting) {
    const [context] = await retrieve({ query, userId });
    retrievedContext = context;
  }

  const systemMessageContent =
    "You are a helpful AI assistant for question-answering tasks. " +
    "Follow these guidelines:\n" +
    "1. If the user ONLY greets you (just 'hi', 'hello', 'hey' without any question), respond warmly and ask how you can help them.\n" +
    "2. If the user asks a question (even if it contains greeting words), provide an answer based on the retrieved context.\n" +
    "3. For questions, use the retrieved context to provide accurate answers.\n" +
    "4. If the context doesn't contain relevant information, say 'I don't have enough information to answer that question based on the available documents.'\n" +
    "5. Keep responses concise but informative (2-4 sentences).\n" +
    "6. If the user asks for information in bullet points, use bullet points.\n" +
    "7. If the user asks for information in number, numbered list, or similar, ALWAYS format your response as a numbered list in the following style: Each number should have a bold heading (e.g., **Heading:**) followed by a description. If there are technical terms or branch names, format them as inline code (e.g., `dev`). Example: 1. **Merge Completed:** Merged all pending feature branches into the `dev` branch after review.\n" +
    "8. Do not use bullet points or paragraphs if the user requests a numbered list; always use numbers in that case.\n" +
    "9. Consider the conversation history to provide contextual and relevant responses.\n" +
    "10. Always be helpful and professional.\n\n" +
    `${retrievedContext ? `Retrieved Context:\n${retrievedContext}` : ""}`;

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
    "You are a helpful AI assistant for question-answering tasks. " +
    "Follow these guidelines:\n" +
    "1. If the user ONLY greets you (just 'hi', 'hello', 'hey' without any question), respond warmly and ask how you can help them.\n" +
    "2. If the user asks a question (even if it contains greeting words), provide an answer based on the retrieved context.\n" +
    "3. For questions, use the retrieved context to provide accurate answers.\n" +
    "4. If the context doesn't contain relevant information, say 'I don't have enough information to answer that question based on the available documents.'\n" +
    "5. Keep responses concise but informative (2-4 sentences).\n" +
    "6. If the user asks for information in bullet points, use bullet points.\n" +
    "7. If the user asks for information in number, numbered list, or similar, ALWAYS format your response as a numbered list in the following style: Each number should have a bold heading (e.g., **Heading:**) followed by a description. If there are technical terms or branch names, format them as inline code (e.g., `dev`). Example: 1. **Merge Completed:** Merged all pending feature branches into the `dev` branch after review.\n" +
    "8. Do not use bullet points or paragraphs if the user requests a numbered list; always use numbers in that case.\n" +
    "9. Consider the conversation history to provide contextual and relevant responses.\n" +
    "10. Always be helpful and professional.\n\n" +
    `Retrieved Context:\n${docsContent}`;

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
