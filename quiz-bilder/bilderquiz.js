import {
  startClockCountdown,
  startTimer,
  startTimerBuzzed,
  switchScreen,
  elementHider,
  elementShower,
  changeTextById,
  emitCustomBuzzerEvent,
  fetchCurrentQuizType,
  fetchActiveQuiz,
  fetchActiveQuizWithoutAge,
  extractQuestionsFromQuiz,
  launchConfetti,
  hideAllQuizScreens
} from './bilderFunctions.js';



let lang; // track selected lang
let currentScreen = 'lang'; // starting screen
let questions = []; // store quiz questions
let currentQuestionIndex = 0; // current quiz question
let lastBuzzedTeam = null; // 'left' or 'right'
let lastAnswerCorrect = null; // true or false
let scores = { left: 0, right: 0 }; // track scores
let quizEnded = false; // flag for quiz end


// leftBuzzer handler
window.addEventListener('leftBuzzer', () => {

    // if quiz ended, disable buzzers
    if (quizEnded) return;


    // buzz to answer question
    if (currentScreen === 'quiz') {
        if (timerTimeoutId) clearTimeout(timerTimeoutId); // cancel auto-advance
        // change message depending on team 
        const message =  'TEAM BLAU HAT GEBUZZERT! <br>NENNT JETZT DIE RICHTIGE LÖSUNG';
        // mark down who buzzed
        lastBuzzedTeam = 'left';
        changeTextById('buzz-message', message);
        // screen switch
        switchScreen('questionScreen', 'buzzedScreen');
        currentScreen = 'buzzed';
        // start answer timer
        startTimerBuzzed(10000);

            // move to reveal screen after 10 seconds
            setTimeout(() => {
                // if quiz ended, return
                if (quizEnded) return;

                switchScreen('buzzedScreen', 'questionScreenReveal');
                currentScreen = 'reveal';

                // Show correct answer in reveal screen
                const currentQ = questions[currentQuestionIndex];

                // Show the correct answer in the reveal screen
                const revealTextDiv = document.getElementById('questionContainerReveal');
                const correctAnswer = currentQ.answers[currentQ.correctIndex || 0];
                revealTextDiv.innerHTML = `Die richtige Antwort lautet: ${correctAnswer}`;

                // Also show image in reveal screen
                const revealContainer = document.getElementById('pictureContainerReveal');
                revealContainer.innerHTML = ''; // Clear previous image

                if (currentQ.imagePath) {
                    const revealImg = document.createElement('img');
                    revealImg.src = currentQ.imagePath;
                    revealImg.alt = 'Fragebild';
                    revealImg.style.maxWidth = '100%';
                    revealImg.style.maxHeight = '100%';
                    revealImg.style.objectFit = 'contain';
                    revealImg.style.display = 'block';
                    revealImg.style.margin = '0 auto';
                    revealContainer.appendChild(revealImg);
                }
            }, 10000);
        return;
    }

    // if buzzers are pressed on reveal screen, move to teamAnswerCheck
    if (currentScreen === 'reveal') {
        switchScreen('questionScreenReveal', 'teamAnswerCheck');
        currentScreen = 'answerCheck';
        return;
    }

    // if on teamAnswerCheck screen, mark answer as correct
    if (currentScreen === 'answerCheck') {
        lastAnswerCorrect = true;
        switchScreen('teamAnswerCheck', 'teamAnswerConfirm');
        currentScreen = 'answerConfirm';
        return;
    }

    // if on teamAnswerConfirm screen, confirm result
    if (currentScreen === 'answerConfirm') {
        if (lastBuzzedTeam && lastAnswerCorrect !== null) {
            // if marked correct in prev screen, get point
            if (lastAnswerCorrect) {
                scores[lastBuzzedTeam]++;

                //display who won round
                const teamName = lastBuzzedTeam === 'left' ? 'BLAU' : 'ROT';
                changeTextById('roundResult-message', `EIN PUNKT FÜR TEAM ${teamName}!`);
            } else {
                // if not, other team gets a point
                const oppositeTeam = lastBuzzedTeam === 'left' ? 'right' : 'left';
                scores[oppositeTeam]++;

                //display who won round
                const teamName = oppositeTeam === 'left' ? 'BLAU' : 'ROT';
                changeTextById('roundResult-message', `EIN PUNKT FÜR TEAM ${teamName}!`);
            }

            // update displays
            updateScoreDisplays();

            // if there are more questions, move to ne
            currentQuestionIndex++;
            if (currentQuestionIndex < questions.length) {
                switchScreen('teamAnswerConfirm', 'roundResult');
                currentScreen = 'roundResult';
            } else {
                getQuizResult();
                switchScreen('teamAnswerConfirm', 'quizResult');
                currentScreen = 'result';
                elementHider('clockContainer');
                launchConfetti();
            }
        }
        return;
    }

    // if on roundResult screen, move to next question if theres more
    if (currentScreen === 'roundResult') {
        if (currentQuestionIndex < questions.length) {
            switchScreen('roundResult', 'questionScreen');
            currentScreen = 'quiz';
            showQuestion(currentQuestionIndex);
        // if not, end quiz
        } else {
            getQuizResult();
            switchScreen('roundResult', 'quizResult');
            currentScreen = 'result';
            elementHider('clockContainer');
            launchConfetti()
        }
        return;
    }


    switch (currentScreen) {

        // lang select
        case 'lang':
            lang = 'deutsch';
            currentScreen = 'quiz';
            switchScreen('langSelect', 'questionScreen');
            elementHider('title-container');
            console.log(`Language selected: ${lang}`);

            startClockCountdown(360, () => { //360 sec = 6 min
                if (quizEnded) return;
                quizEnded = true;

                console.log('Time is up!');
                if (timerTimeoutId) clearTimeout(timerTimeoutId);

                getQuizResult();

                hideAllQuizScreens(); 
                document.getElementById('quizResult').style.display = 'flex';
                currentScreen = 'result';
                elementHider('clockContainer');
                launchConfetti();
            });

            (async () => {
                // get current active quiz type
                const currentActiveQuizType = await fetchCurrentQuizType();
                if (currentActiveQuizType) {
                    // get the actual active quiz
                    const quiz = await fetchActiveQuizWithoutAge(currentActiveQuizType, lang);
                    // extract the questions
                    questions = extractQuestionsFromQuiz(quiz);
                    // set initial index of question
                    currentQuestionIndex = 0;
                    // run function loop
                    showQuestion(currentQuestionIndex);
                }
            })();

            break;
    }
});

// rightBuzzer handler
window.addEventListener('rightBuzzer', () => {

    // if quiz ended, disable buzzers
    if (quizEnded) return;

    // buzz to answer question
    if (currentScreen === 'quiz') {
        if (timerTimeoutId) clearTimeout(timerTimeoutId); // cancel auto-advance
        // change message depending on team 
        const message =  'TEAM ROT HAT GEBUZZERT! <br>NENNT JETZT DIE RICHTIGE LÖSUNG';
        // mark down who buzzed
        lastBuzzedTeam = 'right';
        changeTextById('buzz-message', message);
        // screen switch
        switchScreen('questionScreen', 'buzzedScreen');
        currentScreen = 'buzzed';
        // start answer timer
        startTimerBuzzed(10000);

        // move to reveal screen after 10 seconds
            setTimeout(() => {
                // if quiz ended, return
                if (quizEnded) return;

                switchScreen('buzzedScreen', 'questionScreenReveal');
                currentScreen = 'reveal';

                // Show correct answer in reveal screen
                const currentQ = questions[currentQuestionIndex];

                // Show the correct answer in the reveal screen
                const revealTextDiv = document.getElementById('questionContainerReveal');
                const correctAnswer = currentQ.answers[currentQ.correctIndex || 0];
                revealTextDiv.innerHTML = `Die richtige Antwort lautet: ${correctAnswer}`;

                // Also show image in reveal screen
                const revealContainer = document.getElementById('pictureContainerReveal');
                revealContainer.innerHTML = ''; // Clear previous image

                if (currentQ.imagePath) {
                    const revealImg = document.createElement('img');
                    revealImg.src = currentQ.imagePath;
                    revealImg.alt = 'Fragebild';
                    revealImg.style.maxWidth = '100%';
                    revealImg.style.maxHeight = '100%';
                    revealImg.style.objectFit = 'contain';
                    revealImg.style.display = 'block';
                    revealImg.style.margin = '0 auto';
                    revealContainer.appendChild(revealImg);
                }
            }, 10000);
        return;
    }

    // if buzzers are pressed on reveal screen, move to teamAnswerCheck
    if (currentScreen === 'reveal') {
        switchScreen('questionScreenReveal', 'teamAnswerCheck');
        currentScreen = 'answerCheck';
        return;
    }

    // if on teamAnswerCheck screen, mark answer as incorrect
    if (currentScreen === 'answerCheck') {
        lastAnswerCorrect = false;
        switchScreen('teamAnswerCheck', 'teamAnswerConfirm');
        currentScreen = 'answerConfirm';
        return;
    }

    // if on teamAnswerConfirm screen, make correction
    if (currentScreen === 'answerConfirm') {
        switchScreen('teamAnswerConfirm', 'teamAnswerCheck');
        currentScreen = 'answerCheck';
        return;
    }

    // if on roundResult screen, move to next question if theres more
    if (currentScreen === 'roundResult') {
        if (currentQuestionIndex < questions.length) {
            switchScreen('roundResult', 'questionScreen');
            currentScreen = 'quiz';
            showQuestion(currentQuestionIndex);
        // if not, end quiz
        } else {
            getQuizResult();
            switchScreen('roundResult', 'quizResult');
            currentScreen = 'result';
            elementHider('clockContainer');
            launchConfetti();
        }
        return;
    }


    switch (currentScreen) {

        // lang select
        case 'lang':
            lang = 'englisch';
            currentScreen = 'quiz';
            switchScreen('langSelect', 'questionScreen');
            elementHider('title-container');
            console.log(`Language selected: ${lang}`);
            
            startClockCountdown(360, () => { //360 sec = 6 min
                if (quizEnded) return;
                quizEnded = true;

                console.log('Time is up!');
                if (timerTimeoutId) clearTimeout(timerTimeoutId);

                getQuizResult();

                hideAllQuizScreens(); 
                document.getElementById('quizResult').style.display = 'flex';
                currentScreen = 'result';
                elementHider('clockContainer');
                launchConfetti();
            });

            (async () => {
                // get current active quiz type
                const currentActiveQuizType = await fetchCurrentQuizType();
                if (currentActiveQuizType) {
                    // get the actual active quiz
                    const quiz = await fetchActiveQuizWithoutAge(currentActiveQuizType, lang);
                    // extract the questions
                    questions = extractQuestionsFromQuiz(quiz);
                    // set initial index of question
                    currentQuestionIndex = 0;
                    // run function loop
                    showQuestion(currentQuestionIndex);
                }
            })();

            break;
    }
});


// Global timeout ID so it can be cleared
let timerTimeoutId = null; 

// function to show questions
function showQuestion(index) {
  const questionObj = questions[index];
  if (!questionObj) {
    console.warn('No question available at index', index);
    return;
  }

  // Start visual timer
  startTimer(20000);

  // Set logic timer to auto-move to next question
 timerTimeoutId = setTimeout(() => {
  if (quizEnded) return;

  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
    showQuestion(currentQuestionIndex);
  } else {
    // if timer runs out on last question
    console.log('Quiz complete');
    quizEnded = true;
    getQuizResult();
    hideAllQuizScreens(); 
    document.getElementById('quizResult').style.display = 'flex';
    currentScreen = 'result';
    elementHider('clockContainer');
    launchConfetti();
  }
}, 20000);


  // Display the image
  const pictureContainer = document.getElementById('pictureContainer');
  pictureContainer.innerHTML = ''; // Clear previous image

  // the pixelator/ mosaic
  if (questionObj.imagePath) {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.objectFit = 'contain';
    canvas.id = 'pixelCanvas';
    pictureContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = questionObj.imagePath;

    img.onload = () => {
        const fullW = img.width;
        const fullH = img.height;
        canvas.width = fullW;
        canvas.height = fullH;

        const duration = 20000; // 20 sec
        const interval = 2000; // update every 2 sec
        const blockSizes = [70, 60, 40, 35, 30, 25, 20, 10, 5, 1]; // Start more pixelated
        const steps = blockSizes.length;
        let currentStep = 0;

        const drawPixelated = () => {
            const blockSize = blockSizes[currentStep] || 1;
            const scaledW = Math.max(1, Math.floor(fullW / blockSize));
            const scaledH = Math.max(1, Math.floor(fullH / blockSize));

            ctx.clearRect(0, 0, fullW, fullH);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, scaledW, scaledH);
            ctx.drawImage(canvas, 0, 0, scaledW, scaledH, 0, 0, fullW, fullH);
        };

        drawPixelated();

        const pixelTimer = setInterval(() => {
            currentStep++;
            drawPixelated();
            if (currentStep >= steps) {
            clearInterval(pixelTimer);
            }
        }, interval);
    };

  }
}




/*
    Function to update scores
*/
export function updateScoreDisplays() {
    document.getElementById('scoreLeft').textContent = scores.left;
    document.getElementById('scoreRight').textContent = scores.right;

    document.getElementById('scoreLeftBuzz').textContent = scores.left;
    document.getElementById('scoreRightBuzz').textContent = scores.right;

    document.getElementById('scoreLeftReveal').textContent = scores.left;
    document.getElementById('scoreRightReveal').textContent = scores.right;

    document.getElementById('scoreLeftAnswerCheck').textContent = scores.left;
    document.getElementById('scoreRightAnswerCheck').textContent = scores.right;

    document.getElementById('scoreLeftAnswerConfirm').textContent = scores.left;
    document.getElementById('scoreRightAnswerConfirm').textContent = scores.right;

    document.getElementById('scoreLeftRoundResult').textContent = scores.left;
    document.getElementById('scoreRightRoundResult').textContent = scores.right;

    document.getElementById('scoreLeftQuizResult').textContent = scores.left;
    document.getElementById('scoreRightQuizResult').textContent = scores.right;
}


/*
    Handle win, lose, and ties
*/
function getQuizResult() {
    // Determine winner or tie
    let resultMessage = '';
    if (scores.left > scores.right) {
        resultMessage = 'TEAM BLAU GEWINNT!';
    } else if (scores.right > scores.left) {
        resultMessage = 'TEAM ROT GEWINNT!';
    } else {
        resultMessage = 'UNENTSCHIEDEN!';
    }

    // Update result message on screen
    changeTextById('quizResult-message', resultMessage);

    // Update score visuals
    updateScoreDisplays();
}





// clear and set start screen
hideAllQuizScreens();
elementShower('langSelect');
