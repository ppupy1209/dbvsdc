# TODO — 세션 인계용 작업 상태

> 매 세션 **시작 시 읽고**, **종료 시 갱신**한다. 다른 PC/세션이 여기만 보고 이어받을 수 있어야 한다.

## 지금 상태 (2026-06-26)

프론트 MVP + 백엔드 스캐폴딩 + 인프라(AWS/Docker/CI·CD) 완료. **프론트 UI/로직 다듬기 진행 중.**
- 인프라: 로컬 `docker compose up --build`(mysql+api+web), 운영 `docker-compose.prod.yml`(GHCR pull, RDS 미사용),
  CI(gradle+npm)·CD(main→GHCR), Maven→Gradle, NCP→AWS ([ADR 0002](DECISIONS/0002-infra-aws-docker.md)).
- UI/로직(2026-06-26): 다크/라이트 토글, **수익률을 배당 재투자 포함(총수익)으로 전환**,
  미래 모드 역전표시·임금피크 옵션 제거, 호버 시 연도별 DC 수익률, 지수별 연평균 수익률 표시,
  '미래 예측'→'미래 시뮬레이션', 면책·정확도 → 푸터 '유의사항' 통합. (상세 DEVLOG 2026-06-26)
- ⚠️ **배당은 지수별 평균 배당수익률 연 고정 가정**(indexData.ts `DIVIDEND_YIELD`) — 근사치, 추후 실제 데이터로 교체 필요.

(이전) **프론트 MVP 코드 완성** — Next.js 16(`web/`)에 시뮬레이터 구현(연도별 그래프 / 30·70 백테스트 / 과거·미래 모드 / 세금·IRP / 정확도 문구). `npm run build` 통과, 로컬 렌더 확인 완료.

### web/ 구조
- `src/lib/indexData.ts` — 지수·연도별 수익률(예시값 1995~2024)
- `src/lib/calc.ts` — DB/DC 시뮬레이션 + 퇴직소득세 (순수 함수, 테스트·백엔드 이식 용이)
- `src/components/Simulator.tsx` (+`.module.css`) — 시뮬레이터 UI
- `src/app/globals.css` — 디자인 토큰(고급·심플, 라이트/다크)
- 실행: `npm --prefix web run dev`

## 다음 할 일 (우선순위 순)

- [ ] **도메인 dbvsdc.com 구매** (사용자 액션)
- [ ] **AWS EC2 t3.micro 2번째 인스턴스 프로비저닝** (사용자 액션) → 스왑 2GB 설정 + GHCR 로그인 + `docker-compose.prod.yml`로 기동 ([docs/DEPLOY.md](DEPLOY.md))
- [ ] 배포 후 도메인 연결 + 리버스 프록시(nginx/Caddy) + HTTPS
- [x] Docker/CI·CD 정비 + 인프라 AWS 전환 + Maven→Gradle ✅ (2026-06-25, ADR 0002)
- [~] ~~NCP 가입 + 크레딧 신청~~ → **폐기**. AWS로 변경 ([ADR 0002](DECISIONS/0002-infra-aws-docker.md))
- [~] ~~API 키 신청(공공데이터포털 ETF 시세)~~ → **불필요로 변경**. 지수 연간 수익률을 큐레이션 보유(2026-06-24 결정, DATA-SOURCES.md). 통합연금포털 키는 "상품으로 구성" 화면 할 때만.
- [~] DB/DC·세금 계산식 정밀화 — 법정 산식 근거 확인·임금피크 옵션·과세범위 정정 완료. 남은 것: 평균임금 상여 분리, 환율, IRP 추가납입 ([ARCHITECTURE.md](ARCHITECTURE.md) "확정 필요")
- [x] 프론트 스캐폴딩 (Next.js, `web/`) — 시안을 실제 코드로 이식 ✅
- [x] 랜딩/소개 섹션 (Intro: DB vs DC 30초 요약 + CTA) ✅
- [x] 프리미엄 리디자인 — 심플·고급(잉크+블루), Pretendard, Nav/Footer, 히어로·시뮬레이터 리스타일 ✅
- [x] 프론트 데이터 주도 전환 — API에서 시장데이터 fetch + 예시 폴백 + 소스 배지 ✅
- [x] 백엔드 API 계약·MySQL 스키마 정의 ([api-spec.md](api-spec.md)) + mock 라우트 ✅
- [x] **Codex: Spring 백엔드 스캐폴딩** (`api/`) — GET /api/index-returns 샘플모드 구현, MySQL 스키마/JPA/배치 골격, 프로필 분리, CORS ✅ (Claude 리뷰 통과)
- [x] 백엔드 빌드·실행 검증 — **Docker(JDK17 컨테이너)로 해결**. `docker compose up`, /api/index-returns 200 확인 ✅ (로컬 Java 8 우회)
- [x] 프론트↔백엔드 end-to-end 연결 검증 — `web/.env.local`(NEXT_PUBLIC_API_BASE=http://localhost:8090) → 프론트가 백엔드 호출 200·CORS 정상·화면 반영 확인 ✅
- [x] 데이터 전략 확정 — 지수 연간 수익률 큐레이션 보유(현 데이터가 이미 정확함: S&P·KOSPI 공시값과 일치 검증). "예시값" 라벨 → "지수 연간 수익률"로 정정. API 키 불필요 ✅
- [ ] **Codex(세션 리셋 후): Flyway 시드 V2** — indexData.ts 값을 MySQL `index_return_yearly`에 적재 + `LiveMarketDataSource`가 DB 읽어 서빙(외부 API/키 없음). ETF 실시간 연동 폐기.
- [ ] **배당 데이터 정밀화** — 현재 `DIVIDEND_YIELD` 연 고정 평균 가정 → 지수별 연도별 실제 배당수익률 또는 총수익(TR) 지수 시계열로 교체. Flyway 시드/`indexData.ts` 양쪽 반영.
- [x] UI/로직 다듬기 (다크모드·총수익·미래 시뮬레이션·호버 DC수익률·연평균 표시 등) ✅ (2026-06-26)
- [ ] 배포 후: `NEXT_PUBLIC_API_BASE`를 AWS 백엔드로 설정 → "실데이터" 배지 전환
- [ ] 프론트 후속: 결과 공유(URL 인코딩), 개발기 블로그, Vercel 배포
- [ ] 백엔드 API 스펙 정의 → Codex 위임 (AGENTS.md 규약대로)

## 시안에서 합의된 설계 (이식 시 반영)

- 컨셉: 고급·심플, 평면 흰 카드, 색 2개(DB 무채색 / DC 블루)
- 시뮬레이터: 입력(지수 70% 칩 / 기간 1~30년 / 연봉 / 상승률), 안전자산 30% 예금 3.0% 고정(2026)
- 모드 토글: 과거 백테스트 ↔ 미래 시뮬레이션
- 출력: 연도별 그래프(역전/변동), 세전 카드, 세금표(일시금 vs IRP), IRP 절세 강조, 정확도 안내 박스

## 대기/블로커

- 도메인 구매, NCP 가입, API 키 신청은 사용자 직접 액션 필요.

## 결정 로그 (요약 — 상세는 DECISIONS/)

- 2026-06-23: 인프라 NCP 확정 ([ADR 0001](DECISIONS/0001-infra-ncp.md)) — **2026-06-25 대체됨**
- 2026-06-23: 백엔드 Java/Spring + MySQL (사용자 제약)
- 2026-06-23: 프론트 Vercel + Next.js
- 2026-06-23: 도메인 dbvsdc.com
- 2026-06-25: 인프라 **AWS EC2 + Docker/GHCR, RDS 미사용** ([ADR 0002](DECISIONS/0002-infra-aws-docker.md))
- 2026-06-25: 백엔드 빌드툴 Maven→Gradle / 프론트 Vite 전환 안 함(SEO)
- 2026-06-26: 수익률을 **배당 재투자 포함(총수익)**으로 — 평균 배당수익률 연 고정 가정(근사·고지)
- 2026-06-26: 다크/라이트 수동 토글 도입 / '미래 예측'→'미래 시뮬레이션'
