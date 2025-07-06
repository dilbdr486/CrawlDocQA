import express from "express";
import {
  saveConversation,
  getConversations,
  getConversation,
  deleteConversation,
  updateConversationTitle,
  addMessage,
} from "../controllers/chatController.js";
import { verifyJWT } from "../middlewares/auth.js";

const chatRoute = express.Router();

// All chat routes require authentication
chatRoute.use(verifyJWT);

// Save or update a conversation
chatRoute.route("/save").post(saveConversation);

// Get all conversations for the authenticated user
chatRoute.route("/conversations").get(getConversations);

// Get a specific conversation
chatRoute.route("/conversation/:id").get(getConversation);

// Delete a conversation
chatRoute.route("/conversation/:id").delete(deleteConversation);

// Update conversation title
chatRoute.route("/conversation/:id/title").patch(updateConversationTitle);

// Add a message to a conversation
chatRoute.route("/conversation/:id/message").post(addMessage);

export default chatRoute;
