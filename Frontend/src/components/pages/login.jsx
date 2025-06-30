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
    email: "",
    password: "",
  });

  const onChangeHandler = (event) => {
    setData({
      ...data,
      [event.target.name]: event.target.value,
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

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
  };

  const onGoogleHandler = () => {
    window.location.href = `${backendUrl}/auth/google`;
  };

  return (
    <div className="flex justify-center items-center flex-col h-screen w-screen bg-black text-white px-4">
      <div className="w-full max-w-md p-8 bg-zinc-900 shadow-lg rounded-2xl border border-zinc-700">
        <div className="flex flex-col items-center gap-2 mb-6">
          <h2 className="text-xl font-semibold">Login</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            name="email"
            placeholder="Enter the email..."
            value={data.email}
            onChange={onChangeHandler}
            className="w-full p-3 rounded-md bg-zinc-800 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Enter the password..."
            value={data.password}
            onChange={onChangeHandler}
            className="w-full p-3 rounded-md bg-zinc-800 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition-all text-white py-3 rounded-lg hover:cursor-pointer"
          >
            Login
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
          Sign in with Google
        </button>

        {/* Register Link */}
        <p className="text-center text-sm mt-6 text-zinc-300">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-blue-500 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
