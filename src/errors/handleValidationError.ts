// src/errors/handleValidationError.ts
import { IGenericErrorMessage } from "../interfaces/common";

const handleValidationError = (err: any) => {
  const errors: IGenericErrorMessage[] = [
    {
      path: "",
      message: err.message || "Validation Error",
    },
  ];
  const statusCode = 400;
  return {
    statusCode,
    message: "Validation Error",
    errorMessages: errors,
  };
};

export default handleValidationError;
