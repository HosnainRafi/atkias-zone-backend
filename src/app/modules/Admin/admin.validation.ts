// src/app/modules/Admin/admin.validation.ts
import { z } from 'zod';

const createAdminZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    email: z
      .string()
      .min(1, { message: 'Email is required' })
      .email('Invalid email address'),
    password: z
      .string()
      .min(1, { message: 'Password is required' })
      .min(6, 'Password must be at least 6 characters long'),
    role: z.enum(['ADMIN', 'EDITOR'] as [string, ...string[]], {
      message: 'Role must be ADMIN or EDITOR',
    }),
  }),
});

const loginAdminZodSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, { message: 'Email is required' })
      .email('Invalid email address'),
    password: z.string().min(1, { message: 'Password is required' }),
  }),
});

const updateProfileZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name is required' }),
  }),
});

export const AdminValidation = {
  createAdminZodSchema,
  loginAdminZodSchema,
  updateProfileZodSchema,
};
