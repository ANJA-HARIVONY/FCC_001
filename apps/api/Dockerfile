FROM node:22-bookworm-slim
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/domain/package.json packages/domain/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci
COPY packages/domain packages/domain
COPY apps/api apps/api
RUN npm run build -w @fcc/domain \
 && npm run prisma:generate -w @fcc/api \
 && npm run build -w @fcc/api
WORKDIR /repo/apps/api
ENV PORT=4000
EXPOSE 4000
CMD ["node", "dist/main.js"]
