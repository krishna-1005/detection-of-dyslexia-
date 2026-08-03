from google import genai
import os
import json
import requests
from dotenv import load_dotenv

# Absolute path loading to ensure key is found
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '../.env'), override=True)

def analyze_with_llm(text):
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return {"error": "Gemini API key not found in environment. Check your .env file."}
    
    try:
        client = genai.Client(api_key=api_key)
        
        # Step 1: Find ANY model that works for this key
        valid_models = []
        try:
            for m in client.models.list():
                if 'generateContent' in m.supported_methods or 'generate_content' in m.supported_methods:
                    valid_models.append(m.name)
        except Exception:
            pass

        # Step 2: Set priority order
        priority = ["models/gemini-1.5-flash", 
    "models/gemini-1.5-pro", 
    "models/gemini-1.5-flash-8b"]
        model_to_use = None
        
        for p in priority:
            if p in valid_models:
                model_to_use = p
                break
        
        if not model_to_use and valid_models:
            model_to_use = valid_models[0]
        
        if not model_to_use:
            model_to_use = "gemini-3.1-flash-lite-preview" # Absolute fallback

        print(f"DEBUG: Using model '{model_to_use}'")

        prompt = f"""
        Role: Dyslexia Intent Decoder.
        Task: Reconstruct the user's intended sentence and analyze ONLY the patterns found in the input.
        
        INPUT: "{text}"
        
        CRITICAL INSTRUCTIONS:
        1. Return ONLY the linguistic patterns found in the provided input. 
        2. If the input is short or has only one error, return ONLY that one error.
        3. Do NOT include examples like "peple" or "uoy" unless they are in the input.
        
        Format: Return ONLY a JSON object.
        JSON Structure:
        {{
            "total_words": int,
            "misspelled_count": int,
            "risk_score": float,
            "corrected_sentence": "string",
            "misspelled_words": [
                {{ "original": "s", "suggested": "s", "type": "s", "reason": "s" }}
            ],
            "linguistic_patterns": [
                {{ "category": "Type", "level": "High | Med | Low", "example": "original -> suggested" }}
            ],
            "analysis_feedback": "string",
            "suggestions_for_improvement": ["string"]
        }}
        """

        response = client.models.generate_content(
            model=model_to_use,
            contents=prompt
        )
        
        content = response.text.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        return json.loads(content)
        
    except Exception as e:
        print(f"DEBUG: AI Error: {str(e)}")
        return {
            "error": str(e),
            "fallback_needed": True
        }

def simplify_for_dyslexia(text):
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return {"error": "Gemini API key not found."}
    
    try:
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        Role: Dyslexia-Friendly Content Editor.
        Task: Rewrite the following text to be more accessible for someone with dyslexia.
        
        Rules:
        1. Use short, simple sentences.
        2. Use active voice.
        3. Break down complex concepts into bullet points if possible.
        4. Use common, easy-to-read words.
        5. Keep the core meaning and facts exactly the same.
        6. Avoid metaphors or complex idioms.
        
        INPUT TEXT: "{text}"
        
        Return ONLY the simplified text.
        """

        # Using a reliable model
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        
        return {"simplified_text": response.text.strip()}
        
    except Exception as e:
        return {"error": str(e)}

def get_local_clinical_response(user_message):
    msg = user_message.lower()
    
    if "dyslexia" in msg or "what is" in msg or "definition" in msg or "symptom" in msg or "sign" in msg or "cause" in msg:
        return (
            "📖 **Understanding Dyslexia & Key Symptoms**:\n\n"
            "Dyslexia is a neurobiological reading difference that affects phonological processing, word decoding, and reading fluency. It is **unrelated** to intelligence.\n\n"
            "**Common Symptoms & Indicators**:\n"
            "• **Phonological Bottlenecks**: Difficulty breaking words into individual sound components (phonemes).\n"
            "• **Letter Reversals**: Frequently swapping visually similar letters (e.g. 'b' vs 'd', 'p' vs 'q').\n"
            "• **Slow Reading Rate**: Hesitant visual tracking that reduces reading comprehension and causes fatigue.\n"
            "• **Spelling & Rapid Naming**: Trouble recalling letter sounds or spelling unfamiliar multi-syllable words.\n\n"
            "💡 *Try LexiFlow's 3-minute Symptoms Assessment at `/quiz` or explore our Bionic Reader and Therapy Modules on the Dashboard!*"
        )
    elif "bionic" in msg or "reader" in msg or "fixation" in msg:
        return (
            "✨ **Bionic Reading & Smart Reader Guide**:\n\n"
            "• **Bionic Fixation**: Bolds the initial letters of words to create natural visual anchor points, guiding your eyes smoothly across text.\n"
            "• **OpenDyslexic Font**: Heavy-bottomed letter designs prevent letter rotation (like mistaking 'b' for 'd').\n"
            "• **Line Focusing**: Highlighting a single line reduces visual crowding and cognitive fatigue.\n\n"
            "💡 *Tip: Try our live Bionic Reader Sandbox on the Home page or launch the full Smart Reader from the Dashboard!*"
        )
    elif "phoneme" in msg or "sound" in msg or "auditory" in msg or "phonological" in msg:
        return (
            "🧩 **Phoneme & Auditory Processing**:\n\n"
            "• **Phonemic Awareness**: The ability to hear, identify, and manipulate individual sounds (phonemes) in spoken words.\n"
            "• **Phoneme Matching Therapy**: Connects visual graphemes with audio pronunciation cues to reinforce decoding.\n"
            "• **Auditory Drills**: Sound isolation exercises help break words into component syllables.\n\n"
            "💡 *Try our interactive Multisensory Phoneme Sampler deck on the Home page!*"
        )
    elif "orton" in msg or "gillingham" in msg or "method" in msg or "science" in msg:
        return (
            "🏆 **Orton-Gillingham (OG) Approach**:\n\n"
            "• **Multisensory Learning**: Engages visual, auditory, and kinesthetic pathways simultaneously.\n"
            "• **Structured & Sequential**: Breaks down reading into explicit, step-by-step rules from simple phonemes to complex morphology.\n"
            "• **Diagnostic & Prescriptive**: Tailors exercise difficulty dynamically based on real-time learner accuracy.\n\n"
            "LexiFlow's 6 therapy modules are 100% aligned with OG research principles."
        )
    elif "tip" in msg or "fluency" in msg or "help" in msg or "improve" in msg:
        return (
            "📖 **5 Proven Dyslexia Reading Strategies**:\n\n"
            "1. **Use Bionic Reading Overlays**: Guides saccadic eye movements and speeds up word recognition.\n"
            "2. **Multisensory Practice**: Combine speech synthesis listening with visual reading.\n"
            "3. **Increase Letter & Line Spacing**: Reduces visual crowding by up to 40%.\n"
            "4. **Short, Consistent Sessions**: 10–15 minutes daily yields better retention than long cramming.\n"
            "5. **Color Contrast Tuning**: Warm cream or dark background tints reduce eye strain."
        )
    elif "quiz" in msg or "screen" in msg or "assessment" in msg or "test" in msg:
        return (
            "📋 **LexiFlow Dyslexia Symptoms Screening**:\n\n"
            "• **Quick & Non-Invasive**: Takes less than 3 minutes to evaluate 10 developmental reading indicators.\n"
            "• **Dynamic Questions**: Refresh automatically on every attempt for accurate tracking.\n"
            "• **Instant Clinical Report**: Receive immediate risk assessment metrics and tailored recommendations.\n\n"
            "🔗 Visit `/quiz` or click 'Start Screening' on the Home page to get started."
        )
    elif "therapy" in msg or "exercise" in msg or "drill" in msg:
        return (
            "🧠 **LexiFlow Interactive Therapy Suite**:\n\n"
            "• **Phoneme Matching**: Master sound-symbol correspondences.\n"
            "• **Morphology**: Learn prefixes, roots, and suffixes.\n"
            "• **Rapid Naming**: Boost rapid automatized naming (RAN) speed.\n"
            "• **Visual Tracking**: Train ocular motor coordination with saccadic target tracking.\n"
            "• **Auditory Processing**: Fine-tune sound discrimination skills.\n"
            "• **Video Practice**: Record reading passages with real-time Azure speech pronunciation assessment."
        )
    else:
        return (
            "👋 **LexiAI Clinical Assistant**:\n\n"
            "I'm here to support you with evidence-based dyslexia strategies, reading tools, and therapy exercises!\n\n"
            "You can ask me about:\n"
            "• **What is Dyslexia & Key Symptoms**\n"
            "• **Bionic Reading** & OpenDyslexic fonts\n"
            "• **Phoneme Matching** & Auditory Therapy\n"
            "• **Orton-Gillingham** principles\n"
            "• **Reading Fluency Tips** for home and classroom\n"
            "• **LexiFlow Diagnostics** & Therapy Modules"
        )

def chat_with_gemini(user_message, history=None):
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return {"reply": get_local_clinical_response(user_message)}
    
    api_key_str = api_key.strip()
    
    system_instruction = """You are LexiAI, an expert AI Clinical Specialist and Educational Assistant for LexiFlow.
Your goal is to assist parents, educators, clinicians, and learners dealing with dyslexia, reading difficulties, and phonological challenges.

Core Principles:
1. Provide empathetic, science-backed, and clear advice based on established methods (e.g. Orton-Gillingham, multisensory learning, phonological awareness, bionic reading).
2. Format answers with clear bullet points, short paragraphs, and high-readability spacing.
3. If asked about LexiFlow features, explain how to use the Diagnostic Engine, Smart Bionic Reader, Therapy Suite (Phoneme Matching, Morphology, Rapid Naming, Visual Tracking, Auditory Processing, Video Practice), and Symptoms Quiz.
4. Always remain encouraging, warm, professional, and accessible.
5. Keep answers concise (under 200 words)."""

    formatted_contents = []
    if history and isinstance(history, list):
        for h in history:
            role = "user" if h.get("sender") == "user" else "model"
            text = h.get("text", "")
            if text:
                formatted_contents.append(f"{role.upper()}: {text}")
    
    formatted_contents.append(f"USER: {user_message}")
    prompt = system_instruction + "\n\nCONVERSATION:\n" + "\n".join(formatted_contents) + "\n\nLEXIAI:"

    # Support OAuth bearer tokens (keys starting with AQ. or ya29.)
    if api_key_str.startswith("AQ.") or api_key_str.startswith("ya29."):
        print("DEBUG: Authenticating Gemini API using OAuth Bearer Token flow...")
        candidate_models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
        last_err = None
        for model in candidate_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                headers = {
                    "Authorization": f"Bearer {api_key_str}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "contents": [
                        {
                            "parts": [
                                {"text": prompt}
                            ]
                        }
                    ]
                }
                print(f"DEBUG: Posting to Gemini REST URL: {url}")
                resp = requests.post(url, headers=headers, json=payload, timeout=15)
                if resp.status_code == 200:
                    resp_json = resp.json()
                    candidates = resp_json.get("candidates") or []
                    if candidates:
                        content = candidates[0].get("content") or {}
                        parts = content.get("parts") or []
                        if parts:
                            reply_text = parts[0].get("text", "").strip()
                            print(f"DEBUG: Gemini OAuth SUCCESS! Reply length: {len(reply_text)} chars")
                            return {"reply": reply_text}
                    last_err = f"Gemini response structure unexpected: {resp_json}"
                else:
                    last_err = f"Status {resp.status_code}: {resp.text}"
                    print(f"DEBUG: Gemini OAuth attempt failed: {last_err}")
            except Exception as e:
                last_err = str(e)
                print(f"DEBUG: Gemini OAuth model {model} error: {e}")
                continue
        return {"error": f"Gemini OAuth Failed: {last_err}"}

    # Standard AI Studio Client Flow
    try:
        client = genai.Client(api_key=api_key_str)
        candidate_models = [
            "models/gemini-1.5-flash",
            "gemini-1.5-flash",
            "models/gemini-1.5-flash-8b",
            "gemini-1.5-flash-8b",
            "models/gemini-1.5-pro",
            "gemini-1.5-pro",
            "models/gemini-2.0-flash",
            "gemini-2.0-flash",
            "gemini-2.5-flash"
        ]
        
        last_error = None
        for model in candidate_models:
            try:
                print(f"DEBUG: Trying Gemini chat with model '{model}'...")
                response = client.models.generate_content(
                    model=model,
                    contents=prompt
                )
                reply_text = response.text.strip()
                if reply_text:
                    print(f"DEBUG: Success with model '{model}'! Reply length: {len(reply_text)} chars")
                    return {"reply": reply_text}
            except Exception as model_err:
                err_msg = str(model_err)
                print(f"DEBUG: Model '{model}' failed: {err_msg[:120]}")
                last_error = err_msg
                continue

        return {"error": f"Gemini Client Error: {last_error}"}
    except Exception as e:
        print(f"DEBUG: Gemini Client Exception: {str(e)}")
        return {"error": f"Gemini Client Exception: {str(e)}"}

def chat_with_groq(user_message, history=None):
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key or not groq_key.strip() or groq_key == "YOUR_GROQ_API_KEY_HERE":
        print("DEBUG: GROQ_API_KEY missing in .env")
        return {"error": "GROQ_API_KEY is missing in backend/.env file. Please add GROQ_API_KEY=gsk_..."}

    try:
        print(f"DEBUG: Calling Groq AI API for query: '{user_message[:40]}...'")
        headers = {
            "Authorization": f"Bearer {groq_key.strip()}",
            "Content-Type": "application/json"
        }
        
        system_instruction = (
            "You are LexiAI, an expert AI Clinical Specialist and Educational Assistant for LexiFlow. "
            "Your goal is to assist parents, educators, clinicians, and learners dealing with dyslexia, reading difficulties, and phonological challenges. "
            "Core Principles:\n"
            "1. Provide empathetic, science-backed, and clear advice based on established methods (e.g. Orton-Gillingham, multisensory learning, phonological awareness, bionic reading).\n"
            "2. Format answers with clear bullet points, short paragraphs, and high-readability spacing.\n"
            "3. If asked about LexiFlow features, explain how to use the Diagnostic Engine, Smart Bionic Reader, Therapy Suite, and Symptoms Quiz.\n"
            "4. Keep answers concise (under 180 words)."
        )

        messages = [{"role": "system", "content": system_instruction}]
        
        # Token Economy: Only send the last 2 turns of conversation history to stay well under TPM rate limits
        if history and isinstance(history, list):
            recent_history = history[-2:]
            for h in recent_history:
                role = "user" if h.get("sender") == "user" else "assistant"
                text = h.get("text", "")
                if text:
                    messages.append({"role": role, "content": text})
                    
        messages.append({"role": "user", "content": user_message})

        # High-Quota Groq Models (llama-3.1-8b-instant has 5x higher TPM limit than 70b!)
        groq_models = [
            "llama-3.1-8b-instant",
            "llama3-8b-8192",
            "gemma2-9b-it",
            "llama-3.3-70b-versatile",
            "mixtral-8x7b-32768"
        ]

        last_error = None
        for model_name in groq_models:
            try:
                payload = {
                    "model": model_name,
                    "messages": messages,
                    "max_tokens": 300,
                    "temperature": 0.65
                }
                resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=12)
                if resp.status_code == 200:
                    res_json = resp.json()
                    reply = res_json["choices"][0]["message"]["content"].strip()
                    print(f"DEBUG: Groq AI ({model_name}) SUCCESS! Response length: {len(reply)} chars")
                    return {"reply": reply}
                else:
                    last_error = f"Model {model_name} status {resp.status_code}: {resp.text[:150]}"
                    print(f"DEBUG: {last_error}")
            except Exception as m_err:
                last_error = str(m_err)
                print(f"DEBUG: Groq model {model_name} failed: {m_err}")
                continue

        return {"error": f"Groq AI Quota Notice: {last_error}"}
    except Exception as e:
        print(f"DEBUG: Groq API Exception: {str(e)}")
        return {"error": f"Groq API Exception: {str(e)}"}

def chat_with_llm(user_message, history=None):
    # 1. Primary: Try Groq API (fast, free, high quota)
    groq_res = chat_with_groq(user_message, history)
    if groq_res and "reply" in groq_res:
        return groq_res

    # 2. Secondary: Try Gemini API if GOOGLE_API_KEY is set with a valid AIzaSy... key
    google_key = os.getenv("GOOGLE_API_KEY", "")
    if google_key and not google_key.startswith("AQ.") and not google_key.startswith("ya29."):
        gemini_res = chat_with_gemini(user_message, history)
        if gemini_res and "reply" in gemini_res:
            return gemini_res

    # 3. Tertiary: Local Clinical Knowledge Base (always available offline)
    return {"reply": get_local_clinical_response(user_message)}


