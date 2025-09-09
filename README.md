# Buzzer Quiz System
**Interactive classroom & event quiz game with multiple modes and buzzer-style controls**

A freelance project built for a German client, built per the client's requests and guidelines.
It's an interactive buzzer-based quiz game built with Node.js, Express, and MongoDB, designed mainly for use in classrooms, events, and parties.
Players will interact with the quiz through a shared device (mouse left/right button), with future support for physical buzzer hardware in mind.

### Preview Link:
[Live Demo on Railway](https://buzzerquiz.up.railway.app/)

<br>![Image](https://github.com/user-attachments/assets/14d83538-f1bb-4901-a592-46d01b0aa646)

### Rules:
1. Choose answering language.
2. First team to buzz in (using left or right mouse buttons) gets to answer first. If no team answers before the timer runs out, the quiz will move to the next question.
3. The buzzing team gives their answer and both teams will have to confirm whether the answer given was correct or incorrect.
4. If the buzzing team answered correctly, they will recieve a point. If not, the opposing team gets the point.
5. The game ends when all questions are answered, or the game timer runs out. The team with the most points win. If both teams have the same amount of points, the game will end in a draw. 

---

# Features
### 1. Multiple Quiz Types
- **Wissensquiz (text-based)**
<br><img width="500" alt="Image" src="https://github.com/user-attachments/assets/e439d962-13d0-48db-97c0-77501da39264" /><br>
  - Basic mulitple choice trivia based questions.
  
- **Bilderquiz (image-based)**
<br><img width="500" alt="Image" src="https://github.com/user-attachments/assets/5f8fe825-3302-4297-966d-cd0a650bcda5" /><br>
  - The quiz questions starts with a pixelated image that gradually gets less pixelated as time passes.
  - Teams are to guess what the image is.

- **Soundquiz (audio-based)**
<br><img width="500" alt="Image" src="https://github.com/user-attachments/assets/33d01932-6b67-4a46-9fa7-5d26d3fd63fb" /><br>
  - The quiz questions starts with a sound playing.
  - Teams are to guess what the sound is.

### 2. Admin Panel
Those with admin access may...
<br><img width="500" alt="Image" src="https://github.com/user-attachments/assets/24689c7b-ae34-4f80-a8f3-224374e85b51" /><br>
- Create, edit, and delete quizzes
- Upload and manage images/audio
- Activate quizzes with one-click toggle
- **Note:** Only one quiz is active at a time.
  
### 3. Database
- MongoDB stores quizzes with unique (quizName + type + age + language)
- Prevents duplicate quiz entries
  
### 4. File Handling
- /uploads folder stores images & audio
- Automatic cleanup when deleting quizzes

---

# Tech Stack
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Backend:** Node.js + Express
- **Database:** MongoDB (Railway-hosted)
- **Deployment:** Railway
