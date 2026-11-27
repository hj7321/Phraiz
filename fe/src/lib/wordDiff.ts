export type DiffType = "equal" | "removed" | "added";

export interface DiffToken {
  type: DiffType;
  value: string;
}

export interface DiffSummary {
  tokens: DiffToken[];
  changeRatio: number; // 0 ~ 100 (%)
}

/**
 * 한국어·영어 공백/구두점 단위 LCS 기반 단어 Diff 계산기 (외부 의존성 없음)
 */
export function computeWordDiff(original: string, modified: string): DiffSummary {
  const a = tokenize(original);
  const b = tokenize(modified);

  const m = a.length;
  const n = b.length;

  // LCS DP 테이블
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const rawTokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  let equalWords = 0;

  while (i < m && j < n) {
    if (a[i] === b[j]) {
      rawTokens.push({ type: "equal", value: a[i] });
      if (a[i].trim().length > 0) equalWords++;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rawTokens.push({ type: "removed", value: a[i] });
      i++;
    } else {
      rawTokens.push({ type: "added", value: b[j] });
      j++;
    }
  }

  while (i < m) {
    rawTokens.push({ type: "removed", value: a[i++] });
  }
  while (j < n) {
    rawTokens.push({ type: "added", value: b[j++] });
  }

  // 연속된 같은 타입 토큰 병합
  const merged: DiffToken[] = [];
  for (const t of rawTokens) {
    const last = merged[merged.length - 1];
    if (last && last.type === t.type) {
      last.value += t.value;
    } else {
      merged.push({ ...t });
    }
  }

  const origWordCount = a.filter((w) => w.trim().length > 0).length;
  const changeRatio =
    origWordCount === 0
      ? 0
      : Math.min(100, Math.round(((origWordCount - equalWords) / origWordCount) * 100));

  return { tokens: merged, changeRatio };
}

function tokenize(text: string): string[] {
  if (!text) return [];
  return text.split(/(\s+)/).filter((part) => part.length > 0);
}
