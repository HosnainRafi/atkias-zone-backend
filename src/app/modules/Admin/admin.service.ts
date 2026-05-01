// src/app/modules/Admin/admin.service.ts
import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { Secret } from 'jsonwebtoken';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import prisma from '../../../shared/prisma';
import { TAdmin, TLoginAdmin, TLoginAdminResponse } from './admin.interface';

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
      'Admin with this email already exists.',
    );
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds),
  );

  const result = await prisma.admin.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      role: payload.role as any,
      mustChangePassword: true,
    },
  });

  const { password: _pw, ...rest } = result;
  return rest as unknown as TAdmin;
};

const loginAdmin = async (
  payload: TLoginAdmin,
): Promise<TLoginAdminResponse> => {
  const { email, password } = payload;

  // 1. Check if admin exists
  const admin = await prisma.admin.findUnique({
    where: {
      email,
    },
  });

  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Admin account not found.');
  }

  // 2. Check if admin is blocked
  if (admin.isBlocked) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Your account has been blocked. Contact super admin.',
    );
  }

  // 3. Check if password is correct
  const isPasswordMatched = await bcrypt.compare(password, admin.password);

  if (!isPasswordMatched) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password.');
  }

  // 4. Create JWT payload
  const jwtPayload = {
    userId: admin.id,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
  };

  // 5. Generate Access Token
  const accessToken = jwtHelpers.createToken(
    jwtPayload,
    config.jwt.secret as Secret,
    config.jwt.expires_in as string,
  );

  // 6. Format admin data to return (excluding password)
  const adminData = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role as any,
  };

  return {
    accessToken,
    mustChangePassword: admin.mustChangePassword,
    adminData,
  };
};

const getMeFromDB = async (
  adminId: string,
): Promise<Omit<TAdmin, 'password'>> => {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new ApiError(httpStatus.NOT_FOUND, 'Admin not found.');
  const { password: _pw, ...rest } = admin;
  return rest as unknown as Omit<TAdmin, 'password'>;
};

const getAllAdminsFromDB = async (): Promise<Omit<TAdmin, 'password'>[]> => {
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBlocked: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return admins as unknown as Omit<TAdmin, 'password'>[];
};

const changePasswordInDB = async (
  adminId: string,
  payload: { currentPassword: string; newPassword: string },
): Promise<{ accessToken: string }> => {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new ApiError(httpStatus.NOT_FOUND, 'Admin not found.');

  const matched = await bcrypt.compare(payload.currentPassword, admin.password);
  if (!matched)
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      'Current password is incorrect.',
    );

  const hashed = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );
  const updated = await prisma.admin.update({
    where: { id: adminId },
    data: { password: hashed, mustChangePassword: false },
  });

  const jwtPayloadNew = {
    userId: updated.id,
    role: updated.role,
    mustChangePassword: false,
  };
  const accessToken = jwtHelpers.createToken(
    jwtPayloadNew,
    config.jwt.secret as Secret,
    config.jwt.expires_in as string,
  );
  return { accessToken };
};

const updateProfileInDB = async (
  adminId: string,
  payload: { name: string },
): Promise<Omit<TAdmin, 'password'>> => {
  const result = await prisma.admin.update({
    where: { id: adminId },
    data: { name: payload.name.trim() },
  });
  const { password: _pw, ...rest } = result;
  return rest as unknown as Omit<TAdmin, 'password'>;
};

const updateAdminInDB = async (
  id: string,
  payload: Partial<Pick<TAdmin, 'name' | 'role' | 'isBlocked'>>,
): Promise<Omit<TAdmin, 'password'>> => {
  const admin = await prisma.admin.findUnique({ where: { id } });
  if (!admin) throw new ApiError(httpStatus.NOT_FOUND, 'Admin not found.');

  // Prevent modifying SUPER_ADMIN
  if (admin.role === 'SUPER_ADMIN') {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Cannot modify super admin account.',
    );
  }

  const result = await prisma.admin.update({
    where: { id },
    data: payload as any,
  });
  const { password: _pw, ...rest } = result;
  return rest as unknown as Omit<TAdmin, 'password'>;
};

const deleteAdminFromDB = async (id: string): Promise<void> => {
  const admin = await prisma.admin.findUnique({ where: { id } });
  if (!admin) throw new ApiError(httpStatus.NOT_FOUND, 'Admin not found.');

  if (admin.role === 'SUPER_ADMIN') {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Cannot delete super admin account.',
    );
  }

  await prisma.admin.delete({ where: { id } });
};

export const AdminService = {
  createAdminIntoDB,
  loginAdmin,
  getMeFromDB,
  getAllAdminsFromDB,
  changePasswordInDB,
  updateProfileInDB,
  updateAdminInDB,
  deleteAdminFromDB,
};
