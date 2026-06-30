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


def post(data: dict) -> dict:
    r = S.post(GETJSON, data=data, timeout=30)
    try:
        return r.json()
    except Exception:
        print(f"// 응답이 JSON이 아님 (HTTP {r.status_code}). 원문 앞부분 ↓ (이걸 붙여주세요)")
        print("//", r.text[:400].replace("\n", " "))
        return {}


def find_index(search: str) -> list[dict]:
    """KRX 지수 finder → [{full_code, short_code, codeName, marketName, ...}]."""
    j = post({"bld": "dbms/comm/finder/finder_equidx", "mktsel": "ALL", "searchText": search})
    # finder 결과 키가 버전마다 block1 / output 으로 다를 수 있어 둘 다 시도
    return j.get("block1") or j.get("output") or []


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


def run(label: str, key: str, search: str, exact: str) -> None:
    cands = find_index(search)
    if not cands:
        print(f"// {label}: 파인더 결과 비어있음 — 위 응답 원문 확인 필요.")
        return
    pick = (
        next((c for c in cands if c.get("codeName") == exact), None)
        or next((c for c in cands if exact.replace(" ", "") in (c.get("codeName") or "").replace(" ", "")), None)
    )
    if not pick:
        print(f"// {label}: '{exact}' 못 찾음. 파인더 후보 ↓ (이걸 붙여주세요)")
        print("//", json.dumps(cands, ensure_ascii=False)[:900])
        return
    full, short = pick.get("full_code"), pick.get("short_code")
    rows = series(full, short)
    if not rows:
        print(f"// {label}: 시세 비어있음. 선택된 지수 정보 ↓ (이걸 붙여주세요)")
        print("//", json.dumps(pick, ensure_ascii=False))
        return
    rets = annual_returns(rows)
    ys = sorted(rets)
    if not ys:
        print(f"// {label}: 수익률 계산 실패. 시세 첫 행 ↓ (이걸 붙여주세요)")
        print("//", json.dumps(rows[0], ensure_ascii=False))
        return
    print(f"// {label}: {pick.get('codeName')} (full={full}, short={short}), {ys[0]}~{ys[-1]}")
    print(f"  // RETURN_YEARS.{key}")
    print(f"  {key}: {ys},")
    print(f"  // RETURNS.{key} (배당 포함 TR)")
    print(f"  {key}: {[rets[y] for y in ys]},")
    print()


if __name__ == "__main__":
    print("// KRX 공식 gross TR (requests 직접 호출). 반영 시 indexData의 배당 가산(+1.8 등) 제거.\n")
    run("KOSPI 200 TR", "ks", "200", "코스피 200 TR")
    run("KOSDAQ 150 TR", "kq", "150", "코스닥 150 TR")
