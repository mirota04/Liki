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

  const grammarSection = document.getElementById('grammarSection');
  const grammarQuestionsEl = document.getElementById('grammarQuestions');
  const btnSubmitGrammar = document.getElementById('btnSubmitGrammar');
  const grammarResultsEl = document.getElementById('grammarResults');

  // Use server-provided questions or fallback
  const questions = (window.mixedQuestions && window.mixedQuestions.length)
    ? window.mixedQuestions
    : [];

  const total = questions.length;
  let current = 0;
  const answers = new Map(); // id -> { given, correct, checked }
  
  // Load saved progress from localStorage
  const quizId = `mixed_quiz_${questions.map(q => q.id).join('_')}`;
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

  console.log('Mixed Quiz JS Initialization:', {
    questions,
    total,
    windowMixedQuestions: window.mixedQuestions,
    windowGrammarBlock: window.grammarBlock
  });

  totalCountEl.textContent = String(total + 1); // +1 for grammar section

  function renderDots() {
    dotsEl.innerHTML = '';
    const totalDots = total + 1; // +1 for grammar section
    
    for (let i = 0; i < totalDots; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold';

      if (i === current) {
        dot.classList.add('bg-primary', 'text-white');
      } else if (i < total) {
        const state = answers.get(questions[i].id);
        if (state && state.checked) {
          if (state.correct) {
            dot.classList.add('bg-green-500', 'text-white');
          } else {
            dot.classList.add('bg-red-500', 'text-white');
          }
        } else {
          dot.classList.add('bg-gray-300', 'text-dark');
        }
      } else {
        // Grammar section dot
        dot.classList.add('bg-gray-300', 'text-dark');
      }

      dot.textContent = String(i + 1);
      dot.addEventListener('click', () => {
        if (i < total) {
          current = i;
          renderQuestion();
        } else {
          showGrammarPage();
        }
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
    // Hide grammar section, show question card
    grammarSection.classList.add('hidden');
    document.getElementById('questionCard').classList.remove('hidden');
    
    if (total === 0) {
      qPromptEl.textContent = 'No vocabulary words available.';
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
    
    // Update Next button text for last question
    if (current === total - 1) {
      btnNext.textContent = 'Grammar Page';
      btnNext.className = 'px-5 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors';
    } else {
      btnNext.textContent = 'Next';
      btnNext.className = 'px-5 py-3 rounded-lg btn-primary custom-text-white font-medium';
    }

    renderDots();
    renderProgress();
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
        feedbackEl.textContent = 'Correct!';
        feedbackEl.className = 'text-sm font-medium text-green-600';
      } else {
        // Show the correct answer when wrong
        const correctAnswer = q.answer;
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

  btnNext.addEventListener('click', () => {
    if (current < total - 1) {
      // Navigate to next question
      current += 1;
      renderQuestion();
      saveProgress();
    } else {
      // Show grammar page
      showGrammarPage();
      saveProgress();
    }
  });

  function showGrammarPage() {
    // Hide question card, show grammar section
    document.getElementById('questionCard').classList.add('hidden');
    grammarSection.classList.remove('hidden');
    
    currentIndexEl.textContent = String(total + 1);
    current = total; // Set current to grammar section index
    
    // Populate grammar questions
    const gb = window.grammarBlock || { questions: [] };
    grammarQuestionsEl.innerHTML = '';
    
    gb.questions.forEach((gq, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'p-4 border border-gray-100 rounded-lg';
      wrapper.innerHTML = `
        <div class="text-sm text-warm mb-1">Rule ${idx + 1}</div>
        <div class="font-semibold mb-2 text-dark">${gq.title}</div>
        <div class="text-sm text-warm mb-3">English Example: <span class="text-dark">${gq.englishExample || 'No example available'}</span></div>
        <input type="text" data-id="${gq.id}" data-rule-title="${gq.title}" data-english-example="${gq.englishExample || ''}" placeholder="Write a Korean sentence..." class="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30" />
      `;
      grammarQuestionsEl.appendChild(wrapper);
    });

    renderDots();
    saveProgress();
  }

  // Submit & check for grammar page
  btnSubmitGrammar.addEventListener('click', async () => {
    try {
      // Disable button during submission
      btnSubmitGrammar.disabled = true;
      btnSubmitGrammar.textContent = 'Submitting...';
      
      // Collect all vocabulary answers
      const vocabAnswers = {};
      questions.forEach((q, index) => {
        const state = answers.get(q.id);
        if (state && state.checked && state.correct) {
          vocabAnswers[`answer_${q.id}`] = state.given;
        }
      });
      
      // Collect grammar answers for OpenAI evaluation
      const grammarAnswers = [];
      const grammarInputs = grammarQuestionsEl.querySelectorAll('input[data-id]');
      grammarInputs.forEach((input) => {
        const ruleId = input.getAttribute('data-id');
        const ruleTitle = input.getAttribute('data-rule-title');
        const englishExample = input.getAttribute('data-english-example');
        const koreanAnswer = input.value.trim();
        
        if (koreanAnswer) {
          grammarAnswers.push({
            ruleId,
            ruleTitle,
            englishExample,
            koreanAnswer
          });
        }
      });
      
      // First submit mixed quiz completion
      const response = await fetch('/quiz/mixed/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: vocabAnswers })
      });
      
      if (!response.ok) throw new Error('Failed to submit mixed quiz');
      
      // Now evaluate grammar with OpenAI
      if (grammarAnswers.length > 0) {
        btnSubmitGrammar.textContent = 'Evaluating with AI...';
        
        const grammarResponse = await fetch('/api/grammar/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            answers: grammarAnswers,
            maxTokens: 10000 // Higher token limit for mixed quiz
          })
        });
        
        if (!grammarResponse.ok) throw new Error('Failed to evaluate grammar');
        
        const evaluationResult = await grammarResponse.json();
        
        // Display grammar evaluation results
        grammarResultsEl.innerHTML = `
          <div class="space-y-6">
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="flex items-center">
                <i class="ri-check-line text-green-500 text-xl mr-2"></i>
                <span class="text-green-800 font-medium">Mixed Quiz Completed!</span>
              </div>
              <p class="text-green-700 mt-2">Great job! You've completed today's mixed quiz.</p>
            </div>
            
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 class="text-lg font-semibold text-blue-800 mb-3">Grammar Evaluation Results</h3>
              <div class="space-y-4">
                ${evaluationResult.evaluations.map((eval, index) => `
                  <div class="border border-blue-200 rounded-lg p-3 bg-white">
                    <h4 class="font-semibold text-blue-900 mb-2">${eval.ruleTitle}</h4>
                    <div class="text-sm text-blue-800 mb-2">
                      <strong>English Example:</strong> ${eval.englishExample}
                    </div>
                    <div class="text-sm text-blue-800 mb-2">
                      <strong>Your Answer:</strong> ${eval.koreanAnswer}
                    </div>
                    <div class="text-sm text-blue-700 whitespace-pre-line">
                      ${eval.evaluation}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="flex justify-center">
              <a href="/home" class="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Return to Home
              </a>
            </div>
          </div>
        `;
      } else {
        // No grammar answers, just show completion
        grammarResultsEl.innerHTML = `
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center">
              <i class="ri-check-line text-green-500 text-xl mr-2"></i>
              <span class="text-green-800 font-medium">Mixed Quiz Completed!</span>
            </div>
            <p class="text-green-700 mt-2">Great job! You've completed today's mixed quiz.</p>
            <div class="mt-4">
              <a href="/home" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-800 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500">
                Return to Home
              </a>
            </div>
          </div>
        `;
      }
      
      // Change button to show completion
      btnSubmitGrammar.textContent = 'Completed!';
      btnSubmitGrammar.className = 'px-6 py-3 rounded-lg bg-green-500 text-white font-semibold cursor-default';
      
      // Clear saved progress since quiz is completed
      localStorage.removeItem(quizId);
      console.log('Quiz completed, progress cleared');
       
    } catch (err) {
      console.error('Error submitting mixed quiz:', err);
      grammarResultsEl.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-center">
            <i class="ri-error-warning-line text-red-500 text-xl mr-2"></i>
            <span class="text-red-800 font-medium">Submission Error</span>
          </div>
          <p class="text-red-700 mt-2">Failed to submit quiz. Please try again.</p>
        </div>
      `;
      
      // Re-enable button
      btnSubmitGrammar.disabled = false;
      btnSubmitGrammar.textContent = 'Submit & Check';
    }
  });

  // Initialize
  renderQuestion();
})();


