const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');

// use disk storage to store files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname);

    // Fallback if extension is missing
    if (!ext) {
      if (file.mimetype === 'image/jpeg') ext = '.jpg';
      else if (file.mimetype === 'image/png') ext = '.png';
      else ext = '.bin';
    }

    const filename = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, filename);
  }
});

const upload = multer({ storage });

// express app instance
const app = express();
// cors allows frontend to access server
app.use(cors());
// auto parse incoming JSON requests
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/quizapp');


// Define Schema
const quizSchema = new mongoose.Schema({
  quizName: String,
  quizType: String,
  quizAge: String,
  quizLanguage: String,
  isActive: { type: Boolean, default: false },
  questions: [
    {
      questionText: String,
      answers: [String],
      correctIndex: Number,
      imagePath: String,
      soundPath: String,
      originalName: String
    }
  ],
});

// create an object of quizzes collection in DB
const Quiz = mongoose.model('Quiz', quizSchema);




/*
  Redirects
*/
/*
// dynamically serve home landing page based on active quiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'quiz-bilder', 'bilderquiz.html'));
});*/
app.get('/', async (req, res) => {
  try {
    const active = await CurrQuizType.findOne({ key: 'selectedQuizType' });

    if (!active || !active.value) {
      return res.status(404).send('Kein aktiver Quiz-Typ gefunden.');
    }

    const quizType = active.value.trim();

    if (quizType === 'Wissensquiz') {
      res.sendFile(path.join(__dirname, 'quiz-wissens', 'wissensquiz.html'));
    } else if (quizType === 'Bilderquiz') {
      res.sendFile(path.join(__dirname, 'quiz-bilder', 'bilderquiz.html'));
    } else if (quizType === 'Soundquiz') {
      res.sendFile(path.join(__dirname, 'quiz-sound', 'soundquiz.html'));
    } else {
      res.status(400).send('Unbekannter Quiz-Typ: ' + quizType);
    }
  } catch (err) {
    console.error('Fehler beim Laden des Quiz-Typs:', err);
    res.status(500).send('Serverfehler');
  }
});





// easy admin page redirect
app.get('/admin', (req, res) => {
  res.redirect('/admin-page/admin.html');
});
// serve assets folder
app.use('/assets', express.static(path.join(__dirname, 'assets')));
// uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// serve css and html for main-page
app.use('/main-page', express.static(path.join(__dirname, 'main-page')));
// serve admin page
app.use('/admin-page', express.static(path.join(__dirname, 'admin-page')));
//serve quiz-creator page
app.use('/quiz-creator', express.static(path.join(__dirname, 'quiz-creator')));
//serve wissensquiz page
app.use('/quiz-wissens', express.static(path.join(__dirname, 'quiz-wissens')));
//serve bilderquiz page
app.use('/quiz-bilder', express.static(path.join(__dirname, 'quiz-bilder')));
//serve soundquiz page
app.use('/quiz-sound', express.static(path.join(__dirname, 'quiz-sound')));
//serve buzzer handler
app.use('/buzzer-client.js', express.static(path.join(__dirname, 'buzzer-client.js')));









/* 
  Routes/Functions
*/
// Route to create an empty quiz
app.post('/api/quiz', async (req, res) => {
  const { quizName, quizType, quizAge, quizLanguage } = req.body;
  const existing = await Quiz.findOne({
    quizName,
    quizType,
    quizAge,
    quizLanguage
  });
  if (existing) return res.status(400).send('Quiz with same name and parameters already exists');

  const quiz = new Quiz({ quizName, quizType, quizAge, quizLanguage, questions: [] });
  await quiz.save();
  res.send(quiz);
});

// Route to create questions
app.post('/api/quiz/:quizName/question', async (req, res) => {
  const { quizType, quizAge, quizLanguage, questionText, answers, correctIndex } = req.body;

  const query = { quizName: req.params.quizName, quizType, quizLanguage };
  if (quizAge !== null && quizAge !== undefined && quizAge !== '') query.quizAge = quizAge;
  const quiz = await Quiz.findOne(query);


  if (!quiz) return res.status(404).send('Quiz not found');

  quiz.questions.push({ questionText, answers, correctIndex });
  await quiz.save();
  res.send(quiz);
});


// Route to get all quizzes
app.get('/api/quizzes', async (req, res) => {
  const quizzes = await Quiz.find();
  res.send(quizzes);
});

// delete questions in quizzes
app.put('/api/quiz/:quizName', async (req, res) => {
  const { quizName } = req.params;
  const updatedQuiz = req.body;
  try {
    const { quizType, quizAge, quizLanguage } = updatedQuiz;
    const query = { quizName, quizType, quizLanguage };
    if (quizAge !== null && quizAge !== undefined && quizAge !== '') query.quizAge = quizAge;

    const quiz = await Quiz.findOneAndUpdate(query, updatedQuiz, { new: true });

    if (!quiz) return res.status(404).send('Quiz not found');
    res.send(quiz);
  } catch (err) {
    res.status(500).send('Error updating quiz');
  }
});

// Route to delete a quiz by name
app.delete('/api/quiz/:quizName', async (req, res) => {
  const { quizName } = req.params;
  try {
    const quiz = await Quiz.findOne({ quizName });
    if (!quiz) return res.status(404).send('Quiz not found');

    // Loop through questions and delete image files
    quiz.questions.forEach(q => {
      if (q.imagePath) {
        const fullPath = path.join(__dirname, q.imagePath);
        fs.unlink(fullPath, (err) => {
          if (err) console.warn('Failed to delete file:', fullPath);
          else console.log('Deleted:', fullPath);
        });
      }
      if (q.soundPath) {
        const soundFullPath = path.join(__dirname, q.soundPath);
        fs.unlink(soundFullPath, err => {
          if (err) console.warn('Failed to delete sound file:', soundFullPath);
        });
      }
    });

    await Quiz.deleteOne({ quizName });
    res.send('Quiz and all associated images deleted');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting quiz');
  }
});


// Set quiz active and unset others with same parameters
app.post('/api/quiz/:quizName/set-active', async (req, res) => {
    const { quizName, quizType, quizAge, quizLanguage } = req.body;
    /*console.log("Incoming set-active request with:", {
      quizName,
      quizType,
      quizAge,
      quizLanguage
    });*/
    try {
      const normalizedQuizAge = quizAge ?? '';
      await Quiz.updateMany(
        { quizType, quizAge: normalizedQuizAge, quizLanguage },
        { $set: { isActive: false } } // <- FIXED
      );

      const result = await Quiz.updateOne(
        {
          quizName,
          quizType,
          quizLanguage,
          $or: [
            { quizAge: normalizedQuizAge },
            { quizAge: { $exists: false } },
            { quizAge: null }
          ]
        },
        { $set: { isActive: true } } // <- FIXED
      );

      //console.log('Set active result:', result);

      if (result.modifiedCount === 0) {
        return res.status(404).send('Quiz nicht gefunden.');
      }

      res.sendStatus(200);
    } catch (err) {
      console.error('Error setting active quiz:', err);
      res.status(500).send('Server error');
    }
});


// Upload image for a question (Bilderquiz)
app.post('/api/quiz/:quizName/upload-image', upload.single('image'), async (req, res) => {
    try {
        const { quizName, quizType, quizAge, quizLanguage, questionText, answers, correctIndex } = req.body;
        const imagePath = `/uploads/${req.file.filename}`;

        const query = { quizName, quizType, quizLanguage };
        if (quizAge !== null && quizAge !== undefined && quizAge !== '') query.quizAge = quizAge;
        const quiz = await Quiz.findOne(query);

        if (!quiz) return res.status(404).send('Quiz nicht gefunden.');

        quiz.questions.push({
            questionText,
            answers: JSON.parse(answers),
            correctIndex: parseInt(correctIndex),
            imagePath
        });

        await quiz.save();
        res.send('Image question saved.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Serverfehler beim Hochladen.');
    }
});




// check duplicates
app.get('/api/quiz/check-duplicate', async (req, res) => {
    const { quizName, quizType, quizAge, quizLanguage } = req.query;

    try {
        const query = { quizName, quizType, quizLanguage };
        if (quizAge !== null && quizAge !== undefined && quizAge !== '') query.quizAge = quizAge;
        const existingQuiz = await Quiz.findOne(query);

        res.json({ exists: !!existingQuiz });
    } catch (err) {
        res.status(500).send('Server error while checking duplicate');
    }
});


//delete individual question images dynamically
app.post('/api/delete-image', (req, res) => {
  const { imagePath } = req.body;
  if (!imagePath) return res.status(400).send('No image path provided');

  const fullPath = path.join(__dirname, imagePath);
  fs.unlink(fullPath, (err) => {
    if (err) {
      console.error('Failed to delete image:', fullPath);
      return res.status(500).send('Failed to delete image');
    }
    res.send('Image deleted');
  });
});


// Route to delete a quiz by params (not just name)
app.post('/api/quiz/delete-by-params', async (req, res) => {
    const { quizName, quizType, quizAge, quizLanguage } = req.body;

    try {
        const query = { quizName, quizType, quizLanguage };
        if (quizAge !== null && quizAge !== undefined && quizAge !== '') {
            query.quizAge = quizAge;
        }

        const quiz = await Quiz.findOne(query);
        if (!quiz) return res.status(404).send('Quiz nicht gefunden.');

        // Delete associated image files
        quiz.questions.forEach(q => {
            if (q.imagePath) {
                const fullPath = path.join(__dirname, q.imagePath);
                fs.unlink(fullPath, err => {
                    if (err) console.warn('Failed to delete image:', fullPath);
                });
            }
            if (q.soundPath) {
                const fullPath = path.join(__dirname, q.soundPath);
                fs.unlink(fullPath, err => {
                    if (err) console.warn('Failed to delete sound:', fullPath);
                });
            }
        });

        await Quiz.deleteOne(query);
        res.send('Quiz gelöscht');
    } catch (err) {
        console.error('Serverfehler beim Löschen:', err);
        res.status(500).send('Serverfehler beim Löschen');
    }
});

// Edit an existing question in a quiz
app.post('/api/quiz/:quizName/edit-question', async (req, res) => {
    try {
        const { quizType, quizAge, quizLanguage, index, questionText, answers, correctIndex } = req.body;
        const quizName = req.params.quizName;

        const quiz = await Quiz.findOne({
            quizName,
            quizType,
            quizAge: quizAge || null,
            quizLanguage
        });

        if (!quiz) return res.status(404).send("Quiz not found.");
        if (!Array.isArray(quiz.questions) || index < 0 || index >= quiz.questions.length)
            return res.status(400).send("Invalid question index.");

        // Replace the question at given index
        quiz.questions[index] = { questionText, answers, correctIndex };
        await quiz.save();

        res.sendStatus(200);
    } catch (err) {
        console.error("Error updating question:", err);
        res.status(500).send("Server error");
    }
});

// Edit an existing question in a image quiz
app.post('/api/quiz/:quizName/edit-image-question', upload.single('newImage'), async (req, res) => {
    const { quizName } = req.params;
    const { quizType, quizAge, quizLanguage, index, questionText, answers, correctIndex, oldImagePath } = req.body;

    const quiz = await Quiz.findOne({ quizName, quizType, quizAge, quizLanguage });
    if (!quiz) return res.status(404).send("Quiz not found");

    const i = parseInt(index, 10);
    if (i < 0 || i >= quiz.questions.length) return res.status(400).send("Invalid index");

    // delete old image if a new one is uploaded
    if (req.file && oldImagePath) {
        const oldPath = path.join(__dirname, oldImagePath);
        fs.unlink(oldPath, err => {
            if (err) console.warn('Could not delete old image:', err);
        });
    }

    quiz.questions[i] = {
        questionText,
        answers: JSON.parse(answers),
        correctIndex: parseInt(correctIndex),
        imagePath: req.file ? `/uploads/${req.file.filename}` : quiz.questions[i].imagePath,
        originalName: req.file ? req.file.originalname : quiz.questions[i].originalName
    };

    await quiz.save();
    res.send("Question updated");
});


// handle both img and sound upload
app.post('/api/quiz/:quizName/upload-media', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'newSound', maxCount: 1 }
]), async (req, res) => {
    const { quizName } = req.params;
    const { quizType, quizAge, quizLanguage, questionText, answers, correctIndex } = req.body;

    const quiz = await Quiz.findOne({ quizName, quizType, quizAge, quizLanguage });
    if (!quiz) return res.status(404).send('Quiz nicht gefunden.');

    const imageFile = req.files?.image?.[0];
    const soundFile = req.files?.newSound?.[0];

    const imageFilename = imageFile?.originalname || 'none';
    const soundFilename = soundFile?.originalname || 'none';

    const question = {
        questionText: `{${soundFilename},${imageFilename}}`,
        answers: JSON.parse(answers),
        correctIndex: Number(correctIndex)
    };


    if (req.files?.image?.[0]) {
        question.imagePath = `/uploads/${req.files.image[0].filename}`;
    }

    if (req.files?.newSound?.[0]) {
        question.soundPath = `/uploads/${req.files.newSound[0].filename}`;
    }

    quiz.questions.push(question);
    await quiz.save();

    res.send('Question with media uploaded successfully');
});


app.post('/api/quiz/:quizName/edit-media-question', upload.fields([
  { name: 'newImage', maxCount: 1 },
  { name: 'newSound', maxCount: 1 }
]), async (req, res) => {
  try {
    const { quizName } = req.params;
    const { quizType, quizAge, quizLanguage, index, questionText, answers, correctIndex } = req.body;
    const i = parseInt(index);

    const quiz = await Quiz.findOne({
      quizName,
      quizType,
      quizAge: quizAge || '',
      quizLanguage
    });

    if (!quiz) return res.status(404).send("Quiz nicht gefunden.");

    const question = quiz.questions[i];
    if (!question) return res.status(400).send("Ungültiger Index.");

    // Determine filenames to reflect in questionText
    let soundFilename = req.files['newSound']?.[0]?.originalname || question.questionText?.match(/^\{(.*?),/)?.[1] || '';
    let imageFilename = req.files['newImage']?.[0]?.originalname || question.questionText?.match(/,(.*?)\}$/)?.[1] || '';



    // Save only filenames to questionText
    question.questionText = `{${soundFilename}, ${imageFilename}}`;
    question.originalName = question.questionText;
    question.answers = JSON.parse(answers);
    question.correctIndex = correctIndex;

    
    const oldImagePath = req.body.oldImagePath;
    const oldSoundPath = req.body.oldSoundPath;

    // Delete old sound if new one is uploaded
    if (req.files['newSound']?.[0]) {
      if (oldSoundPath) {
        const fullSoundPath = path.join(__dirname, oldSoundPath);
        fs.unlink(fullSoundPath, (err) => {
          if (err) console.warn('Failed to delete old sound:', fullSoundPath);
          else console.log('Deleted old sound:', fullSoundPath);
        });
      }
      const newSound = req.files['newSound'][0];
      question.soundPath = `uploads/${newSound.filename}`;
      soundFilename = newSound.originalname;
    }

    // Delete old image if new one is uploaded
    if (req.files['newImage']?.[0]) {
      if (oldImagePath) {
        const fullImagePath = path.join(__dirname, oldImagePath);
        fs.unlink(fullImagePath, (err) => {
          if (err) console.warn('Failed to delete old image:', fullImagePath);
          else console.log('Deleted old image:', fullImagePath);
        });
      }
      const newImage = req.files['newImage'][0];
      question.imagePath = `uploads/${newImage.filename}`;
      imageFilename = newImage.originalname;
    }

    await quiz.save();
    res.status(200).send("Frage erfolgreich aktualisiert.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Serverfehler beim Bearbeiten der Frage.");
  }
});


app.post('/api/quiz/:quizName/add-question', async (req, res) => {
    const { quizType, quizAge, quizLanguage, questionText, answers, correctIndex } = req.body;
    const quizName = req.params.quizName;

    const quiz = await Quiz.findOne({ quizName, quizType, quizAge, quizLanguage });
    if (!quiz) return res.status(404).send("Quiz nicht gefunden.");

    quiz.questions.push({ questionText, answers, correctIndex });
    await quiz.save();

    res.sendStatus(200);
});



// find all active quizzes
app.get('/api/quizzes/active', async (req, res) => {
  try {
    const activeQuizzes = await Quiz.find({ isActive: true });
    res.send(activeQuizzes);
  } catch (err) {
    console.error('Error fetching active quizzes:', err);
    res.status(500).send('Server error');
  }
});


// route to save the active quiz type to mongo
const quizType = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: String,
});
const CurrQuizType = mongoose.model('quizType', quizType);


// save current active quiz
app.post('/api/curr-quiz-type/save-quiz-type', async (req, res) => {
  const { quizType } = req.body;
  if (!quizType) return res.status(400).send("quizType required");

  try {
    await CurrQuizType.findOneAndUpdate(
      { key: 'selectedQuizType' },
      { value: quizType },
      { upsert: true, new: true }
    );
    res.send("Quiz type saved to MongoDB");
  } catch (err) {
    console.error("Failed to save quizType:", err);
    res.status(500).send("Server error");
  }
});

// get current active quiz
app.get('/api/curr-quiz-type/quiz-type', async (req, res) => {
  try {
    const state = await CurrQuizType.findOne({ key: 'selectedQuizType' });
    if (!state) return res.status(404).send("No quiz type set");
    res.json({ quizType: state.value });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// get quiz by parameters
app.get('/api/quiz/by-params', async (req, res) => {
  const { quizType, quizAge, quizLanguage } = req.query;

  if (!quizType || !quizLanguage) {
    return res.status(400).send('quizType and quizLanguage are required');
  }

  const query = {
    quizType,
    quizLanguage,
    isActive: true
  };

  // Only add quizAge if provided
  if (quizAge !== null && quizAge !== undefined && quizAge !== '') {
    query.quizAge = quizAge;
  }

  try {
    const quiz = await Quiz.findOne(query);
    if (!quiz) return res.status(404).send('No active quiz found for given parameters');
    res.json(quiz);
  } catch (err) {
    console.error('Error fetching quiz by parameters:', err);
    res.status(500).send('Server error');
  }
});



app.listen(3000, () => console.log('Server running on http://localhost:3000'));

