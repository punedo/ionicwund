FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port 4200 for Angular dev server
EXPOSE 4200

# Start the development server
CMD ["npm", "run", "start", "--", "--host", "0.0.0.0", "--port", "4200"]
