# 서버(고품질 TTS + MP4 렌더링 + 환자용 MP4 링크) 컨테이너.
#   docker build -t psgresult .
#   docker run -p 3123:3123 --env-file .env -v psg-output:/app/server/output psgresult
# Cloud Run / Fly.io / Render 등 컨테이너 호스팅에 그대로 올릴 수 있습니다 (메모리 2GB 이상 권장).
FROM node:22-bookworm-slim

# Remotion(Chrome Headless Shell) 실행에 필요한 라이브러리 + 한글 폰트
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev libxfixes3 \
    libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
    fonts-noto-cjk ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Chrome Headless Shell 을 이미지 빌드 시 미리 내려받는다
RUN npx remotion browser ensure
RUN npm run build

ENV PORT=3123
EXPOSE 3123
VOLUME ["/app/server/output"]
CMD ["node", "server/index.mjs"]
