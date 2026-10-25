FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DENO_INSTALL=/usr/local

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl unzip git \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://deno.land/install.sh | sh -s -- -y \
    && deno --version

# Install the BgUtils PO-token provider server matching the Python plugin version.
RUN git clone --depth 1 --branch 2.0.2 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil-ytdlp-pot-provider \
    && cd /opt/bgutil-ytdlp-pot-provider/server \
    && deno install --allow-scripts=npm:canvas --frozen

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir --pre -r requirements.txt
COPY app.py ./app.py
RUN useradd --create-home --uid 10001 appuser && mkdir -p /tmp/videodrop && chown -R appuser:appuser /tmp/videodrop /app /opt/bgutil-ytdlp-pot-provider
USER appuser
EXPOSE 10000
CMD ["sh", "-c", "(cd /opt/bgutil-ytdlp-pot-provider/server/node_modules && deno run --allow-env --allow-net --allow-ffi=. --allow-read=. ../src/main.ts --host 127.0.0.1) & until curl -sS --max-time 2 http://127.0.0.1:4416/ >/dev/null; do sleep 1; done; exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-10000}"]
