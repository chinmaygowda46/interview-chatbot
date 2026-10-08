import asyncio
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent import (
    generate_question,
    score_answer,
    handle_follow_up,
    generate_final_report,
)


app = FastAPI(title="Interview Practice Chatbot")


# =========================================
# CORS
# =========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================
# HISTORY DATABASE
# =========================================

HISTORY_DB_PATH = "./interview_history.db"


def init_history_db():

    with sqlite3.connect(
        HISTORY_DB_PATH
    ) as connection:

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS interview_history (
                id            TEXT PRIMARY KEY,
                role          TEXT NOT NULL,
                scores        TEXT NOT NULL,
                average_score REAL NOT NULL,
                created_at    TEXT NOT NULL
            )
            """
        )


init_history_db()


# =========================================
# MODELS
# =========================================

class QuestionRequest(BaseModel):
    role: str
    question_number: int


class AnswerRequest(BaseModel):
    role: str
    question: str
    answer: str


class FollowUpRequest(BaseModel):
    role: str
    question: str
    answer: str
    feedback: str
    follow_up: str


class InterviewHistoryRequest(BaseModel):
    role: str
    scores: List[float]
    average_score: float


class FinalReportRequest(BaseModel):
    role: str
    performance: str


# =========================================
# BASIC
# =========================================

@app.get("/")
def root():
    return {
        "message": "Interview Practice API is running"
    }


# =========================================
# QUESTION
# =========================================

@app.post("/new-question")
def new_question(request: QuestionRequest):

    question = generate_question(
        request.role,
        request.question_number
    )

    return {
        "question": question
    }


# =========================================
# ANSWER
# =========================================

@app.post("/submit-answer")
def submit_answer(request: AnswerRequest):

    feedback = score_answer(
        request.role,
        request.question,
        request.answer
    )

    return {
        "feedback": feedback
    }


# =========================================
# FOLLOW UP
# =========================================

@app.post("/follow-up")
def follow_up(request: FollowUpRequest):

    response = handle_follow_up(
        request.role,
        request.question,
        request.answer,
        request.feedback,
        request.follow_up
    )

    return {
        "response": response
    }


# =========================================
# FINAL REPORT
# =========================================

@app.post("/final-report")
async def final_report(request: FinalReportRequest):

    print("FINAL REPORT REQUEST RECEIVED")

    fallback = """
Overall Assessment:
- You completed the interview and demonstrated a developing technical foundation.

Strengths:
- You completed all interview questions.
- You were able to attempt the technical questions.

Weak Areas:
- Your lower-scoring areas need stronger technical understanding and clearer explanations.

Improvement Plan:
- Review the concepts behind your lowest-scoring questions.
- Practice explaining technical concepts with examples.
- Complete another mock interview and compare your scores.
"""

    try:

        print("Generating final AI report...")

        report = await asyncio.wait_for(
            asyncio.to_thread(
                generate_final_report,
                request.role,
                request.performance
            ),
            timeout=15
        )

        print("FINAL REPORT GENERATED")

        if not report:
            report = fallback

        return {
            "report": report
        }

    except asyncio.TimeoutError:

        print(
            "Final report timed out. "
            "Using fallback report."
        )

        return {
            "report": fallback
        }

    except Exception as error:

        print(
            f"Final report failed: {error}"
        )

        return {
            "report": fallback
        }


# =========================================
# SAVE HISTORY
# =========================================

@app.post("/interview-history")
def save_interview_history(
    request: InterviewHistoryRequest
):

    created_at = (
        datetime.now(timezone.utc)
        .isoformat(timespec="seconds")
    )

    with sqlite3.connect(
        HISTORY_DB_PATH
    ) as connection:

        connection.execute(
            """
            INSERT INTO interview_history (
                id,
                role,
                scores,
                average_score,
                created_at
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                request.role,
                json.dumps(request.scores),
                float(request.average_score),
                created_at,
            ),
        )

    return {
        "message":
            "Interview history saved successfully"
    }


# =========================================
# GET HISTORY
# =========================================

@app.get("/interview-history")
def get_interview_history():

    with sqlite3.connect(
        HISTORY_DB_PATH
    ) as connection:

        connection.row_factory = sqlite3.Row

        rows = connection.execute(
            """
            SELECT *
            FROM interview_history
            ORDER BY created_at ASC, id ASC
            """
        ).fetchall()

    history = []

    for row in rows:

        history.append({

            "id":
                row["id"],

            "role":
                row["role"],

            "scores":
                json.loads(row["scores"]),

            "average_score":
                row["average_score"],

            "created_at":
                row["created_at"]
        })

    return {
        "history": history
    }