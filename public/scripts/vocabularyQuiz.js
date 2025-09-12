(() => {
  const percentEl = document.getElementById('percentComplete');
  const dotsEl = document.getElementById('progressDots');
  const currentIndexEl = document.getElementById('currentIndex');
  const totalCountEl = document.getElementById('totalCount');
  const qNumberEl = document.getElementById('qNumber');
  const qTitleEl = document.getElementById('qTitle');
  const qPromptEl = document.getElementById('qPrompt');
  const answerForm = document.getElementById('answerForm');
  const answerInput = document.getElementById('answerInput');
  const feedbackEl = document.getElementById('answerFeedback');
  const btnSubmit = document.getElementById('btnSubmitAnswer');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');

  // Use server-provided questions or fallback
  const questions = (window.vocabQuestions && window.vocabQuestions.length)
    ? window.vocabQuestions
    : [];

  const total = questions.length;
  let current = 0;
  const answers = new Map(); // id -> { given, correct, checked }
  
  // Load saved progress from localStorage
  const quizId = `vocab_quiz_${questions.map(q => q.id).join('_')}`;
  const savedProgress = localStorage.getItem(quizId);
  if (savedProgress) {
    try {
      const parsed = JSON.parse(savedProgress);
      current = parsed.current || 0;
      if (parsed.answers) {
        parsed.answers.forEach(([id, data]) => {
          answers.set(id, data);
        });
      }
      console.log('Loaded saved progress:', { current, answers: Array.from(answers.entries()) });
    } catch (err) {
      console.error('Error loading saved progress:', err);
    }
  }

  totalCountEl.textContent = String(total);

  function renderDots() {
    dotsEl.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold';

      const state = answers.get(questions[i].id);
      if (i === current) {
        dot.classList.add('bg-primary', 'text-white');
      } else if (state && state.checked) {
        if (state.correct) {
          dot.classList.add('bg-green-500', 'text-white');
        } else {
          dot.classList.add('bg-red-500', 'text-white');
        }
      } else {
        dot.classList.add('bg-gray-200', 'text-dark');
      }

      dot.textContent = String(i + 1);
      dot.addEventListener('click', () => {
        current = i;
        renderQuestion();
      });
      dotsEl.appendChild(dot);
    }
  }

  function renderProgress() {
    const answered = Array.from(answers.values()).filter(v => v.checked).length;
    const pct = Math.round((answered / total) * 100);
    percentEl.textContent = `${pct}%`;
  }
  
  function saveProgress() {
    try {
      const progressData = {
        current,
        answers: Array.from(answers.entries()),
        timestamp: Date.now()
      };
      localStorage.setItem(quizId, JSON.stringify(progressData));
      console.log('Progress saved:', progressData);
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  }

  function renderQuestion() {
    if (total === 0) {
      // No questions available
      qPromptEl.textContent = 'No vocabulary words available from the last 3 successful days (days with >1 hour of study time).';
      answerInput.disabled = true;
      btnSubmit.disabled = true;
      return;
    }

    currentIndexEl.textContent = String(current + 1);
    const q = questions[current];
    qNumberEl.textContent = String(current + 1);
    qTitleEl.textContent = `Question ${current + 1}`;
    qPromptEl.textContent = q.prompt || '';
    qPromptEl.className = 'mb-4 text-primary text-xl font-semibold';

    const state = answers.get(q.id);
    answerInput.value = state?.given || '';
    answerInput.disabled = false;
    btnSubmit.disabled = false;
    
    // Reset button and input styles to default
    btnSubmit.textContent = 'Submit Answer';
    btnSubmit.className = 'btn-primary custom-text-white px-8 py-3 rounded-lg font-semibold shadow-sm transition-all duration-200';
    answerInput.className = 'w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors';
    
    if (state && state.checked) {
      if (state.correct) {
        feedbackEl.textContent = 'Correct!';
        feedbackEl.className = 'text-sm font-medium text-green-600';
        btnSubmit.textContent = 'Correct!';
        btnSubmit.className = 'bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold shadow-sm transition-all duration-200';
        answerInput.className = 'w-full border-2 border-green-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-300 transition-colors';
      } else {
        // Show the correct answer when wrong
        const correctAnswer = q.answer;
        feedbackEl.textContent = `Correct answer: ${correctAnswer}`;
        feedbackEl.className = 'text-sm font-medium text-red-600';
        btnSubmit.textContent = 'Incorrect';
        btnSubmit.className = 'bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-semibold shadow-sm transition-all duration-200';
        answerInput.className = 'w-full border-2 border-red-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors';
      }
    } else {
      feedbackEl.textContent = '';
      feedbackEl.className = 'text-sm font-medium';
    }

    btnPrev.disabled = current === 0;
    btnNext.disabled = current === total - 1;
    
    // Update Next button text for last question
    if (current === total - 1) {
      btnNext.textContent = 'Finish';
      btnNext.className = 'px-5 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors';
      btnNext.disabled = false; // Ensure it's enabled
      console.log('Last question - Finish button enabled');
    } else {
      btnNext.textContent = 'Next';
      btnNext.className = 'px-5 py-3 rounded-lg btn-primary custom-text-white font-medium';
      btnNext.disabled = false;
    }

    renderDots();
    renderProgress();
  }

  // Enter key: submit first, then after evaluation advance to next
  if (answerInput) {
    answerInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const q = questions[current];
      const state = q ? answers.get(q.id) : null;
      if (state && state.checked) {
        // Already evaluated: go to next
        e.preventDefault();
        if (!btnNext.disabled) btnNext.click();
      }
      // else allow normal form submission
    });
  }

  answerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = questions[current];
    const given = (answerInput.value || '').trim();
    if (!given) return;

    // Disable input and button during check
    answerInput.disabled = true;
    btnSubmit.disabled = true;

    try {
      // Check answer with backend
      const response = await fetch('/api/vocabulary/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId: q.id,
          userAnswer: given,
          direction: q.direction || 'en-ko'
        })
      });

      if (!response.ok) throw new Error('Failed to check answer');

      const result = await response.json();
      const correct = result.correct;

      // Store answer state
      answers.set(q.id, { 
        given, 
        correct, 
        checked: true 
      });

      // Show feedback and update button/input styles
      if (correct) {
        const correctAnswer = q.answer;
        feedbackEl.textContent = `Correct! Answer: ${correctAnswer}`;
        feedbackEl.className = 'text-sm font-medium text-green-600';
      } else {
        // Show the correct answer when wrong
        const correctAnswer = q.direction === 'ko-en' ? q.answer : q.answer;
        feedbackEl.textContent = `Correct answer: ${correctAnswer}`;
        feedbackEl.className = 'text-sm font-medium text-red-600';
      }
      
      // Update button appearance
      if (correct) {
        btnSubmit.textContent = 'Correct!';
        btnSubmit.className = 'bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold shadow-sm transition-all duration-200';
      } else {
        btnSubmit.textContent = 'Incorrect';
        btnSubmit.className = 'bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-semibold shadow-sm transition-all duration-200';
      }
      
      // Update input border color
      if (correct) {
        answerInput.className = 'w-full border-2 border-green-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-300 transition-colors';
      } else {
        answerInput.className = 'w-full border-2 border-red-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors';
      }

      // Re-enable input and button
      answerInput.disabled = false;
      btnSubmit.disabled = false;

      renderDots();
      renderProgress();
      saveProgress();

    } catch (err) {
      console.error('Error checking answer:', err);
      feedbackEl.textContent = 'Error checking answer';
      feedbackEl.className = 'text-sm font-medium text-red-600';
      
      // Re-enable input and button
      answerInput.disabled = false;
      btnSubmit.disabled = false;
    }
  });

  btnPrev.addEventListener('click', () => {
    if (current > 0) {
      current -= 1;
      renderQuestion();
      saveProgress();
    }
  });

  btnNext.addEventListener('click', async () => {
    if (current < total - 1) {
      // Navigate to next question
      current += 1;
      renderQuestion();
      saveProgress();
    } else {
      // Finish quiz - mark correct answers as asked and redirect to home
      console.log('Finish button clicked! Starting quiz completion...');
      try {
        // Get all correctly answered questions
        const correctAnswers = [];
        console.log('Current answers map:', answers);
        
        for (const [questionId, answerState] of answers.entries()) {
          console.log(`Question ${questionId}:`, answerState);
          if (answerState.checked && answerState.correct) {
            correctAnswers.push(questionId);
          }
        }
        
        console.log('Correct answers to mark as asked:', correctAnswers);
        
        // Mark correct answers as asked = true
        if (correctAnswers.length > 0) {
          console.log('Marking correct answers as asked...');
          const response = await fetch('/api/vocabulary/mark-correct-as-asked', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wordIds: correctAnswers })
          });
          
          if (!response.ok) {
            console.error('Failed to mark words as asked:', response.status);
          } else {
            const result = await response.json();
            console.log('Marked words as asked result:', result);
          }
        }
        
        // Mark quiz as completed for today
        console.log('Marking quiz as completed...');
        
        const submitResponse = await fetch('/quiz/vocabulary/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Send empty answers so backend only records completion date
          // and does not change asked flags (already set above for correct ones)
          body: JSON.stringify({ answers: {} })
        });
        
        if (!submitResponse.ok) {
          console.error('Failed to mark quiz as completed:', submitResponse.status);
        } else {
          console.log('Quiz marked as completed successfully');
        }
       
        // Clear saved progress since quiz is completed
        localStorage.removeItem(quizId);
        console.log('Quiz completed, progress cleared');
        
        // Redirect to home page
        console.log('Redirecting to home page...');
        window.location.href = '/home';
        
      } catch (err) {
        console.error('Error finishing quiz:', err);
        // Still redirect to home even if there's an error
        console.log('Redirecting to home despite error...');
        window.location.href = '/home';
      }
    }
  });

  renderQuestion();
})();


