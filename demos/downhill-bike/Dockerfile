FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY build ./build
COPY tools/crew-server.cjs ./tools/crew-server.cjs
COPY src/track.js ./src/track.js
COPY src/expedition.js ./src/expedition.js
COPY src/landscape.js ./src/landscape.js
USER node
ENV NODE_ENV=production
EXPOSE 8184
CMD ["node", "tools/crew-server.cjs"]
