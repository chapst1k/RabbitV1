FROM node:20-alpine

# Install sqlite3 and dependencies
RUN apk add --no-cache sqlite

WORKDIR /app
COPY . .
RUN npm install

EXPOSE 8000
CMD ["node", "server.js"]