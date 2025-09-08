let activeQuiz = null;

/*
    Record admin's choice of quiz for editing edit
*/
// select all buttons with class .mainButton
document.querySelectorAll('.mainButton').forEach(button => {
    // for each button, listen for click
    button.addEventListener('click', (e) => {
        const quizType = e.target.value; // store value of button as const, set as url param
        if (quizType === 'Bilderquiz') {
            location.href = `/quiz-creator/quiz-creator-bilder.html?quizType=${quizType}`; // if bilder
        } 
        else if (quizType === 'Soundquiz') {
            location.href = `/quiz-creator/quiz-creator-sound.html?quizType=${quizType}`; // if sound
        }
        else {
            location.href = `/quiz-creator/quiz-creator.html?quizType=${quizType}`; // if wissen
        };
    });
});

// Save selected radio to MongoDB on change
document.querySelectorAll('input[name="quizType"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
        const selectedQuizType = e.target.value;

        try {
            await fetch('/api/curr-quiz-type/save-quiz-type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quizType: selectedQuizType })
            });
            console.log(`Saved ${selectedQuizType} to MongoDB`);
        } catch (err) {
            console.error('Failed to save quiz type:', err);
        }
    });
});

// auto load current active quiz
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/curr-quiz-type/quiz-type');
        const data = await res.json();
        const selected = data.quizType;

        // Auto-check the saved radio
        const radio = document.querySelector(`input[name="quizType"][value="${selected}"]`);
        if (radio) radio.checked = true;
    } catch (err) {
        console.warn('No previously selected quiz type found or failed to fetch.');
    }
});

// fetch current active quiz from mongo
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/curr-quiz-type/quiz-type');
        if (!res.ok) throw new Error("No quiz type set");
        const data = await res.json();
        activeQuiz = data.quizType;
        console.log("Loaded quiz type from MongoDB:", activeQuiz);

        // Auto-check the corresponding radio
        const radio = document.querySelector(`input[name="quizType"][value="${activeQuiz}"]`);
        if (radio) radio.checked = true;
    } catch (err) {
        console.warn("Failed to load quiz type:", err.message);
    }
});
