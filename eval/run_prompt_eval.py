#!/usr/bin/env python3
"""
Phraiz Phase 4 — 프롬프트 & 파이프라인 회귀 평가 스크립트
백엔드(localhost:8080)가 켜진 상태에서 실행하면 3가지 핵심 품질 기준을 자동 검증합니다.
"""
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8080"


def call_sse_paraphrase(text: str, mode: str, strength: int, tier: str = "PRO") -> str:
    payload = json.dumps({
        "text": text,
        "mode": mode,
        "strengthLevel": strength,
        "fastMode": False,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/v2/ai/paraphrase/stream",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "X-Plan-Tier": tier,
        },
        method="POST",
    )
    chunks = []
    with urllib.request.urlopen(req, timeout=60) as resp:
        event_name = ""
        for raw in resp:
            line = raw.decode("utf-8").strip()
            if line.startswith("event:"):
                event_name = line[6:].strip()
            elif line.startswith("data:") and event_name == "delta":
                data = json.loads(line[5:].strip())
                chunks.append(data.get("content", ""))
    return "".join(chunks)


def word_change_ratio(a: str, b: str) -> float:
    sa, sb = set(a.split()), set(b.split())
    if not sa:
        return 0.0
    return round((1 - len(sa & sb) / len(sa)) * 100, 1)


def main():
    print("=== Phraiz Prompt & Pipeline Regression Eval ===\n")

    # Test 1: 1단계 vs 5단계 변경률 단조 증가 검증
    ko_sample = "요즘 대학생들이 레포트 쓸 때 AI를 엄청 많이 쓰는데, 그냥 복붙만 하면 표절 걸릴 수도 있고 교수님들이 바로 알아챈다."
    out_lv1 = call_sse_paraphrase(ko_sample, "academic", 1)
    out_lv5 = call_sse_paraphrase(ko_sample, "academic", 5)
    r1 = word_change_ratio(ko_sample, out_lv1)
    r5 = word_change_ratio(ko_sample, out_lv5)
    t1_pass = r5 > r1
    print(f"[{'PASS' if t1_pass else 'FAIL'}] Test 1 (강도 분리): 1단계 변경률={r1}% < 5단계 변경률={r5}%")

    # Test 2: 영문 입력 시 원어(영어) 유지 검증
    en_sample = "Traditional RAG systems score each passage independently against the query."
    out_en = call_sse_paraphrase(en_sample, "academic", 4)
    korean_chars = sum(1 for ch in out_en if "\uac00" <= ch <= "\ud7a3")
    t2_pass = len(out_en) > 10 and korean_chars == 0
    print(f"[{'PASS' if t2_pass else 'FAIL'}] Test 2 (언어 유지): 한글 혼입={korean_chars}자 | 출력='{out_en[:60]}...'")

    # Test 3: Crossref DOI 공식 검증 파이프라인 확인
    cite_req = urllib.request.Request(
        f"{BASE_URL}/api/v2/ai/citation/extract",
        data=json.dumps({"url": "https://doi.org/10.1038/nature14539"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(cite_req, timeout=20) as resp:
        cite = json.loads(resp.read().decode("utf-8"))
    t3_pass = cite.get("doiVerified") is True and "Deep learning" in (cite.get("title") or "")
    print(f"[{'PASS' if t3_pass else 'FAIL'}] Test 3 (Crossref DOI 검증): source={cite.get('source')}, verified={cite.get('doiVerified')}")

    print("\n완료:", "모든 테스트 통과!" if (t1_pass and t2_pass and t3_pass) else "일부 항목 점검 필요")


if __name__ == "__main__":
    main()
