# API 명세 — 백엔드(Spring) 계약

프론트가 소비하는 REST API 계약. **현재 `web/src/app/api/index-returns/route.ts`에 개발용 mock으로 구현**돼 있고, 이를 **Spring 백엔드(@ NCP)가 동일 스키마로 대체**한다. 프론트는 `NEXT_PUBLIC_API_BASE`를 백엔드 URL로 지정하면 전환 완료(코드 수정 불필요).

> 담당: 백엔드 = Codex ([AGENTS.md](../AGENTS.md)) / 계약·프론트 = Claude

## 공통

- 형식: JSON, UTF-8
- CORS: `https://dbvsdc.com`, `https://*.vercel.app`, 로컬 개발 오리진 허용
- 캐싱: 외부 API 실시간 호출 금지. **일배치 수집 → MySQL → API는 캐시만 서빙**
- 실패 시 프론트는 예시 데이터로 폴백하므로, 5xx여도 UI는 죽지 않음

---

## 1) GET /api/index-returns  (구현 우선순위 1)

백테스트·미래예측용 지수 연도별 수익률.

### 응답
```json
{
  "asOf": "2026-06-23",
  "source": "live",
  "depositRate": 0.03,
  "years": [1995, 1996, "...", 2024],
  "returns": {
    "sp": [34.0, 20.0, "...", 23.3],
    "nq": ["..."],
    "dj": ["..."],
    "ks": ["..."],
    "kq": ["..."]
  }
}
```

### 필드
| 필드 | 타입 | 설명 |
|---|---|---|
| `asOf` | string(YYYY-MM-DD) | 데이터 기준일 |
| `source` | "live" \| "sample" | 실데이터 여부(프론트 배지 표기) |
| `depositRate` | number | 안전자산 30% 금리 (예 0.03). `app_config`에서 |
| `years` | number[] | 연도 오름차순 |
| `returns` | object | 키: sp/nq/dj/ks/kq, 값: `years`와 같은 길이의 연수익률(%) |

### 지수 ↔ 데이터 소스 매핑
| key | 지수 | 추종 ETF(예) | 소스 |
|---|---|---|---|
| sp | S&P 500 | TIGER 미국S&P500 | KRX/증권상품시세정보 또는 KIS |
| nq | 나스닥100 | KODEX 미국나스닥100 | 〃 |
| dj | 다우존스 | TIGER 미국다우존스30 | 〃 |
| ks | 코스피 | KODEX 200 | 〃 |
| kq | 코스닥 | KODEX 코스닥150 | 〃 |

규칙:
- **국내 상장 ETF 종가**로 연수익률 계산 → 환율·운용보수 자연 반영(권장).
- 해외 추종 ETF가 특정 연도 이전 미상장이면 해당 연도는 원지수+환율로 보강하거나 `null` 대신 데이터 보유 연도만 `years`에 포함.
- 연수익률(%) = (해당 연말 종가 / 전년 말 종가 − 1) × 100, 소수 1자리.

---

## 2) GET /api/dc-products?provider={code}  (우선순위 2, 추후)

특정 사업자의 DC 적격 상품 목록·수익률. 소스: 통합연금포털 Open API / 공공데이터포털.

```json
{
  "asOf": "2026-06-23",
  "provider": "예시증권",
  "products": [
    { "name": "...", "type": "원리금보장|실적배당", "return1y": 4.2, "return3y": 5.1, "feeRate": 0.3 }
  ]
}
```

---

## MySQL 스키마(초안)

```sql
-- 추종 ETF 일별 종가 (원천)
CREATE TABLE etf_price_daily (
  index_key   VARCHAR(8)  NOT NULL,   -- sp/nq/dj/ks/kq
  trade_date  DATE        NOT NULL,
  close_price DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (index_key, trade_date)
);

-- API 서빙용 연도별 수익률 캐시 (배치가 etf_price_daily에서 산출)
CREATE TABLE index_return_yearly (
  index_key   VARCHAR(8) NOT NULL,
  year        SMALLINT   NOT NULL,
  return_pct  DECIMAL(7,2) NOT NULL,
  PRIMARY KEY (index_key, year)
);

-- 설정값 (depositRate 등)
CREATE TABLE app_config (
  cfg_key   VARCHAR(40) PRIMARY KEY,
  cfg_value VARCHAR(100) NOT NULL
);

-- 배치 실행 로그
CREATE TABLE sync_log (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  source    VARCHAR(40) NOT NULL,
  ran_at    DATETIME    NOT NULL,
  status    VARCHAR(20) NOT NULL,    -- ok / fail
  rows_cnt  INT,
  message   VARCHAR(255)
);
```

## 배치
- 스케줄: 매 영업일 1회(예: 18:00). 공공데이터는 기준일+1영업일 13시 이후 갱신되므로 그 이후.
- 흐름: 외부 API 호출 → `etf_price_daily` upsert → 연수익률 재계산 → `index_return_yearly` upsert → `sync_log` 기록.

## 시크릿
- 모든 API 키는 환경변수로 주입(코드/깃 금지). 키 발급처는 [DATA-SOURCES.md](DATA-SOURCES.md).

## 계산 로직 참고
- DB/DC 시뮬레이션·세금 계산은 **프론트**(`web/src/lib/calc.ts`)에 있음. 백엔드가 동일 계산을 해야 할 일이 생기면 그 로직을 Java로 1:1 이식.
