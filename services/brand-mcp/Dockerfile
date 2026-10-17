FROM node:22-alpine
WORKDIR /app/services/brand-mcp
COPY packages/mcp-runtime /app/packages/mcp-runtime
RUN cd /app/packages/mcp-runtime && npm ci --omit=dev --ignore-scripts
COPY services/brand-mcp/package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY services/brand-mcp/ ./
USER node
ENV PORT=8080
EXPOSE 8080
CMD ["node","server.mjs"]
