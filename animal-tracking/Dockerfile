FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy backend and frontend code
COPY backend ./backend
COPY frontend ./frontend

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Install and build frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Return to backend and expose port
WORKDIR /app/backend

EXPOSE 8000

# Start backend server
CMD ["npm", "run", "dev"]
