FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs mcp.mjs auth-policy.mjs mcp-auth.mjs auth-client.js ./
COPY dist ./dist
USER node
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
