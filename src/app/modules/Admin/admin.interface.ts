// src/app/modules/Admin/admin.interface.ts

// Type for the Admin Role
export type TAdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';

export type TAdmin = {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: TAdminRole;
  isBlocked?: boolean;
  mustChangePassword?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

// Interface for Zod validation on login
export type TLoginAdmin = Pick<TAdmin, 'email' | 'password'>;

// Interface for the login response
export type TLoginAdminResponse = {
  accessToken: string;
  mustChangePassword: boolean;
  adminData: {
    id: string;
    name: string;
    email: string;
    role: TAdminRole;
  };
};
