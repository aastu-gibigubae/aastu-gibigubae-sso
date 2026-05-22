import { Router } from "express";
import { login,  passwordResetRequestController,  passwordVerify,  refresh,  register, updatePassword, verifyEmail } from "./auth.controller.js";
import { authenticate } from "../../middlewares/authenticate.middleware.js";

const authRouter = Router();
authRouter.post("/register", register);
authRouter.post("/login",login);
authRouter.post("/refresh",refresh);
authRouter.post("/verify-email",verifyEmail);
authRouter.post("/password-reset/request",passwordResetRequestController)
authRouter.post("/password-reset/verify",passwordVerify);
authRouter.patch("/update-password", authenticate, updatePassword);
export default authRouter;
