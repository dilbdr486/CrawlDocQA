import axios from "axios";
import { createContext, useEffect, useState } from "react";

export const appContext = createContext();

export const AppStoreContext = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const ragServiceUrl = import.meta.env.VITE_RAG_SERVICE_URL;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);

  const getUserData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/v1/current-user`, {
        withCredentials: true,
      });

      if (data.success) {
        setUserData(data.data);
      } else {
        setUserData(null);
      }
    } catch (error) {
      console.error("Get user data failed:", error);
      setUserData(null);
    }
  };

  const getAuth = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/v1/is-auth`, {
        withCredentials: true,
      });

      if (data.success) {
        setIsLoggedIn(true);
        getUserData();
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      setIsLoggedIn(false);
    }
  };

  const logout = async () => {
    try {
      // Try logging out from the backend API
      const response = await axios.get(`${backendUrl}/api/v1/logout`, {
        withCredentials: true,
      });
  
      if (response.data.success) {
        // If the backend logout is successful, stop and do not proceed to the second API
        console.log("Logged out from backend API successfully.");
        setIsLoggedIn(false);
        setUserData(null);
      } else {
        // If backend logout is unsuccessful, proceed to the second logout route
        console.log("Backend logout failed, moving on to Google logout.");
        const googleLogoutResponse = await axios.get(`${backendUrl}/auth/logout`, {
          withCredentials: true,
        });
  
        if (googleLogoutResponse.data.success) {
          console.log("Logged out from Google authentication.");
          setIsLoggedIn(false);
          setUserData(null);
        } else {
          console.error("Google logout failed:", googleLogoutResponse.data.message);
        }
      }
    } catch (error) {
      // If the first API fails, proceed directly to the second API
      console.error("Error during backend logout:", error);
  
      try {
        console.log("Attempting Google logout.");
        const googleLogoutResponse = await axios.get(`${backendUrl}/auth/logout`, {
          withCredentials: true,
        });
  
        if (googleLogoutResponse.data.success) {
          console.log("Logged out from Google authentication.");
          setIsLoggedIn(false);
          setUserData(null);
        } else {
          console.error("Google logout failed:", googleLogoutResponse.data.message);
        }
      } catch (error) {
        console.error("Both logout routes failed:", error);
      }
    }
  };
  

  useEffect(() => {
    getAuth();
  }, []);

  const value = {
    backendUrl,
    ragServiceUrl,
    isLoggedIn,
    setIsLoggedIn,
    userData,
    setUserData,
    getUserData,
    getAuth,
    logout,
  };
  return <appContext.Provider value={value}>{children}</appContext.Provider>;
};
