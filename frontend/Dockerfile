# Use an official Node runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package dependencies files
COPY package*.json ./

# Install packages
RUN npm install

# Copy the rest of the application code
COPY . .

# Set environment variables for Next.js build
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOST=0.0.0.0

# Build the Next.js production build
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
