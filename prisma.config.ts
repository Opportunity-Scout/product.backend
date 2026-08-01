import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// .env only exists locally; CI/production set DATABASE_URL directly, no file to load
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
