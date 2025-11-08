// src/config/index.ts
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV,
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS),
  jwt: {
    secret: process.env.JWT_SECRET,
    expires_in: process.env.JWT_EXPIRES_IN,
  },
  smtp: {
    host: process.env.SMTP_HOST || 'mail.outfitro.com',
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER || 'order@outfitro.com',
    pass: process.env.SMTP_PASS,
    adminEmail: process.env.ADMIN_EMAIL,
  },
};
