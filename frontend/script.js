const API_URL = "http://127.0.0.1:8000";

// =================================
// STATE
// =================================

let selectedRole = "Software Engineer";
let currentQuestion = "";
let currentAnswer = "";
let currentFeedback = "";
let awaitingFollowUp = false;
let questionCount = 0;
let scores = [];
let interviewRecords = [];

// =================================
// ELEMENTS
// =================================

const roleCards = document.querySelectorAll(".role-card");

const startScreen = document.getElementById("startScreen");
const interviewScreen = document.getElementById("interviewScreen");
const resultsScreen = document.getElementById("resultsScreen");
const historyScreen = document.getElementById("historyScreen");

const startRole = document.getElementById("startRole");
const currentRole = document.getElementById("currentRole");

const startInterviewBtn = document.getElementById("startInterviewBtn");
const newInterviewBtn = document.getElementById("newInterviewBtn");
const newInterviewFromResults =
    document.getElementById("newInterviewFromResults");

const sendBtn = document.getElementById("sendBtn");
const answerInput = document.getElementById("answerInput");
const chatMessages = document.getElementById("chatMessages");

const questionNumber = document.getElementById("questionNumber");
const questionCountElement = document.getElementById("questionCount");
const averageScoreElement = document.getElementById("averageScore");
const characterCount = document.getElementById("characterCount");

const lightThemeBtn = document.getElementById("lightThemeBtn");
const darkThemeBtn = document.getElementById("darkThemeBtn");

const finalScore = document.getElementById("finalScore");
const finalQuestionCount = document.getElementById("finalQuestionCount");
const finalAverageScore = document.getElementById("finalAverageScore");

const finalStrengths = document.getElementById("finalStrengths");
const finalWeaknesses = document.getElementById("finalWeaknesses");
const finalSuggestions = document.getElementById("finalSuggestions");

const historyList = document.getElementById("historyList");
const backFromHistoryBtn =
    document.getElementById("backFromHistoryBtn");
const viewHistoryBtn =
    document.getElementById("viewHistoryBtn");

// =================================
// INITIAL ROLE
// =================================

const activeRole = document.querySelector(".role-card.active");

if (activeRole) {
    selectedRole =
        activeRole.dataset.role || "Software Engineer";
}

if (startRole) {
    startRole.textContent = selectedRole;
}

// =================================
// ROLE SELECTION
// =================================

roleCards.forEach((card) => {
    card.addEventListener("click", () => {

        roleCards.forEach((item) => {
            item.classList.remove("active");
        });

        card.classList.add("active");

        selectedRole =
            card.dataset.role || "Software Engineer";

        startRole.textContent = selectedRole;
    });
});

// =================================
// THEME
// =================================

function setTheme(theme) {

    const dark = theme === "dark";

    document.body.classList.toggle("dark", dark);

    darkThemeBtn.classList.toggle("active", dark);
    lightThemeBtn.classList.toggle("active", !dark);

    localStorage.setItem(
        "interview-theme",
        dark ? "dark" : "light"
    );
}

lightThemeBtn.addEventListener(
    "click",
    () => setTheme("light")
);

darkThemeBtn.addEventListener(
    "click",
    () => setTheme("dark")
);

setTheme(
    localStorage.getItem("interview-theme") === "dark"
        ? "dark"
        : "light"
);

// =================================
// START INTERVIEW
// =================================

startInterviewBtn.addEventListener(
    "click",
    async () => {

        if (!selectedRole) {
            alert("Please select a role first.");
            return;
        }

        resetInterviewState();

        startScreen.classList.add("hidden");
        resultsScreen.classList.add("hidden");
        historyScreen.classList.add("hidden");

        interviewScreen.classList.remove("hidden");

        currentRole.textContent = selectedRole;

        await getNewQuestion();
    }
);

// =================================
// NEW INTERVIEW
// =================================

newInterviewBtn.addEventListener(
    "click",
    () => {

        resetInterviewState();

        interviewScreen.classList.add("hidden");
        resultsScreen.classList.add("hidden");
        historyScreen.classList.add("hidden");

        startScreen.classList.remove("hidden");
    }
);

newInterviewFromResults.addEventListener(
    "click",
    () => {

        resetInterviewState();

        resultsScreen.classList.add("hidden");
        historyScreen.classList.add("hidden");

        startScreen.classList.remove("hidden");
    }
);

// =================================
// RESET INTERVIEW
// =================================

function resetInterviewState() {

    questionCount = 1;

    scores = [];

    interviewRecords = [];

    currentQuestion = "";
    currentAnswer = "";
    currentFeedback = "";

    awaitingFollowUp = false;

    questionNumber.textContent = "1";

    chatMessages.innerHTML = "";

    answerInput.value = "";

    sendBtn.disabled = false;

    updateCharacterCount();
    updateStats();

    removeNextQuestionButton();
}

// =================================
// API HELPER
// =================================

async function fetchJSON(url, options = {}) {

    const response = await fetch(
        url,
        options
    );

    if (!response.ok) {

        throw new Error(
            `Server error: ${response.status}`
        );
    }

    return await response.json();
}

// =================================
// GET NEW QUESTION
// =================================

async function getNewQuestion() {

    removeNextQuestionButton();

    showTyping();

    try {

        const data = await fetchJSON(
            `${API_URL}/new-question`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    role: selectedRole,
                    question_number: questionCount
                })
            }
        );

        removeTyping();

        currentQuestion =
            data.question || "";

        if (!currentQuestion) {

            addAIMessage(
                "No question was generated."
            );

            return;
        }

        addAIMessage(
            currentQuestion
        );

    } catch (error) {

        removeTyping();

        console.error(
            "Question error:",
            error
        );

        addAIMessage(
            "Unable to get a question. Please make sure the FastAPI server is running."
        );
    }
}

// =================================
// SEND ANSWER
// =================================

async function sendAnswer() {

    const message =
        answerInput.value.trim();

    if (!message) {
        return;
    }

    if (awaitingFollowUp) {

        await sendFollowUp(message);

        return;
    }

    await submitInitialAnswer(message);
}

sendBtn.addEventListener(
    "click",
    sendAnswer
);

answerInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendAnswer();
        }
    }
);

answerInput.addEventListener(
    "input",
    updateCharacterCount
);

function updateCharacterCount() {

    characterCount.textContent =
        `${answerInput.value.length} characters`;
}

// =================================
// SUBMIT INITIAL ANSWER
// =================================

async function submitInitialAnswer(answer) {

    if (!currentQuestion) {

        alert(
            "Please wait for the interview question."
        );

        return;
    }

    currentAnswer = answer;

    addUserMessage(answer);

    answerInput.value = "";

    updateCharacterCount();

    sendBtn.disabled = true;

    showTyping();

    try {

        const data = await fetchJSON(
            `${API_URL}/submit-answer`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    role: selectedRole,
                    question: currentQuestion,
                    answer: answer
                })
            }
        );

        removeTyping();

        currentFeedback =
            data.feedback || "";

        if (currentFeedback) {

            addAIMessage(
                currentFeedback
            );

            const scoreMatch =
                currentFeedback.match(
                    /Score:\s*(\d+(?:\.\d+)?)\s*\/\s*5/i
                );

            if (scoreMatch) {

                const score =
                    Math.max(
                        1,
                        Math.min(
                            5,
                            parseFloat(scoreMatch[1])
                        )
                    );

                scores.push(score);

                interviewRecords.push({
                    question:
                        currentQuestion,

                    answer:
                        currentAnswer,

                    feedback:
                        currentFeedback,

                    score:
                        score
                });

                updateStats();
            }

        } else {

            addAIMessage(
                "Your answer has been evaluated."
            );
        }

        awaitingFollowUp = true;

        addNextQuestionButton();

    } catch (error) {

        removeTyping();

        console.error(
            "Answer submission error:",
            error
        );

        addAIMessage(
            "Unable to evaluate your answer. Please check that the FastAPI server is running."
        );

    } finally {

        sendBtn.disabled = false;
    }
}

// =================================
// FOLLOW-UP
// =================================

async function sendFollowUp(followUp) {

    removeNextQuestionButton();

    addUserMessage(followUp);

    answerInput.value = "";

    updateCharacterCount();

    sendBtn.disabled = true;

    showTyping();

    try {

        const data = await fetchJSON(
            `${API_URL}/follow-up`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    role: selectedRole,
                    question: currentQuestion,
                    answer: currentAnswer,
                    feedback: currentFeedback,
                    follow_up: followUp
                })
            }
        );

        removeTyping();

        addAIMessage(
            data.response ||
            "I couldn't generate a response."
        );

        awaitingFollowUp = false;

        addNextQuestionButton();

    } catch (error) {

        removeTyping();

        console.error(
            "Follow-up error:",
            error
        );

        addAIMessage(
            "Unable to answer the follow-up. Please check that the FastAPI server is running."
        );

    } finally {

        sendBtn.disabled = false;
    }
}

// =================================
// NEXT QUESTION
// =================================

function addNextQuestionButton() {

    removeNextQuestionButton();

    const container =
        document.createElement("div");

    container.className =
        "next-question-container";

    container.innerHTML = `
        <button
            class="next-question-btn"
            type="button"
        >
            Next Question <span>→</span>
        </button>
    `;

    chatMessages.appendChild(
        container
    );

    container
        .querySelector(".next-question-btn")
        .addEventListener(
            "click",
            async () => {

                container.remove();

                if (questionCount >= 5) {

                    showResults();

                    return;
                }

                questionCount += 1;

                questionNumber.textContent =
                    questionCount;

                currentQuestion = "";
                currentAnswer = "";
                currentFeedback = "";

                awaitingFollowUp = false;

                updateStats();

                await getNewQuestion();
            }
        );

    scrollToBottom();
}

function removeNextQuestionButton() {

    document
        .querySelectorAll(
            ".next-question-container"
        )
        .forEach(
            (item) => item.remove()
        );
}

// =================================
// AI MESSAGE
// =================================

function addAIMessage(message) {

    const element =
        document.createElement("div");

    element.className =
        "message ai-message";

    const isFeedback =
        /Score:\s*\d+(?:\.\d+)?\s*\/\s*5/i
            .test(message || "");

    element.innerHTML = `
        <div class="message-header">

            <div class="message-avatar ai-avatar">
                ✦
            </div>

            <span class="message-name">
                Interviewer
            </span>

        </div>

        ${
            isFeedback
                ? `<div class="feedback-card">
                        ${formatFeedback(message)}
                   </div>`
                : `<div class="message-content">
                        ${formatMessage(message)}
                   </div>`
        }
    `;

    chatMessages.appendChild(
        element
    );

    scrollToBottom();
}

// =================================
// USER MESSAGE
// =================================

function addUserMessage(message) {

    const element =
        document.createElement("div");

    element.className =
        "message user-message";

    element.innerHTML = `
        <div class="message-header user-header">

            <span class="message-name">
                You
            </span>

        </div>

        <div class="message-content">
            ${formatMessage(message)}
        </div>
    `;

    chatMessages.appendChild(
        element
    );

    scrollToBottom();
}

// =================================
// FEEDBACK FORMAT
// =================================

function formatFeedback(feedback) {

    const scoreMatch =
        feedback.match(
            /Score:\s*(\d+(?:\.\d+)?)\s*\/\s*5/i
        );

    const correctMatch =
        feedback.match(
            /What was correct:\s*([\s\S]*?)(?=What was missed:|Model answer:|$)/i
        );

    const missedMatch =
        feedback.match(
            /What was missed:\s*([\s\S]*?)(?=Model answer:|$)/i
        );

    const modelMatch =
        feedback.match(
            /Model answer:\s*([\s\S]*)/i
        );

    const score =
        scoreMatch
            ? scoreMatch[1]
            : "—";

    const correct =
        correctMatch
            ? correctMatch[1].trim()
            : "No specific points provided.";

    const missed =
        missedMatch
            ? missedMatch[1].trim()
            : "Nothing important was missed.";

    const model =
        modelMatch
            ? modelMatch[1].trim()
            : "No model answer provided.";

    return `
        <div class="feedback-score">

            <div class="score-label">
                Score
            </div>

            <div class="score-value">
                ${formatMessage(score)}
                <span>/5</span>
            </div>

        </div>

        <div class="feedback-section correct">

            <div class="feedback-title">
                <span>✓</span>
                What you got right
            </div>

            <div class="feedback-text">
                ${formatMessage(correct)}
            </div>

        </div>

        <div class="feedback-section missed">

            <div class="feedback-title">
                <span>!</span>
                What you missed
            </div>

            <div class="feedback-text">
                ${formatMessage(missed)}
            </div>

        </div>

        <div class="feedback-section model">

            <div class="feedback-title">
                <span>💡</span>
                Model answer
            </div>

            <div class="feedback-text">
                ${formatMessage(model)}
            </div>

        </div>
    `;
}

// =================================
// MESSAGE FORMAT
// =================================

function formatMessage(message) {

    if (!message) {
        return "";
    }

    let text =
        escapeHTML(
            String(message)
        );

    text =
        text.replace(
            /```([\s\S]*?)```/g,
            "<pre><code>$1</code></pre>"
        );

    text =
        text.replace(
            /^### (.*)$/gm,
            "<h4>$1</h4>"
        );

    text =
        text.replace(
            /^## (.*)$/gm,
            "<h3>$1</h3>"
        );

    text =
        text.replace(
            /^# (.*)$/gm,
            "<h2>$1</h2>"
        );

    text =
        text.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

    text =
        text.replace(
            /\*(.*?)\*/g,
            "<em>$1</em>"
        );

    text =
        text.replace(
            /^(\d+)\.\s+(.*)$/gm,
            '<div class="formatted-list-item">$1. $2</div>'
        );

    text =
        text.replace(
            /^[*-]\s+(.*)$/gm,
            '<div class="formatted-list-item">• $1</div>'
        );

    text =
        text.replace(
            /\n/g,
            "<br>"
        );

    return text;
}

// =================================
// ESCAPE HTML
// =================================

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}

// =================================
// TYPING
// =================================

function showTyping() {

    removeTyping();

    const element =
        document.createElement("div");

    element.className =
        "message ai-message";

    element.id =
        "typingIndicator";

    element.innerHTML = `
        <div class="message-header">

            <div class="message-avatar ai-avatar">
                ✦
            </div>

            <span class="message-name">
                Interviewer
            </span>

        </div>

        <div class="message-content typing">

            <span></span>
            <span></span>
            <span></span>

        </div>
    `;

    chatMessages.appendChild(
        element
    );

    scrollToBottom();
}

function removeTyping() {

    document
        .getElementById(
            "typingIndicator"
        )
        ?.remove();
}

function scrollToBottom() {

    chatMessages.scrollTop =
        chatMessages.scrollHeight;
}

// =================================
// STATS
// =================================

function updateStats() {

    questionCountElement.textContent =
        questionCount;

    if (scores.length === 0) {

        averageScoreElement.textContent =
            "—";

        return;
    }

    const total =
        scores.reduce(
            (sum, score) =>
                sum + score,
            0
        );

    const average =
        total / scores.length;

    averageScoreElement.textContent =
        `${average.toFixed(1)}/5`;
}

// =================================
// FINAL RESULTS
// =================================

function showResults() {

    const total =
        scores.reduce(
            (sum, score) =>
                sum + score,
            0
        );

    const average =
        scores.length
            ? total / scores.length
            : 0;

    finalScore.textContent =
        `${total}/${scores.length * 5}`;

    finalQuestionCount.textContent =
        scores.length;

    finalAverageScore.textContent =
        `${average.toFixed(1)}/5`;

    finalStrengths.innerHTML =
        "<p>Generating personalized report...</p>";

    finalWeaknesses.innerHTML =
        "<p>Generating personalized report...</p>";

    finalSuggestions.innerHTML =
        "<p>Generating personalized report...</p>";

    interviewScreen.classList.add(
        "hidden"
    );

    historyScreen.classList.add(
        "hidden"
    );

    resultsScreen.classList.remove(
        "hidden"
    );

    // Run independently.
    // The results page appears immediately.
    saveInterviewHistory(average);

    generateAIReport(average);
}

// =================================
// SAVE INTERVIEW HISTORY
// =================================

async function saveInterviewHistory(average) {

    try {

        await fetchJSON(
            `${API_URL}/interview-history`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    role:
                        selectedRole,

                    scores:
                        scores,

                    average_score:
                        average
                })
            }
        );

        console.log(
            "Interview history saved."
        );

    } catch (error) {

        console.error(
            "History save error:",
            error
        );
    }
}

// =================================
// AI FINAL REPORT
// =================================

async function generateAIReport(average) {

    const performance = {

        role:
            selectedRole,

        questions_answered:
            interviewRecords.length,

        scores:
            scores,

        average_score:
            Number(
                average.toFixed(1)
            ),

        interview:
            interviewRecords
    };

    const fallback = `
Overall Assessment:
- You completed the interview and demonstrated a developing technical foundation.

Strengths:
- You completed all interview questions.
- You attempted the technical questions.

Weak Areas:
- Review the concepts behind your lower-scoring answers.
- Work on clearer and more complete technical explanations.

Improvement Plan:
- Review the concepts behind your lowest-scoring questions.
- Practice explaining technical concepts with examples.
- Complete another mock interview and compare your scores.
`;

    try {

        console.log(
            "Generating final AI report..."
        );

        const data =
            await fetchJSON(
                `${API_URL}/final-report`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        role:
                            selectedRole,

                        performance:
                            JSON.stringify(
                                performance,
                                null,
                                2
                            )
                    })
                }
            );

        console.log(
            "Final AI report received."
        );

        renderFinalReport(
            data.report || fallback
        );

    } catch (error) {

        console.error(
            "Final report error:",
            error
        );

        renderFinalReport(
            fallback
        );
    }
}

// =================================
// RENDER FINAL REPORT
// =================================

function renderFinalReport(report) {

    const strengths =
        extractSection(
            report,
            "Strengths",
            "Weak Areas"
        );

    const weaknesses =
        extractSection(
            report,
            "Weak Areas",
            "Improvement Plan"
        );

    const plan =
        extractSection(
            report,
            "Improvement Plan",
            null
        );

    finalStrengths.innerHTML =
        formatReportSection(
            strengths
        );

    finalWeaknesses.innerHTML =
        formatReportSection(
            weaknesses
        );

    finalSuggestions.innerHTML =
        formatReportSection(
            plan
        );
}

// =================================
// EXTRACT REPORT SECTIONS
// =================================

function extractSection(
    text,
    heading,
    nextHeading
) {

    const start =
        text.indexOf(
            `${heading}:`
        );

    if (start === -1) {
        return text;
    }

    const contentStart =
        start +
        heading.length +
        1;

    const end =
        nextHeading
            ? text.indexOf(
                `${nextHeading}:`,
                contentStart
            )
            : text.length;

    return text
        .slice(
            contentStart,
            end === -1
                ? text.length
                : end
        )
        .trim();
}

// =================================
// FORMAT REPORT SECTION
// =================================

function formatReportSection(text) {

    if (!text) {

        return `
            <p>
                No report information available.
            </p>
        `;
    }

    const cleaned =
        text

            .replace(
                /^\s*[-•]\s*/gm,
                ""
            )

            .split("\n")

            .map(
                (line) =>
                    line.trim()
            )

            .filter(
                Boolean
            );

    if (cleaned.length <= 1) {

        return `
            <p>
                ${formatMessage(text)}
            </p>
        `;
    }

    return `
        <ul>
            ${
                cleaned
                    .map(
                        (item) =>
                            `<li>${formatMessage(item)}</li>`
                    )
                    .join("")
            }
        </ul>
    `;
}

// =================================
// INTERVIEW HISTORY
// =================================

function formatHistoryDate(isoString) {

    if (!isoString) {
        return "";
    }

    const date = new Date(isoString);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


async function loadInterviewHistory() {

    historyList.innerHTML = `
        <div class="history-loading">
            <p>
                Loading history...
            </p>
        </div>
    `;

    try {

        console.log(
            "Loading interview history..."
        );

        const data =
            await fetchJSON(
                `${API_URL}/interview-history`,
                {
                    method: "GET"
                }
            );

        console.log(
            "Interview history received:",
            data
        );

        if (
            !data.history ||
            data.history.length === 0
        ) {

            historyList.innerHTML = `
                <div class="history-empty">

                    <div class="history-empty-icon">
                        &#9784;
                    </div>

                    <h3>
                        No interviews yet
                    </h3>

                    <p>
                        Complete an interview and your results will appear here.
                    </p>

                </div>
            `;

            return;
        }

        historyList.innerHTML = "";

        const totalCount = data.history.length;

        [...data.history]
            .reverse()
            .forEach(
                (item, index) => {

                    const card =
                        document.createElement(
                            "div"
                        );

                    card.className =
                        "history-card";

                    const role =
                        escapeHTML(
                            item.role ||
                            "Interview"
                        );

                    const score =
                        Number(
                            item.average_score ||
                            0
                        ).toFixed(1);

                    const dateLabel =
                        escapeHTML(
                            formatHistoryDate(
                                item.created_at
                            )
                        );

                    const questionCount =
                        Array.isArray(
                            item.scores
                        )
                            ? item.scores.length
                            : 0;

                    const interviewNumber =
                        totalCount - index;

                    card.innerHTML = `
                        <div class="history-card-top">

                            <div>
                                <span class="history-label">
                                    ${dateLabel}
                                </span>

                                <h3>
                                    ${role}
                                </h3>
                            </div>

                            <div class="history-score">
                                ${score}<span>/5</span>
                            </div>

                        </div>

                        <div class="history-card-bottom">
                            Interview ${interviewNumber} &middot; ${questionCount} question${questionCount === 1 ? "" : "s"} answered
                        </div>
                    `;

                    historyList.appendChild(
                        card
                    );
                }
            );

    } catch (error) {

        console.error(
            "History loading error:",
            error
        );

        historyList.innerHTML = `
            <div class="history-error">

                <h3>
                    Unable to load history
                </h3>

                <p>
                    Unable to load interview history.
                    Please make sure FastAPI is running.
                </p>

                <button
                    id="retryHistoryBtn"
                    class="history-retry-btn"
                    type="button"
                >
                    Retry
                </button>

            </div>
        `;

        document
            .getElementById(
                "retryHistoryBtn"
            )
            ?.addEventListener(
                "click",
                loadInterviewHistory
            );
    }
}

// =================================
// HISTORY BUTTON
// =================================

viewHistoryBtn.addEventListener(
    "click",
    async () => {

        startScreen.classList.add(
            "hidden"
        );

        interviewScreen.classList.add(
            "hidden"
        );

        resultsScreen.classList.add(
            "hidden"
        );

        historyScreen.classList.remove(
            "hidden"
        );

        historyScreen.scrollTop = 0;

        await loadInterviewHistory();
    }
);

// =================================
// BACK FROM HISTORY
// =================================

backFromHistoryBtn.addEventListener(
    "click",
    () => {

        historyScreen.classList.add(
            "hidden"
        );

        startScreen.classList.remove(
            "hidden"
        );
    }
);

// =================================
// INITIAL UI
// =================================

updateCharacterCount();

updateStats();