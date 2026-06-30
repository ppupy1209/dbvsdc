#!/usr/bin/env python3
"""
KRX 공식 gross TR (코스피 200 TR · 코스닥 150 TR) 직접 수집 — pykrx 불필요.

WHY NOT pykrx
  최근 KRX 포털 변경으로 일부 pykrx 버전이 KRX 회원 로그인(KRX_ID/KRX_PW)을
  요구하고, Python 3.14에서 깨진다. 여기서는 KRX의 공개 JSON 엔드포인트를
  requests로 직접 호출한다. KRX가 막는 건 로그인이 아니라 '헤더 없는 요청'이라,
  올바른 Referer/User-Agent만 보내면 로그인 없이 받아진다(브라우저 단순 접근은 403).

RUN (네트워크 되는 PC):
  pip install requests
  python web/scripts/fetch-krx-tr.py

OUTPUT
  성공: RETURNS.ks / RETURNS.kq (연간 %) + 연도 배열 → indexData.ts에 붙여넣기.
        TR엔 배당이 이미 포함 → DIVIDEND_YIELD.ks 1.8→0, kq 프록시 표기 제거.
  실패: 진단(파인더 결과 / 응답 원문)을 출력하니 그 출력을 그대로 붙여주세요.
        (KRX 필드명/코드 매핑이 바뀌었으면 그걸로 한 번에 고칠 수 있습니다.)
"""
import sys
import json

try:
    import requests
except ImportError:
    sys.exit("requests 미설치:  pip install requests")

BASE = "http://data.krx.co.kr"
GETJSON = BASE + "/comm/bldAttendant/getJsonData.cmd"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Referer": BASE + "/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201020103",
    "X-Requested-With": "XMLHttpRequest",
}

S = requests.Session()
S.headers.update(HEADERS)


def prime() -> None:
    """KRX는 POST 전에 로더 페이지를 한 번 GET해 세션 쿠키를 받아야 JSON을 준다."""
    try:
        S.get(HEADERS["Referer"], timeout=30)
    except Exception as e:
        print(f"// 세션 초기화 GET 실패: {e}")


def post(data: dict) -> dict:
    r = S.post(GETJSON, data=data, timeout=30)
    try:
        return r.json()
    except Exception:
        print(f"// 응답이 JSON이 아님 (HTTP {r.status_code}). 원문 앞부분 ↓ (이걸 붙여주세요)")
        print("//", r.text[:400].replace("\n", " "))
        return {}


MKTSELS = ["ALL", "STK", "KSQ", "1", "2", ""]


def find_index(searches: list[str]) -> list[dict]:
    """finder_equidx는 mktsel/searchText 조합이 까다로워, 여러 조합을 쓸어본다."""
    last = {}
    for st in searches:
        for mk in MKTSELS:
            j = post({"bld": "dbms/comm/finder/finder_equidx", "mktsel": mk, "searchText": st})
            last = j
            rows = j.get("block1") or j.get("output") or []
            if rows:
                print(f"// [ok] finder 매칭: mktsel={mk!r}, searchText={st!r} → {len(rows)}건")
                return rows
    print(f"// [진단] finder 전 조합 실패. 마지막 응답 키={list(last.keys())}; 원문 ↓")
    print("//", json.dumps(last, ensure_ascii=False)[:600])
    return []


TR_HINTS = ["TR", "총수익", "토탈", "토털", "TOTALRETURN"]


def pick_index(cands: list[dict], base: str) -> dict | None:
    for c in cands:  # prefer a TR / 총수익 variant
        nm = (c.get("codeName") or "").upper().replace(" ", "")
        if any(h.upper() in nm for h in TR_HINTS):
            return c
    for c in cands:  # else the exact base index (validates the series endpoint)
        if c.get("codeName") == base:
            return c
    return None


def series(full_code: str, short_code: str) -> list[dict]:
    j = post({
        "bld": "dbms/MDC/STAT/standard/MDCSTAT00301",
        "locale": "ko_KR",
        "indIdx": full_code,
        "indIdx2": short_code,
        "strtDd": "20010101",
        "endDd": "20251231",
        "share": "2",
        "money": "3",
        "csvxls_isNo": "false",
    })
    return j.get("output") or j.get("block1") or []


def annual_returns(rows: list[dict]) -> dict[int, float]:
    """연말종가 기준 연간 수익률(%) = 종가_t / 종가_{t-1} − 1."""
    year_close: dict[int, tuple[str, float]] = {}
    for row in rows:
        d = (row.get("TRD_DD") or "").replace("-", "/")
        c = row.get("CLSPRC_IDX") or row.get("CLSPRC") or row.get("CLSPRC_ISU") or ""
        if not d or not c:
            continue
        try:
            year = int(d[:4])
            val = float(str(c).replace(",", ""))
        except ValueError:
            continue
        if val <= 0:
            continue
        if year not in year_close or d > year_close[year][0]:
            year_close[year] = (d, val)
    years = sorted(year_close)
    return {
        years[i]: round((year_close[years[i]][1] / year_close[years[i - 1]][1] - 1) * 100, 2)
        for i in range(1, len(years))
    }


def run(label: str, key: str, searches: list[str], base: str) -> None:
    cands = find_index(searches)
    if not cands:
        print(f"// {label}: 파인더 결과 비어있음.")
        return
    # TR이 한글명일 수 있어 전체 변형명을 본다.
    print(f"// {label}: finder {len(cands)}건 — 전체 이름 ↓")
    print("//  " + " | ".join((c.get("codeName") or "?") for c in cands))
    pick = pick_index(cands, base)
    if not pick:
        print(f"// {label}: TR/총수익 변형도, base '{base}'도 못 찾음.")
        return
    is_tr = any(h.upper() in (pick.get("codeName") or "").upper().replace(" ", "") for h in TR_HINTS)
    full, short = pick.get("full_code"), pick.get("short_code")
    rows = series(full, short)
    if not rows:
        print(f"// {label}: 시세 비어있음. pick={json.dumps(pick, ensure_ascii=False)}")
        return
    print(f"// {label}: 시세 OK ({pick.get('codeName')}, full={full}, short={short}), "
          f"{'TR✅' if is_tr else 'PRICE(가격지수) — TR 미발견 시 폴백'}; 첫 행 키={list(rows[0].keys())}")
    print("//  첫 행:", json.dumps(rows[0], ensure_ascii=False))
    rets = annual_returns(rows)
    ys = sorted(rets)
    if not ys:
        print(f"// {label}: 수익률 계산 실패(필드명 확인). 위 첫 행 참고.")
        return
    print(f"  // RETURN_YEARS.{key}\n  {key}: {ys},")
    print(f"  // RETURNS.{key} ({pick.get('codeName')})\n  {key}: {[rets[y] for y in ys]},")
    print()


if __name__ == "__main__":
    print("// KRX 공식 gross TR (requests 직접 호출). 반영 시 indexData의 배당 가산(+1.8 등) 제거.\n")
    prime()
    run("KOSPI 200 TR", "ks", ["코스피 200", "코스피", "200"], "코스피 200")
    run("KOSDAQ 150 TR", "kq", ["코스닥 150", "코스닥", "150"], "코스닥 150")
