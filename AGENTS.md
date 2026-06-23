# AGENTS.md — Codex(백엔드) 위임 규약

백엔드는 Codex가 담당한다. 이 문서는 위임 시 지켜야 할 계약이다.

## 범위

- 담당: `api/` — Java + Spring Boot REST API, MySQL.
- 제외: 프론트(`web/`), 인프라 결정(문서는 Claude가 관리).

## 고정 제약

- 언어/프레임워크: **Java + Spring Boot** (변경 불가, 사용자 지정).
- DB: **MySQL** (변경 불가). NCP Cloud DB for MySQL 또는 직접설치 — 상품 확정 후 반영.
- 호스팅: NCP. 환경변수로 시크릿 주입(키를 코드/깃에 넣지 말 것).

## 백엔드의 책임 (그리고 하지 말 것)

백엔드는 "데이터·프록시·저장"만 맡는다. **시뮬레이션 계산 로직은 프론트(클라이언트)** 에 있다.

해야 할 것:
- 외부 공공데이터 API 프록시 + **일배치 캐싱** → MySQL ([DATA-SOURCES.md](docs/DATA-SOURCES.md))
- 캐싱된 펀드/연금 수익률 데이터 서빙 REST API
- (선택) 개발기/통계/공유결과 저장

하지 말 것:
- 무거운 비즈니스 계산을 서버로 끌어오기(비용·지연 증가).
- 외부 API를 사용자 요청마다 실시간 호출하기.

## API 스펙 합의 방식

- 계약은 [docs/api-spec.md](docs/api-spec.md)에 정의됨. Codex는 이 스키마 그대로 Spring으로 구현.
- 새 엔드포인트/스키마 변경 시 api-spec.md 갱신.

## 첫 작업 (우선순위)

1. **GET /api/index-returns** 구현 — 현재 프론트에 mock(`web/src/app/api/index-returns/route.ts`)으로 동작 중. 동일 JSON 스키마로 Spring 구현 + 일배치(외부 API → MySQL 캐싱). 프론트는 `NEXT_PUBLIC_API_BASE`만 바꾸면 전환됨.
2. (추후) GET /api/dc-products — 통합연금포털 연동.

블로커: 외부 API 키 발급(공공데이터포털/통합연금포털)과 NCP 서버는 사용자 액션 필요. 키 없이도 Spring 프로젝트 구조·스키마·배치 골격은 mock 소스로 선행 가능.

## 코드 리뷰

- Codex가 작성한 백엔드 코드는 Claude가 리뷰한다(보안·시크릿 노출·CORS·예외처리 중심).

## 산출물 규칙

- 모든 변경은 commit & push.
- 의미 있는 작업은 [docs/DEVLOG/](docs/DEVLOG/)에 기록(문제해결 위주).
