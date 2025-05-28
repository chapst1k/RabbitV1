FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend and frontend files
COPY backend ./backend
COPY . .

# Install backend deps with Express 4
WORKDIR /app/backend
RUN npm install express@4
RUN npm install

# Build frontend
WORKDIR /app
RUN npm install && npm run build

# Return to backend
WORKDIR /app/backend
EXPOSE 8000
CMD ["npm", "start"]
