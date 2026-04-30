import { Router } from "express";
import { register, verifyEmail } from "./auth.controller.js";

const authRouter = Router();
authRouter.post("/register", register);
authRouter.post("/verify-email",verifyEmail)
export default authRouter;
