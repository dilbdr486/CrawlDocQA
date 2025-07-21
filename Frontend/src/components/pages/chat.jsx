import { useContext, useEffect, useState, useRef } from "react";
import {
  AttachFile,
  Send,
  Link,
  Logout,
  MoreVert,
  Edit,
  Delete,
  Check,
  Close,
} from "@mui/icons-material";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import { appContext } from "../../store/storeContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

function getUrlTitle(url) {
  try {
    const { hostname, pathname } = new URL(url);
    // Use domain + first path segment (if any) for more context
    let title = hostname.replace(/^www\./, "");
    if (pathname && pathname !== "/") {
      const firstSegment = pathname.split("/").filter(Boolean)[0];
      if (firstSegment) title += `/${firstSegment}`;
    }
    return title;
  } catch {
    return url;
  }
}

const Chat = () => {
  const { getAuth, getUserData, userData, logout, backendUrl, ragServiceUrl } =
    useContext(appContext);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUrlUploading, setIsUrlUploading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [menuConversationId, setMenuConversationId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    const init = async () => {
      await getAuth();
      await getUserData();

      // Load conversations from MongoDB
      try {
        const response = await axios.get(
          `${backendUrl}/api/v1/chat/conversations`,
          {
            withCredentials: true,
          }
        );

        if (response.data.success) {
          const conversations = response.data.data || [];
          console.log("Loaded from MongoDB:", conversations);
          setConversations(conversations);
          if (conversations.length > 0) {
            setCurrentConversationId(conversations[0].id);
            setMessages(conversations[0].messages);
          }
        }
      } catch (error) {
        console.error("Error loading conversations:", error);
        // Fallback to localStorage if API fails
        const data = localStorage.getItem("chat_conversations");
        if (data) {
          try {
            const parsed = JSON.parse(data);
            const now = Date.now();
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            const freshConvs = (parsed.conversations || []).filter((conv) => {
              return now - new Date(conv.timestamp).getTime() < sevenDays;
            });
            console.log("Loaded from localStorage (fallback):", freshConvs);
            setConversations(freshConvs);
            if (freshConvs.length > 0) {
              setCurrentConversationId(freshConvs[0].id);
              setMessages(freshConvs[0].messages);
            }
          } catch (e) {
            localStorage.removeItem("chat_conversations");
          }
        }
      }

      setLoading(false);
    };
    init();
  }, []);

  // Save conversations to MongoDB on every change
  useEffect(() => {
    if (!loading && conversations.length > 0 && currentConversationId) {
      const currentConversation = conversations.find(
        (conv) => conv.id === currentConversationId
      );
      if (currentConversation) {
        saveConversationToMongoDB(currentConversation);
      }
    }
  }, [conversations, currentConversationId, loading]);

  // Function to save conversation to MongoDB
  const saveConversationToMongoDB = async (conversation) => {
    try {
      await axios.post(`${backendUrl}/api/v1/chat/save`, conversation, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      });
    } catch (error) {
      console.error("Error saving conversation to MongoDB:", error);
      // Fallback to localStorage
      const data = {
        conversations,
        savedAt: Date.now(),
      };
      localStorage.setItem("chat_conversations", JSON.stringify(data));
    }
  };

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
  const updateConversationTitle = async (conversationId, title) => {
    try {
      await axios.patch(
        `${backendUrl}/api/v1/chat/conversation/${conversationId}/title`,
        { title },
        { withCredentials: true }
      );
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, title } : conv
        )
      );
      toast.success("Chat renamed!");
    } catch (error) {
      toast.error("Failed to rename chat.");
      console.error("Rename error:", error);
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId) => {
    try {
      await axios.delete(
        `${backendUrl}/api/v1/chat/conversation/${conversationId}`,
        {
          withCredentials: true,
        }
      );
      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId)
      );
      if (currentConversationId === conversationId) {
        createNewConversation();
      }
      toast.success("Chat deleted!");
    } catch (error) {
      toast.error("Failed to delete chat.");
      console.error("Delete error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully!");
      navigate("/login");
    } catch (error) {
      toast.error("Logout failed. Please try again.");
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
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
        {
          message: message,
          userId: userData?._id,
          chatHistory: messages, // Send current chat history
        },
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
      if (error.response && error.response.data && error.response.data.error) {
        if (error.response.data.error.includes("Unauthorized access")) {
          toast.error(
            "You are not authorized to access some of this data. Please re-upload your documents or contact support."
          );
          setMessages([]); // Optionally clear chat
        } else if (
          error.response.data.error.includes("Failed to process the query")
        ) {
          toast.error(
            "Sorry, we couldn't process your query. Please try again or check your uploaded documents."
          );
        } else {
          toast.error(error.response.data.error);
        }
      } else {
        toast.error(
          "Failed to connect to the server. Please make sure the server is running."
        );
      }
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
      toast.error("Please upload a PDF file only.");
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
        `${ragServiceUrl}/api/v1/upload?userId=${userData?._id}`,
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
      let aiContent = `PDF "${selectedFile.name}" uploaded and processed successfully!`;
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
        // Use the PDF file name (without extension) as the chat title
        const fileName = selectedFile.name.replace(/\\.[^/.]+$/, "");
        updateConversationTitle(currentConversationId, fileName);
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
      toast.error(
        error.response?.data?.error ||
          "Failed to upload the PDF. Please try again."
      );
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

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    try {
      setIsUrlUploading(true);

      // Create new conversation if none exists
      if (!currentConversationId) {
        createNewConversation();
      }

      // Add URL chip message to chat
      const urlChipMessage = {
        id: Date.now().toString(),
        type: "url",
        url: urlInput,
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...messages, urlChipMessage];
      setMessages(updatedMessages);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: updatedMessages }
            : conv
        )
      );

      // Send URL to backend
      const response = await axios.post(
        `${ragServiceUrl}/api/load-data`,
        { url: urlInput, userId: userData?._id },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      // Add success message
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: `uploaded and processed successfully!`,
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
        const urlTitle = getUrlTitle(urlInput);
        updateConversationTitle(currentConversationId, urlTitle);
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === currentConversationId
              ? { ...conv, title: urlTitle }
              : conv
          )
        );
      }
      setMessages(finalMessages);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: finalMessages }
            : conv
        )
      );

      // Clear URL input
      setUrlInput("");
      setShowUrlInput(false);
      toast.success("Web content loaded successfully!");
    } catch (error) {
      console.error("Error uploading URL:", error);
      toast.error(
        error.response?.data?.error ||
          "Failed to load web content. Please try again."
      );
      const errorMessage = {
        id: Date.now().toString(),
        type: "error",
        content:
          error.response?.data?.error ||
          "Failed to load web content. Please try again.",
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
      setIsUrlUploading(false);
    }
  };

  const handleUrlButtonClick = () => {
    setShowUrlInput(!showUrlInput);
    if (showUrlInput) {
      setUrlInput("");
    }
  };

  const handleMenuOpen = (event, conversationId) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuConversationId(conversationId);
  };
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuConversationId(null);
  };
  const handleRename = () => {
    setRenamingId(menuConversationId);
    setRenameValue(
      conversations.find((c) => c.id === menuConversationId)?.title || ""
    );
    handleMenuClose();
  };
  const handleRenameSubmit = () => {
    updateConversationTitle(renamingId, renameValue);
    setRenamingId(null);
    setRenameValue("");
  };
  const handleDelete = () => {
    deleteConversation(menuConversationId);
    handleMenuClose();
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-white text-lg">Loading chat...</div>
      </div>
    );

  return (
    <div className="flex w-full h-screen bg-gray-300">
      {/* Sidebar */}
      <aside className="w-80 min-h-full flex flex-col bg-gradient-to-b from-blue-900 via-blue-950 to-slate-900 shadow-xl">
        {/* New Chat Button */}
        <div className="p-4 border-b border-blue-800">
          <button
            onClick={createNewConversation}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-4 py-3 rounded-xl transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          >
            + New Chat
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-blue-800 flex items-center gap-3 bg-blue-950/70">
          <img
            src={
              userData?.avatar ||
              userData?.profile?.photos ||
              userData?.photos ||
              "https://via.placeholder.com/150"
            }
            alt="Avatar"
            className="h-11 w-11 rounded-full object-cover border-2 border-blue-700 shadow-sm"
          />
          <div className="flex-1">
            <p className="text-white font-semibold text-base truncate">
              {userData?.username || userData?.displayName || "Unknown User"}
            </p>
            <p className="text-blue-200 text-xs">AI Assistant</p>
          </div>
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="text-blue-300 hover:text-red-500 text-sm px-3 py-2 rounded-lg transition-all duration-200 hover:bg-red-50/10 focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer font-medium flex items-center gap-2"
            title="Logout"
          >
            <Logout style={{ fontSize: 16 }} />
            Logout
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto bg-transparent">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-blue-800 cursor-pointer transition-all duration-200 hover:bg-blue-800/40 ${
                currentConversationId === conversation.id
                  ? "bg-blue-800/60 shadow-inner"
                  : ""
              } flex items-center justify-between rounded-lg mx-2 my-2`}
              onClick={() => loadConversation(conversation.id)}
            >
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {renamingId === conversation.id ? (
                  <>
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      autoFocus
                      className="text-blue-900 font-medium text-sm bg-blue-100 rounded px-2 py-1 focus:ring-2 focus:ring-blue-400 outline-none border-none mr-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      style={{ minWidth: "80px" }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameSubmit();
                      }}
                      className="!p-1 ml-1 text-blue-500 hover:text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
                      sx={{ ml: 0.5 }}
                    >
                      <Check fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(null);
                      }}
                      className="!p-1 ml-1 text-red-400 hover:text-red-600 bg-blue-100 hover:bg-red-100 rounded-full transition-colors"
                      sx={{ ml: 0.5 }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <p className="text-blue-100 font-medium text-sm truncate">
                      {conversation.title}
                    </p>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(conversation.id);
                        setRenameValue(conversation.title);
                      }}
                      sx={{ ml: 0.5 }}
                    >
                      <Edit fontSize="small" className="text-blue-300" />
                    </IconButton>
                    <p className="text-blue-300 text-xs font-medium mt-1">
                      {new Date(conversation.timestamp).toLocaleDateString()}
                    </p>
                  </>
                )}
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuOpen(e, conversation.id);
                  }}
                >
                  <MoreVert fontSize="small" className="text-blue-300" />
                </IconButton>
              </div>
              <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem onClick={handleDelete} className="text-red-600">
                  <Delete fontSize="small" className="mr-2" /> Delete
                </MenuItem>
              </Menu>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-gradient-to-br from-slate-100 to-slate-200 border-l border-slate-300 shadow-inner">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8">
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
                    className="bg-purple-700 hover:bg-purple-800 text-white px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    Start New Chat
                  </button>
                  <button
                    onClick={handleFileButtonClick}
                    className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                  >
                    Upload PDF
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              {messages.map((msg) => {
                // Detect file/web upload success
                const isFileSuccess =
                  msg.type === "ai" &&
                  (msg.content.startsWith("PDF") ||
                    msg.content.startsWith("The uploaded file"));
                const isWebSuccess =
                  msg.type === "ai" &&
                  msg.content.trim() === "uploaded and processed successfully!";

                if (msg.type === "pdf") {
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="flex items-center bg-white rounded-2xl px-6 py-4 w-fit border border-slate-200 shadow-sm">
                        <AttachFile
                          className="text-pink-500 mr-3"
                          style={{ fontSize: 24 }}
                        />
                        <div className="flex flex-col mr-4">
                          <span className="text-slate-900 font-semibold text-sm">
                            {msg.fileName}
                          </span>
                          <span className="text-slate-500 text-xs font-medium">
                            PDF Document
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                } else if (msg.type === "url") {
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="flex items-center bg-white rounded-2xl px-6 py-4 w-fit border border-slate-200 shadow-sm">
                        <Link
                          className="text-blue-500 mr-3"
                          style={{ fontSize: 24 }}
                        />
                        <div className="flex flex-col mr-4">
                          <span className="text-slate-900 font-semibold text-sm">
                            {msg.url}
                          </span>
                          <span className="text-slate-500 text-xs font-medium">
                            Web Content
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                } else if (isFileSuccess) {
                  // File upload success card
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="flex items-center bg-white rounded-2xl px-6 py-4 w-fit border border-green-200 shadow-sm">
                        <span className="text-green-500 mr-3 text-2xl"></span>
                        <div className="flex flex-col mr-4">
                          <span className="text-slate-900 font-semibold text-sm">
                            {msg.content}
                          </span>
                          <span className="text-green-500 text-xs font-medium">
                            PDF Upload
                          </span>
                        </div>
                        <div className="text-xs opacity-60 mt-1 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                } else if (isWebSuccess) {
                  // Web upload success card
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="flex items-center bg-white rounded-2xl px-6 py-4 w-fit border border-blue-200 shadow-sm">
                        <span className="text-blue-500 mr-3 text-2xl"></span>
                        <div className="flex flex-col mr-4">
                          <span className="text-slate-900 font-semibold text-sm">
                            {msg.content}
                          </span>
                          <span className="text-blue-500 text-xs font-medium">
                            Web Content Upload
                          </span>
                        </div>
                        <div className="text-xs opacity-60 mt-1 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Default chat bubble for user, ai, error
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-center gap-3 ${
                        msg.type === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {/* Avatar removed for both AI and user */}
                      {/* Message text */}
                      <div
                        className={
                          msg.type === "user"
                            ? "bg-blue-100 text-blue-900 font-medium px-6 py-4 text-base max-w-xl text-right shadow-md rounded-2xl"
                            : msg.type === "error"
                            ? "bg-red-100 text-red-700 font-medium px-6 py-4 text-base max-w-xl text-left shadow rounded-2xl"
                            : "bg-white text-slate-900 font-medium px-6 py-4 text-base max-w-xl text-left shadow rounded-2xl"
                        }
                      >
                        {msg.type === "ai" ? (
                          <div>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-2 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
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
                      <span className="text-sm"></span>
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
              {isUrlUploading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 text-white px-6 py-4 rounded-2xl max-w-3xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <div>
                        <div className="text-sm font-medium">
                          Loading web content...
                        </div>
                        <div className="w-48 bg-zinc-700 rounded-full h-2 mt-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `80%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                          Please wait
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
        <div className="p-3 border-t border-blue-900 bg-blue-950 shadow-t-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-2 bg-blue-900/80 rounded-xl p-2 h-14 min-h-0 border border-blue-800 shadow-md">
              {selectedFile && (
                <div
                  className="flex items-center bg-white rounded-xl px-2 w-fit border border-slate-200 shadow-sm h-10"
                  style={{ minHeight: "2.5rem", height: "2.5rem" }}
                >
                  <AttachFile
                    className="text-pink-500 mr-2"
                    style={{ fontSize: 20 }}
                  />
                  <div className="flex flex-col mr-2 justify-center h-full">
                    <span className="text-slate-900 font-semibold text-sm leading-tight">
                      {selectedFile.name}
                    </span>
                    <span className="text-slate-500 text-xs font-medium leading-tight">
                      PDF
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="ml-auto text-slate-400 hover:text-red-500 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all duration-200 cursor-pointer h-8 w-8 flex items-center justify-center"
                    title="Remove file"
                    style={{ height: "2rem", width: "2rem" }}
                  >
                    ×
                  </button>
                  <button
                    onClick={handleUploadSelectedFile}
                    className="ml-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer shadow-sm h-8"
                    style={{ height: "2rem" }}
                    disabled={isUploading}
                  >
                    Upload
                  </button>
                </div>
              )}

              {showUrlInput && (
                <div
                  className="flex items-center bg-white rounded-xl px-2 w-fit border border-slate-200 shadow-sm h-10"
                  style={{ minHeight: "2.5rem", height: "2.5rem" }}
                >
                  <Link
                    className="text-blue-500 mr-2"
                    style={{ fontSize: 20 }}
                  />
                  <input
                    type="url"
                    placeholder="Enter website URL..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="bg-transparent text-slate-900 text-sm outline-none border-none min-w-48 font-medium placeholder-slate-400 h-full"
                    style={{ height: "100%" }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleUrlUpload();
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      setShowUrlInput(false);
                      setUrlInput("");
                    }}
                    className="ml-1 text-slate-400 hover:text-red-500 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all duration-200 cursor-pointer h-8 w-8 flex items-center justify-center"
                    title="Cancel"
                    style={{ height: "2rem", width: "2rem" }}
                  >
                    ×
                  </button>
                  <button
                    onClick={handleUrlUpload}
                    className="ml-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm h-8"
                    style={{ height: "2rem" }}
                    disabled={isUrlUploading || !urlInput.trim()}
                  >
                    {isUrlUploading ? "Loading..." : "Load"}
                  </button>
                </div>
              )}

              <textarea
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 bg-transparent text-white resize-none outline-none border-none text-sm h-8 min-h-0 py-1 placeholder-blue-200"
                rows="1"
                style={{ minHeight: "24px", maxHeight: "60px" }}
              />

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* URL upload button */}
              <button
                onClick={handleUrlButtonClick}
                className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer ${
                  isUrlUploading
                    ? "text-blue-300 cursor-not-allowed"
                    : showUrlInput
                    ? "text-blue-400 bg-blue-100/10 border border-blue-400"
                    : "text-blue-200 hover:text-blue-400 hover:bg-blue-800/40"
                }`}
                title="Load Web Content"
              >
                <Link style={{ fontSize: 18 }} />
              </button>

              {/* File upload button */}
              <button
                onClick={handleFileButtonClick}
                className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer ${
                  isUploading
                    ? "text-blue-300 cursor-not-allowed"
                    : "text-blue-200 hover:text-blue-400 hover:bg-blue-800/40"
                }`}
                title="Upload PDF"
              >
                <AttachFile style={{ fontSize: 18 }} />
              </button>

              <button
                onClick={handleSendMessage}
                className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                  isLoading || !message.trim()
                    ? "text-blue-300 cursor-not-allowed"
                    : "text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm"
                }`}
              >
                <Send style={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 font-sans">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 border border-zinc-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">
              Confirm Logout
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to logout?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutDialog(false)}
                className="px-5 py-2 rounded-lg bg-zinc-700 text-gray-200 hover:bg-zinc-600 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutDialog(false);
                  handleLogout();
                }}
                className="px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all font-semibold shadow"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
