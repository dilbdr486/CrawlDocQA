import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/acyncHandler.js";
import jwt from "jsonwebtoken"
import { userModel } from "../models/userModel.js";

export const verifyJWT = asyncHandler(async(req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        // console.log(token);
        // console.log("Cookies received:", req.cookies);
        // console.log(token);
        if (!token) {
            console.error("Token not found in cookies or Authorization header");
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.GENERATE_ACCESS_TOKEN_SECRET)
    
        const user = await userModel.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            console.error("User not found for the provided token");
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})