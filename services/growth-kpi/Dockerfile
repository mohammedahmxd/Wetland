FROM node:22-alpine
RUN apk add --no-cache python3 py3-reportlab py3-pypdf py3-pillow poppler-utils
WORKDIR /app/services/growth-kpi
COPY packages/mcp-runtime /app/packages/mcp-runtime
COPY packages/mcp-skills /app/packages/mcp-skills
COPY packages/mcp-reporting /app/packages/mcp-reporting
RUN cd /app/packages/mcp-runtime && npm ci --omit=dev --ignore-scripts
COPY services/growth-kpi/package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY services/growth-kpi/ ./
USER node
ENV PORT=8080
EXPOSE 8080
CMD ["node","server.mjs","--http"]
