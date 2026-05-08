import { Router } from "express";
import { login, PasswordResetRequestController, register, verifyEmail } from "./auth.controller.js";

const authRouter = Router();
authRouter.post("/register", register);
authRouter.post("/verify-email",verifyEmail);
authRouter.post("/login",login);
authRouter.post("/password-reset/request",PasswordResetRequestController)
export default authRouter;
