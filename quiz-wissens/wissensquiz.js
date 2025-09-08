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
} from './wissensFunctions.js';



let age, lang; // track selected age and lang
let currentScreen = 'age'; // starting screen
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

                // correct answer is green
                currentQ.answers.forEach((ans, i) => {
                    const btn = document.getElementById(`answer${i}Reveal`);
                    if (btn) {
                        btn.textContent = ans;

                        // Reset all styles
                        btn.classList.remove('correct-answer');

                        // Highlight correct answer
                        if (i === currentQ.correctIndex) {
                            btn.classList.add('correct-answer');
                        }
                    }
                });
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
        // age select
        case 'age':
            age = 'kinder';
            currentScreen = 'lang';
            switchScreen('ageSelect', 'langSelect');
            console.log(`Age selected: ${age}`);
            break;

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
                    const quiz = await fetchActiveQuiz(currentActiveQuizType, age, lang);
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

                // correct answer is green
                currentQ.answers.forEach((ans, i) => {
                    const btn = document.getElementById(`answer${i}Reveal`);
                    if (btn) {
                        btn.textContent = ans;

                        // Reset all styles
                        btn.classList.remove('correct-answer');

                        // Highlight correct answer
                        if (i === currentQ.correctIndex) {
                            btn.classList.add('correct-answer');
                        }
                    }
                });
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
        // age select
        case 'age':
            age = 'erwachsene';
            currentScreen = 'lang';
            switchScreen('ageSelect', 'langSelect');
            console.log(`Age selected: ${age}`);
            break;

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
                    const quiz = await fetchActiveQuiz(currentActiveQuizType, age, lang);
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

  // Set question text
  document.getElementById('questionContainer').textContent = questionObj.questionText;

  // Set answer buttons
  questionObj.answers.forEach((answer, i) => {
    const btn = document.getElementById(`answer${i}`);
    if (btn) {
      btn.textContent = answer;
    }
  });

  // Start visual timer
  startTimer(30000);

  // Set logic timer to auto-move to next question
  if (timerTimeoutId) clearTimeout(timerTimeoutId); // clear previous
  timerTimeoutId = setTimeout(() => {

    // if quiz ended, return
    if (quizEnded) return;

    console.log('No buzz — moving to next question...');
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      showQuestion(currentQuestionIndex);
    } else {

        // complete quiz if time runs out on last question
        console.log('Quiz complete');

        quizEnded = true;
        getQuizResult();

        hideAllQuizScreens(); 
        document.getElementById('quizResult').style.display = 'flex';
        currentScreen = 'result';
        elementHider('clockContainer');
        launchConfetti();
    }
  }, 30000);
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


