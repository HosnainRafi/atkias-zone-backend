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
    host: process.env.SMTP_HOST || "mail.outfitro.com",
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER || "order@outfitro.com",
    pass: process.env.SMTP_PASS,
    adminEmail: process.env.ADMIN_EMAIL,
  },
  bkash: {
    appKey: process.env.BKASH_APP_KEY,
    appSecret: process.env.BKASH_APP_SECRET,
    username: process.env.BKASH_USERNAME,
    password: process.env.BKASH_PASSWORD,
    // Sandbox base URL — switch to production URL when going live:
    // https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized
    baseUrl:
      process.env.BKASH_BASE_URL ||
      "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized",
  },
  backendUrl: process.env.BACKEND_URL || "http://localhost:5000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};
