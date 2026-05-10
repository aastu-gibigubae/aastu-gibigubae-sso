import { AppError } from "../types/error.js";

export const errorService = (message: string, status: number) => {
  const error: AppError = new Error(message);
  error.status = status;
  throw error;
};
