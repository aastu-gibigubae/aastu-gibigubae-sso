import { Router } from "express";
import { getMe } from "./users.controller.js";
import { authenticate } from "../../middlewares/authenticate.middleware.js";


const userRouter = Router();
userRouter.get("/me", authenticate, getMe);

export default userRouter;
