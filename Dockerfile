# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# --ignore-scripts: no .git/husky here, so npm's `prepare` hook would fail — run prisma generate ourselves.
RUN npm ci --ignore-scripts && npx prisma generate
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --omit=dev --ignore-scripts && npx prisma generate
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "--env-file=.env", "dist/main.js"]
