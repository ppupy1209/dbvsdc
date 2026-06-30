#!/usr/bin/env python3
"""
KRX 공식 가격지수(코스피 200 · 코스닥 150) 연간 수익률 — pykrx + KRX 로그인.

배경
  KRX gross TR 지수는 무료 경로(pykrx)로 받을 수 없음이 실측으로 확정됐다
  (로그인해도 지수목록에 TR 미포함; 자세히는 docs/DATA-SOURCES.md "최종 결론").
  대신 *가격*지수(코스피 200·코스닥 150)는 목록에 있으므로, 1stock1.com 스크랩을
  KRX 공식 데이터로 교체하고 가능한 한 과거까지 이력을 확장한다.
    - ks(코스피 200): 현재 2003~ (1stock1) → KRX 공식, 1990년대까지 확장 시도.
    - kq(코스닥 150): 기준일 2010-01-04 → KRX 공식, 2010/2011~로 확장 시도.
  이 값은 *가격수익률*(배당 제외)이다. 반영 시 배당 처리:
    - ks: + 평균배당(현행 1.8%) 유지.
    - kq: KOSDAQ 배당수익률 낮음(~0.5%) — 통합 시 결정.

준비 (최초 1회)
  1. https://data.krx.co.kr 회원가입(무료).
  2. PowerShell:  $env:KRX_ID="아이디" ; $env:KRX_PW="비밀번호"
  3. pip install pykrx   (Python 3.11~3.12 권장; 3.14에서 깨지면 3.12 venv)

실행
  python web/scripts/fetch-krx-tr.py
출력
  ks/kq 연도·수익률 배열 → indexData.ts 반영. (어디까지 거슬러 오는지 확인용으로
  연도 배열도 함께 출력.)
"""
import os
import sys
from datetime import datetime

if not (os.environ.get("KRX_ID") and os.environ.get("KRX_PW")):
    print("// ⚠️ KRX_ID / KRX_PW 미설정 → 로그인 데이터 비어서 옴.")
    print("//    PowerShell:  $env:KRX_ID='아이디'; $env:KRX_PW='비밀번호'  후 재실행\n")

try:
    from pykrx import stock
except ImportError:
    sys.exit("pykrx 미설치:  pip install pykrx")

START = "19900101"  # 지수가 존재하는 만큼만 돌아옴(코스닥150은 2010~)
END = f"{datetime.now().year}1231"
TODAY = datetime.now().strftime("%Y%m%d")


def list_indices(market: str) -> list[tuple[str, str]]:
    try:
        tickers = stock.get_index_ticker_list(date=TODAY, market=market)
    except Exception as e:
        print(f"// {market} 지수목록 조회 실패: {type(e).__name__}: {e}")
        return []
    out = []
    for t in tickers:
        try:
            out.append((t, stock.get_index_ticker_name(t)))
        except Exception:
            out.append((t, "?"))
    return out


def find_exact(indices: list[tuple[str, str]], exact: str) -> str | None:
    for t, name in indices:
        if name.strip() == exact:
            return t
    return None


def annual_returns(ticker: str) -> dict[int, float]:
    try:
        df = stock.get_index_ohlcv(START, END, ticker, freq="y")
    except TypeError:
        df = stock.get_index_ohlcv(START, END, ticker)  # 일별 폴백
    closes: dict[int, float] = {}
    for idx, row in df.iterrows():
        try:
            v = float(row["종가"])
        except (KeyError, ValueError, TypeError):
            continue
        if v > 0:
            closes[idx.year] = v  # 오름차순 → 같은 해 마지막(연말)이 남음
    years = sorted(closes)
    return {years[i]: round((closes[years[i]] / closes[years[i - 1]] - 1) * 100, 2)
            for i in range(1, len(years))}


def run(label: str, key: str, market: str, exact: str) -> None:
    idx = list_indices(market)
    if not idx:
        print(f"// {label}: {market} 지수목록 비어있음 (로그인/네트워크 확인).")
        return
    t = find_exact(idx, exact)
    if not t:
        print(f"// {label}: '{exact}' 정확매칭 실패. {market} 지수명 ↓ (붙여주세요)")
        print("//  " + " | ".join(n for _, n in idx))
        return
    try:
        rets = annual_returns(t)
    except Exception as e:
        print(f"// {label}: 시세 실패 ({exact}, {t}): {type(e).__name__}: {e}")
        return
    ys = sorted(rets)
    if not ys:
        print(f"// {label}: 시세 비어있음 ({exact}, {t}) — 로그인 확인.")
        return
    print(f"// {label}: {exact} (ticker {t}) — KRX 공식 *가격*수익률, {ys[0]}~{ys[-1]} ({len(ys)}년)")
    print(f"  // RETURN_YEARS.{key}")
    print(f"  {key}: {ys},")
    print(f"  // RETURNS.{key} (가격수익률; 반영 시 배당 별도 처리)")
    print(f"  {key}: {[rets[y] for y in ys]},")
    print()


if __name__ == "__main__":
    print(f"// KRX 공식 가격지수 via pykrx, ~{END[:4]}. (TR은 무료 경로 부재 — DATA-SOURCES 참고)\n")
    run("KOSPI 200", "ks", "KOSPI", "코스피 200")
    run("KOSDAQ 150", "kq", "KOSDAQ", "코스닥 150")
