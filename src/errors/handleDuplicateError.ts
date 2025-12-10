// src/errors/handleDuplicateError.ts
import { IGenericErrorMessage } from "../interfaces/common";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleDuplicateError = (err: any) => {
  const errors: IGenericErrorMessage[] = [];

  // Prisma P2002 error
  if (err.code === "P2002") {
    const target = err.meta?.target;
    const message = target
      ? `Duplicate value error. The field '${target}' already exists.`
      : "Duplicate value error.";

    errors.push({
      path: target ? String(target) : "",
      message: message,
    });
  }

  const statusCode = 409; // 409 Conflict is often used for duplicate resources
  return {
    statusCode,
    message: "Duplicate Key Error",
    errorMessages: errors,
  };
};

export default handleDuplicateError;
