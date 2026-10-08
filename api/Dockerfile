FROM node:22-bookworm-slim

COPY api/postgrest /usr/local/bin/postgrest
RUN chmod +x /usr/local/bin/postgrest

WORKDIR /app
COPY api/package.json api/package-lock.json api/
COPY api/server.mjs api/authCrypto.mjs api/
COPY src/lib/manageAccounts.ts src/lib/jiraApprovedImport.ts src/lib/
WORKDIR /app/api
RUN npm ci --omit=dev
ENV PORT=8080
EXPOSE 8080
CMD ["node", "--experimental-strip-types", "server.mjs"]
