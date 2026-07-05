# # backend/dyslexia_agent_backend.py

# from difflib import SequenceMatcher
# import json
# import os

# # -------------------------------
# # DETECTION AGENT
# # -------------------------------
# def call_detection_agent(user_input_text, correct_text):
#     """
#     Simple comparison-based dyslexia risk detection.
#     Compares each word in user's text with the correct text.
#     """
#     user_words = user_input_text.strip().split()
#     correct_words = correct_text.strip().split()
    
#     incorrect_words = []
#     corrected_sentence = []

#     # Compare word by word
#     for i, word in enumerate(user_words):
#         if i < len(correct_words):
#             correct_word = correct_words[i]
#             similarity = SequenceMatcher(None, word.lower(), correct_word.lower()).ratio()
#             if similarity < 0.8:
#                 incorrect_words.append({"userWord": word, "correctWord": correct_word})
#                 corrected_sentence.append(correct_word)
#             else:
#                 corrected_sentence.append(word)
#         else:
#             incorrect_words.append({"userWord": word, "correctWord": None})
#             corrected_sentence.append(word)

#     # Severity = ratio of mistakes
#     total_words = len(correct_words)
#     mistakes = len(incorrect_words)
#     severity = (mistakes / total_words) * 100 if total_words > 0 else 0

#     feedback = "Low risk. Good spelling!" if severity < 20 else (
#         "Moderate risk. Check your spellings carefully." if severity < 50 else
#         "High risk. You made many spelling errors."
#     )

#     result = {
#         "inputText": user_input_text,
#         "correctText": correct_text,
#         "incorrectWords": incorrect_words,
#         "correctedSentence": " ".join(corrected_sentence),
#         "severityScore": round(severity, 2),
#         "agentFeedback": feedback
#     }
#     return result


# # -------------------------------
# # SIMULATED DATABASE
# # -------------------------------
# DATABASE_FILE = "simulated_user_data.json"

# def save_session_to_db(user_id, session_data):
#     if os.path.exists(DATABASE_FILE):
#         with open(DATABASE_FILE, 'r') as f:
#             db = json.load(f)
#     else:
#         db = {}

#     if user_id not in db:
#         db[user_id] = []
#     db[user_id].append(session_data)

#     with open(DATABASE_FILE, 'w') as f:
#         json.dump(db, f, indent=4)

# def get_history_from_db(user_id):
#     if not os.path.exists(DATABASE_FILE):
#         return []
#     with open(DATABASE_FILE, 'r') as f:
#         db = json.load(f)
#     return db.get(user_id, [])
