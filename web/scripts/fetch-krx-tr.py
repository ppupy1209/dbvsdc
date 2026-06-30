#!/usr/bin/env python3
"""
Pull the OFFICIAL KRX gross Total-Return indices for KOSPI 200 / KOSDAQ 150 and
print ready-to-paste arrays for web/src/lib/indexData.ts.

WHY THIS SCRIPT EXISTS
  KRX TR indices (코스피 200 TR · 코스닥 150 TR) are not downloadable without
  KRX's OTP token flow + session headers (the public site returns 403, and Yahoo
  has only the *price* index). `pykrx` performs that OTP handshake for you, so
  this removes the manual "generate OTP → download CSV" step entirely.

RUN (on any machine with internet — not this sandbox, which has no network):
  pip install pykrx
  python web/scripts/fetch-krx-tr.py

WHAT TO DO WITH THE OUTPUT
  Paste the printed arrays into web/src/lib/indexData.ts:
    - RETURNS.ks / RETURN_YEARS.ks   (KOSPI 200 TR)
    - RETURNS.kq / RETURN_YEARS.kq   (KOSDAQ 150 TR)
  Because TR already includes reinvested dividends, REMOVE the dividend add-ons:
    - DIVIDEND_YIELD.ks 1.8 → 0   (the current ks = price + 1.8% approximation)
    - kq stops being the "KODEX ETF adjusted-close proxy"
  Update the source comments / Footer to say "KRX 공식 TR (gross)".
"""

import sys
from datetime import datetime

try:
    from pykrx import stock
except ImportError:
    sys.exit("pykrx 미설치. 먼저:  pip install pykrx")

START_YEAR = 2001
END_YEAR = datetime.now().year - 1  # last *completed* year


def find_index(market: str, must_contain: list[str]) -> tuple[str, str] | tuple[None, None]:
    """Find an index ticker whose name contains all needles (e.g. ['200','TR'])."""
    today = datetime.now().strftime("%Y%m%d")
    best = None
    for ticker in stock.get_index_ticker_list(date=today, market=market):
        name = stock.get_index_ticker_name(ticker)
        if all(n in name for n in must_contain):
            # Prefer the shortest matching name (avoids "200 TR 레버리지" etc.)
            if best is None or len(name) < len(best[1]):
                best = (ticker, name)
    return best if best else (None, None)


def annual_tr_returns(ticker: str) -> dict[int, float]:
    """Year-over-year % return from year-end TR index levels."""
    df = stock.get_index_ohlcv(f"{START_YEAR-1}0101", f"{END_YEAR}1231", ticker, freq="y")
    closes = {idx.year: float(row["종가"]) for idx, row in df.iterrows() if float(row["종가"]) > 0}
    years = sorted(closes)
    out = {}
    for i in range(1, len(years)):
        y, p = years[i], years[i - 1]
        out[y] = round((closes[y] / closes[p] - 1) * 100, 2)
    return out


def emit(label: str, key: str, market: str, needles: list[str]) -> None:
    ticker, name = find_index(market, needles)
    if not ticker:
        print(f"// {label}: '{' '.join(needles)}' 지수를 못 찾음 — KRX 지수명 변경 가능. "
              f"stock.get_index_ticker_list(market='{market}') 출력 확인 필요.")
        return
    rets = annual_tr_returns(ticker)
    years = sorted(rets)
    print(f"// {label}: KRX 공식 gross TR — {name} (ticker {ticker})")
    print(f"  {key}: {[years[0], '...', years[-1]]},  // RETURN_YEARS.{key}")
    print(f"  {key}: {[rets[y] for y in years]},  // RETURNS.{key} (배당 포함 TR, +배당 가산 제거)")
    print()


if __name__ == "__main__":
    print(f"// KRX TR fetched {datetime.now():%Y-%m-%d}, {START_YEAR}~{END_YEAR}\n")
    emit("KOSPI 200 TR", "ks", "KOSPI", ["200", "TR"])
    emit("KOSDAQ 150 TR", "kq", "KOSDAQ", ["150", "TR"])
    print("// 참고: TR엔 배당이 이미 포함 → indexData.ts의 DIVIDEND_YIELD.ks 1.8→0, kq 프록시 표기 제거.")
