"""
Cognilex AI - Handwriting Analysis Utilities: Metrics
Provides research-standard evaluation metrics including Levenshtein Edit Distance,
Character Error Rate (CER), and Word Error Rate (WER).
"""

from typing import List, Tuple, Sequence


def levenshtein_distance(s1: str, s2: str) -> int:
    """
    Computes standard Levenshtein edit distance (insertions, deletions, substitutions).

    Args:
        s1: Source string
        s2: Target string

    Returns:
        int: Minimum edit operations
    """
    m, n = len(s1), len(s2)
    if m == 0:
        return n
    if n == 0:
        return m

    # Use two-row dynamic programming for O(min(m, n)) space
    dp = list(range(n + 1))

    for i in range(1, m + 1):
        prev = dp[0]
        dp[0] = i
        for j in range(1, n + 1):
            temp = dp[j]
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            dp[j] = min(
                dp[j] + 1,       # deletion
                dp[j - 1] + 1,   # insertion
                prev + cost      # substitution
            )
            prev = temp

    return dp[n]


def character_error_rate(reference: str, hypothesis: str, case_sensitive: bool = False) -> float:
    """
    Calculates Character Error Rate (CER) = Levenshtein(ref, hyp) / max(1, len(ref)).

    Args:
        reference: Ground-truth target string
        hypothesis: Recognized / transcribed string
        case_sensitive: Whether case differences count as errors (default False for dyslexia research)

    Returns:
        float: Error rate between 0.0 and inf (typically 0.0 to 1.0)
    """
    ref = reference if case_sensitive else reference.upper()
    hyp = hypothesis if case_sensitive else hypothesis.upper()

    ref = ref.strip()
    hyp = hyp.strip()

    if not ref:
        return 0.0 if not hyp else 1.0

    distance = levenshtein_distance(ref, hyp)
    return float(distance / len(ref))


def word_error_rate(reference: Sequence[str], hypothesis: Sequence[str]) -> float:
    """
    Calculates Word Error Rate (WER) across word sequences.
    """
    ref_words = [w.strip().upper() for w in reference if w.strip()]
    hyp_words = [w.strip().upper() for w in hypothesis if w.strip()]

    if not ref_words:
        return 0.0 if not hyp_words else 1.0

    m, n = len(ref_words), len(hyp_words)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = 0 if ref_words[i - 1] == hyp_words[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            )

    return float(dp[m][n] / len(ref_words))


def exact_match_accuracy(references: List[str], hypotheses: List[str]) -> float:
    """
    Calculates exact word recognition accuracy (case-insensitive).
    """
    if not references:
        return 0.0

    correct = 0
    total = len(references)
    for ref, hyp in zip(references, hypotheses):
        if ref.strip().upper() == hyp.strip().upper():
            correct += 1

    return float(correct / total)

