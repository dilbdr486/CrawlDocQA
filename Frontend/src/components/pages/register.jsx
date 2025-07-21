import { useState, useContext } from "react";
import { FcGoogle } from "react-icons/fc";
import { Link, useNavigate } from "react-router-dom";
import { appContext } from "../../store/storeContext";
import axios from "axios";
import { toast } from "react-toastify";

function Register() {
  const navigate = useNavigate();
  const { backendUrl } = useContext(appContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

    if (!strongPasswordRegex.test(password)) {
      toast.error(
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
      );
      return;
    }

    try {
      await axios.post(`${backendUrl}/api/v1/send-verify-otp`, { email });
      toast.success("OTP sent to your email!");
      navigate("/otpVerification", {
        state: { username, email, password },
      });
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

  const onGoogleHandler = () => {
    window.location.href = `${backendUrl}/auth/google`;
  };

  return (
    <div
      className="flex justify-center items-center flex-col h-screen w-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-gray-100 px-4 font-sans"
      style={{ fontFamily: "Inter, Segoe UI, Arial, sans-serif" }}
    >
      <div className="w-full max-w-md p-10 bg-zinc-950 shadow-2xl rounded-3xl border border-zinc-800">
        <div className="flex flex-col items-center gap-2 mb-8">
          <h2
            className="text-2xl font-bold tracking-tight text-blue-400"
            style={{ letterSpacing: "0.02em" }}
          >
            Register
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full p-3 rounded-lg bg-zinc-900 text-gray-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 transition-all duration-150"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            placeholder="Enter your username"
            className="w-full p-3 rounded-lg bg-zinc-900 text-gray-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 transition-all duration-150"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Enter your password"
            className="w-full p-3 rounded-lg bg-zinc-900 text-gray-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 transition-all duration-150"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 transition-all text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
          >
            continue
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <hr className="flex-grow border-zinc-800" />
          <span className="px-3 text-sm text-zinc-400 font-medium">OR</span>
          <hr className="flex-grow border-zinc-800" />
        </div>

        {/* Google Sign-In */}
        <button
          onClick={onGoogleHandler}
          className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 font-semibold py-3 rounded-xl hover:bg-blue-50 transition-all hover:cursor-pointer shadow-sm border border-zinc-200"
        >
          <FcGoogle className="text-2xl" />
          Sign up with Google
        </button>

        {/* Login Link */}
        <p className="text-center text-sm mt-8 text-zinc-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-400 hover:underline font-medium"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
