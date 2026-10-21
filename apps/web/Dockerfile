FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/domain/package.json packages/domain/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY packages/domain packages/domain
COPY apps/web apps/web
COPY i18n/translations i18n/translations
COPY presentation/static presentation/static
RUN npm run build -w @fcc/domain && npm run build -w @fcc/web

FROM nginx:alpine
COPY docker/nginx/fcc-web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY --from=build /repo/presentation/static /usr/share/nginx/html/static
EXPOSE 80
