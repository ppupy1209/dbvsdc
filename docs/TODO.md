# TODO — 세션 인계용 작업 상태

> 매 세션 **시작 시 읽고**, **종료 시 갱신**한다. 다른 PC/세션이 여기만 보고 이어받을 수 있어야 한다.

## 지금 상태 (2026-06-23)

기획·인프라 방향 확정. 프로젝트 문서 골격 생성 완료. 아직 코드 없음.

## 다음 할 일 (우선순위 순)

- [ ] **도메인 dbvsdc.com 구매** (사용자 액션)
- [ ] NCP 가입 + 크레딧 신청, 서버 상품 선택 ([ARCHITECTURE.md](ARCHITECTURE.md) 미해결 참조)
- [ ] DB/DC 계산 수식 확정 — 법정 산식 근거 확인 후 ARCHITECTURE.md 갱신
- [ ] 프론트 스캐폴딩 (Next.js, `web/`) — Claude
- [ ] 시뮬레이터 UI MVP (입력 슬라이더 + DB/DC 비교 그래프 + 손익분기 수익률)
- [ ] 백엔드 API 스펙 정의 → Codex 위임 (AGENTS.md 규약대로)

## 대기/블로커

- 도메인 구매, NCP 가입은 사용자 직접 액션 필요.

## 결정 로그 (요약 — 상세는 DECISIONS/)

- 2026-06-23: 인프라 NCP 확정 ([ADR 0001](DECISIONS/0001-infra-ncp.md))
- 2026-06-23: 백엔드 Java/Spring + MySQL (사용자 제약)
- 2026-06-23: 프론트 Vercel + Next.js
- 2026-06-23: 도메인 dbvsdc.com
