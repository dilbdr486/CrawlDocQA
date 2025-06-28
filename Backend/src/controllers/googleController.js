import passport from "passport";
import GoogleStrategy from "passport-google-oauth20";
import { userModel } from "../models/userModel.js";
import { generateAccessAndRefereshTokens } from "../controllers/userController.js";
import express from "express";
import "dotenv/config"


const googleRoute = express.Router();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log("Google profile data:", profile);

        let user = await userModel.findOne({ googleId: profile.id });

        if (!user) {
          user = new userModel({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            avatar:
              profile.photos && profile.photos.length > 0
                ? profile.photos[0].value
                : null,
            password: null,
            fullname: profile.displayName,
          });

          await user.save();
        }

        return cb(null, user);
      } catch (err) {
        return cb(err, null);
        s;
      }
    }
  )
);

passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((obj, cb) => cb(null, obj));

googleRoute.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

googleRoute.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    const user = req.user;

    try {
      const { accessToken, refreshToken } =
        await generateAccessAndRefereshTokens(user._id);

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000, // 1 hour expiry
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 86400000, // 1 day expiry
      });

      // Redirect to frontend with tokens and avatar URL
      res.redirect(
        `http://localhost:5173/chat?accessToken=${accessToken}&refreshToken=${refreshToken}&avatar=${user.avatar}`
      );
    } catch (err) {
      console.error("Error generating tokens:", err);
      res.redirect("/");
    }
  }
);


googleRoute.get("/auth/logout", (req, res) => {
    try {
      // Clear the cookies
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Only set secure flag in production
        sameSite: "Strict" // Ensures cookies are sent only for same-site requests
      });
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Only set secure flag in production
        sameSite: "Strict" // Ensures cookies are sent only for same-site requests
      });
  
      // If you're using express-session (Passport.js), clear the session
      if (req.logout) {
        req.logout((err) => {
          if (err) {
            console.error("Error during logout:", err);
            return res.status(500).json({ success: false, message: "Logout failed" });
          }
  
          return res.status(200).json({ success: true, message: "Logged out successfully" });
        });
      } else {
        // In case req.logout() is not defined, just return a success message
        res.status(200).json({ success: true, message: "Logged out successfully" });
      }
    } catch (error) {
      console.error("Logout failed:", error);
      res.status(500).json({ success: false, message: "Logout failed" });
    }
  });
  


export default googleRoute;