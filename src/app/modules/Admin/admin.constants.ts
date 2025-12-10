// src/app/modules/Admin/admin.constants.ts

// Using 'as const' provides strong, literal types for the values
export const ADMIN_ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
} as const;

// An array version for Zod enum validation
export const AdminRole = ["SUPER_ADMIN", "ADMIN", "EDITOR"];
