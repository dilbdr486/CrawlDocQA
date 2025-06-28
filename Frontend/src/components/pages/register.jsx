import { useState, useContext } from "react";
import { FcGoogle } from "react-icons/fc";
import { Link, useNavigate } from "react-router-dom";
import { appContext } from "../../store/storeContext";
import axios from "axios";

function Register() {
  const navigate = useNavigate();
  const { backendUrl } = useContext(appContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

    if (!strongPasswordRegex.test(password)) {
      setPasswordError(
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
      );
      return;
    }

    try {
      await axios.post(`${backendUrl}/api/v1/send-verify-otp`, { email });

      navigate("/otpVerification", {
        state: { username, email, password },
      });
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 400) {
          setErrorMessage(
            error.response.data.message || "Invalid registration data."
          );
        }
        if (status === 409) {
          setErrorMessage("User is already exists.");
        } else {
          setErrorMessage("Something went wrong. Please try again later.");
        }
      } else {
        setErrorMessage("Network error. Please check your connection.");
      }
    }
  };

  const onGoogleHandler = () => {
    window.location.href = `${backendUrl}/auth/google`;
  };

  return (
    <div className="flex justify-center items-center flex-col h-screen w-screen bg-black text-white px-4">
      <div className="w-full max-w-md p-8 bg-zinc-900 shadow-lg rounded-2xl border border-zinc-700">
        <div className="flex flex-col items-center gap-2 mb-6">
          <h2 className="text-xl font-semibold">Register</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {passwordError && (
            <p className="text-red-500 text-sm -mt-2">{passwordError}</p>
          )}

          <input
            type="email"
            placeholder="Enter your email..."
            className="w-full p-3 rounded-md bg-zinc-800 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            placeholder="Enter your username..."
            className="w-full p-3 rounded-md bg-zinc-800 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Enter your password..."
            className="w-full p-3 rounded-md bg-zinc-800 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition-all text-white py-3 rounded-lg hover:cursor-pointer"
          >
            continue
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-4">
          <hr className="flex-grow border-zinc-700" />
          <span className="px-3 text-sm text-zinc-400">OR</span>
          <hr className="flex-grow border-zinc-700" />
        </div>

        {/* Google Sign-In */}
        <button
          onClick={onGoogleHandler}
          className="w-full flex items-center justify-center gap-2 bg-white text-black font-medium py-3 rounded-lg hover:bg-zinc-200 transition-all hover:cursor-pointer"
        >
          <FcGoogle className="text-xl" />
          Sign up with Google
        </button>

        {/* Login Link */}
        <p className="text-center text-sm mt-6 text-zinc-300">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
