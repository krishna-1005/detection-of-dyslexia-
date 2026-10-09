"""
Cognilex 30-Sample Benchmark Evaluation Runner
Evaluates LexiFlow Backend Detection Models:
- Deterministic NLP Agent (model.detection_agent.analyze_text)
- Gemini LLM Agent (model.llm_agent.analyze_with_llm)
- Combined / Fallback Engine
"""

import os
import sys
import time
import argparse
import csv
from dotenv import load_dotenv

# Pre-flight Import Verification
try:
    from model.detection_agent import analyze_text
except ImportError as e:
    print(f"[FATAL ERROR] Failed to import analyze_text from model.detection_agent: {e}")
    sys.exit(1)

try:
    from model.llm_agent import analyze_with_llm
except ImportError as e:
    print(f"[FATAL ERROR] Failed to import analyze_with_llm from model.llm_agent: {e}")
    sys.exit(1)


def categorize_risk(score):
    """
    Standardize risk score (0-100 or 0.0-1.0 float) into Low, Medium, or High risk category.
    """
    if score is None:
        return "N/A"
    try:
        val = float(score)
        if 0.0 <= val <= 1.0:
            val = val * 100.0
    except (ValueError, TypeError):
        return "N/A"

    if val < 20.0:
        return "Low"
    elif val < 50.0:
        return "Medium"
    else:
        return "High"


def run_benchmark(input_csv, output_csv):
    print("================================================================================")
    print("         LEXIFLOW BACKEND NLP BENCHMARK EVALUATION RUNNER (30 SAMPLES)")
    print("================================================================================")

    # 1. Environment & Pre-Flight Check
    basedir = os.path.abspath(os.path.dirname(__file__))
    env_path = os.path.join(basedir, ".env")
    load_dotenv(env_path, override=True)

    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    has_api_key = bool(api_key)

    if has_api_key:
        print("[PRE-FLIGHT] GOOGLE_API_KEY detected in backend/.env.")
        print("[PRE-FLIGHT] Gemini LLM Evaluation Mode: ENABLED")
    else:
        print("[PRE-FLIGHT] GOOGLE_API_KEY not found in backend/.env.")
        print("[PRE-FLIGHT] Gemini LLM Evaluation Mode: DISABLED (Deterministic Fallback Only)")

    if not os.path.isabs(input_csv):
        input_csv_path = os.path.join(basedir, input_csv)
    else:
        input_csv_path = input_csv

    if not os.path.exists(input_csv_path):
        print(f"[FATAL ERROR] Input dataset '{input_csv_path}' not found!")
        sys.exit(1)

    print(f"[PRE-FLIGHT] Target Input File: {input_csv_path}")

    if not os.path.isabs(output_csv):
        output_csv_path = os.path.join(basedir, output_csv)
    else:
        output_csv_path = output_csv

    print(f"[PRE-FLIGHT] Target Output File: {output_csv_path}\n")

    # Read evaluation dataset
    samples = []
    with open(input_csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            samples.append(row)

    print(f"[EXECUTION] Successfully loaded {len(samples)} benchmark samples.")
    print("--------------------------------------------------------------------------------")

    results = []
    total_det_latency = 0.0
    total_llm_latency = 0.0
    llm_attempts = 0
    fallback_count = 0

    predicted_categories = {"Low": 0, "Medium": 0, "High": 0}

    for idx, sample in enumerate(samples, 1):
        sample_id = sample.get("sample_id", str(idx))
        input_text = sample.get("input_text", "").strip()
        expected_cat = sample.get("expected_category", "Unknown").strip()

        print(f"[{idx:02d}/30] Evaluating Sample #{sample_id}...")

        # ---------------------------------------------------------
        # 1. Deterministic NLP Agent Evaluation
        # ---------------------------------------------------------
        start_det = time.perf_counter()
        det_error = None
        try:
            det_res = analyze_text(input_text)
            det_risk_score = det_res.get("risk_score", 0)
            det_risk_cat = det_res.get("risk_category") or categorize_risk(det_risk_score)
        except Exception as e:
            det_error = str(e)
            det_risk_score = 0
            det_risk_cat = "Low"
        end_det = time.perf_counter()
        det_latency_ms = round((end_det - start_det) * 1000.0, 2)
        total_det_latency += det_latency_ms

        # ---------------------------------------------------------
        # 2. Gemini LLM Agent Evaluation (with graceful error handling)
        # ---------------------------------------------------------
        llm_risk_score = None
        llm_risk_cat = None
        llm_latency_ms = 0.0
        llm_error = None
        llm_success = False

        if has_api_key:
            llm_attempts += 1
            start_llm = time.perf_counter()
            try:
                llm_res = analyze_with_llm(input_text)
                end_llm = time.perf_counter()
                llm_latency_ms = round((end_llm - start_llm) * 1000.0, 2)
                total_llm_latency += llm_latency_ms

                if isinstance(llm_res, dict) and "error" not in llm_res and not llm_res.get("fallback_needed"):
                    raw_score = llm_res.get("risk_score", 0)
                    if isinstance(raw_score, float) and raw_score <= 1.0:
                        llm_risk_score = round(raw_score * 100.0, 2)
                    else:
                        llm_risk_score = round(float(raw_score), 2)
                    llm_risk_cat = categorize_risk(llm_risk_score)
                    llm_success = True
                else:
                    err_text = llm_res.get("error", "LLM fallback requested") if isinstance(llm_res, dict) else str(llm_res)
                    llm_error = err_text
            except Exception as exc:
                end_llm = time.perf_counter()
                llm_latency_ms = round((end_llm - start_llm) * 1000.0, 2)
                total_llm_latency += llm_latency_ms
                llm_error = str(exc)

        # ---------------------------------------------------------
        # 3. Combined / Fallback Decision Logic
        # ---------------------------------------------------------
        if llm_success and llm_risk_score is not None:
            combined_risk_score = llm_risk_score
            combined_risk_cat = llm_risk_cat
            fallback_used = False
            effective_latency_ms = llm_latency_ms
        else:
            combined_risk_score = det_risk_score
            combined_risk_cat = det_risk_cat
            fallback_used = True
            fallback_count += 1
            effective_latency_ms = round(det_latency_ms + (llm_latency_ms if has_api_key else 0.0), 2)

        # Record predicted category distribution based on combined decision
        if combined_risk_cat in predicted_categories:
            predicted_categories[combined_risk_cat] += 1
        else:
            predicted_categories[combined_risk_cat] = 1

        results.append({
            "sample_id": sample_id,
            "input_text": input_text,
            "expected_category": expected_cat,
            "det_risk_score": det_risk_score,
            "det_risk_category": det_risk_cat,
            "det_latency_ms": det_latency_ms,
            "llm_risk_score": llm_risk_score if llm_risk_score is not None else "N/A",
            "llm_risk_category": llm_risk_cat if llm_risk_cat else "N/A",
            "llm_latency_ms": llm_latency_ms,
            "llm_error": llm_error if llm_error else "None",
            "combined_risk_score": combined_risk_score,
            "combined_risk_category": combined_risk_cat,
            "fallback_used": fallback_used,
            "effective_latency_ms": effective_latency_ms
        })

    # Save Output CSV
    fieldnames = [
        "sample_id",
        "input_text",
        "expected_category",
        "det_risk_score",
        "det_risk_category",
        "det_latency_ms",
        "llm_risk_score",
        "llm_risk_category",
        "llm_latency_ms",
        "llm_error",
        "combined_risk_score",
        "combined_risk_category",
        "fallback_used",
        "effective_latency_ms"
    ]

    with open(output_csv_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print("--------------------------------------------------------------------------------")
    print(f"[POST-RUN VALIDATION] Successfully saved benchmark results ({len(results)} rows) to:")
    print(f"                      {output_csv_path}\n")

    # ---------------------------------------------------------
    # 4. Post-Run Summary & Statistics
    # ---------------------------------------------------------
    avg_det_latency = round(total_det_latency / len(samples), 2) if len(samples) > 0 else 0.0
    avg_llm_latency = round(total_llm_latency / llm_attempts, 2) if llm_attempts > 0 else 0.0
    fallback_rate = round((fallback_count / len(samples)) * 100.0, 1) if len(samples) > 0 else 0.0

    print("================================================================================")
    print("                        POST-RUN SUMMARY METRICS")
    print("================================================================================")
    print(f" Total Samples Evaluated        : {len(samples)}")
    print(f" Average Deterministic NLP Latency: {avg_det_latency} ms")
    if has_api_key:
        print(f" Average Gemini LLM Latency       : {avg_llm_latency} ms")
    else:
        print(f" Average Gemini LLM Latency       : N/A (Key not present)")
    print("--------------------------------------------------------------------------------")
    print(" Distribution of Predicted Risk Categories (Combined Output):")
    print(f"   - Low Risk    : {predicted_categories.get('Low', 0)} samples")
    print(f"   - Medium Risk : {predicted_categories.get('Medium', 0)} samples")
    print(f"   - High Risk   : {predicted_categories.get('High', 0)} samples")
    print("--------------------------------------------------------------------------------")
    print(f" Fallback Trigger Count          : {fallback_count} / {len(samples)} samples")
    print(f" Fallback Trigger Rate           : {fallback_rate}%")
    print("================================================================================")

    return len(results)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cognilex 30-Sample Benchmark Evaluation Runner")
    parser.add_argument("--input", default="Cognilex_30_Sample_Evaluation.csv", help="Input dataset CSV path")
    parser.add_argument("--output", default="Cognilex_30_Sample_Results.csv", help="Output results CSV path")
    args = parser.parse_args()

    run_benchmark(args.input, args.output)
