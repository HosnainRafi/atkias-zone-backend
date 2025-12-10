// src/app/modules/Admin/admin.service.ts
import httpStatus from "http-status";
import { Secret } from "jsonwebtoken";
import bcrypt from "bcrypt";
import config from "../../../config";
import ApiError from "../../../errors/ApiError";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import prisma from "../../../shared/prisma";
import { TAdmin, TLoginAdmin, TLoginAdminResponse } from "./admin.interface";

const createAdminIntoDB = async (payload: TAdmin): Promise<TAdmin> => {
  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (existingAdmin) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Admin with this email already exists."
    );
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds)
  );

  const result = await prisma.admin.create({
    data: {
      ...payload,
      password: hashedPassword,
    },
  });

  return result as unknown as TAdmin;
};

const loginAdmin = async (
  payload: TLoginAdmin
): Promise<TLoginAdminResponse> => {
  const { email, password } = payload;

  // 1. Check if admin exists
  const admin = await prisma.admin.findUnique({
    where: {
      email,
    },
  });

  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin account not found.");
  }

  // 2. Check if password is correct
  const isPasswordMatched = await bcrypt.compare(password, admin.password);

  if (!isPasswordMatched) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password.");
  }

  // 3. Create JWT payload
  const jwtPayload = {
    userId: admin.id,
    role: admin.role,
  };

  // 4. Generate Access Token
  const accessToken = jwtHelpers.createToken(
    jwtPayload,
    config.jwt.secret as Secret,
    config.jwt.expires_in as string
  );

  // 5. Format admin data to return (excluding password)
  const adminData = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role as any,
  };

  return {
    accessToken,
    adminData,
  };
};

export const AdminService = {
  createAdminIntoDB,
  loginAdmin,
};
