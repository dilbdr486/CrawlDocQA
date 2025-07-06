import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["user", "ai", "error", "pdf", "url"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      default: "",
    },
    url: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      default: "New Chat",
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    messages: [messageSchema],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
conversationSchema.index({ userId: 1, timestamp: -1 });

export const conversationModel = mongoose.model(
  "Conversation",
  conversationSchema
);
