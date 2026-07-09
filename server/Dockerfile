# Stage 1: Build Environment
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package files and install ALL dependencies (including devDependencies for TS)
COPY package*.json ./
RUN npm install

# Copy source code and build TypeScript to /dist
COPY . .
RUN npm run build

# Stage 2: Production Environment
FROM node:20-alpine

WORKDIR /usr/src/app

# Set node environment to production
ENV NODE_ENV=production

# Copy package files and install ONLY production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled JavaScript from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port your Express app runs on
EXPOSE 5001

# Start the Node process
CMD ["node", "dist/server.js"]