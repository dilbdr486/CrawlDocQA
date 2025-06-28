import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const userSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },
  avatar: {
    type: String,
  },
  googleId: {
    type: String,
    sparse: true,
    default: null,
  },
  displayName: {
    type: String,
  },
  refreshToken: { type: String },
  resetOtp: { type: String, default: "" },
  resetOtpExpireAt: { type: Number, default: 0 },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  try {
    // If the password is present, hash it
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err); // Pass any error to the next middleware
  }
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
    },
    process.env.GENERATE_ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.GENERATE_EXPIRY_TOKEN_SECRET,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_EXPIRY_TOKEN_SECRET,
    }
  );
};

export const userModel = mongoose.model("User", userSchema);
