# 수면다원검사 결과 안내 (PSG Result Explainer)

수면다원검사(PSG) 결과 PDF(REM Logic 형식)를 드래그 앤 드롭하면

1. **환자용 설명 영상**이 자동으로 만들어져 재생되고 (Remotion + 음성 안내 + 자막)
2. 기존과 같은 **지표 시각화 대시보드**가 아래에 표시됩니다.

영상은 PPT 「진료 전에 먼저 보세요 – 수면다원검사 결과 안내」의 흐름을 따르되, 환자 본인의 수치(AHI, 최저 산소포화도, 자세별 RMI, 코골이, N3/REM, RDI, 수면 시간/효율)가 장면과 나레이션에 그대로 들어갑니다.

| 장면 | 내용 |
|---|---|
| 1 | 진료 전에 먼저 보세요 (인트로) |
| 2 | 오늘 무엇을 봤나요 — 숨·산소·자세·잠의 질 + 실제 수면 시간/효율 |
| 3 | 기억할 숫자는 하나, AHI — 정상/경증/중등도/중증 스케일 위에 환자 수치 |
| 4 | 산소는 얼마나 떨어졌나요 — 최저 SpO₂ 게이지 |
| 5 | 자세에 따라 달라지나요 — 자세별 RMI 막대, 코골이 비율, 자세 의존성 판정 |
| 6 | 얼마나 깊이 잤나요 — N3 / REM 도넛, RDI |
| 7 | 그래서 낮에 어떤 일이 생기나요 |
| 8 | 진료실에서 고를 수 있는 다음 단계 — 중증도에 맞는 선택지 강조 |
| 9 | 진료실에서 확인할 세 가지 (아웃트로) |

영상은 따뜻한 크림색 배경에 세리프 헤드라인, 장면마다 손그림 느낌의 일러스트가 들어가는 에디토리얼 스타일입니다 (`src/remotion/ui.tsx` 의 `T` 에서 색·폰트 변경, `src/remotion/illustrations.tsx` 에 일러스트).

나레이션은 수치에 따라 문장이 달라집니다 (예: 중등도 이상이면 양압기 우선 언급, 바로 누울 때만 심하면 자세 교정 언급, 값을 못 읽으면 "진료실에서 확인해 드립니다").

## 빠른 시작

```bash
npm install
npm run dev        # http://localhost:5173
```

PDF 를 올리거나 「예시 결과로 영상 미리보기」를 누르면 영상 패널이 나타납니다.
**음성은 브라우저 내장 음성(Web Speech API)** 을 쓰므로 서버나 API 키 없이 바로 동작합니다.
Chrome / Edge 에서 한국어 음성이 가장 자연스럽습니다. (Windows 에 한국어 음성이 없으면 설정 → 시간 및 언어 → 음성에서 추가)

### 병원 PC / 웹서버에 배포

```bash
npm run build      # dist/ 생성 — 정적 파일이므로 아무 웹서버에나 올리면 됩니다
npm run preview    # 빌드 결과 미리보기
```

PDF 는 브라우저 안에서만 처리되며 서버로 전송되지 않습니다.

## 선택 기능: 고품질 음성 + MP4 저장

브라우저 음성 대신 클라우드 TTS 를 쓰고, 영상을 MP4 파일로 저장하려면 서버를 함께 띄웁니다.

```bash
cp .env.example .env      # OPENAI_API_KEY 등 입력
npm run build
npm run server            # http://localhost:3123  (dist/ 도 함께 서빙)
```

- 화면에 「🔊 고품질 음성으로 듣기」와 「⬇ MP4 저장」 버튼이 나타납니다.
- TTS 공급자: `openai`(기본, API 키 필요) 또는 `edge`(무료·비공식, `npm i msedge-tts` 후 `TTS_PROVIDER=edge`).
- MP4 렌더링에는 Chrome 이 필요합니다. 없으면 Remotion 이 자동으로 내려받습니다. 리눅스 서버에서는 한글 폰트(예: `fonts-noto-cjk`)를 설치해 주세요.
- 개발 중에는 `npm run dev` 와 `npm run server` 를 동시에 띄우면 vite 가 `/api`, `/media` 를 서버로 프록시합니다.

### 명령줄에서 렌더링

```bash
npm run render                                  # 예시 값 → out/psg-sample.mp4 (자막만)
npm run render -- values.json out/kim.mp4       # values.json 의 수치로
npm run render -- values.json out/kim.mp4 --tts # .env 의 TTS 로 음성까지 포함
npm run studio                                  # Remotion Studio 로 장면 편집·미리보기
```

`values.json` 예시:

```json
{ "ahi": 22.4, "rdi": 25.3, "lowestspo2": 82, "n3pct": 8.2, "rempct": 18.5,
  "snorepct": 34, "rmiSupine": 43.2, "rmiLeft": 18.5, "rmiRight": 21.0, "tst": 372, "eff": 85 }
```

## 프로젝트 구조

```
src/
  psg/extract.ts        PDF → 텍스트 → 수치 (기존 psgviewer.html 로직 그대로)
  psg/metrics.ts        지표 정의·구간 색상 (대시보드·영상 공통)
  psg/script.ts         수치 → 장면별 나레이션 대본, 장면 길이 계산
  remotion/             Remotion 컴포지션 (PsgExplainer) 과 9개 장면
  components/           업로드 UI, 대시보드, 영상 패널
  tts/useNarration.ts   Remotion Player ↔ 브라우저 TTS 동기화
  tts/api.ts            서버 TTS / MP4 렌더 API 클라이언트
server/                 (선택) TTS·렌더 서버
scripts/render.mjs      (선택) CLI 렌더링
legacy/psgviewer.html   업그레이드 전 단일 HTML 버전
```

### 음성 동기화 방식

브라우저 음성은 길이를 미리 알 수 없어서, 글자 수로 장면 길이를 추정한 뒤 **장면 끝에서 발화가 끝날 때까지 기다렸다가** 다음 장면으로 넘어갑니다. 서버 TTS 를 쓰면 실제 오디오 길이로 장면 길이를 확정하므로 정확히 맞습니다.

### 기준값 참고

- 영상의 AHI 구간은 표준 기준(정상 <5 / 경증 5–15 / 중등도 15–30 / 중증 ≥30)을 씁니다 (`src/remotion/scenes/Ahi.tsx`, `ahiSeverity` in `src/psg/script.ts`).
- 대시보드의 AHI 막대는 기존 파일의 구간(…/중등도 15–22 / 중증 22–30)을 그대로 유지했습니다 (`src/psg/metrics.ts`). 한쪽으로 통일하려면 두 곳의 숫자를 맞춰 주세요.
- 나레이션 문구는 `src/psg/script.ts` 에서 자유롭게 고칠 수 있습니다.

이 영상은 결과 안내이며, 진단과 치료는 담당 의사가 결정합니다.
