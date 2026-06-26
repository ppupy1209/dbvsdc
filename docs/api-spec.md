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
  "returnBasis": "gross_total_return",
  "currency": "local",
  "dividendIncluded": true,
  "expenseIncluded": false,
  "depositRate": 0.03,
  "years": [1995, 1996, "...", 2025],
  "returnYears": {
    "sp": [1995, 1996, "...", 2025],
    "ks": [2010, 2011, "...", 2025],
    "kq": [2016, 2017, "...", 2025]
  },
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
| `returnBasis` | "gross_total_return" \| "price_return" | `returns` 값의 수익률 기준. 신규 응답은 `gross_total_return` |
| `currency` | "local" | 각 지수의 현지통화 기준. 해외 지수 원화 환산은 미반영 |
| `dividendIncluded` | boolean | 배당 재투자 포함 여부. 신규 응답은 `true` |
| `expenseIncluded` | boolean | ETF fee/tracking/trading cost inclusion flag. Current response is `false`; frontend does not apply a separate cost haircut |
| `depositRate` | number | 안전자산 30% 금리 (예 0.03). `app_config`에서 |
| `years` | number[] | 레거시 공통 연도 배열. 신규 계산은 `returnYears` 우선 사용 |
| `returnYears` | object | 키별 연도 배열. 지수별 이력이 다를 수 있으므로 `returns[key]`와 같은 길이 |
| `returns` | object | 키: sp/nq/dj/ks/kq, 값: `returnYears[key]`와 같은 길이의 연수익률(%) |

### 데이터 출처 (2026-06-24 변경: ETF 실시간 폐기 → 지수 연간 수익률 큐레이션)
- `returns` 값은 **각 지수의 연간 총수익률 근사치(배당 재투자 포함·현지통화·비용 미반영)**. 단, `kq`(코스닥150)는 지수 직접 시계열 접근 제한으로 KODEX 코스닥150 ETF 조정종가를 프록시로 사용한다.
- **백엔드 구현**: `web/src/lib/indexData.ts`의 값을 **Flyway 시드(V2)** 로 MySQL `index_return_yearly`에 적재 → `LiveMarketDataSource`가 DB에서 읽어 서빙. **외부 API·키 불필요.**
- 갱신: 매년 각 지수 1행씩 INSERT (또는 시드 마이그레이션 추가).
- Overseas indices are USD-based. KRW conversion and product-level cost modeling are future options; frontend does not apply a hidden global cost haircut.
- 출처: S&P500/나스닥100/다우존스30=지수 공시·Slickcharts, 코스피200=KOSPI 200 연말 종가 + 평균 배당 근사, 코스닥150=KODEX 코스닥150 ETF 조정종가 프록시. (DATA-SOURCES.md)

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
  return_pct  DECIMAL(7,2) NOT NULL, -- gross total return %, dividend included, before costs
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
