from google.cloud import firestore

db = firestore.Client()

def log_feedback(data: dict):
    """Stores the Shift Score in Firestore"""
    doc_ref = db.collection("feedbacks").document(data["session_id"])
    doc_ref.set(data)

def save_session(session_id: str, input_data: str):
    """Saves the initial flip request"""
    db.collection("sessions").document(session_id).set({
        "input": input_data,
        "status": "processing"
    })