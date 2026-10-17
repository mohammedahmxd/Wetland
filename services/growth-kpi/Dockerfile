FROM node:22-alpine
WORKDIR /app/services/growth-kpi
COPY packages/mcp-runtime /app/packages/mcp-runtime
RUN cd /app/packages/mcp-runtime && npm ci --omit=dev --ignore-scripts
COPY services/growth-kpi/package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY services/growth-kpi/ ./
USER node
ENV PORT=8080
EXPOSE 8080
CMD ["node","server.mjs","--http"]
