import express from 'express'
import { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    sendVerifyOtp,
    verifyEmail,
    isAuthenticated,
    sendResetOtp,
 } from "../controllers/userController.js"
 import {upload} from "../middlewares/multer.js"
 import {verifyJWT} from "../middlewares/auth.js"

const userRoute = express.Router();

userRoute.route("/register").post(
    upload.fields([
        {
          name: 'avatar',
          maxCount: 1,
        },
      ]),
    registerUser
)

userRoute.route('/login').post(loginUser);

//secured routes
userRoute.route('/logout').post(verifyJWT, logoutUser);
userRoute.route('/refresh-token').post(refreshAccessToken);
userRoute.route("/change-password").post(verifyJWT, changeCurrentPassword)
userRoute.route("/current-user").get(verifyJWT, getCurrentUser)
userRoute.route("/update-account").patch(verifyJWT, updateAccountDetails)

userRoute.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)

userRoute.route("/send-verify-otp").post(sendVerifyOtp)
userRoute.route("/verify-account").post(verifyEmail)
userRoute.route("/is-auth").get(verifyJWT,isAuthenticated)
userRoute.route("/send-reset-otp").post(verifyJWT,sendResetOtp)

export default userRoute;