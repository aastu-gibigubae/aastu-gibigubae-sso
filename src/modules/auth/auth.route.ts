import { Router } from "express";
import { login, passwordResetRequestController, passwordVerify, register, verifyEmail } from "./auth.controller.js";

const authRouter = Router();
authRouter.post("/register", register);
authRouter.post("/verify-email",verifyEmail);
authRouter.post("/login",login);
authRouter.post("/password-reset/request",passwordResetRequestController)
authRouter.post("/password-reset/verify",passwordVerify);
export default authRouter;
