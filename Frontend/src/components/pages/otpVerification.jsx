import React, { useContext, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { appContext } from "../../store/storeContext";
import { toast } from "react-toastify";

function OtpVerification() {
  const [otp, setOtp] = useState("");
  const { email, username, password } = useLocation().state || {};
  const navigate = useNavigate();
  const { backendUrl } = useContext(appContext);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${backendUrl}/api/v1/verify-account`, {
        email,
        otp,
      });

      if (response.data.success) {
        toast.success("OTP verified successfully!");
        navigate("/avatar", { state: { username, email, password } });
      } else {
        toast.error("OTP verification failed!");
      }
    } catch (error) {
      toast.error("OTP verification failed. Please try again.");
      console.error("OTP verification failed", error);
    }
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
            Enter OTP
          </h2>
          <span className="text-sm text-zinc-400 mt-1">
            The OTP will expire in 10 minutes.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <input
            type="text"
            placeholder="Enter the OTP"
            className="w-full p-3 rounded-lg bg-zinc-900 text-gray-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 transition-all duration-150 text-center tracking-widest text-lg"
            maxLength="6"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 transition-all text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
          >
            Verify OTP
          </button>
        </form>
      </div>
    </div>
  );
}

export default OtpVerification;
