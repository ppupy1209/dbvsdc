# dbvsdc

퇴직연금 **DB형 vs DC형**을 비교·시뮬레이션하는 웹 서비스.

> "내 조건에서 DB와 DC 중 어느 쪽이, 수익률 몇 %부터 유리한가?"를 답해주는 계산기 + 콘텐츠 사이트.

- 도메인: `dbvsdc.com`
- 운영자: chipthrone.com 운영자 (개인, 저비용 운영)
- 상태: 🟡 기획/설계 단계 (2026-06-23 시작)

---

## 이 저장소는 여러 PC·세션에서 작업됩니다

작업을 시작하기 전에 **반드시 아래 문서부터 읽으세요.** 모든 맥락·결정·진행상황은 코드가 아니라 `docs/`에 있습니다.

| 문서 | 내용 | 언제 읽나 |
|---|---|---|
| [docs/PROJECT.md](docs/PROJECT.md) | 비전·목표·제약·타깃 | 프로젝트 처음 파악할 때 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 인프라·데이터 흐름·기술스택 | 구조 작업 전 |
| [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md) | 외부 API 목록·키·호출제한·캐싱 | 데이터 연동 작업 전 |
| [docs/api-spec.md](docs/api-spec.md) | 백엔드 REST 계약·MySQL 스키마 | 백엔드(Spring) 구현 전 |
| [docs/TODO.md](docs/TODO.md) | 지금 무슨 작업 중인지 (세션 인계용) | **매 세션 시작/종료 시** |
| [docs/DECISIONS/](docs/DECISIONS/) | ADR — 왜 이렇게 결정했나 | 결정 배경이 궁금할 때 |
| [docs/DEVLOG/](docs/DEVLOG/) | 개발기 (문제해결 기록) | 회고/블로그 발행용 |
| [CLAUDE.md](CLAUDE.md) | Claude 작업 규칙 | Claude 세션 자동 로드 |
| [AGENTS.md](AGENTS.md) | Codex(백엔드) 위임 규약 | 백엔드 작업 전 |

## 작업 인계 규칙 (중요)

1. 세션 시작: `docs/TODO.md`와 최신 `docs/DEVLOG/` 읽기
2. 세션 종료: `docs/TODO.md` 갱신 + 의미 있는 진전이 있으면 `docs/DEVLOG/` 추가
3. 구조/인프라 결정이 바뀌면 `docs/DECISIONS/`에 ADR 추가
4. 모든 변경은 commit & push (다른 PC에서 최신 상태로 이어받기 위함)

## 폴더 구조 (예정)

```
dbvsdc/
├── web/        # 프론트엔드 (Next.js, Vercel 배포) — Claude
├── api/        # 백엔드 (Java/Spring, NCP 배포) — Codex
├── docs/       # 모든 문서 (단일 진실 공급원)
├── CLAUDE.md
└── AGENTS.md
```
