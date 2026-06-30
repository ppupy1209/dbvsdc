#!/usr/bin/env python3
"""
KRX 공식 gross TR (코스피 200 TR · 코스닥 150 TR) — pykrx + KRX 로그인.

배경: KRX가 지수 시세 데이터를 로그인 뒤로 옮겨, 인증 없이는 시세 엔드포인트가
LOGOUT(HTTP 400)만 반환한다(requests 직접호출로 확인 완료). 공개 자동완성
파인더에는 TR 지수 자체가 없었다. 따라서 KRX 회원 로그인이 필요하다.

준비 (최초 1회)
  1. https://data.krx.co.kr 회원가입(무료).
  2. 환경변수 설정 — PowerShell:
       $env:KRX_ID = "아이디"
       $env:KRX_PW = "비밀번호"
     (영구: setx KRX_ID "아이디" ; setx KRX_PW "비밀번호"  → 새 터미널부터 적용)
  3. pip install pykrx
     ⚠️ Python 3.11~3.12 권장. 3.14에서 pandas/pykrx가 깨지면, 3.12로 가상환경:
        py -3.12 -m venv .venv ; .venv\\Scripts\\activate ; pip install pykrx

실행
  python web/scripts/fetch-krx-tr.py

출력
  성공 → ks/kq 연간 수익률 배열. indexData.ts에 반영하고 배당 가산 제거
         (DIVIDEND_YIELD.ks 1.8→0; kq ETF 프록시 표기 제거 — TR엔 배당 포함).
  TR 미발견 → 로그인해도 목록에 TR이 없으면 가용 지수명을 전부 출력하니,
             그 출력을 붙여주세요(다음 판단: KRX OpenAPI 키 or 현 근사 유지).
"""
import os
import sys
from datetime import datetime

if not (os.environ.get("KRX_ID") and os.environ.get("KRX_PW")):
    print("// ⚠️ KRX_ID / KRX_PW 환경변수 미설정 → KRX 로그인 데이터는 비어서 옵니다.")
    print("//    PowerShell:  $env:KRX_ID='아이디'; $env:KRX_PW='비밀번호'  후 재실행\n")

try:
    from pykrx import stock
except ImportError:
    sys.exit("pykrx 미설치:  pip install pykrx")

START = "20010101"
END = f"{datetime.now().year - 1}1231"
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


def find_tr(indices: list[tuple[str, str]], needles: list[str]) -> tuple[str, str] | tuple[None, None]:
    for t, name in indices:
        nm = name.upper().replace(" ", "")
        if all(n.upper() in nm for n in needles):
            return t, name
    return None, None


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
            closes[idx.year] = v  # 오름차순 → 같은 해는 마지막(연말) 값이 남음
    years = sorted(closes)
    return {years[i]: round((closes[years[i]] / closes[years[i - 1]] - 1) * 100, 2)
            for i in range(1, len(years))}


def run(label: str, key: str, market: str, needles: list[str]) -> None:
    idx = list_indices(market)
    if not idx:
        print(f"// {label}: {market} 지수목록 비어있음 (로그인/네트워크 확인).")
        return
    t, name = find_tr(idx, needles)
    if not t:
        print(f"// {label}: '{' '.join(needles)}' 못 찾음. {market} 가용 지수명 {len(idx)}개 ↓ (붙여주세요)")
        print("//  " + " | ".join(n for _, n in idx))
        return
    try:
        rets = annual_returns(t)
    except Exception as e:
        print(f"// {label}: 시세 조회 실패 ({name}, {t}): {type(e).__name__}: {e}")
        return
    ys = sorted(rets)
    if not ys:
        print(f"// {label}: 시세 비어있음 ({name}, {t}) — 로그인 확인.")
        return
    print(f"// {label}: {name} (ticker {t}), {ys[0]}~{ys[-1]}")
    print(f"  // RETURN_YEARS.{key}\n  {key}: {ys},")
    print(f"  // RETURNS.{key} (KRX 공식 TR, 배당 포함)\n  {key}: {[rets[y] for y in ys]},")
    print()


if __name__ == "__main__":
    print(f"// KRX 공식 gross TR via pykrx, {START[:4]}~{END[:4]}. 반영 시 배당 가산(+1.8 등) 제거.\n")
    run("KOSPI 200 TR", "ks", "KOSPI", ["200", "TR"])
    run("KOSDAQ 150 TR", "kq", "KOSDAQ", ["150", "TR"])
