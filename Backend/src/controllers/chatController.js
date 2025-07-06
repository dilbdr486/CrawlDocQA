import { conversationModel } from "../models/chatModel.js";
import { asyncHandler } from "../utils/acyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

// Save or update a conversation
const saveConversation = asyncHandler(async (req, res) => {
  const { id, title, messages } = req.body;
  const userId = req.user._id;

  if (!id || !messages) {
    throw new ApiError(400, "Conversation ID and messages are required");
  }

  // Check if conversation exists
  let conversation = await conversationModel.findOne({ id, userId });

  if (conversation) {
    // Update existing conversation
    conversation.title = title || conversation.title;
    conversation.messages = messages;
    conversation.timestamp = new Date();
    await conversation.save();
  } else {
    // Create new conversation
    conversation = await conversationModel.create({
      id,
      title: title || "New Chat",
      messages,
      userId,
      timestamp: new Date(),
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, conversation, "Conversation saved successfully")
    );
});

// Get all conversations for a user
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const conversations = await conversationModel
    .find({ userId })
    .sort({ timestamp: -1 })
    .select("-__v");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        conversations,
        "Conversations retrieved successfully"
      )
    );
});

// Get a specific conversation
const getConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const conversation = await conversationModel.findOne({ id, userId });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, conversation, "Conversation retrieved successfully")
    );
});

// Delete a conversation
const deleteConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const conversation = await conversationModel.findOneAndDelete({ id, userId });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Conversation deleted successfully"));
});

// Update conversation title
const updateConversationTitle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const userId = req.user._id;

  if (!title) {
    throw new ApiError(400, "Title is required");
  }

  const conversation = await conversationModel.findOneAndUpdate(
    { id, userId },
    { title },
    { new: true }
  );

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        conversation,
        "Conversation title updated successfully"
      )
    );
});

// Add a message to a conversation
const addMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const userId = req.user._id;

  if (!message) {
    throw new ApiError(400, "Message is required");
  }

  const conversation = await conversationModel.findOne({ id, userId });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  conversation.messages.push(message);
  await conversation.save();

  return res
    .status(200)
    .json(new ApiResponse(200, conversation, "Message added successfully"));
});

export {
  saveConversation,
  getConversations,
  getConversation,
  deleteConversation,
  updateConversationTitle,
  addMessage,
};
