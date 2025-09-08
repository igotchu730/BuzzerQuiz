import { emitCustomBuzzerEvent } from './quiz-wissens/wissensFunctions.js';


// Disable context menu
document.addEventListener('contextmenu', (e) => e.preventDefault());

/*
    Mouse click handling.
    In the future, for actual buzzers, you should mimic this process (emit the same custom buzzer events)
*/
document.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    emitCustomBuzzerEvent('leftBuzzer');
  } else if (e.button === 2) {
    emitCustomBuzzerEvent('rightBuzzer');
  }
});
