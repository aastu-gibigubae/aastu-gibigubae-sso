import { Router } from "express";
import { getAll, getMe, updateEmail, updateProfile } from "./users.controller.js";
import {
  authenticate,
  authorizePermissions,
  authorizeRoles,
} from "../../middlewares/authenticate.middleware.js";
import { Role } from "../../generated/prisma/enums.js";

const userRouter = Router();
userRouter.get("/me", authenticate, getMe);
userRouter.get(
  "/",
  authenticate,
  authorizeRoles(Role.admin, Role.subAdmin),
  authorizePermissions("SEE-USERS"),
  getAll,
);
userRouter.patch("/update-profile", authenticate, updateProfile);
userRouter.patch("/update-email",authenticate,updateEmail);

export default userRouter;
