# detection_agent.py
from spellchecker import SpellChecker
import difflib
import re

spell = SpellChecker(language='en')

def tokenize(text):
    # simple tokenization preserving words and punctuation
    tokens = re.findall(r"\w+|[^\w\s]", text, re.UNICODE)
    return tokens

def is_transposition(orig, corr):
    # Returns True if corr can be obtained by swapping adjacent letters in orig
    # or if levenshtein-like distance is 1 with a swap
    if not orig or not corr: 
        return False
    if orig == corr:
        return False
    # Quick check: same length and exactly two positions swapped
    if len(orig) == len(corr):
        diffs = [i for i, (a, b) in enumerate(zip(orig, corr)) if a != b]
        if len(diffs) == 2:
            i, j = diffs
            # check swapped
            if orig[i] == corr[j] and orig[j] == corr[i]:
                return True
    # fallback: check if close sequence (use difflib)
    seq = difflib.SequenceMatcher(None, orig, corr)
    if seq.ratio() > 0.7:
        # ratio indicates they are similar; treat some as dyslexic-like (conservative)
        return True
    return False

def analyze_text(text):
    """
    Returns:
      - tokens: token list
      - misspelled: list of dict { word, index, suggestions }
      - corrected_text: text with suggested corrections applied
      - risk_score: 0-100
      - risk_category: Low/Medium/High
    """
    tokens = tokenize(text)
    words = [t for t in tokens if re.match(r'^\w+$', t)]
    # find misspelled words
    misspelled_set = spell.unknown(words)
    misspelled = []
    transposition_count = 0

    corrected_tokens = tokens.copy()
    # We need to map words back to tokens indices
    word_idx = 0
    for i, tok in enumerate(tokens):
        if re.match(r'^\w+$', tok):
            word = tok
            if word.lower() in misspelled_set:
                suggestions = list(spell.candidates(word))
                # prefer the "correction" method for single best suggestion
                best = spell.correction(word)
                if not best:
                    best = suggestions[0] if suggestions else word
                # check if this looks like a transposition / dyslexic-like error
                if is_transposition(word.lower(), best.lower()):
                    transposition_count += 1

                misspelled.append({
                    "word": word,
                    "index_in_tokens": i,
                    "suggestions": suggestions,
                    "best": best
                })
                # replace token in corrected tokens with best
                corrected_tokens[i] = best
            word_idx += 1

    # create corrected text
    corrected_text = ''
    # join tokens while preserving spacing heuristics: put a space before words and after punctuation heuristics
    for i, tok in enumerate(corrected_tokens):
        if i > 0:
            # determine whether to add space:
            if re.match(r'^\w+$', tok) and re.match(r'^\w+$', corrected_tokens[i-1]):
                corrected_text += ' '
            elif re.match(r'^\w+$', tok) and re.match(r'^[^\w\s]$', corrected_tokens[i-1]):
                corrected_text += ' '
            elif re.match(r'^[^\w\s]$', tok):
                # punctuation: no leading space
                pass
            else:
                corrected_text += ' '
        corrected_text += tok

    # scoring
    total_words = len(words) if len(words) > 0 else 1
    miss_count = len(misspelled)
    miss_rate = miss_count / total_words  # fraction
    transposition_rate = transposition_count / total_words

    # heuristics: weight miss_rate higher, but transpositions bump the score
    score = (miss_rate * 70) + (transposition_rate * 30)
    score = max(0.0, min(100.0, score * 100)) / 100.0  # normalize step (avoid huge numbers)
    # The above two line normalizes into 0-100
    # Simpler: convert to 0-100 directly
    score = int(score * 100)

    # risk category
    if score < 20:
        category = "Low"
    elif score < 50:
        category = "Medium"
    else:
        category = "High"

    return {
        "tokens": tokens,
        "misspelled": misspelled,
        "corrected_text": corrected_text,
        "total_words": total_words,
        "misspelled_count": miss_count,
        "transposition_count": transposition_count,
        "risk_score": score,
        "risk_category": category
    }
