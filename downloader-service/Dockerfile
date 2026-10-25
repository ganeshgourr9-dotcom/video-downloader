FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DENO_INSTALL=/usr/local

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl unzip git \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir --pre -r requirements.txt
COPY app.py ./app.py
RUN useradd --create-home --uid 10001 appuser && mkdir -p /tmp/videodrop && chown -R appuser:appuser /tmp/videodrop /app
USER appuser
EXPOSE 10000
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-10000}"]
