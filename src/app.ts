import express from "express";
import cors from "cors";
import errorMiddleware from "./middlewares/error.middleware.js";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import authRouter from "./modules/auth/auth.route.js";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());
app.use(cors({
    credentials:true,
}))
app.use(helmet());
app.use("/api/v1/auth",authRouter);
app.use(errorMiddleware);

export default app;
