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
    <div className="flex justify-center items-center flex-col h-screen w-screen bg-black text-white px-4">
      <div className="w-full max-w-md p-8 bg-zinc-900 shadow-lg rounded-2xl border border-zinc-700">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold">Upload Your Avatar</h2>

          {preview ? (
            <img
              src={preview}
              alt="Avatar Preview"
              className="w-32 h-32 rounded-full object-cover border-4 border-zinc-600"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 border-4 border-zinc-700">
              No Avatar
            </div>
          )}

          <label className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg cursor-pointer text-center transition-all">
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
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg mt-4 transition-all hover:cursor-pointer"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarUpload;
