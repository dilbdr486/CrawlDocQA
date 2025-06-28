import Chat from "./components/pages/chat";
import { Route, Routes,Navigate } from "react-router-dom";
import Login from "./components/pages/login";
import Register from "./components/pages/register";
import Verification from "./components/pages/otpVerification";
import AvatarUpload from "./components/pages/avatarUpload";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/avatar" element={<AvatarUpload />} />
        <Route path="/otpVerification" element={<Verification />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </>
  );
}

export default App;
