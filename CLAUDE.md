# CLAUDE.md — Claude 작업 규칙

이 프로젝트(dbvsdc)에서 Claude가 매 세션 지켜야 할 컨텍스트와 규칙.

## 프로젝트 한 줄 요약

퇴직연금 DB형 vs DC형 비교·시뮬레이션 사이트. 핵심: "수익률 몇 %부터 DC가 DB를 이기는가(손익분기 수익률)".

## 세션 시작 시 (필수)

1. [docs/TODO.md](docs/TODO.md) 읽기 — 지금 무슨 작업 중인지
2. 최신 [docs/DEVLOG/](docs/DEVLOG/) 훑기 — 직전 맥락
3. 필요 시 [docs/PROJECT.md](docs/PROJECT.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 세션 종료 시 (필수)

1. [docs/TODO.md](docs/TODO.md) 갱신
2. 의미 있는 진전/문제해결이 있으면 [docs/DEVLOG/](docs/DEVLOG/)에 날짜별 추가
3. 구조·인프라 결정이 바뀌면 [docs/DECISIONS/](docs/DECISIONS/)에 ADR 추가
4. 변경 commit & push (다른 PC에서 이어받기 위함)

## 역할 경계

- **Claude 담당**: 설계, 프론트엔드(`web/`, Next.js), 디자인, 코드 리뷰, 문서/개발기.
- **Codex 담당**: 백엔드(`api/`, Java/Spring, MySQL). 규약: [AGENTS.md](AGENTS.md).
- 백엔드 코드를 직접 작성하기보다, **API 스펙·요구사항을 명확히 정의해 Codex에 위임**한다.

## 고정 제약 (어기지 말 것)

- 백엔드는 Java/Spring, DB는 MySQL (사용자 지정).
- 저비용 운영. 계산은 가능한 한 클라이언트에서, 서버 부하 최소화.
- 외부 API는 실시간 호출 대신 일배치 캐싱.
- 모든 시뮬레이션 결과에 면책 문구 ("과거 수익률 ≠ 미래 보장", "투자 권유 아님").

## 톤

- chipthrone처럼 유머·센스 있는 톤 허용. 단 금융 정보의 정확성·신뢰성이 우선.

## 작업 환경

- 멀티 PC/세션. 모든 맥락은 코드가 아니라 `docs/`에 남긴다. 기억에 의존하지 말 것.
