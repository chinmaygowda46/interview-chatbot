import os

from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI

from prompts import (
    QUESTION_PROMPT,
    SCORING_PROMPT,
    FOLLOW_UP_PROMPT,
    FINAL_REPORT_PROMPT,
)


# =========================================
# LOAD ENVIRONMENT
# =========================================

load_dotenv()


# =========================================
# GEMINI
# =========================================

llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",
    google_api_key=os.getenv("GEMINI_API_KEY"),
)


# =========================================
# GET TEXT FROM GEMINI RESPONSE
# =========================================

def get_text(response) -> str:

    content = response.content

    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):

        text_parts = []

        for item in content:

            if isinstance(item, str):
                text_parts.append(item)

            elif isinstance(item, dict):

                if item.get("type") == "text":

                    text_parts.append(
                        item.get("text", "")
                    )

        return "".join(text_parts).strip()

    return str(content).strip()


# =========================================
# GENERATE INTERVIEW QUESTION
# =========================================

def generate_question(
    role: str,
    question_number: int = 1
) -> str:

    response = llm.invoke(

        QUESTION_PROMPT.format(

            role=role,

            question_number=question_number
        )
    )

    return get_text(response)


# =========================================
# SCORE ANSWER
# =========================================

def score_answer(
    role: str,
    question: str,
    answer: str
) -> str:

    response = llm.invoke(

        SCORING_PROMPT.format(

            role=role,

            question=question,

            answer=answer
        )
    )

    return get_text(response)


# =========================================
# FOLLOW UP
# =========================================

def handle_follow_up(
    role: str,
    question: str,
    answer: str,
    feedback: str,
    follow_up: str
) -> str:

    response = llm.invoke(

        FOLLOW_UP_PROMPT.format(

            role=role,

            question=question,

            answer=answer,

            feedback=feedback,

            follow_up=follow_up
        )
    )

    return get_text(response)


# =========================================
# FINAL AI REPORT
# =========================================

def generate_final_report(
    role: str,
    performance: str
) -> str:

    response = llm.invoke(

        FINAL_REPORT_PROMPT.format(

            role=role,

            performance=performance
        )
    )

    return get_text(response)