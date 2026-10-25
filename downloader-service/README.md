# VideoDrop downloader service

A separate container service for media extraction. It is designed to run on a container host (for example, Render or Railway), not inside a Cloudflare Worker. The Next.js frontend can call it after `NEXT_PUBLIC_DOWNLOADER_API_URL` is configured.

## Endpoints

- `GET /health` — service health.
- `POST /api/info` with `{"url":"https://..."}` — extract title and available formats.
- `POST /api/download` with `{"url":"https://...","format":"mp4"}` or `{"url":"https://...","format":"mp3"}` — produce a downloadable file.

## Run locally

```bash
docker build -t videodrop-downloader .
docker run --rm -p 8080:8080 -e ALLOWED_ORIGINS=http://localhost:3000 videodrop-downloader
```

## Deployment notes

Deploy this directory as a Docker service on a container host. Set `ALLOWED_ORIGINS` to the exact public VideoDrop origin (comma-separated only if needed), and configure the frontend's `NEXT_PUBLIC_DOWNLOADER_API_URL` to the service base URL. Do not deploy with wildcard CORS in production. Add rate limiting and a request quota at the hosting layer before public launch; this service consumes CPU and bandwidth. Some platforms may require login or may block extraction; private, paywalled, DRM-protected, or access-controlled content is not supported. Only download content you own or have permission to download.
