import { Router } from "express";
import { login, register, verifyEmail } from "./auth.controller.js";

const authRouter = Router();
authRouter.post("/register", register);
authRouter.post("/verify-email",verifyEmail);
authRouter.post("/login",login);
export default authRouter;
