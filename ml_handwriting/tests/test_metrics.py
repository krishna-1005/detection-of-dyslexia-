"""
Unit tests for Handwriting Evaluation Metrics: Levenshtein distance, CER, WER, and Exact Match.
"""

import pytest
from ml_handwriting.utils.metrics import (
    levenshtein_distance,
    character_error_rate,
    word_error_rate,
    exact_match_accuracy,
)


class TestMetrics:

    def test_levenshtein_distance_exact_match(self):
        assert levenshtein_distance("SCHOOL", "SCHOOL") == 0
        assert levenshtein_distance("", "") == 0

    def test_levenshtein_distance_deletion(self):
        # 'H' omitted
        assert levenshtein_distance("SCHOOL", "SCOOL") == 1

    def test_levenshtein_distance_substitution(self):
        # 'D' replaced with 'B'
        assert levenshtein_distance("FRIEND", "FRIENB") == 1

    def test_levenshtein_distance_transposition(self):
        # In pure Levenshtein, a swap of adjacent letters is 1 deletion + 1 insertion (cost 2)
        assert levenshtein_distance("QUIET", "QUITE") == 2

    def test_levenshtein_distance_empty_strings(self):
        assert levenshtein_distance("WORD", "") == 4
        assert levenshtein_distance("", "TEST") == 4

    def test_character_error_rate(self):
        # 1 edit over 6 reference characters = 1/6 ≈ 0.1667
        cer = character_error_rate("SCHOOL", "SCOOL")
        assert pytest.approx(cer, 0.001) == 1.0 / 6.0

        # Exact match -> 0.0 CER
        assert character_error_rate("PLAY", "PLAY") == 0.0

        # Case-insensitive by default
        assert character_error_rate("play", "PLAY") == 0.0

    def test_word_error_rate(self):
        ref = ["THE", "QUICK", "BROWN", "FOX"]
        hyp = ["THE", "QUIK", "BROWN", "FOX"]
        # 1 word out of 4 is wrong
        wer = word_error_rate(ref, hyp)
        assert pytest.approx(wer, 0.001) == 0.25

    def test_exact_match_accuracy(self):
        refs = ["SCHOOL", "FRIEND", "PLAY"]
        hyps = ["SCOOL", "FRIEND", "PLAY"]
        assert pytest.approx(exact_match_accuracy(refs, hyps), 0.001) == 2.0 / 3.0

