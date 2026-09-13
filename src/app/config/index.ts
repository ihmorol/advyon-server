import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  NODE_ENV: process.env.NODE_ENV,
  port: process.env.PORT,
  db_user: process.env.DB_USER,
  db_password: process.env.DB_PASSWORD,
  database_url: process.env.DATABASE_URL,
  // Production database connection options
  db_options: {
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10'),
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '2'),
    serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT || '5000'),
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000'),
    maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME || '30000'),
  },
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  default_password: process.env.DEFAULT_PASS,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  reset_pass_ui_link: process.env.RESET_PASS_UI_LINK,
  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
  super_admin_password: process.env.SUPER_ADMIN_PASSWORD,
  clerk_secret_key: process.env.CLERK_SECRET_KEY,
  clerk_publishable_key: process.env.CLERK_PUBLISHABLE_KEY,
  openrouter_api_key: process.env.OPENROUTER_API_KEY,
  groq_api_key: process.env.GROQ_API_KEY,
  gemini_api_key: process.env.GEMINI_API_KEY,
  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  stripe_publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
  stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  metadata_cache_ttl: process.env.METADATA_CACHE_TTL_MS,
  metadata_db_enabled: process.env.METADATA_DB_ENABLED,
  support_kpi_enabled: process.env.SUPPORT_KPI_ENABLED,
  contact_email_from: process.env.CONTACT_EMAIL_FROM,
  contact_email_to: process.env.CONTACT_EMAIL_TO,
  contact_smtp_host: process.env.CONTACT_SMTP_HOST,
  contact_smtp_port: process.env.CONTACT_SMTP_PORT,
  contact_smtp_user: process.env.CONTACT_SMTP_USER,
  contact_smtp_pass: process.env.CONTACT_SMTP_PASS,
};
