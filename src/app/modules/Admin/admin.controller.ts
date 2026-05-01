// src/app/modules/Admin/admin.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TAdmin, TLoginAdminResponse } from './admin.interface';
import { AdminService } from './admin.service';

const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.createAdminIntoDB(req.body);
  sendResponse<TAdmin>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Admin created successfully!',
    data: result,
  });
});

const loginAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.loginAdmin(req.body);
  sendResponse<TLoginAdminResponse>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin logged in successfully!',
    data: result,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getMeFromDB(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile retrieved!',
    data: result,
  });
});

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllAdminsFromDB();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admins retrieved!',
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.changePasswordInDB(
    req.user!.userId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password changed successfully!',
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.updateProfileInDB(
    req.user!.userId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile updated!',
    data: result,
  });
});

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await AdminService.updateAdminInDB(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin updated!',
    data: result,
  });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await AdminService.deleteAdminFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin deleted!',
    data: null,
  });
});

export const AdminController = {
  createAdmin,
  loginAdmin,
  getMe,
  getAllAdmins,
  changePassword,
  updateProfile,
  updateAdmin,
  deleteAdmin,
};
