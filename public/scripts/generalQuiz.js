(() => {
  // Get URL parameters to determine quiz mode and direction
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'words';
  const direction = urlParams.get('direction') || 'en-ko';

  console.log('General Quiz initialized with:', { mode, direction });

  if (mode === 'words') {
    renderVocabularyQuiz();
  } else if (mode === 'grammar') {
    renderGrammarQuiz();
  }

  function renderVocabularyQuiz() {
    // Create vocabulary quiz interface identical to vocabularyQuiz.js
    const mainContent = document.querySelector('main');
    mainContent.innerHTML = `
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div class="mb-6">
          <h1 class="text-2xl sm:text-3xl font-bold text-dark">General Quiz - Words</h1>
          <p class="text-warm mt-1">Test your vocabulary knowledge with 100 random words</p>
        </div>

        <!-- Progress Card -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 class="text-sm text-dark font-medium mb-4">Progress</h2>
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-3">
              <div class="w-14 h-14 rounded-full border-4 border-gray-200 flex items-center justify-center">
                <span id="percentComplete" class="text-dark text-sm font-semibold">0%</span>
              </div>
            </div>
            <div class="flex-1">
              <div id="progressDots" class="flex flex-wrap items-center gap-2"></div>
              <div class="flex items-center gap-4 text-xs text-warm mt-2">
                <div class="flex items-center gap-2"><span class="inline-block w-2.5 h-2.5 rounded-full bg-green-500"></span>Answered</div>
                <div class="flex items-center gap-2"><span class="inline-block w-2.5 h-2.5 rounded-full bg-primary"></span>Current</div>
                <div class="flex items-center gap-2"><span class="inline-block w-2.5 h-2.5 rounded-full bg-gray-300"></span>Unanswered</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Question Card -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6" id="questionCard">
          <div class="flex items-center gap-3 mb-4">
            <div id="qNumber" class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">1</div>
            <h3 id="qTitle" class="text-dark font-medium">Question</h3>
          </div>
          <div id="qPrompt" class="mb-4 text-dark">Translate this word:</div>
          <form id="answerForm" class="space-y-4">
            <input id="answerInput" type="text" placeholder="Type your answer..." class="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors">
            <div id="answerFeedback" class="text-sm font-medium"></div>
            <div class="flex justify-center">
              <button id="btnSubmitAnswer" type="submit" class="btn-primary custom-text-white px-8 py-3 rounded-lg font-semibold shadow-sm transition-all duration-200">Submit Answer</button>
            </div>
          </form>
        </div>

        <!-- Nav Buttons -->
        <div class="flex items-center justify-between">
          <button id="btnPrev" class="px-5 py-3 rounded-lg bg-gray-100 text-dark font-medium disabled:opacity-50" disabled>
            <i class="ri-arrow-left-line mr-1"></i> Previous
          </button>
          <button id="btnNext" class="px-5 py-3 rounded-lg btn-primary custom-text-white font-medium">
            Next <i class="ri-arrow-right-line ml-1"></i>
          </button>
        </div>
      </div>
    `;

    // Initialize vocabulary quiz functionality
    initVocabularyQuiz();
  }

  function renderGrammarQuiz() {
    // Create grammar quiz interface identical to grammarQuiz.js
    const mainContent = document.querySelector('main');
    mainContent.innerHTML = `
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                 <div class="mb-6">
           <h1 class="text-2xl sm:text-3xl font-bold text-dark">General Quiz - Grammar</h1>
           <p class="text-warm mt-1">Test your grammar knowledge with 20 random rules</p>
         </div>

        <!-- Grammar Questions -->
        <div class="space-y-6" id="grammarQuestions">
          <!-- Questions will be populated here -->
        </div>

        <!-- Submit Button -->
        <div class="flex justify-center mt-8">
          <button id="btnSubmitGrammar" class="px-6 py-3 rounded-lg bg-primary text-white font-semibold">Submit & Check</button>
        </div>

        <!-- Results -->
        <div id="grammarResults" class="mt-6 space-y-4"></div>
      </div>
    `;

    // Initialize grammar quiz functionality
    initGrammarQuiz();
  }

  function initVocabularyQuiz() {
    const percentEl = document.getElementById('percentComplete');
    const dotsEl = document.getElementById('progressDots');
    const qNumberEl = document.getElementById('qNumber');
    const qTitleEl = document.getElementById('qTitle');
    const qPromptEl = document.getElementById('qPrompt');
    const answerForm = document.getElementById('answerForm');
    const answerInput = document.getElementById('answerInput');
    const feedbackEl = document.getElementById('answerFeedback');
    const btnSubmit = document.getElementById('btnSubmitAnswer');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');

    // Fetch 100 random words from the database
    let questions = [];
    let current = 0;
    const answers = new Map(); // id -> { given, correct, checked }

    async function fetchQuestions() {
      try {
        const response = await fetch(`/api/general/words?direction=${direction}&count=100`);
        if (!response.ok) throw new Error('Failed to fetch questions');
        const data = await response.json();
        questions = data.questions;
        console.log(`Fetched ${questions.length} questions for general vocabulary quiz`);
        renderQuestion();
        renderDots();
      } catch (err) {
        console.error('Error fetching questions:', err);
        feedbackEl.textContent = 'Error loading questions. Please try again.';
      }
    }

    function renderDots() {
      dotsEl.innerHTML = '';
      for (let i = 0; i < questions.length; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold';

        if (i === current) {
          dot.classList.add('bg-primary', 'text-white');
        } else {
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
      const pct = Math.round((answered / questions.length) * 100);
      percentEl.textContent = `${pct}%`;
    }

    function renderQuestion() {
      if (questions.length === 0) {
        qPromptEl.textContent = 'No questions available.';
        answerInput.disabled = true;
        btnSubmit.disabled = true;
        return;
      }

      const q = questions[current];
      qNumberEl.textContent = String(current + 1);
      qTitleEl.textContent = `Question ${current + 1}`;
      qPromptEl.textContent = q.prompt || 'Translate:';

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
      if (current === questions.length - 1) {
        btnNext.textContent = 'Finish';
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
            direction: direction
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
      }
    });

    btnNext.addEventListener('click', () => {
      if (current < questions.length - 1) {
        current += 1;
        renderQuestion();
      } else {
        // Finish quiz
        finishVocabularyQuiz();
      }
    });

    function finishVocabularyQuiz() {
      const correctCount = Array.from(answers.values()).filter(v => v.correct).length;
      const totalCount = questions.length;
      const percentage = Math.round((correctCount / totalCount) * 100);

      const mainContent = document.querySelector('main');
      mainContent.innerHTML = `
        <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div class="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="ri-check-line text-green-600 text-2xl"></i>
            </div>
            <h1 class="text-2xl font-bold text-green-800 mb-2">Quiz Completed!</h1>
            <p class="text-green-700 mb-4">Great job! You've completed the general vocabulary quiz.</p>
            <div class="text-3xl font-bold text-green-600 mb-4">${correctCount}/${totalCount} (${percentage}%)</div>
            <a href="/home" class="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
              Return to Home
            </a>
          </div>
        </div>
      `;
    }

    // Start the quiz
    fetchQuestions();
  }

  function initGrammarQuiz() {
    const grammarQuestionsEl = document.getElementById('grammarQuestions');
    const btnSubmitGrammar = document.getElementById('btnSubmitGrammar');
    const grammarResultsEl = document.getElementById('grammarResults');

         // Fetch 20 random grammar rules from the database
     let grammarQuestions = [];
 
     async function fetchGrammarQuestions() {
       try {
         const response = await fetch('/api/general/grammar?count=20');
         if (!response.ok) throw new Error('Failed to fetch grammar questions');
         const data = await response.json();
         grammarQuestions = data.questions;
         console.log(`Fetched ${grammarQuestions.length} grammar questions for general grammar quiz`);
         renderGrammarQuestions();
       } catch (err) {
         console.error('Error fetching grammar questions:', err);
         grammarQuestionsEl.innerHTML = '<div class="text-red-600">Error loading grammar questions. Please try again.</div>';
       }
     }

    function renderGrammarQuestions() {
      grammarQuestionsEl.innerHTML = '';
      
      grammarQuestions.forEach((rule, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'p-6 border border-gray-100 rounded-xl bg-white';
        wrapper.innerHTML = `
          <div class="text-sm text-warm mb-2">Grammar Rule ${idx + 1}</div>
          <div class="font-semibold text-lg mb-3 text-dark">${rule.title}</div>
          <div class="text-sm text-warm mb-3">English Example: <span class="text-dark">${rule.englishExample || 'No example available'}</span></div>
          <input type="text" data-id="${rule.id}" data-rule-title="${rule.title}" data-english-example="${rule.englishExample || ''}" placeholder="Write a Korean sentence using this grammar rule..." class="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        `;
        grammarQuestionsEl.appendChild(wrapper);
      });
    }

    btnSubmitGrammar.addEventListener('click', async () => {
      try {
        // Disable button during submission
        btnSubmitGrammar.disabled = true;
        btnSubmitGrammar.textContent = 'Evaluating with AI...';

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

                 // Evaluate grammar with OpenAI (no token limit for 20 grammar rules)
         if (grammarAnswers.length > 0) {
           const grammarResponse = await fetch('/api/grammar/evaluate', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
               answers: grammarAnswers,
               maxTokens: 30000 // Higher token limit for 20 grammar rules
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
                  <span class="text-green-800 font-medium">Grammar Quiz Completed!</span>
                </div>
                <p class="text-green-700 mt-2">Great job! You've completed the general grammar quiz.</p>
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
          // No grammar answers
          grammarResultsEl.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="flex items-center">
                <i class="ri-check-line text-green-500 text-xl mr-2"></i>
                <span class="text-green-800 font-medium">Grammar Quiz Completed!</span>
              </div>
              <p class="text-green-700 mt-2">Great job! You've completed the general grammar quiz.</p>
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

      } catch (err) {
        console.error('Error submitting grammar quiz:', err);
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

    // Start the grammar quiz
    fetchGrammarQuestions();
  }
})();
