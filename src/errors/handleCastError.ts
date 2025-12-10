// src/errors/handleCastError.ts
import { Prisma } from "@prisma/client";
import { IGenericErrorMessage } from "../interfaces/common";

const handleCastError = (err: any) => {
  const errors: IGenericErrorMessage[] = [
    {
      path: "",
      message: "Invalid ID or data type",
    },
  ];

  const statusCode = 400;
  return {
    statusCode,
    message: "Cast Error",
    errorMessages: errors,
  };
};

export default handleCastError;
