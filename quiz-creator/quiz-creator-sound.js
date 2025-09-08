// Title setup
const params = new URLSearchParams(window.location.search);
const mainTitle = params.get("quizType") || "QuizTitleDefault";
document.getElementById('main-title').textContent = mainTitle;

let currentEditingIndex = null;
let pendingDeleteIndex = null;


// handle image uplaods
const fileInput = document.getElementById('imageUpload');
// handle sound uplaods
const soundInput = document.getElementById('soundUpload');
soundInput.onclick = function () {
  this.value = null; //reset
};


document.getElementById('submitButton').onclick = async () => {
    const file = fileInput.files[0];
    const sound = soundInput.files[0];

    const quizName = document.getElementById('quizName').value.trim();
    const correctAnswer = document.getElementById('bildAnswer').value.trim();

    if (!quizName || !correctAnswer) {
        return alert("Bitte alle Felder ausfüllen.");
    }

    // Only enforce file presence if creating a new question
    if (currentEditingIndex === null && (!file || !sound)) {
        return alert("Bitte alle Felder ausfüllen.");
    }



    const urlParams = new URLSearchParams(window.location.search);
    const quizType = urlParams.get('quizType');
    const quizLanguage = urlParams.get('quizLanguage');
    const quizAge = '';

    const questionObj = {
        answers: [correctAnswer],
        correctIndex: 0,
        imageFile: file,
        soundFile: sound
    };
    let questionText;

    if (file && sound) {
        // User selected new image and sound
        questionText = `{${sound.name}, ${file.name}}`;
    } else if (currentEditingIndex !== null) {
        // Editing mode, use filenames from existing question
        const quiz = await getQuizByName(quizName, quizType, quizAge, quizLanguage);
        const oldQuestion = quiz.questions[currentEditingIndex];

        const imageName = oldQuestion?.imagePath?.split('/').pop() ?? 'keinBild';
        const soundName = oldQuestion?.soundPath?.split('/').pop() ?? 'keinAudio';

        questionText = `{${soundName}, ${imageName}}`;
    } else {
        // Creating mode, but something is missing
        return alert("Bitte alle Felder ausfüllen.");
    }

    questionObj.questionText = questionText;



    try {
        if (currentEditingIndex !== null) {
            const quiz = await getQuizByName(quizName, quizType, quizAge, quizLanguage);
            const oldQuestion = quiz.questions[currentEditingIndex];

            const formData = new FormData();
            formData.append("quizName", quizName);
            formData.append("quizType", quizType);
            formData.append("quizAge", quizAge);
            formData.append("quizLanguage", quizLanguage);
            formData.append("index", currentEditingIndex);
            formData.append("questionText", questionText);
            formData.append("answers", JSON.stringify([correctAnswer]));
            formData.append("correctIndex", 0);

            if (file) {
                formData.append("newImage", file);
                formData.append("oldImagePath", oldQuestion.imagePath);
            }
            if (sound) {
                formData.append("newSound", sound);
                if (oldQuestion.soundPath) {
                    formData.append("oldSoundPath", oldQuestion.soundPath);
                }
            }

            const res = await fetch(`http://localhost:3000/api/quiz/${quizName}/edit-media-question`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error(await res.text());
            alert("Frage erfolgreich aktualisiert.");

        } else {
            const exists = await checkDuplicates(quizName, quizType, quizAge, quizLanguage);
            if (!exists) {
                try {
                    await saveToMongo({ quizName, quizType, quizAge, quizLanguage });
                    console.log("Quiz created:", quizName);

                    document.getElementById('quizName').readOnly = true;
                    populateQuestionsFromMongo(quizName, quizType, quizAge, quizLanguage, 'questionsList', renderQuestionItem);
                } catch (err) {
                    console.error("Quiz creation failed:", err);
                    return alert("Quiz konnte nicht erstellt werden.");
                }

                await updateQuizQuestions(quizName, questionObj, quizType, quizAge, quizLanguage);
                alert("Soundfrage erfolgreich hochgeladen.");
            } else {
                // Only allow adding/editing if user explicitly clicked on the existing quiz
                const quizNameInput = document.getElementById('quizName');
                if (!quizNameInput.readOnly) {
                    return alert("Quiz mit diesem Namen und Parametern existiert bereits.");
                }

                // Continue to add question to existing quiz
                await updateQuizQuestions(quizName, questionObj, quizType, quizAge, quizLanguage);
                alert("Soundfrage erfolgreich hochgeladen.");
            }
        }

        document.getElementById('bildAnswer').value = '';
        fileInput.value = '';
        document.getElementById('fileName').textContent = '';
        document.getElementById('fileName').style.display = 'none';
        soundInput.value = '';
        document.getElementById('soundFileName').textContent = '';
        document.getElementById('soundFileName').style.display = 'none';

        currentEditingIndex = null;
        document.getElementById('questionsList').style.display = 'flex';
        populateQuestionsFromMongo(quizName, quizType, quizAge, quizLanguage, 'questionsList', renderQuestionItem);
    } catch (err) {
        console.error('Fehler:', err);
        alert("Fehler beim Speichern.");
    }
};



// file input
document.getElementById('imageUpload').addEventListener('change', function () {
  const fileNameSpan = document.getElementById('fileName');
  if (this.files.length > 0) {
    fileNameSpan.textContent = this.files[0].name;
    fileNameSpan.style.display = 'inline-block';
  } else {
    fileNameSpan.textContent = "Kein Bild ausgewählt";
    fileNameSpan.style.display = 'none';
  }
});

// sound input
document.getElementById('soundUpload').addEventListener('change', function () {
    const nameDiv = document.getElementById('soundFileName');
    if (this.files.length > 0) {
        nameDiv.textContent = this.files[0].name;
        nameDiv.style.display = 'inline-block';
    } else {
        nameDiv.textContent = "Keine Datei ausgewählt";
        nameDiv.style.display = 'none';
    }
});





// Hide inputs initially
document.getElementById('quizQuestion').style.display = 'none';
document.getElementById('saveButton').style.display = 'none';

// Handle language selection
[...document.querySelectorAll('#languageSelect .mainButton')].forEach(button => {
    button.onclick = () => {
        const quizLanguage = button.value;
        const newUrl = `?quizType=${mainTitle}&quizLanguage=${quizLanguage}`;
        history.pushState({ quizType: mainTitle, quizLanguage }, '', newUrl);
        document.getElementById('languageSelect').style.display = 'none';
        document.getElementById('savedQuizzes').style.display = 'flex';
        document.getElementById('quizCreate').style.display = 'flex';
        populateFromMongo('savedQuizzes');
    };
});

// Create new quiz
[...document.querySelectorAll('#quizCreate .mainButton')].forEach(button => {
    button.onclick = () => {
        currentEditingIndex = null;
        document.getElementById('bildAnswer').value = '';
        document.getElementById('imageUpload').value = '';
        document.getElementById('savedQuizzes').style.display = 'none';
        document.getElementById('quizCreate').style.display = 'none';
        document.getElementById('quizCreateEditor').style.display = 'flex';
        document.getElementById('questionsList').style.display = 'flex';
        document.getElementById('quizName').readOnly = false;
        document.getElementById('quizName').value = '';
        document.getElementById('questionsList').innerHTML = '';

        const urlParams = new URLSearchParams(window.location.search);
        history.pushState({
            quizType: urlParams.get('quizType'),
            quizLanguage: urlParams.get('quizLanguage'),
            quizCreate: true
        }, '', window.location.href + '&quizCreate=true');
    };
});

// Save question (edit or create)
const saveBtn = document.getElementById('saveButton');
saveBtn.onclick = async () => {
    const quizName = document.getElementById('quizName').value.trim();
    const questionText = document.getElementById('quizQuestion').value.trim();
    if (!questionText) return alert("Bitte eine Frage eingeben.");

    const answers = [...document.querySelectorAll('.mcAnswer')].map(a => a.value.trim());
    if (answers.some(a => a === '')) return alert("Bitte alle Felder ausfüllen.");

    const radios = [...document.querySelectorAll('input[name="mcAnswerRadio"]')];
    const selected = radios.find(r => r.checked);
    if (!selected) return alert("Bitte die richtige Antwort auswählen.");

    const correctIndex = radios.indexOf(selected);
    const questionObj = { questionText, answers, correctIndex };

    const quizType = urlParams.get('quizType');
    const quizLanguage = urlParams.get('quizLanguage');
    const quizAge = '';
    const quiz = await getQuizByName(quizName, quizType, quizAge, quizLanguage);

    if (!quiz) return alert("Quiz nicht gefunden.");

    if (currentEditingIndex !== null && currentEditingIndex >= 0) {
        quiz.questions[currentEditingIndex] = questionObj;
        currentEditingIndex = null;
    } else {
        quiz.questions.push(questionObj);
    }

    await fetch(`http://localhost:3000/api/quiz/${quizName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quiz)
    });

    document.getElementById('quizQuestion').value = '';
    document.querySelectorAll('.mcAnswer').forEach(input => input.value = '');
    radios.forEach(r => r.checked = false);

    document.getElementById('quizQuestion').style.display = 'none';
    document.getElementById('saveButton').style.display = 'none';
    document.getElementById('backButton').style.display = 'flex';

    document.getElementById('createQuestionInit').style.display = 'inline-block';
    document.getElementById('questionsList').style.display = 'flex';

    populateQuestionsFromMongo(quizName, quizType, quizAge, quizLanguage, 'questionsList', renderQuestionItem);
};

// Render a question item
function renderQuestionItem(question, index) {
    const container = document.createElement('div');
    container.className = 'questionContainer';

    const leftTrash = document.createElement('img');
    leftTrash.src = '/assets/trashBtn.svg';
    leftTrash.alt = 'Trash';
    leftTrash.className = 'trashWrapper';
    leftTrash.id = `trashIcon1`;
    leftTrash.onclick = () => handleDeleteQuestion(index);

    // handle populating question list
    const div = document.createElement('div');
    div.className = 'questionListDiv';

    let displayName;

    if (question.originalName) {
        const match = question.originalName.match(/^\{(.*?),/); // match everything between { and ,
        displayName = match ? match[1].trim() : question.originalName;
    } else if (question.questionText) {
        const match = question.questionText.match(/^\{(.*?),/);
        displayName = match ? match[1].trim() : question.questionText;
    } else {
        displayName = '(keine Frage)';
    }
    div.textContent = displayName;


    div.style.cursor = 'pointer';
    div.onclick = async () => {
        currentEditingIndex = index;

        document.getElementById('bildAnswer').value = question.answers?.[0] || '';
        document.getElementById('questionsList').style.display = 'none';

        const fileNameDiv = document.getElementById('fileName');
        fileNameDiv.innerHTML = ''; // Clear previous content
        fileNameDiv.textContent = ''; // clear previous content
        fileNameDiv.style.display = 'none'; // also hide just in case

        const soundFileNameDiv = document.getElementById('soundFileName');
        soundFileNameDiv.innerHTML = ''; // Clear previous content
        soundFileNameDiv.textContent = ''; // clear previous content
        soundFileNameDiv.style.display = 'none'; // also hide just in case

        // Show original image name (if exists)
        if (question.originalName) {
            const parts = question.originalName.replace(/[{}]/g, '').split(',');
            if (parts.length === 2) {
                const soundName = parts[0].trim();
                const imageName = parts[1].trim();

                const imgNameDiv = document.createElement('div');
                imgNameDiv.textContent = imageName;
                fileNameDiv.appendChild(imgNameDiv);

                const soundNameDiv = document.createElement('div');
                soundNameDiv.textContent = soundName;
                soundFileNameDiv.appendChild(soundNameDiv);
            }
        }

        // Show question text (if exists and different from originalName)
        if (question.questionText && question.questionText !== question.originalName) {
            const questionDiv = document.createElement('div');

            const parts = question.questionText?.replace(/[{}]/g, '').split(',');
            if (parts.length === 2) {
                const imageName = parts[1].trim();
                const soundName = parts[0].trim();

                const imageDiv = document.createElement('div');
                imageDiv.textContent = `${imageName}`;
                fileNameDiv.appendChild(imageDiv);

                const soundDiv = document.createElement('div');
                soundDiv.textContent = `${soundName}`;
                soundFileNameDiv.appendChild(soundDiv);
            }


        }

        fileNameDiv.style.display = 'block';
        soundFileNameDiv.style.display = 'block';

        // Reset file input
        document.getElementById('imageUpload').value = '';
        document.getElementById('soundUpload').value = '';

        document.getElementById('bildAnswer').scrollIntoView({ behavior: 'smooth' });
    };



    const rightTrash = document.createElement('img');
    rightTrash.src = '/assets/trashBtn.svg';
    rightTrash.alt = 'Trash';
    rightTrash.className = 'trashWrapper';
    rightTrash.id = `trashIcon2`;
    rightTrash.onclick = () => {
        pendingDeleteIndex = index;
        document.getElementById('customModal').classList.remove('hidden');
    };


    container.appendChild(leftTrash);
    container.appendChild(div);
    container.appendChild(rightTrash);
    return container;
}

// handle image deletion
async function handleDeleteQuestion(index) {
    const urlParams = new URLSearchParams(window.location.search);
    const quizName = document.getElementById('quizName').value.trim();

    if (!quizName) {
        alert("Kein aktives Quiz ausgewählt.");
        return;
    }

    const quizType = urlParams.get('quizType');
    const quizLanguage = urlParams.get('quizLanguage');
    const quizAge = '';
    const quiz = await getQuizByName(quizName, quizType, quizAge, quizLanguage);

    if (!quiz) {
        alert("Quiz nicht gefunden.");
        return;
    }

  // Get the image path of the question being deleted
  const imagePath = quiz.questions[index]?.imagePath;
  // Get the sound path of the question being deleted
  const soundPath = quiz.questions[index]?.soundPath;

  // Delete the image from server if it exists
  if (imagePath) {
    try {
      await fetch('http://localhost:3000/api/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath })
      });
    } catch (err) {
      console.warn('Fehler beim Löschen des Bildes:', err);
    }
  }
  if (soundPath) {
    try {
        await fetch('http://localhost:3000/api/delete-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagePath: soundPath }) // it's the same endpoint
        });
    } catch (err) {
        console.warn('Fehler beim Löschen des Sounds:', err);
    }
  }


  // Remove question from array
  quiz.questions.splice(index, 1);

  // Save updated quiz
  await fetch(`http://localhost:3000/api/quiz/${quizName}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quiz)
  });

  populateQuestionsFromMongo(quizName, quizType, quizAge, quizLanguage, 'questionsList', renderQuestionItem);

}


// Render quiz selection item
function renderQuizItem(quiz, index) {

    document.getElementById('bildAnswer').value = '';
    document.getElementById('imageUpload').value = '';

    const fileNameDiv = document.getElementById('fileName');
    fileNameDiv.innerHTML = ''; // Clear previous content
    fileNameDiv.textContent = ''; // clear previous content
    fileNameDiv.style.display = 'none'; // also hide just in case

    const soundFileNameDiv = document.getElementById('soundFileName');
    soundFileNameDiv.innerHTML = ''; // Clear previous content
    soundFileNameDiv.textContent = ''; // clear previous content
    soundFileNameDiv.style.display = 'none'; // also hide just in case
    

    const container = document.createElement('div');
    container.className = 'questionContainer';

    const radioWrapper = document.createElement('div');
    radioWrapper.className = 'trashWrapper';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'activeQuizRadio';
    radio.className = 'mcRadio';
    radio.value = quiz.quizName;
    radio.checked = quiz.isActive || false;
    const normalizedQuizAge = quiz.quizAge ?? '';

    radio.onchange = async () => {
        try {
            //console.log("Activating quiz:", quiz);
            const normalizedQuizAge = quiz.quizAge ?? '';
            const res = await fetch(`http://localhost:3000/api/quiz/${quiz.quizName}/set-active`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quizName: quiz.quizName,
                    quizType: quiz.quizType,
                    quizAge: normalizedQuizAge,
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
    div.style.cursor = 'pointer';
    div.onclick = () => {
        const params = new URLSearchParams(window.location.search);
        const newState = {
            quizType: params.get('quizType'),
            quizLanguage: params.get('quizLanguage'),
            quizCreate: true,
            quizName: quiz.quizName
        };
        const newUrl = `${window.location.pathname}?${new URLSearchParams(newState).toString()}`;
        history.pushState(newState, '', newUrl);

        document.getElementById('savedQuizzes').style.display = 'none';
        document.getElementById('quizCreate').style.display = 'none';
        document.getElementById('quizCreateEditor').style.display = 'flex';

        document.getElementById('quizName').value = quiz.quizName;
        document.getElementById('quizName').readOnly = true;
  
        document.getElementById('questionsList').style.display = 'flex';

        document.getElementById('quizQuestion').style.display = 'none';

        document.getElementById('saveButton').style.display = 'none';
        document.getElementById('backButton').style.display = 'flex';

        const urlParams = new URLSearchParams(window.location.search);
        const quizType = urlParams.get('quizType');
        const quizLanguage = urlParams.get('quizLanguage');
        const quizAge = '';
        const quizName = quiz.quizName;
        populateQuestionsFromMongo(quizName, quizType, quizAge, quizLanguage, 'questionsList', renderQuestionItem);

    };

    const rightIcon = document.createElement('img');
    rightIcon.src = '/assets/trashBtn.svg';
    rightIcon.alt = 'Trash';
    rightIcon.className = 'trashWrapper';
    rightIcon.id = 'trashIcon2';
    rightIcon.onclick = () => {
        const modal = document.getElementById('customModal');
        modal.classList.remove('hidden');

        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');

        yesBtn.onclick = async () => {
            const fresh = await getQuizByName(quiz.quizName, quiz.quizType, quiz.quizAge, quiz.quizLanguage);
            if (!fresh) {
                alert("Quiz wurde bereits gelöscht.");
                modal.classList.add('hidden');
                await populateFromMongo('savedQuizzes');
                document.getElementById('quizName').value = '';
                document.getElementById('questionsList').innerHTML = '';
                resetConfirmHandler();
                return;
            }

            const normalizedQuizAge = quiz.quizAge ?? '';
            await deleteQuizByName(
                quiz.quizName,
                quiz.quizType,
                normalizedQuizAge,
                quiz.quizLanguage
            );

            modal.classList.add('hidden');
            await populateFromMongo('savedQuizzes');
            document.getElementById('quizName').value = '';
            document.getElementById('questionsList').innerHTML = '';
            resetConfirmHandler(); //restore question deletion logic
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

// Restore screen state on back/forward navigation
window.addEventListener('popstate', () => {
    const state = history.state;

    const urlParams = new URLSearchParams(window.location.search);
    const quizType = urlParams.get('quizType');
    const quizLanguage = urlParams.get('quizLanguage');
    const quizAge = '';

    document.getElementById('languageSelect').style.display = 'none';
    document.getElementById('savedQuizzes').style.display = 'none';
    document.getElementById('quizCreate').style.display = 'none';
    document.getElementById('quizCreateEditor').style.display = 'none';

    // Clear fileName in all transitions
    document.getElementById('fileName').textContent = '';
    document.getElementById('fileName').style.display = 'none';

    if (!state) {
        document.getElementById('languageSelect').style.display = 'flex';
        return;
    }

    if (state.quizLanguage && !state.quizCreate) {
        document.getElementById('savedQuizzes').style.display = 'flex';
        document.getElementById('quizCreate').style.display = 'flex';

        populateFromMongo('savedQuizzes');

    } else if (state.quizCreate && !state.questionCreate && state.quizName) {
        document.getElementById('quizCreateEditor').style.display = 'flex';
        document.getElementById('quizName').value = state.quizName;
        document.getElementById('quizName').readOnly = true;

        document.getElementById('createQuestionInit').style.display = 'inline-block';
        document.getElementById('questionsList').style.display = 'flex';

        document.getElementById('quizQuestion').style.display = 'none';

        document.getElementById('saveButton').style.display = 'none';
        document.getElementById('backButton').style.display = 'flex';

        populateQuestionsFromMongo(state.quizName, quizType, quizAge, quizLanguage, 'questionsList', renderQuestionItem);

    } else if (state.questionCreate && state.quizName) {
        document.getElementById('quizCreateEditor').style.display = 'flex';
        document.getElementById('quizName').value = state.quizName;
        document.getElementById('quizName').readOnly = true;

        document.getElementById('quizQuestion').style.display = 'block';

        document.getElementById('saveButton').style.display = 'flex';
        document.getElementById('backButton').style.display = 'none';

        document.getElementById('questionsList').style.display = 'none';
        document.getElementById('createQuestionInit').style.display = 'none';

        populateQuestionsFromMongo(state.quizName, quizType, quizAge, quizLanguage, 'questionsList', renderQuestionItem);
    }
});

// delete screen
document.getElementById('confirmYes').onclick = async () => {
    if (pendingDeleteIndex !== null) {
        await handleDeleteQuestion(pendingDeleteIndex);
        pendingDeleteIndex = null;
    }
    document.getElementById('customModal').classList.add('hidden');
};

document.getElementById('confirmNo').onclick = () => {
    pendingDeleteIndex = null;
    document.getElementById('customModal').classList.add('hidden');
};

function resetConfirmHandler() {
    const confirmYes = document.getElementById('confirmYes');
    confirmYes.onclick = async () => {
        if (pendingDeleteIndex !== null) {
            await handleDeleteQuestion(pendingDeleteIndex);
            pendingDeleteIndex = null;
        }
        document.getElementById('customModal').classList.add('hidden');
    };
}
