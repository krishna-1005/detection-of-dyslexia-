from google import genai
import os
import json
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
