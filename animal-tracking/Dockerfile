FROM node:20-alpine

# Install optional build dependencies (if needed by npm packages)
RUN apk add --no-cache python3 make g++ && \
    npm install -g serve

WORKDIR /app
COPY . .

RUN npm install
RUN npm run build

# Set the default command to serve the build directory
CMD ["serve", "-s", "build", "-l", "3000"]
