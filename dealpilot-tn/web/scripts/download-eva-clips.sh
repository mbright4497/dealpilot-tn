#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  # fallback to .env
  ENV_FILE="$ROOT_DIR/.env"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "No .env.local or .env found in $ROOT_DIR. Please create one with HEYGEN_API_KEY." >&2
  exit 1
fi

# load HEYGEN_API_KEY
HEYGEN_API_KEY="$(grep -E '^HEYGEN_API_KEY=' "$ENV_FILE" | head -n1 | cut -d'=' -f2- | tr -d '\"')"
if [ -z "$HEYGEN_API_KEY" ]; then
  echo "HEYGEN_API_KEY not found in $ENV_FILE" >&2
  exit 1
fi

OUT_DIR="$ROOT_DIR/public/eva-clips"
mkdir -p "$OUT_DIR"

declare -A VIDEOS=(
  ["0674ca82bd074315bf5ccf68be41aeb6"]="eva-idle.mp4"
  ["706e9a954ba048158d887dace6e3784e"]="eva-greeting.mp4"
  ["cb1287ceb31f4404958a8053be92bba7"]="eva-thinking.mp4"
  ["c4bb2f76931048d8ab46f5a189f44060"]="eva-goodbye.mp4"
)

for id in "${!VIDEOS[@]}"; do
  filename="${VIDEOS[$id]}"
  echo "Fetching video_id=$id -> $filename"
  resp=$(curl -s -H "X-Api-Key: $HEYGEN_API_KEY" "https://api.heygen.com/v1/video_status.get?video_id=$id")
  if [ -z "$resp" ]; then
    echo "Empty response for video_id=$id" >&2
    continue
  fi
  # try to extract download url
  video_url=$(echo "$resp" | jq -r '.data.video.download_url // .data.video_url // .download_url // empty') || true
  if [ -z "$video_url" ] || [ "$video_url" = "null" ]; then
    echo "Could not find download URL in response for $id. Response:" >&2
    echo "$resp" >&2
    continue
  fi
  echo "Downloading $video_url -> $OUT_DIR/$filename"
  curl -L "$video_url" -o "$OUT_DIR/$filename"
  echo "Downloaded $filename"
done

echo "Done. Add and commit the files: git add public/eva-clips/*.mp4 scripts/download-eva-clips.sh && git commit -m 'feat(assets): add Eva v2 video clips for agent UI' && git push"
