# Dockerfile Explanation — Patient Data Forms (Angular 21)

This multi-stage Dockerfile compiles the Angular application and serves the resulting static files with Nginx.

## Structure

```
Stage 1 → build    (Node.js image — compiles the app)
Stage 2 → serve    (Nginx Alpine image — serves static files)
```

---

## Stage 1: Build

| Line | Purpose |
|------|---------|
| `FROM node:20-alpine AS build` | Starts from a small Node.js 20 Alpine Linux image. Named `build` so the next stage can reference compiled output via `COPY --from=build`. |
| `WORKDIR /app` | Sets `/app` as the working directory inside the container. All subsequent commands run relative to this path. |
| `COPY package.json package-lock.json ./` | Copies only the lock files into the container first. This lets Docker reuse its layer cache for `npm ci` — as long as these two files don't change, the dependency installation step skips. |
| `RUN npm ci --ignore-scripts` | Installs all dependencies **exactly** as pinned in `package-lock.json`. `--ignore-scripts` skips any post-install scripts (e.g., native addon compilation) since they're not needed here. Faster and safer than `npm install`. |
| `COPY . .` | Copies the entire source tree (Angular config, TypeScript source, assets). Placed *after* `npm ci` so layer caching still works. |
| `RUN npm run build -- --configuration production` | Runs Angular's production build (`ng build --configuration production`). Outputs compiled HTML, JS bundles, and CSS to `dist/Project_SamplePatientDataForms/browser/`. |

## Stage 2: Serve

| Line | Purpose |
|------|---------|
| `FROM nginx:alpine AS serve` | Starts from a tiny (~5 MB) Nginx Alpine image. This is what actually runs when you start the container. |
| `RUN rm -rf /usr/share/nginx/html/*` | Deletes Nginx's default "Welcome to nginx!" page so it doesn't conflict with the Angular app. |
| `COPY --from=build /app/dist/Project_SamplePatientDataForms/browser /usr/share/nginx/html` | Copies only the **compiled output** from the `build` stage into Nginx's document root. The final image contains only static files + Nginx — no Node, no source code, keeping the image small (~30 MB). |
| `EXPOSE 80` | Documents that the container listens on port 80. Does not publish the port by itself — you must map it at runtime with `-p 8080:80`. |
| `CMD ["nginx", "-g", "daemon off;"]` | Tells Docker how to start the container. Nginx normally forks to the background; `-g daemon off;` forces it to stay in the foreground so Docker keeps the container alive. |

---

## Running

### Build and run locally

```bash
# Build the Docker image
docker build -t patient-data-forms .

# Run the container, mapping host port 4200 → container port 80
docker run -d -p 4200:80 --name pdf-app patient-data-forms
```

Then open [http://localhost:4200](http://localhost:4200) in your browser.

### Using docker-compose

Create a `docker-compose.yml` alongside this Dockerfile:

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "4200:80"
```

Then:
```bash
docker compose up -d
```

---

## Custom Nginx config (SPA routing)

If your app uses client-side routing (e.g., navigating to `/step/2`), add this
Nginx config so refreshes work correctly:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Try serving requested file, then fall back to index.html (SPA route support)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Uncomment line 29 in the Dockerfile (`COPY nginx.conf ...`) after creating this file as `nginx.conf` next to the Dockerfile.
