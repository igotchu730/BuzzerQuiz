/*
    function to count down quiz clock
*/
export function startClockCountdown(durationSeconds, onFinish) {
    const totalTimeLeft = document.getElementById('totalTimeLeft');
    let timeLeft = durationSeconds;

    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        totalTimeLeft.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    updateDisplay();

    const interval = setInterval(() => {
        timeLeft--;
        updateDisplay();
        if (timeLeft <= 0) {
            clearInterval(interval);
            totalTimeLeft.textContent = "00:00";
            if (typeof onFinish === 'function') onFinish(); // end quiz
        }
    }, 1000);
}



/* 
    function to count down question timer
*/
export function startTimer(duration) {
    const fill = document.getElementById('timerFill');

    // Reset
    fill.style.transition = 'none';
    fill.style.width = '100%';

    // Allow layout to apply before transitioning
    setTimeout(() => {
        fill.style.transition = `width ${duration}ms linear`;
        fill.style.width = '0%';
    }, 50);
};


/* 
    function to count down timer for team to answer after buzzing
*/
export function startTimerBuzzed(duration) {
    const fill = document.getElementById('timerFillBuzz');

    // Reset
    fill.style.transition = 'none';
    fill.style.width = '100%';

    // Allow layout to apply before transitioning
    setTimeout(() => {
        fill.style.transition = `width ${duration}ms linear`;
        fill.style.width = '0%';
    }, 50);
};

// Reusable screen switcher
export function switchScreen(fromId, toId) {
    document.getElementById(fromId).style.display = 'none';
    document.getElementById(toId).style.display = 'flex';
};

// Reusable element hider
export function elementHider(id){
    document.getElementById(id).style.display = 'none';
};

// Reusable element shower
export function elementShower(id){
    document.getElementById(id).style.display = 'flex';
};

// Reusable element text changer
export function changeTextById(id, newText) {
  const element = document.getElementById(id);
  if (element) {
    element.innerHTML = newText;
  }
}

// function to 'emit' custom DOM event
export function emitCustomBuzzerEvent(eventName) {
  const buzzerEvent = new CustomEvent(eventName);
  window.dispatchEvent(buzzerEvent);
}

/*
    Function to fetch current active quiz type
*/
export async function fetchCurrentQuizType() {
  try {
    const response = await fetch('/api/curr-quiz-type/quiz-type');

    if (response.status === 404) {
      alert("Kein Quiztyp wurde festgelegt. Bitte kontaktieren Sie den Administrator.");
      return null;
    }

    if (!response.ok) throw new Error(`Failed with status ${response.status}`);

    const data = await response.json();
    return data.quizType;
  } catch (err) {
    alert("Fehler beim Abrufen des aktuellen Quiztyps. Bitte versuchen Sie es erneut.");
    console.error('Failed to fetch current quiz type:', err);
    return null;
  }
}

/*
    Function to fetch quiz object that is active
*/
export async function fetchActiveQuiz(quizType, quizAge, quizLanguage) {
  try {
    const response = await fetch(`/api/quiz/by-params?quizType=${quizType}&quizAge=${quizAge}&quizLanguage=${quizLanguage}`);
    
    if (response.status === 404) {
      location.reload();

      alert("Fehler: Kein aktives Quiz mit den gewählten Parametern gefunden. Bitte kontaktieren Sie den Administrator, um ein aktives Quiz festzulegen.");
      return null;
    }

    if (!response.ok) throw new Error(`Failed with status ${response.status}`);

    const data = await response.json();
    return data;
  } catch (err) {
    location.reload();
    alert("Fehler: Kein aktives Quiz mit den gewählten Parametern gefunden. Bitte kontaktieren Sie den Administrator, um ein aktives Quiz festzulegen.");
    console.error('Failed to fetch quiz:', err);
    return null;
  }
}

/*
    Function to fetch quiz object without using age that is active
*/
export async function fetchActiveQuizWithoutAge(quizType, quizLanguage) {
  try {
    const response = await fetch(`/api/quiz/by-params?quizType=${quizType}&quizLanguage=${quizLanguage}`);
    
    if (response.status === 404) {
      location.reload();
      alert("Fehler: Kein aktives Quiz mit den gewählten Parametern gefunden. Bitte kontaktieren Sie den Administrator, um ein aktives Quiz festzulegen.");
      return null;
    }

    if (!response.ok) throw new Error(`Failed with status ${response.status}`);

    const data = await response.json();
    return data;
  } catch (err) {
    location.reload();
    alert("Fehler: Kein aktives Quiz mit den gewählten Parametern gefunden. Bitte kontaktieren Sie den Administrator, um ein aktives Quiz festzulegen.");
    console.error('Failed to fetch quiz:', err);
    return null;
  }
}

/*
    Function to fetch quiz object without using age that is active
*/
export function extractQuestionsFromQuiz(quizObject) {
  if (!quizObject || !Array.isArray(quizObject.questions)) {
    console.warn("Ungültiges Quizobjekt oder keine Fragen gefunden.");
    return [];
  }

  return quizObject.questions;
}

/*
    confetti
*/
export function launchConfetti() {
    const count = 7; // number of bursts
    const defaults = {
        spread: 360,
        startVelocity: 40,
        particleCount: 60,
        ticks: 100,
        zIndex: 9999
    };

    for (let i = 0; i < count; i++) {
        confetti({
            ...defaults,
            origin: {
                x: Math.random(),          // random left to right
                y: Math.random() * 0.5     // only top half vertically
            }
        });
    }
}


/*
    hide all screens
*/
export function hideAllQuizScreens() {
    const screens = [
        'questionScreen',
        'buzzedScreen',
        'questionScreenReveal',
        'teamAnswerCheck',
        'teamAnswerConfirm',
        'roundResult',
        'quizResult'
    ];
    screens.forEach(id => document.getElementById(id).style.display = 'none');
}