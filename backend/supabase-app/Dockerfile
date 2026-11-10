FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --chown=node:node src ./src
COPY --chown=node:node database ./database
# Supabase CA certificate (public, optional) used by database/migrate.js when SUPABASE_DB_SSL_CA is set.
COPY --chown=node:node certs ./certs

# Run as the unprivileged "node" user, never root.
USER node
EXPOSE 4002
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4002)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Same image runs the API (default), the cron worker (node src/worker.js) and migrations.
CMD ["node", "src/server.js"]
