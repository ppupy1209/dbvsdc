# 금융 QA 수정 사유서 (2026-06-26)

이 문서는 DB vs DC 시뮬레이터의 금융 QA 결과를 바탕으로 이번 코드 수정의 이유와 유지해야 할 계산 원칙을 남기기 위한 작업자용 메모입니다.

## 수정 목적

기존 시뮬레이터는 교육용 MVP로는 충분했지만, 실제 퇴직연금 전환 판단에 쓰기에는 DC 결과가 낙관적으로 보일 수 있는 가정이 있었습니다. 특히 지수 수익률 기준 불일치, 배당 중복/누락 가능성, 비용 미반영, 연초 납입 가정, 미래 평균수익률 직선 투영, IRP 세금 단순화가 핵심 리스크였습니다.

이번 수정은 결과를 더 보수적으로 만들고, 프론트와 백엔드가 같은 데이터 계약을 쓰게 하며, 세금과 비용을 화면 설명과 실제 계산에 모두 반영하기 위한 것입니다.

## 핵심 변경 사항

1. `/api/index-returns`의 `returns` 기준을 `gross_total_return`으로 명시했습니다.
   - `returnBasis`, `currency`, `dividendIncluded`, `expenseIncluded` 필드를 추가했습니다.
   - `returns`는 배당 재투자 포함 총수익률 근사치이며, ETF 보수·추적오차·거래비용은 포함하지 않습니다.
   - 프론트는 구 API가 `dividendIncluded`를 보내지 않는 경우에만 평균 배당을 한 번 보정합니다.

2. 프론트와 백엔드 샘플 수익률을 통일했습니다.
   - 기존 Spring 샘플은 프론트 `indexData.ts`와 다른 값이어서 API 전환만으로 결과가 달라질 수 있었습니다.
   - S&P500 uses observed total returns; NASDAQ 100/Dow Jones 30 use price returns plus average dividends; KOSPI 200 uses price returns plus a 1.8%p average dividend approximation; KOSDAQ 150 uses the KODEX KOSDAQ 150 ETF adjusted-close proxy.
   - Added `returnYears` so each index can expose its own maximum backtest range: KOSPI 200 2010~2025, KOSDAQ 150 2016~2025.

3. Removed the conservative DC cost-haircut constants.
   - Removed the hidden global cost-haircut constants from the calculation.
   - Current blended return is `0.3 * depositRate + 0.7 * selectedIndexReturn`.
   - Product TER, tracking difference, hedge cost, and trading cost are not modeled in this version; add them later as product-level data, not hidden global constants.
4. DC 부담금 납입 시점을 보수화했습니다.
   - 기존: `bal = (bal + contribution) * (1 + ret)`
   - 변경: `bal = bal * (1 + ret) + contribution`
   - 즉, 연초 납입 후 1년 전체 수익을 얻는 가정에서 연말 납입 가정으로 바꿨습니다.
   - 실제 월납/분기납 구현 전까지 DC 과대계상을 막기 위한 보수적 처리입니다.

5. 미래 시뮬레이션을 평균 시나리오와 최악 시나리오로 분리했습니다.
   - 평균 시나리오: 선택 지수의 전체 기간 CAGR을 매년 반복하되, 연말 납입 가정은 유지합니다.
   - 최악 시나리오: 동일 기간의 과거 모든 구간 중 DC 최종 잔액이 가장 낮은 경로를 선택합니다.
   - 이로써 기준 기대값과 2000~2002, 2008, 2022 같은 하락장·횡보장 순서위험을 분리해서 볼 수 있습니다.

6. 퇴직소득세와 IRP 연금수령 세금을 보정했습니다.
   - 퇴직소득세 계산 결과에 지방소득세 10%를 포함했습니다.
   - IRP 연금수령 세금은 15년 균등수령 가정으로 바꿨습니다.
   - 10년차까지는 이연퇴직소득세의 70%, 11년차부터는 60%를 반영합니다.

## 유지해야 할 원칙

- `returns`에 배당이 이미 포함되어 있으면 `DIVIDEND_YIELD`를 다시 더하지 마십시오.
- `returns[key]` must align with `returnYears[key]`. Do not assume every index has the same historical start year.
- API 응답에 `dividendIncluded: true`가 있으면 프론트에서 배당 보정을 하지 않아야 합니다.
- DC 결과는 현재 별도 비용 헤어컷 상수를 적용하지 않습니다.
- 미래 모드의 평균 시나리오는 CAGR 반복을 허용하지만, 반드시 최악 시나리오와 함께 제공해야 합니다. 평균값만 보여주면 하락장과 순서위험을 숨깁니다.
- 개인 IRP 추가납입, 세액공제 받은 원금, 운용수익, 중도해지 기타소득세 16.5%, 사적연금 연 1,500만원 초과 과세는 아직 별도 버킷으로 구현되지 않았습니다. 이 기능을 추가할 때는 퇴직급여 원본과 개인 추가납입분을 반드시 분리해야 합니다.
- 해외 지수는 아직 USD 기준입니다. 국내 투자자 원화 수익률을 엄밀히 보려면 USD/KRW 연간 수익률 또는 국내 상장 ETF 실현 수익률을 별도로 반영해야 합니다.

## 관련 파일

- `web/src/lib/calc.ts`: 연말 납입, 보수적 미래 경로, IRP 세금 로직
- `web/src/lib/indexData.ts`: 배당 포함 총수익률 샘플 데이터와 레거시 가격수익률 보정 함수
- `web/src/lib/api.ts`: API 메타데이터 기반 배당 보정 방어 로직
- `api/src/main/java/com/dbvsdc/api/market/MarketDataResponse.java`: 수익률 기준 메타데이터 추가
- `api/src/main/java/com/dbvsdc/api/market/SampleMarketDataSource.java`: 프론트와 동일한 샘플 총수익률 데이터
- `api/src/main/resources/db/migration/V2__seed_curated_index_returns.sql`: refreshes the production DB seed for annual index returns
- `docs/api-spec.md`: API 계약 갱신
