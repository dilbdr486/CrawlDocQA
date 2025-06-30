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
    <div className="flex justify-center items-center flex-col h-screen w-screen bg-black text-white px-4">
      <div className="w-full max-w-md p-8 bg-zinc-900 shadow-lg rounded-2xl border border-zinc-700">
        <div className="flex flex-col items-center gap-2 mb-6">
          <h2 className="text-xl font-semibold">Enter OTP</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter the OTP..."
            className="w-full p-3 rounded-md bg-zinc-800 text-white border border-zinc-600"
            maxLength="6"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition-all text-white py-3 rounded-lg hover:cursor-pointer"
          >
            Verify OTP
          </button>
        </form>
      </div>
    </div>
  );
}

export default OtpVerification;
