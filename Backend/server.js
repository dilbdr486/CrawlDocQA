import express from "express";
import "dotenv/config";
import cors from "cors";
import cookiePaeser from "cookie-parser";
import userRoutes from './src/routes/userRoute.js'
import connectDB from "./src/db/mongoDb.js";
import googleRoute from "./src/controllers/googleController.js";
import passport from "passport";
import session from "express-session";

const app = express();
connectDB();

const allowedOrigins = ["http://localhost:5173","http://localhost:4000"];

app.use(
  cors({
    origin: allowedOrigins,
    // origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(
  session({
    secret: "secretcode",
    resave: false,
    saveUninitialized:false
  })
);

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(cookiePaeser());
app.use(passport.initialize());
app.use(passport.session());


// userRoute
app.use("/api/v1",userRoutes);
app.use("/",googleRoute)

const port = process.env.PORT || 8000;

app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
})