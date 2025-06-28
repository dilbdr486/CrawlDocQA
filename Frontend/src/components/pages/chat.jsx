import { useContext, useEffect, useState, useRef } from "react";
import { FiPaperclip } from "react-icons/fi";
import { IoMdSend } from "react-icons/io";
import { appContext } from "../../store/storeContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Improved helpers at the top-level, before the Chat component
function isGenericAIResponse(aiText) {
  const genericPhrases = [
    "I cannot answer this question",
    "I'm sorry",
    "I don't know",
    "there is no context",
    "I do not have enough information",
    "Sorry",
    "As an AI language model",
  ];
  return genericPhrases.some((phrase) =>
    aiText.toLowerCase().includes(phrase.toLowerCase())
  );
}

function generateShortTitle(text, fallback) {
  const stopwords = [
    "the",
    "is",
    "a",
    "an",
    "of",
    "and",
    "to",
    "in",
    "on",
    "for",
    "with",
    "as",
    "by",
    "at",
    "from",
    "that",
    "this",
    "it",
    "be",
    "are",
    "was",
    "were",
    "has",
    "have",
    "had",
  ];
  const words = text
    .replace(/[.,!?\-]/g, "")
    .split(/\s+/)
    .filter((word) => word && !stopwords.includes(word.toLowerCase()));
  const titleWords = words.slice(0, 3);
  if (titleWords.length === 0 && fallback) {
    return generateShortTitle(fallback);
  }
  return titleWords
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const Chat = () => {
  const { getAuth, getUserData, userData, logout, backendUrl, ragServiceUrl } =
    useContext(appContext);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const init = async () => {
      await getAuth();
      await getUserData();

      // Load from localStorage
      const data = localStorage.getItem("chat_conversations");
      if (data) {
        try {
          const parsed = JSON.parse(data);
          const now = Date.now();
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          const freshConvs = (parsed.conversations || []).filter((conv) => {
            return now - new Date(conv.timestamp).getTime() < sevenDays;
          });
          console.log("Loaded from localStorage, after filtering:", freshConvs);
          setConversations(freshConvs);
          if (freshConvs.length > 0) {
            setCurrentConversationId(freshConvs[0].id);
            setMessages(freshConvs[0].messages);
          }
        } catch (e) {
          localStorage.removeItem("chat_conversations");
        }
      }

      setLoading(false);
    };
    init();
  }, []);

  // Save conversations to localStorage on every change
  useEffect(() => {
    const data = {
      conversations,
      savedAt: Date.now(),
    };
    console.log("Saving to localStorage:", conversations);
    localStorage.setItem("chat_conversations", JSON.stringify(data));
  }, [conversations]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create new conversation
  const createNewConversation = () => {
    const newConversation = {
      id: Date.now().toString(),
      title: "New Chat",
      timestamp: new Date().toISOString(),
      messages: [],
    };
    setConversations((prev) => {
      const updated = [newConversation, ...prev];
      console.log("After createNewConversation:", updated);
      return updated;
    });
    setCurrentConversationId(newConversation.id);
    setMessages([]);
  };

  // Load conversation
  const loadConversation = (conversationId) => {
    const conversation = conversations.find(
      (conv) => conv.id === conversationId
    );
    if (conversation) {
      setCurrentConversationId(conversationId);
      setMessages(conversation.messages);
    }
  };

  // Update conversation title
  const updateConversationTitle = (conversationId, title) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, title: title } : conv
      )
    );
  };

  // Delete conversation
  const deleteConversation = (conversationId) => {
    setConversations((prev) =>
      prev.filter((conv) => conv.id !== conversationId)
    );
    if (currentConversationId === conversationId) {
      createNewConversation();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    // Clear the input immediately
    setMessage("");

    try {
      setIsLoading(true);

      // Create new conversation if none exists
      if (!currentConversationId) {
        createNewConversation();
      }

      // Add user message to chat
      const userMessage = {
        id: Date.now().toString(),
        type: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // Update conversation with new message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: updatedMessages }
            : conv
        )
      );

      // Send to backend using axios
      const response = await axios.post(
        `${ragServiceUrl}/api/v1/query`,
        { message: message },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          withCredentials: true,
        }
      );

      // Add AI response to chat
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: response.data.response,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, aiMessage];
      const userFirstMessage = finalMessages.find(
        (m) => m.type === "user"
      )?.content;
      const currentConv = conversations.find(
        (conv) => conv.id === currentConversationId
      );
      if (
        currentConv &&
        (currentConv.title === "New Chat" || !currentConv.title)
      ) {
        let baseTitle;
        if (isGenericAIResponse(aiMessage.content) && userFirstMessage) {
          baseTitle = userFirstMessage;
        } else {
          baseTitle = aiMessage.content;
        }
        const sweetTitle = generateShortTitle(baseTitle, userFirstMessage);
        updateConversationTitle(currentConversationId, sweetTitle);
      }
      setMessages(finalMessages);
      // Update conversation with AI response
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: finalMessages }
            : conv
        )
      );
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        id: Date.now().toString(),
        type: "error",
        content:
          error.response?.data?.error ||
          "Failed to connect to the server. Please make sure the server is running.",
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...messages, errorMessage];
      setMessages(updatedMessages);

      // Update conversation with error message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: updatedMessages }
            : conv
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is PDF
    if (file.type !== "application/pdf") {
      const errorMessage = {
        id: Date.now().toString(),
        type: "error",
        content: "Please upload a PDF file only.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [errorMessage, ...prev]);
      return;
    }

    setSelectedFile(file); // Show chip preview
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadSelectedFile = async () => {
    if (!selectedFile) return;
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Create new conversation if none exists
      if (!currentConversationId) {
        createNewConversation();
      }

      // Add PDF chip message to chat
      const pdfChipMessage = {
        id: Date.now().toString(),
        type: "pdf",
        fileName: selectedFile.name,
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...messages, pdfChipMessage];
      setMessages(updatedMessages);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: updatedMessages }
            : conv
        )
      );

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("pdf", selectedFile);

      // Send file to backend
      const response = await axios.post(
        `${ragServiceUrl}/api/v1/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Check for blank/empty PDF
      let aiContent = `✅ PDF "${selectedFile.name}" uploaded and processed successfully!`;
      if (
        response.data.chunks.length === 0 ||
        (response.data.chunks.length === 1 &&
          response.data.chunks[0].content.trim().length < 50)
      ) {
        aiContent = `The uploaded file \`${selectedFile.name}\` appears to be essentially blank or contains only a title page without any substantive content.\n\nIf you meant to upload a different document or expected more content, please try re-uploading the correct file or clarify what you're looking for help with.`;
      }

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: aiContent,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...updatedMessages, aiMessage];
      const userFirstMessage2 = finalMessages.find(
        (m) => m.type === "user"
      )?.content;
      const currentConv2 = conversations.find(
        (conv) => conv.id === currentConversationId
      );
      if (
        currentConv2 &&
        (currentConv2.title === "New Chat" || !currentConv2.title)
      ) {
        let baseTitle;
        if (isGenericAIResponse(aiMessage.content) && userFirstMessage2) {
          baseTitle = userFirstMessage2;
        } else {
          baseTitle = aiMessage.content;
        }
        const sweetTitle = generateShortTitle(baseTitle, userFirstMessage2);
        updateConversationTitle(currentConversationId, sweetTitle);
      }
      setMessages(finalMessages);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: finalMessages }
            : conv
        )
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage = {
        id: Date.now().toString(),
        type: "error",
        content:
          error.response?.data?.error ||
          "Failed to upload the PDF. Please try again.",
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...messages, errorMessage];
      setMessages(updatedMessages);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: updatedMessages }
            : conv
        )
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-white text-lg">Loading chat...</div>
      </div>
    );

  return (
    <div className="flex w-full h-screen bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-80 bg-zinc-900 border-r border-zinc-700 flex flex-col">
        {/* New Chat Button */}
        <div className="p-4 border-b border-zinc-700">
          <button
            onClick={createNewConversation}
            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-medium px-4 py-3 rounded-lg transition-colors"
          >
            + New Chat
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-zinc-700 flex items-center gap-3">
          <img
            src={
              userData?.avatar ||
              userData?.profile?.photos ||
              userData?.photos ||
              "https://via.placeholder.com/150"
            }
            alt="Avatar"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="text-white font-medium text-sm">
              {userData?.username || userData?.displayName || "Unknown User"}
            </p>
            <p className="text-zinc-400 text-xs">AI Assistant</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-white text-sm"
          >
            Logout
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-3 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors ${
                currentConversationId === conversation.id ? "bg-zinc-800" : ""
              }`}
              onClick={() => loadConversation(conversation.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">
                    {conversation.title}
                  </p>
                  <p className="text-zinc-400 text-xs">
                    {new Date(conversation.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conversation.id);
                  }}
                  className="text-zinc-500 hover:text-red-400 text-sm ml-2"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-zinc-400">
                <h2 className="text-2xl font-semibold mb-4">
                  Welcome to AI Assistant
                </h2>
                <p className="mb-6">
                  Start a new conversation or upload a PDF to get started.
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={createNewConversation}
                    className="bg-purple-700 hover:bg-purple-800 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Start New Chat
                  </button>
                  <button
                    onClick={handleFileButtonClick}
                    className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Upload PDF
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) =>
                msg.type === "pdf" ? (
                  <div key={msg.id} className="flex justify-start">
                    <div className="flex items-center bg-zinc-900 rounded-xl px-4 py-2 w-fit border border-zinc-700">
                      <FiPaperclip className="text-pink-400 mr-2" size={22} />
                      <div className="flex flex-col mr-4">
                        <span className="text-white font-medium text-sm">
                          {msg.fileName}
                        </span>
                        <span className="text-zinc-400 text-xs">PDF</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-3xl px-6 py-4 rounded-2xl ${
                        msg.type === "user"
                          ? "bg-purple-700 text-white"
                          : msg.type === "error"
                          ? "bg-red-700 text-white"
                          : "bg-zinc-800 text-white"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <div className="text-xs opacity-70 mt-2">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 text-white px-6 py-4 rounded-2xl max-w-3xl">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              {isUploading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 text-white px-6 py-4 rounded-2xl max-w-3xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <div>
                        <div className="text-sm font-medium">
                          Uploading PDF...
                        </div>
                        <div className="w-48 bg-zinc-700 rounded-full h-2 mt-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {uploadProgress}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Section */}
        <div className="p-6 border-t border-zinc-700 bg-zinc-900">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-3 bg-zinc-800 rounded-2xl p-4">
              {selectedFile && (
                <div className="flex items-center mb-2 bg-zinc-900 rounded-xl px-4 py-2 w-fit border border-zinc-700">
                  <FiPaperclip className="text-pink-400 mr-2" size={22} />
                  <div className="flex flex-col mr-4">
                    <span className="text-white font-medium text-sm">
                      {selectedFile.name}
                    </span>
                    <span className="text-zinc-400 text-xs">PDF</span>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="ml-auto text-zinc-400 hover:text-white rounded-full focus:outline-none"
                    title="Remove file"
                  >
                    ×
                  </button>
                  <button
                    onClick={handleUploadSelectedFile}
                    className="ml-4 bg-purple-700 hover:bg-purple-800 text-white px-3 py-1 rounded-lg text-xs font-medium"
                    disabled={isUploading}
                  >
                    Upload
                  </button>
                </div>
              )}
              <textarea
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 bg-transparent text-white resize-none outline-none border-none text-sm"
                rows="1"
                style={{ minHeight: "24px", maxHeight: "120px" }}
              />

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* File upload button */}
              <button
                onClick={handleFileButtonClick}
                disabled={isUploading}
                className={`p-2 rounded-lg ${
                  isUploading
                    ? "text-zinc-500 cursor-not-allowed"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-700"
                } transition-colors`}
                title="Upload PDF"
              >
                <FiPaperclip size={20} />
              </button>

              <button
                onClick={handleSendMessage}
                disabled={isLoading || !message.trim()}
                className={`p-2 rounded-lg ${
                  isLoading || !message.trim()
                    ? "text-zinc-500 cursor-not-allowed"
                    : "text-white bg-purple-700 hover:bg-purple-800"
                } transition-colors`}
              >
                <IoMdSend size={20} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;
