# ---- Stage 1: Build ----
# Use an official Node.js LTS image as the base builder.
# This stage installs dependencies and compiles the Angular project into static files.
FROM node:20-alpine AS build

# Set working directory inside the container.
WORKDIR /app

# Copy only package.json and package-lock.json first so npm can cache layers
# between dependency changes without rebuilding from scratch.
COPY package.json package-lock.json ./

# Install all production and dev dependencies (required for ng build).
RUN npm ci --ignore-scripts

# Copy the rest of the source code into the container.
COPY . .

# Build the Angular application in production mode.
# Output goes to dist/Project_SamplePatientDataForms/browser/ (Angular default).
RUN npm run build -- --configuration production

# ---- Stage 2: Serve ----
# Use a minimal Nginx image to serve the built static files via HTTP on port 80.
FROM nginx:alpine AS serve

# Remove Nginx's default welcome page.
RUN rm -rf /usr/share/nginx/html/*

# Copy the Angular build output from the build stage into Nginx's web root.
COPY --from=build /app/dist/Project_SamplePatientDataForms/browser /usr/share/nginx/html

# (Optional) Mount a custom Nginx config if you need SPA routing support.
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 so the container can receive HTTP traffic.
EXPOSE 80

# Start Nginx in the foreground (keep the container running).
CMD ["nginx", "-g", "daemon off;"]
