const API_BASE = window.API_BASE;

// Title setting from URL
const params = new URLSearchParams(window.location.search);
const mainTitle = params.get("quizType") || "QuizTitleDefault";
document.getElementById('main-title').textContent = mainTitle;

let currentEditingIndex = null;


// Default settings
document.getElementById('quizQuestion').style.display = 'none';
document.getElementById('answerWarning').style.display = 'none';
document.getElementById('multipleChoice').style.display = 'none';
document.getElementById('saveButton').style.display = 'none';

// Record admin's choice of quiz age
[...document.querySelectorAll('#ageSelect .mainButton')].forEach(button => {
    button.onclick = () => {
        const quizAge = button.value;
        const newUrl = `?quizType=${mainTitle}&quizAge=${quizAge}`;
        history.pushState({ quizType: mainTitle, quizAge }, '', newUrl); // Use replace to avoid stack
        document.getElementById('ageSelect').style.display = 'none';
        document.getElementById('languageSelect').style.display = 'flex';
    };
});

// Record admin's choice of language
[...document.querySelectorAll('#languageSelect .mainButton')].forEach(button => {
    button.onclick = () => {
        const currentParams = new URLSearchParams(window.location.search);
        const quizAge = currentParams.get('quizAge');
        const quizLanguage = button.value;
        const newUrl = `?quizType=${mainTitle}&quizAge=${quizAge}&quizLanguage=${quizLanguage}`;
        history.pushState({
            quizType: mainTitle,
            quizAge,
            quizLanguage
        }, '', newUrl); // Still replacing to consolidate
        document.getElementById('languageSelect').style.display = 'none';
        document.getElementById('savedQuizzes').style.display = 'flex';
        document.getElementById('quizCreate').style.display = 'flex';
        populateFromMongo('savedQuizzes');
    };
});

// Create new quiz
[...document.querySelectorAll('#quizCreate .mainButton')].forEach(button => {
    button.onclick = () => {
        document.getElementById('savedQuizzes').style.display = 'none';
        document.getElementById('quizCreate').style.display = 'none';
        document.getElementById('quizCreateEditor').style.display = 'flex';
        document.getElementById('createQuestionInit').style.display = 'inline-block';
        document.getElementById('questionsList').style.display = 'flex';
        document.getElementById('quizName').readOnly = false;
        document.getElementById('quizName').value = '';

        // clear previous questions list
        document.getElementById('questionsList').innerHTML = '';

        // push state
        const urlParams = new URLSearchParams(window.location.search);
        history.pushState({
            quizType: urlParams.get('quizType'),
            quizAge: urlParams.get('quizAge'),
            quizLanguage: urlParams.get('quizLanguage'),
            quizCreate: true
        }, '', window.location.href + '&quizCreate=true');
    };
});


// Create quiz and show question input
const createButton = document.getElementById('createQuestionInit');
createButton.onclick = async () => {
    const quizName = document.getElementById('quizName').value.trim();
    if (!quizName) return alert("Bitte einen Quiznamen eingeben.");

    const urlParams = new URLSearchParams(window.location.search);
    const quizType = urlParams.get('quizType');
    const quizAge = urlParams.get('quizAge');
    const quizLanguage = urlParams.get('quizLanguage');

    const isEditing = document.getElementById('quizName').readOnly;

    if (!isEditing) {
        const exists = await checkDuplicates(quizName, quizType, quizAge, quizLanguage);
        if (exists) {
            alert("Ein Quiz mit diesem Namen und denselben Parametern existiert bereits.");
            return;
        }

        const quizObj = { quizName, quizType, quizAge, quizLanguage };
        try {
            await saveToMongo(quizObj);
        } catch (err) {
            console.error('Fehler beim Speichern:', err.message);
            alert('Fehler beim Erstellen des Quiz. Stellen Sie sicher, dass der Name nicht doppelt ist.');
            return;
        }
    }

    document.getElementById('quizName').readOnly = true;

    history.replaceState({ questionCreate: true, quizName }, '', window.location.href);
    document.getElementById('createQuestionInit').style.display = 'none';
    document.getElementById('quizQuestion').style.display = 'block';
    document.getElementById('answerWarning').style.display = 'block';
    document.getElementById('multipleChoice').style.display = 'grid';
    document.getElementById('saveButton').style.display = 'flex';
    document.getElementById('backButton').style.display = 'none';
    populateQuestionsFromMongo(
        quizName,
        quizType,
        quizAge,
        quizLanguage,
        'questionsList',
        renderQuestionItem
    );


    document.getElementById('questionsList').style.display = 'none';
};


// Save a question
const saveBtn = document.getElementById('saveButton');
saveBtn.onclick = async () => {
    
    const quizName = document.getElementById('quizName').value.trim();
    const questionText = document.getElementById('quizQuestion').value.trim();
    if (!questionText) return alert("Bitte eine Frage eingeben.");

    const answers = [...document.querySelectorAll('.mcAnswer')].map(a => a.value.trim());
    if (answers.some(a => a === '')) return alert("Bitte alle Antwortfelder ausfüllen.");

    const radios = [...document.querySelectorAll('input[name="mcAnswerRadio"]')];
    const selected = radios.find(r => r.checked);
    if (!selected) return alert("Bitte die richtige Antwort auswählen.");

    const correctIndex = radios.indexOf(selected);
    const questionObj = { questionText, answers, correctIndex };

    //  get quiz fopr editing
    const urlParams = new URLSearchParams(window.location.search);
    const quizType = urlParams.get('quizType');
    const quizAge = urlParams.get('quizAge');
    const quizLanguage = urlParams.get('quizLanguage');

    const quiz = await getQuizByName(quizName, quizType, quizAge, quizLanguage);

    if (!quiz) return alert("Quiz nicht gefunden.");

    if (currentEditingIndex !== null && currentEditingIndex >= 0) {
    await editQuizQuestionAtIndex(
        quizName,
        currentEditingIndex,
        questionObj,
        quizType,
        quizAge,
        quizLanguage
    );
    currentEditingIndex = null;
    } else {
        await updateQuizQuestions(
            quizName,
            questionObj,
            quizType,
            quizAge,
            quizLanguage
        );
    }



    // Clear form
    document.getElementById('quizQuestion').value = '';
    document.querySelectorAll('.mcAnswer').forEach(input => input.value = '');
    radios.forEach(r => r.checked = false);

    // Refresh the visible question list
    document.getElementById('questionsList').style.display = 'flex';
    populateQuestionsFromMongo(quizName, quizType, quizAge, quizLanguage, 'questionsList', renderQuestionItem);

    // Hide the question input
    document.getElementById('quizQuestion').style.display = 'none';
    document.getElementById('answerWarning').style.display = 'none';
    document.getElementById('multipleChoice').style.display = 'none';

    // Hide the save button and show the back button
    document.getElementById('saveButton').style.display = 'none';
    document.getElementById('backButton').style.display = 'flex';

    // Stay in quizCreateEditor and show existing questions
    document.getElementById('createQuestionInit').style.display = 'inline-block';
    document.getElementById('questionsList').style.display = 'flex';

};

// render questions on question list
function renderQuestionItem(question, index) {
    const container = document.createElement('div');
    container.className = 'questionContainer';

    // Left trash icon
    const leftTrash = document.createElement('img');
    leftTrash.src = '/assets/trashBtn.svg';
    leftTrash.alt = 'Trash';
    leftTrash.className = 'trashWrapper';
    leftTrash.id = `trashIcon1`;
    leftTrash.onclick = () => handleDeleteQuestion(index);

    // Question display
    const div = document.createElement('div');
    div.className = 'questionListDiv';

    // render question for editing
    div.textContent = question.questionText;
    div.style.cursor = 'pointer';
    div.onclick = () => {
        document.getElementById('quizQuestion').value = question.questionText;
        const answerInputs = document.querySelectorAll('.mcAnswer');
        answerInputs.forEach((input, i) => {
            input.value = question.answers[i] || '';
        });

        const radios = document.querySelectorAll('input[name="mcAnswerRadio"]');
        radios.forEach((radio, i) => {
            radio.checked = (i === question.correctIndex);
        });

        document.getElementById('quizQuestion').style.display = 'block';
        document.getElementById('answerWarning').style.display = 'block';
        document.getElementById('multipleChoice').style.display = 'grid';
        document.getElementById('saveButton').style.display = 'flex';
        document.getElementById('backButton').style.display = 'none';

        document.getElementById('questionsList').style.display = 'none';
        document.getElementById('createQuestionInit').style.display = 'none';

        currentEditingIndex = index;
    };



    // Right trash icon
    const rightTrash = document.createElement('img');
    rightTrash.src = '/assets/trashBtn.svg';
    rightTrash.alt = 'Trash';
    rightTrash.className = 'trashWrapper';
    rightTrash.id = `trashIcon2`;
    rightTrash.onclick = () => handleDeleteQuestion(index);

    container.appendChild(leftTrash);
    container.appendChild(div);
    container.appendChild(rightTrash);

    return container;
}

// handle question deletion
async function handleDeleteQuestion(index) {
    const quizName = document.getElementById('quizName').value.trim();
    const urlParams = new URLSearchParams(window.location.search);
    const quizType = urlParams.get('quizType');
    const quizAge = urlParams.get('quizAge');
    const quizLanguage = urlParams.get('quizLanguage');

    const quiz = await getQuizByName(quizName, quizType, quizAge, quizLanguage);

    if (!quiz) return alert("Quiz nicht gefunden.");

    quiz.questions.splice(index, 1); // remove the question

    // Save updated quiz
    await fetch(`${API_BASE}/api/quiz/${encodeURIComponent(quizName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quiz)
    });

    // Refresh list
    populateQuestionsFromMongo(
        quiz.quizName,
        quiz.quizType,
        quiz.quizAge,
        quiz.quizLanguage,
        'questionsList',
        renderQuestionItem
    );

}

// render quizzes on quiz list
function renderQuizItem(quiz, index) {
    const container = document.createElement('div');
    container.className = 'questionContainer';

    // Create wrapper div for the radio
    const radioWrapper = document.createElement('div');
    radioWrapper.className = 'trashWrapper';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'activeQuizRadio';
    radio.className = 'mcRadio';
    
    radio.value = quiz.quizName;
    radio.checked = quiz.isActive || false;

    // check radio buttons and update active quiz
    radio.onchange = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/quiz/${encodeURIComponent(quiz.quizName)}/set-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quizName: quiz.quizName,  // ✅ Add this line
            quizType: quiz.quizType,
            quizAge: quiz.quizAge,
            quizLanguage: quiz.quizLanguage
        })
        });

        if (!res.ok) throw new Error(await res.text());

        populateFromMongo('savedQuizzes');
        } catch (err) {
            console.error('Error setting active quiz:', err);
            alert('Fehler beim Aktivieren des Quiz');
        }
    };



    radioWrapper.appendChild(radio);

    const div = document.createElement('div');
    div.className = 'questionListDiv';
    div.textContent = quiz.quizName;

    // handle quiz viewing
    div.style.cursor = 'pointer';
    div.onclick = () => {
        const params = new URLSearchParams(window.location.search);
        const newState = {
            quizType: params.get('quizType'),
            quizAge: params.get('quizAge'),
            quizLanguage: params.get('quizLanguage'),
            quizCreate: true,
            quizName: quiz.quizName
        };
        const newUrl = `${window.location.pathname}?${new URLSearchParams(newState).toString()}`;
        history.pushState(newState, '', newUrl);

        // Update UI to show question list (NOT question creation form)
        document.getElementById('savedQuizzes').style.display = 'none';
        document.getElementById('quizCreate').style.display = 'none';
        document.getElementById('quizCreateEditor').style.display = 'flex';

        document.getElementById('quizName').value = quiz.quizName;
        document.getElementById('quizName').readOnly = true;

        document.getElementById('createQuestionInit').style.display = 'inline-block';
        document.getElementById('questionsList').style.display = 'flex';

        document.getElementById('quizQuestion').style.display = 'none';
        document.getElementById('answerWarning').style.display = 'none';
        document.getElementById('multipleChoice').style.display = 'none';
        document.getElementById('saveButton').style.display = 'none';
        document.getElementById('backButton').style.display = 'flex';

        populateQuestionsFromMongo(
            quiz.quizName,
            quiz.quizType,
            quiz.quizAge,
            quiz.quizLanguage,
            'questionsList',
            renderQuestionItem
        );

    };



    // trash icons
    const rightIcon = document.createElement('img');
    rightIcon.src = '/assets/trashBtn.svg';
    rightIcon.alt = 'Trash';
    rightIcon.className = 'trashWrapper';
    rightIcon.id = 'trashIcon2';

    // delete logic
    rightIcon.onclick = () => {
        const modal = document.getElementById('customModal');
        modal.classList.remove('hidden');

        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');

        yesBtn.onclick = async () => {
            await deleteQuizByName(
                quiz.quizName,
                quiz.quizType,
                quiz.quizAge,
                quiz.quizLanguage
            );
            populateFromMongo('savedQuizzes');
            modal.classList.add('hidden');
        };

        noBtn.onclick = () => {
            modal.classList.add('hidden');
        };
    };


    container.appendChild(radioWrapper);
    container.appendChild(div);
    container.appendChild(rightIcon);

    return container;
}





// Restore state on navigation
window.addEventListener('popstate', () => {
    const state = history.state;

    // Hide all screens first
    document.getElementById('ageSelect').style.display = 'none';
    document.getElementById('languageSelect').style.display = 'none';
    document.getElementById('savedQuizzes').style.display = 'none';
    document.getElementById('quizCreate').style.display = 'none';
    document.getElementById('quizCreateEditor').style.display = 'none';

    // If no state, go to initial view
    if (!state) {
        document.getElementById('ageSelect').style.display = 'flex';
        return;
    }

    if (state.quizAge && !state.quizLanguage) {
        document.getElementById('languageSelect').style.display = 'flex';
    } else if (state.quizLanguage && !state.quizCreate) {
        document.getElementById('savedQuizzes').style.display = 'flex';
        document.getElementById('quizCreate').style.display = 'flex';
        populateFromMongo('savedQuizzes');
    } else if (state.quizCreate && !state.questionCreate) {
        document.getElementById('quizCreateEditor').style.display = 'flex';
        document.getElementById('createQuestionInit').style.display = 'inline-block';
        document.getElementById('questionsList').style.display = 'flex';
        document.getElementById('quizQuestion').style.display = 'none';
        document.getElementById('answerWarning').style.display = 'none';
        document.getElementById('multipleChoice').style.display = 'none';
        document.getElementById('saveButton').style.display = 'none';
        document.getElementById('backButton').style.display = 'flex';
    } else if (state.questionCreate) {
        document.getElementById('quizCreateEditor').style.display = 'flex';
        document.getElementById('quizQuestion').style.display = 'block';
        document.getElementById('answerWarning').style.display = 'block';
        document.getElementById('multipleChoice').style.display = 'grid';
        document.getElementById('saveButton').style.display = 'flex';
        document.getElementById('backButton').style.display = 'none';
        populateQuestionsFromMongo(
            state.quizName,
            state.quizType,
            state.quizAge,
            state.quizLanguage,
            'questionsList',
            renderQuestionItem
        );
    } else if (state.quizCreate && !state.questionCreate && state.quizName) {
        document.getElementById('quizCreateEditor').style.display = 'flex';

        document.getElementById('quizName').value = state.quizName;
        document.getElementById('quizName').readOnly = true;

        document.getElementById('createQuestionInit').style.display = 'inline-block';
        document.getElementById('questionsList').style.display = 'flex';

        document.getElementById('quizQuestion').style.display = 'none';
        document.getElementById('answerWarning').style.display = 'none';
        document.getElementById('multipleChoice').style.display = 'none';
        document.getElementById('saveButton').style.display = 'none';
        document.getElementById('backButton').style.display = 'flex';

        populateQuestionsFromMongo(
            quiz.quizName,
            quiz.quizType,
            quiz.quizAge,
            quiz.quizLanguage,
            'questionsList',
            renderQuestionItem
        );
    }
});
