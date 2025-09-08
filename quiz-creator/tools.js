// Updated tools.js with MongoDB-compatible methods using Fetch

// Fetch all quizzes
async function getAllQuizNames() {
    const res = await fetch('http://localhost:3000/api/quizzes');
    const quizzes = await res.json();
    return quizzes.map(q => q.quizName);
}

// Check if quiz name exists
async function checkDuplicates(quizName, quizType, quizAge, quizLanguage) {
    const params = new URLSearchParams({ quizName, quizType, quizAge, quizLanguage });
    const res = await fetch(`http://localhost:3000/api/quiz/check-duplicate?${params}`);
    const data = await res.json();
    return data.exists;
}


// Save a new quiz
async function saveToMongo(quizObj) {
    const res = await fetch('http://localhost:3000/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizObj)
    });
    if (!res.ok) throw new Error(await res.text());
}

// Add question to quiz
async function updateQuizQuestions(quizName, questionObj, quizType, quizAge, quizLanguage) {
    const isMediaQuiz = quizType === "Bilderquiz" || quizType === "Soundquiz";

    if (isMediaQuiz) {
        const formData = new FormData();
        formData.append("quizName", quizName);
        formData.append("quizType", quizType);
        formData.append("quizAge", quizAge);
        formData.append("quizLanguage", quizLanguage);
        formData.append("questionText", questionObj.questionText);
        formData.append("answers", JSON.stringify(questionObj.answers));
        formData.append("correctIndex", questionObj.correctIndex);

        if (questionObj.imageFile) formData.append("image", questionObj.imageFile);
        if (questionObj.soundFile) formData.append("newSound", questionObj.soundFile);

        const res = await fetch(`http://localhost:3000/api/quiz/${quizName}/upload-media`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Failed to save media question:', errorText);
            alert(`Server Error: ${errorText}`);
        } else {
            console.log(`Question added to "${quizName}" (with media)`, questionObj);
        }

    } else {
        // Non-media (e.g., Wissensquiz)
        const res = await fetch(`http://localhost:3000/api/quiz/${quizName}/add-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quizName,
                quizType,
                quizAge,
                quizLanguage,
                questionText: questionObj.questionText,
                answers: questionObj.answers,
                correctIndex: questionObj.correctIndex
            })
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Failed to save question:', errorText);
            alert(`Server Error: ${errorText}`);
        } else {
            console.log(`Question added to "${quizName}"`, questionObj);
        }
    }
}





// Get full quiz by name
async function getQuizByName(quizName, quizType, quizAge, quizLanguage) {
    const res = await fetch('http://localhost:3000/api/quizzes');
    const quizzes = await res.json();

    return quizzes.find(q =>
        q.quizName === quizName &&
        q.quizType === quizType &&
        (quizAge === '' || quizAge == null
            ? (q.quizAge === '' || q.quizAge == null)
            : q.quizAge === quizAge) &&
        q.quizLanguage === quizLanguage
    );
}


// Populate saved quizzes, with admin seelected parameters
async function populateFromMongo(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    // get params from current URL
    const params = new URLSearchParams(window.location.search);
    const selectedType = params.get('quizType');
    const selectedAge = params.get('quizAge');
    const selectedLang = params.get('quizLanguage');

    // fetch all quizzes
    const res = await fetch('http://localhost:3000/api/quizzes');
    const allQuizzes = await res.json();

    // filter only those matching current URL params
    const filtered = allQuizzes.filter(q =>
        q.quizType === selectedType &&
        (selectedAge ? q.quizAge === selectedAge : true) &&
        q.quizLanguage === selectedLang
    );


    if (filtered.length === 0) {
        container.innerHTML = '<p style="color:white;">Keine gespeicherten Quizze.</p>';
        return;
    }

    // render each matching quiz name
    filtered.forEach((quiz, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'questionContainer';
        wrapper.appendChild(renderQuizItem(quiz, index));
        container.appendChild(wrapper);
    });
}


// Populate questions
async function populateQuestionsFromMongo(quizName, quizType, quizAge, quizLanguage, containerId, renderItem) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const quiz = await getQuizByName(quizName, quizType, quizAge, quizLanguage);
    if (!quiz || !quiz.questions.length) {
        return;
    }
    quiz.questions.forEach((question, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'questionContainer';
        wrapper.appendChild(renderItem(question, index));
        container.appendChild(wrapper);
    });
}


// Delete quiz by name
async function deleteQuizByName(quizName, quizType, quizAge, quizLanguage) {
    console.log("Deleting:", quizName, quizType, quizAge, quizLanguage);
    const res = await fetch(`http://localhost:3000/api/quiz/delete-by-params`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizName, quizType, quizAge, quizLanguage })
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to delete quiz:', errorText);
        alert(`Fehler beim Löschen: ${errorText}`);
    }
}

// edit questions
async function editQuizQuestionAtIndex(quizName, index, questionObj, quizType, quizAge, quizLanguage) {
    try {
        const res = await fetch(`http://localhost:3000/api/quiz/${quizName}/edit-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quizType,
                quizAge,
                quizLanguage,
                index,
                questionText: questionObj.questionText,
                answers: questionObj.answers,
                correctIndex: questionObj.correctIndex
            })
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Failed to edit question:', errorText);
            alert(`Server Error: ${errorText}`);
        } else {
            console.log(`Question at index ${index} updated for quiz "${quizName}"`);
        }
    } catch (err) {
        console.error('Fetch failed:', err);
        alert('Connection error updating question');
    }
}
