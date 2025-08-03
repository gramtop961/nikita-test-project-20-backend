# You can use most Debian-based base images
FROM node:21-slim

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY compile_backend.sh /compile_backend.sh
RUN chmod +x /compile_backend.sh

# Set working directory
WORKDIR /home/user

# Copy the backend application files
COPY . .

# Install dependencies
RUN npm install

# Build the TypeScript application
RUN npm run build