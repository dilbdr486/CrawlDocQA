import { useContext, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { appContext } from "../../store/storeContext";
import { toast } from "react-toastify";

function Login() {
  const { backendUrl, setIsLoggedIn } = useContext(appContext);
  const navigate = useNavigate();

  const [data, setData] = useState({
    // if you want to actual login with backend then remove this and use empty string
    email: "admin@gmail.com",
    password: "admin123",
  });

  const onChangeHandler = (event) => {
    setData({
      ...data,
      [event.target.name]: event.target.value,
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    // if you want to actual login with backend then remove the if condition and use the try catch block

    if (data.email === "admin@gmail.com" && data.password === "admin123") {
      setIsLoggedIn(true);
      navigate("/Chat", { replace: true });
      return;
    }else{
      try {
        const response = await axios.post(
          `${backendUrl}/api/v1/login`,
          {
            email: data.email,
            password: data.password,
          },
          { withCredentials: true }
        );
  
        if (response.data.success) {
          toast.success("Login successful!");
          setIsLoggedIn(true);
          navigate("/Chat", { replace: true });
        } else {
          toast.error(response.data.message || "Login failed.");
          console.error("Login failed:", response.data.message);
        }
      } catch (error) {
        if (error.response) {
          const status = error.response.status;
          if (status === 401) {
            toast.error("Incorrect password. Please try again.");
          } else if (status === 404) {
            toast.error("User not found. Please check your email or register.");
          } else if (status === 400) {
            toast.error("User is already logged in with Google.");
          } else {
            toast.error(
              error.response.data.message || "An unexpected error occurred."
            );
          }
        } else {
          toast.error("Unable to connect to the server. Please try again later.");
        }
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
            Login
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={data.email}
            onChange={onChangeHandler}
            className="w-full p-3 rounded-lg bg-zinc-900 text-gray-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 transition-all duration-150"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={data.password}
            onChange={onChangeHandler}
            className="w-full p-3 rounded-lg bg-zinc-900 text-gray-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 transition-all duration-150"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 transition-all text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
          >
            Login
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
          Sign in with Google
        </button>

        {/* Register Link */}
        <p className="text-center text-sm mt-8 text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-blue-400 hover:underline font-medium"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
