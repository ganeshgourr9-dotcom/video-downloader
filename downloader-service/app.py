import ipaddress
import logging
import os
import re
import shutil
import socket
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

logger = logging.getLogger("videodrop.downloader")

class YtDlpLogBridge:
    """Expose useful yt-dlp extraction diagnostics in Render logs."""

    def debug(self, message):
        message = str(message)
        if any(term in message.lower() for term in (
            "http error", "player", "api json", "webpage", "token",
            "client", "warning", "error", "downloading", "response",
        )):
            logger.info("yt-dlp: %s", message[:1200])

    def warning(self, message):
        logger.warning("yt-dlp: %s", str(message)[:1200])

    def error(self, message):
        logger.error("yt-dlp: %s", str(message)[:1200])


YTDLP_LOG_BRIDGE = YtDlpLogBridge()

app = FastAPI(title="VideoDrop Downloader API", version="0.1.0")
origins = [item.strip().rstrip("/") for item in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type"])

TEMP_ROOT = Path(os.getenv("DOWNLOAD_TMP_DIR", "/tmp/videodrop"))
TEMP_ROOT.mkdir(parents=True, exist_ok=True)
MAX_DURATION_SECONDS = int(os.getenv("MAX_DURATION_SECONDS", "3600"))
MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", str(500 * 1024 * 1024)))


class UrlRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


class DownloadRequest(UrlRequest):
    format: str = Field(pattern="^(mp4|mp3)$")


def validate_public_url(value: str) -> str:
    try:
        parsed = urlparse(value.strip())
        if parsed.scheme not in ("https", "http") or not parsed.hostname:
            raise ValueError("Only HTTP(S) URLs are supported.")
        if parsed.username or parsed.password:
            raise ValueError("URLs containing credentials are not supported.")
        host = parsed.hostname.rstrip(".").lower()
        if host in {"localhost", "localhost.localdomain"} or host.endswith((".localhost", ".local")):
            raise ValueError("Local network URLs are not supported.")
        try:
            addresses = {ipaddress.ip_address(host)}
        except ValueError:
            addresses = {ipaddress.ip_address(item[4][0]) for item in socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)}
        if not addresses or any(not address.is_global for address in addresses):
            raise ValueError("Private or non-public network addresses are not supported.")
        return value.strip()
    except (ValueError, OSError, socket.gaierror) as exc:
        raise HTTPException(status_code=400, detail=str(exc) or "Invalid URL.") from exc


def extractor_args() -> dict:
    # BgUtils is disabled. Try a documented alternate YouTube client set because
    # the default client selection currently returns no player response on Render.
    clients = ["web", "mweb", "tv"]
    logger.info("YouTube extraction: BgUtils disabled; trying player clients %s", ",".join(clients))
    return {"youtube": {"player_client": clients}}

def extract_info(url: str) -> dict:
    options = {
        "quiet": False,
        "no_warnings": False,
        "noplaylist": True,
        "skip_download": True,
        "socket_timeout": 20,
        "extractor_retries": 1,
        "ignoreerrors": False,
        "extractor_args": extractor_args(),
        "verbose": True,
        "logger": YTDLP_LOG_BRIDGE,
    }
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as exc:
        logger.exception("yt-dlp metadata extraction failed (%s): %s", type(exc).__name__, exc)
        raise HTTPException(status_code=422, detail="Video details could not be retrieved. The source may block extraction or require access. Please wait before retrying if YouTube returns 429.") from exc
    if not info or info.get("is_live"):
        raise HTTPException(status_code=422, detail="This video is unavailable or live streams are not supported.")
    duration = info.get("duration")
    if duration and duration > MAX_DURATION_SECONDS:
        raise HTTPException(status_code=413, detail="Video exceeds the configured duration limit.")
    return info


@app.get("/health")
def health():
    return {"ok": True, "service": "videodrop-downloader", "yt_dlp_version": yt_dlp.version.__version__}


@app.post("/api/info")
def info(request: UrlRequest):
    data = extract_info(validate_public_url(request.url))
    qualities = {}
    for item in data.get("formats") or []:
        if item.get("vcodec") != "none" and item.get("height"):
            height = int(item["height"])
            qualities[height] = {"height": height, "label": f"{height}p"}
    return {"title": data.get("title") or "Video", "duration": data.get("duration"), "thumbnail": data.get("thumbnail"), "extractor": data.get("extractor_key"), "formats": sorted(qualities.values(), key=lambda item: item["height"], reverse=True)[:8], "mp3_available": True}


@app.post("/api/download")
def download(request: DownloadRequest, background_tasks: BackgroundTasks):
    url = validate_public_url(request.url)
    info_data = extract_info(url)
    safe_title = re.sub(r"[^A-Za-z0-9._-]+", "-", info_data.get("title") or "videodrop-video").strip("-._")[:80] or "videodrop-video"
    tmp = tempfile.mkdtemp(prefix="job-", dir=TEMP_ROOT)
    output = str(Path(tmp) / "%(title).80B.%(ext)s")
    options = {
        "quiet": False,
        "no_warnings": False,
        "noplaylist": True,
        "socket_timeout": 20,
        "retries": 1,
        "fragment_retries": 1,
        "extractor_retries": 1,
        "extractor_args": extractor_args(),
        "verbose": True,
        "outtmpl": output,
        "max_filesize": MAX_FILE_BYTES,
        "overwrites": True,
    }
    if request.format == "mp3":
        options.update({"format": "bestaudio/best", "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}]})
    else:
        options.update({"format": "best[ext=mp4][height<=1080]/best[height<=1080]/best", "merge_output_format": "mp4"})
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            ydl.download([url])
        extensions = {".mp3"} if request.format == "mp3" else {".mp4", ".mkv", ".webm", ".mov"}
        matches = [item for item in Path(tmp).iterdir() if item.is_file() and item.suffix.lower() in extensions]
        if not matches:
            raise HTTPException(status_code=422, detail="No supported output file was created.")
        file_path = matches[0]
        if file_path.stat().st_size > MAX_FILE_BYTES:
            raise HTTPException(status_code=413, detail="Output exceeds the configured file size limit.")
        background_tasks.add_task(shutil.rmtree, tmp, True)
        media_type = "audio/mpeg" if request.format == "mp3" else ("video/mp4" if file_path.suffix.lower() == ".mp4" else "application/octet-stream")
        return FileResponse(path=file_path, media_type=media_type, filename=f"{safe_title}.{request.format}", background=background_tasks)
    except HTTPException:
        shutil.rmtree(tmp, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(tmp, ignore_errors=True)
        logger.exception("yt-dlp download failed (%s): %s", type(exc).__name__, exc)
        raise HTTPException(status_code=422, detail="Download failed. The source may require authentication, block extraction, or use an unsupported format.") from exc
