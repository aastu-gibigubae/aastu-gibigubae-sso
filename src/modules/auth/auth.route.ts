import { Router } from "express";
import { login,  register } from "./auth.controller.js";

const authRouter = Router();
authRouter.post("/register", register);
authRouter.post("/login",login);
// authRouter.post("/verify-email",verifyEmail);

// authRouter.post("/password-reset/request",passwordResetRequestController)
// authRouter.post("/password-reset/verify",passwordVerify);
export default authRouter;
