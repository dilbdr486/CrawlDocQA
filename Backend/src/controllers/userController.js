import { userModel } from "../models/userModel.js";
import { asyncHandler } from "../utils/acyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import transporter from "../middlewares/nodeMailer.js";
import { otpStore } from "../utils/otpStore.js";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await userModel.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }
    console.log("Found user:", user);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    console.log("Tokens generated:", { accessToken, refreshToken });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  console.log(req.body);

  if ([username, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await userModel.findOne({
    $or: [{ email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with username or email is existed");
  }

  if (existedUser) {
    if (existedUser.googleId) {
      throw new ApiError(
        409,
        "This email is registered via Google. Please use 'Sign in with Google'."
      );
    }
    throw new ApiError(409, "User already exists.");
  }

  const avatarLocalPath = req.files.avatar[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await userModel.create({
    username,
    avatar: avatar.url,
    email,
    password,
  });

  const createdUser = await userModel
    .findById(user._id)
    .select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  const mailOptions = {
    from: process.env.SENDER_EMAIL,
    to: email,
    subject: "Welcome to Our Platform",
    text: `Hello ${username},\n\nWelcome to our platform! We're excited to have you on board.`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new ApiError(500, "Error sending welcome email");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  console.log("user Logged in");

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // console.log(email,password);

  if (!email || !password) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await userModel.findOne({
    email,
  });

  // console.log(user);

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  if (user.googleId) {
    throw new ApiError(
      400,
      "This email is registered via Google. Please use 'Sign in with Google'."
    );
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  // console.log(isPasswordValid);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const loggedInUser = await userModel
    .findById(user._id)
    .select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  };

  console.log("user Logged in");

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await userModel.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_ACCESS_TOKEN_SECRET
    );

    const user = await userModel.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { email, oldPassword, newPassword, otp } = req.body;

  if (!email || !oldPassword || !newPassword || !otp) {
    throw new ApiError(
      400,
      "All fields (email, oldPassword, newPassword, otp) are required"
    );
  }

  const user = await userModel.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.resetOtp !== otp) {
    throw new ApiError(400, "Invalid OTP");
  }

  if (user.resetOtpExpireAt < Date.now()) {
    throw new ApiError(400, "OTP has expired");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  user.resetOtp = "";
  user.resetOtpExpireAt = null;

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { username, email } = req.body;

  if (!username || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await userModel
    .findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          username,
          email: email,
        },
      },
      { new: true }
    )
    .select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  //TODO: delete old image - assignment

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await userModel
    .findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatar.url,
        },
      },
      { new: true }
    )
    .select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

const sendVerifyOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // OTP expires in 10 minutes
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore.set(email, { otp, expiresAt });

    // Send OTP via email
    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Account Verification OTP",
      text: `Your OTP is: ${otp}`,
    });

    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log("Received Email:", email);
    console.log("Received OTP:", otp);

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email or OTP is missing!" });
    }

    const stored = otpStore.get(email);

    if (!stored) {
      return res
        .status(400)
        .json({ success: false, message: "No OTP found for this email" });
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (stored.expiresAt < Date.now()) {
      otpStore.delete(email);
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    }

    otpStore.delete(email);

    return res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong during verification",
      error: error.message,
    });
  }
};

const isAuthenticated = asyncHandler(async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "User is authenticated",
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
});

const sendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // console.log("Generated OTP:", otp);
    // console.log("User before saving OTP:", user);

    await user.save();

    // console.log("User after saving OTP:", user);

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Account Verification OTP",
      text: `Your OTP to reset your password is ${otp}`,
    };

    // console.log("Sending reset OTP email with options:", mailOptions);

    await transporter.sendMail(mailOptions);

    res.json({ message: "OTP sent successfully on email" });
  } catch (error) {
    console.error("Error during sending reset OTP:", error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

export {
  generateAccessAndRefereshTokens,
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  isAuthenticated,
  sendResetOtp,
  sendVerifyOtp,
  verifyEmail,
};
