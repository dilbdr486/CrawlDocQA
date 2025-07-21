import { useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { appContext } from "../../store/storeContext";
import axios from "axios";
import { toast } from "react-toastify";

function AvatarUpload() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { backendUrl, setIsLoggedIn } = useContext(appContext);
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleContinue = async () => {
    if (!state || !state.username || !state.email || !state.password) {
      toast.error("Missing registration data");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("username", state.username);
      formData.append("password", state.password);
      formData.append("email", state.email);
      formData.append("avatar", avatar);

      const response = await axios.post(
        `${backendUrl}/api/v1/register`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast.success("Registration successful!");
        setIsLoggedIn(true);
        navigate("/chat");
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 400) {
          toast.error(
            error.response.data.message || "Invalid registration data."
          );
        } else if (status === 409) {
          toast.error("User already exists.");
        } else {
          toast.error("Something went wrong. Please try again later.");
        }
      } else {
        toast.error("Network error. Please check your connection.");
      }
    }
  };

  return (
    <div
      className="flex justify-center items-center flex-col h-screen w-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-gray-100 px-4 font-sans"
      style={{ fontFamily: "Inter, Segoe UI, Arial, sans-serif" }}
    >
      <div className="w-full max-w-md p-10 bg-zinc-950 shadow-2xl rounded-3xl border border-zinc-800">
        <div className="flex flex-col items-center gap-6">
          <h2
            className="text-2xl font-bold tracking-tight text-blue-400 mb-2"
            style={{ letterSpacing: "0.02em" }}
          >
            Upload Your Avatar
          </h2>

          {preview ? (
            <img
              src={preview}
              alt="Avatar Preview"
              className="w-32 h-32 rounded-full object-cover border-4 border-blue-400 shadow-md"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 border-4 border-zinc-700 text-lg font-medium">
              No Avatar
            </div>
          )}

          <label className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-xl cursor-pointer text-center transition-all font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2">
            Choose Photo
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>

          <button
            onClick={handleContinue}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl mt-4 transition-all hover:cursor-pointer font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2"
          >
            Continue
          </button>

          <button
            onClick={async () => {
              if (
                !state ||
                !state.username ||
                !state.email ||
                !state.password
              ) {
                toast.error("Missing registration data");
                return;
              }
              try {
                const formData = new FormData();
                formData.append("username", state.username);
                formData.append("password", state.password);
                formData.append("email", state.email);
                // Do NOT append avatar
                const response = await axios.post(
                  `${backendUrl}/api/v1/register`,
                  formData,
                  {
                    withCredentials: true,
                    headers: {
                      "Content-Type": "multipart/form-data",
                    },
                  }
                );
                if (response.data.success) {
                  toast.success("Registration successful!");
                  setIsLoggedIn(true);
                  navigate("/chat");
                }
              } catch (error) {
                if (error.response) {
                  const status = error.response.status;
                  if (status === 400) {
                    toast.error(
                      error.response.data.message ||
                        "Invalid registration data."
                    );
                  } else if (status === 409) {
                    toast.error("User already exists.");
                  } else {
                    toast.error(
                      "Something went wrong. Please try again later."
                    );
                  }
                } else {
                  toast.error("Network error. Please check your connection.");
                }
              }
            }}
            className="w-full bg-zinc-700 hover:bg-zinc-800 text-gray-200 py-3 rounded-xl mt-2 transition-all hover:cursor-pointer font-semibold shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarUpload;
