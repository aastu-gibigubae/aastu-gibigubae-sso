import type { NextFunction, Request, Response } from "express";
import type { AppError } from "../types/error.js";

const errorMiddleware = async (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};
export default errorMiddleware