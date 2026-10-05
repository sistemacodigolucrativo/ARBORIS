FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run lint && npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src/types ./src/types
COPY --from=build /app/src/services/gameEngine.ts /app/src/services/adminGameEngine.ts ./src/services/
COPY --from=build /app/data ./data
USER node
EXPOSE 3001
CMD ["npm", "start"]
