// Minimal front-end logic for Grammar Quiz
document.addEventListener('DOMContentLoaded', function() {
	const btnSubmitCheck = document.getElementById('btnSubmitCheck');
	const quizFormSection = document.getElementById('quizFormSection');
	const gptResponseSection = document.getElementById('gptResponseSection');
	const gptResponseContent = document.getElementById('gptResponseContent');
	const chatMessages = document.getElementById('chatMessages');
	const chatForm = document.getElementById('chatForm');
	const chatInput = document.getElementById('chatInput');

	let quizData = null;
	let conversationHistory = [];

	// Get answers from form
	function getAnswers() {
		const answers = {};
		const inputs = document.querySelectorAll('[name^="answer_"]');
		inputs.forEach(input => {
			const questionId = input.name.replace('answer_', '');
			answers[questionId] = input.value.trim();
		});
		return answers;
	}

	// Get questions data for GPT prompt
	function getQuestionsData() {
		const questions = [];
		const questionElements = document.querySelectorAll('[name^="answer_"]');
		questionElements.forEach((input, index) => {
			const questionId = input.name.replace('answer_', '');
			const questionCard = input.closest('.bg-white');
			const title = questionCard.querySelector('h2').textContent;
			const englishExample = questionCard.querySelector('.text-dark').textContent;
			const koreanAnswer = input.value.trim();
			
			questions.push({
				id: questionId,
				title: title,
				englishExample: englishExample,
				koreanAnswer: koreanAnswer
			});
		});
		return questions;
	}

	// Submit quiz and get GPT feedback
	btnSubmitCheck.addEventListener('click', async function() {
		const answers = getAnswers();
		const questionCount = document.querySelectorAll('[name^="answer_"]').length;
		const answeredCount = Object.keys(answers).filter(key => answers[key] && answers[key].length > 0).length;

		if (answeredCount < questionCount) {
			alert('Please answer all questions before submitting.');
			return;
		}

		// Disable button and show loading
		btnSubmitCheck.disabled = true;
		
		// Preserve button size so it doesn't shrink during loading
		const btnWidth = btnSubmitCheck.offsetWidth;
		const btnHeight = btnSubmitCheck.offsetHeight;
		btnSubmitCheck.style.width = btnWidth + 'px';
		btnSubmitCheck.style.height = btnHeight + 'px';
		
		btnSubmitCheck.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><div class="loader-container" style="--uib-size: 48px; --uib-color: #ffffff; --uib-speed: 2.2s"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div></div>';
		btnSubmitCheck.className = 'btn-primary custom-text-white px-8 py-3 rounded-lg font-semibold shadow-sm transition-colors cursor-not-allowed';

		try {
			// First submit the quiz to mark it as completed
			const submitRes = await fetch('/quiz/grammar/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ answers })
			});

			if (!submitRes.ok) {
				throw new Error('Failed to submit quiz');
			}

			// Get questions data for GPT prompt
			quizData = getQuestionsData();

			// Get GPT feedback
			const gptRes = await fetch('/api/grammar/check-answers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					questions: quizData,
					conversationHistory: conversationHistory
				})
			});

			if (!gptRes.ok) {
				throw new Error('Failed to get AI feedback');
			}

			const gptData = await gptRes.json();
			
			// Display GPT response
			displayGPTResponse(gptData.feedback);
			
			// Switch to chatbot interface
			showChatInterface();

		} catch (err) {
			console.error(err);
			alert('Error: ' + err.message);
			// Re-enable button and restore size
			btnSubmitCheck.disabled = false;
			btnSubmitCheck.innerHTML = 'Submit & Check';
			btnSubmitCheck.className = 'btn-primary custom-text-white px-8 py-3 rounded-lg font-semibold shadow-sm transition-colors';
			btnSubmitCheck.style.width = '';
			btnSubmitCheck.style.height = '';
		}
	});

	// Display GPT response
	function displayGPTResponse(feedback) {
		if (gptResponseContent) {
			gptResponseContent.innerHTML = `
				<div class="space-y-4">
					<div class="text-gray-700 leading-relaxed">
						${feedback.split('\n').map(line => 
							line.trim() ? `<p class="mb-2">${line}</p>` : ''
						).join('')}
					</div>
				</div>
			`;
		}
	}

	// Show chatbot interface
	function showChatInterface() {
		// Don't hide the quiz form - keep it visible for reference
		// Just show the GPT response section below it
		gptResponseSection.classList.remove('hidden');
		
		// Update button to show completion state
		btnSubmitCheck.disabled = false;
		btnSubmitCheck.innerHTML = 'Done';
		btnSubmitCheck.className = 'bg-green-400 hover:bg-green-500 custom-text-white px-8 py-3 rounded-lg font-semibold shadow-sm transition-colors';
		btnSubmitCheck.style.width = '';
		btnSubmitCheck.style.height = '';
		
		// Scroll to show the GPT response section
		gptResponseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// Handle chat form submission
	chatForm.addEventListener('submit', async function(e) {
		e.preventDefault();
		
		const message = chatInput.value.trim();
		if (!message) return;

		// Add user message to chat
		addChatMessage('user', message);
		chatInput.value = '';

		// Show typing indicator with mirage loader
		const typingId = addChatMessage('assistant', '', true);

		try {
			// Send to GPT for response
			const response = await fetch('/api/grammar/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: message,
					quizData: quizData,
					conversationHistory: conversationHistory
				})
			});

			if (!response.ok) {
				throw new Error('Failed to get AI response');
			}

			const data = await response.json();
			
			// Remove typing indicator and add real response
			removeChatMessage(typingId);
			addChatMessage('assistant', data.response);

		} catch (err) {
			console.error(err);
			removeChatMessage(typingId);
			addChatMessage('assistant', 'Sorry, I encountered an error. Please try again.');
		}
	});

	// Add chat message
	function addChatMessage(role, content, isTyping = false) {
		const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
		const messageDiv = document.createElement('div');
		messageDiv.id = messageId;
		messageDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
		
		const messageContent = document.createElement('div');
		messageContent.className = `max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
			role === 'user' 
				? 'bg-primary text-white' 
				: 'bg-gray-100 text-dark'
		}`;
		
		if (isTyping) {
			messageContent.innerHTML = `
				<div class="flex items-center justify-center">
					<div class="loader-container" style="--uib-size: 40px; --uib-color: #6B7280; --uib-speed: 2.2s">
						<div class="loader-dot"></div>
						<div class="loader-dot"></div>
						<div class="loader-dot"></div>
						<div class="loader-dot"></div>
						<div class="loader-dot"></div>
					</div>
				</div>
			`;
		} else {
			messageContent.textContent = content;
		}
		
		messageDiv.appendChild(messageContent);
		chatMessages.appendChild(messageDiv);
		
		// Scroll to bottom
		chatMessages.scrollTop = chatMessages.scrollHeight;
		
		// Add to conversation history if not typing
		if (!isTyping) {
			conversationHistory.push({ role, content });
		}
		
		return messageId;
	}

	// Remove chat message (for typing indicators)
	function removeChatMessage(messageId) {
		const message = document.getElementById(messageId);
		if (message) {
			message.remove();
		}
	}
});
