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
기본 음성은 브라우저 내장 음성(Web Speech API)이라 서버나 API 키 없이 바로 동작하지만 품질은 떨어집니다. 아래 「고품질 음성」을 설정하면 Google 음성으로 바뀝니다.

PDF 는 브라우저 안에서만 처리되며 서버로 전송되지 않습니다.

### 배포

- **GitHub Pages(자동)**: `main` 또는 `claude/**` 브랜치에 푸시하면 `.github/workflows/pages.yml` 이 빌드해서 배포합니다. 저장소 Settings → Pages → Source 는 "GitHub Actions" 여야 합니다.
- **직접**: `npm run build` 로 만든 `dist/` 를 아무 정적 웹서버에 올리면 됩니다.

## 환자용 링크 (서버 없이 동작)

영상 패널의 「📱 환자용 링크」를 누르면 링크·QR 코드가 나옵니다. 링크 복사 후 병원의 문자 발송 시스템이나 카카오톡에 붙여 넣어 보내면 됩니다.

- 링크에는 검사 **수치만** 들어 있습니다 (`#v=ahi:22.4;spo2:82;…`). 이름·생년월일 등 개인정보는 없어 링크만으로는 누구의 결과인지 알 수 없습니다.
- 환자 휴대폰에서 열면 업로드 화면 없이 영상만 나오고, 같은 수치로 영상이 다시 만들어져 재생됩니다. 서버에 아무것도 저장되지 않습니다.
- 고품질 음성(아래)이 배포 빌드에 설정돼 있으면 환자 휴대폰에서도 Google 음성이 나오고, 없으면 휴대폰 내장 음성(iPhone: 유나, Android: Google TTS)을 씁니다.

## 고품질 음성 (Google Cloud Text-to-Speech)

한국어 품질이 가장 좋은 Google **Chirp 3 HD** 음성을 기본으로 씁니다 (Neural2·WaveNet 도 선택 가능). 영상 하나가 약 1,500자라 Chirp 3 HD 기준 약 60원, Neural2 기준 약 30원입니다.

1. Google Cloud 콘솔에서 프로젝트를 만들고 **Cloud Text-to-Speech API** 를 사용 설정합니다.
2. 사용자 인증 정보 → **API 키** 를 만들고 반드시 제한을 겁니다.
   - 애플리케이션 제한: **HTTP 리퍼러** → `https://<계정>.github.io/*` (배포 주소)
   - API 제한: **Cloud Text-to-Speech API** 만
   - 할당량(Quotas)에서 일일 문자 수 한도 설정 (예: 500,000자/일)
3. 키를 넣는 방법 두 가지:
   - **이 브라우저에서만**: 영상 패널의 「⚙」 → Google Cloud TTS API 키 → 저장. (localStorage 에만 저장되어 환자 휴대폰에는 적용되지 않음)
   - **배포 빌드에 포함(환자 휴대폰까지 적용)**: 저장소 Settings → Secrets and variables → Actions → New repository secret → 이름 `GOOGLE_TTS_KEY`. 다음 배포부터 적용됩니다. 목소리를 바꾸려면 Variables 에 `GOOGLE_TTS_VOICE`(예: `ko-KR-Chirp3-HD-Kore`).

키는 빌드된 JS 에 그대로 들어가므로 위의 리퍼러·API 제한과 한도는 필수입니다. 키를 노출하고 싶지 않으면 아래 서버 방식(`GOOGLE_TTS_API_KEY`)을 쓰세요.

## 선택 기능: 서버 — MP4 다운로드 + 완성 영상 링크

MP4 파일이 필요하거나(다운로드, 병원 시스템 보관), 환자 휴대폰에서 아무 처리 없이 바로 재생되는 **완성 영상 링크**를 원하면 서버를 띄웁니다. 서버는 Remotion 으로 MP4 를 렌더링하고, `#m=<id>` 링크로 그 파일을 서빙합니다.

```bash
cp .env.example .env      # GOOGLE_TTS_API_KEY 등 입력
npm run build
npm run server            # http://localhost:3123  (dist/ 도 함께 서빙)
```

- 화면에 「⬇ MP4 만들기」 버튼이 나타납니다. 누르면 음성 합성 → 렌더링 → 「환자용 MP4 링크」와 「MP4 파일 다운로드」가 나옵니다.
- 음성은 서버의 TTS(`TTS_PROVIDER=google|openai|edge`)를 쓰고, 서버에 키가 없으면 브라우저에서 만든 Google 음성을 올려서 씁니다.
- GitHub Pages 화면에서 별도 서버를 쓰려면 「⚙」 → 서버 주소에 입력하거나 Actions Variables 에 `SERVER_URL` 을 넣습니다. 서버 `.env` 의 `PUBLIC_URL` 은 환자용 MP4 링크의 주소가 됩니다.
- 컨테이너로 올리려면 `Dockerfile` 을 쓰세요 (Cloud Run, Fly.io, Render 등 · 메모리 2GB 이상 권장). 렌더링 결과는 `server/output/` 에 남으므로 볼륨을 붙여 주세요.
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
  psg/share.ts          환자용 링크(#v=수치 / #m=MP4 id) 인코딩·디코딩
  remotion/             Remotion 컴포지션 (PsgExplainer) 과 9개 장면
  components/           업로드 UI, 대시보드, 영상 패널
  tts/useNarration.ts   Remotion Player ↔ 브라우저 TTS 동기화
  tts/cloud.ts          고품질 음성: Google TTS 직접 호출 / 서버 TTS
  tts/api.ts            서버 TTS / MP4 렌더 API 클라이언트
server/                 (선택) TTS·렌더 서버 (Dockerfile 로 배포 가능)
scripts/render.mjs      (선택) CLI 렌더링
legacy/psgviewer.html   업그레이드 전 단일 HTML 버전
```

### 음성 동기화 방식

브라우저 음성은 길이를 미리 알 수 없어서, 글자 수로 장면 길이를 추정한 뒤 **장면 끝에서 발화가 끝날 때까지 기다렸다가** 다음 장면으로 넘어갑니다. 고품질 음성(Google/서버 TTS)을 쓰면 실제 오디오 길이로 장면 길이를 확정하므로 정확히 맞습니다.

### 기준값 참고

- 영상의 AHI 구간은 표준 기준(정상 <5 / 경증 5–15 / 중등도 15–30 / 중증 ≥30)을 씁니다 (`src/remotion/scenes/Ahi.tsx`, `ahiSeverity` in `src/psg/script.ts`).
- 대시보드의 AHI 막대는 기존 파일의 구간(…/중등도 15–22 / 중증 22–30)을 그대로 유지했습니다 (`src/psg/metrics.ts`). 한쪽으로 통일하려면 두 곳의 숫자를 맞춰 주세요.
- 나레이션 문구는 `src/psg/script.ts` 에서 자유롭게 고칠 수 있습니다.

이 영상은 결과 안내이며, 진단과 치료는 담당 의사가 결정합니다.
