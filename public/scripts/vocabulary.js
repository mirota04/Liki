// Vocabulary page interactions
document.addEventListener('DOMContentLoaded', function() {
	const searchInput = document.getElementById('searchInput');
	const searchBtn = document.getElementById('searchBtn');
	const searchResult = document.getElementById('searchResult');
	const emptySearchState = document.getElementById('emptySearchState');
	const addToDictionaryBtn = document.getElementById('addToDictionary');
	const dictionaryList = document.getElementById('dictionaryList');
	const emptyDictionary = document.getElementById('emptyDictionary');
	const floatingAddBtn = document.querySelector('.floating-btn');
	const addWordModal = document.getElementById('addWordModal');
	const closeModalBtn = document.getElementById('closeModal');
	const cancelBtn = document.getElementById('cancelBtn');
	const addWordForm = document.getElementById('addWordForm');
	const koreanWordInput = document.getElementById('koreanWord');
	const englishMeaningInput = document.getElementById('meaning');
	const georgianInput = document.getElementById('georgianTranslation');
	
	// View All Modal elements
	const viewAllBtn = document.getElementById('viewAllBtn');
	const viewAllModal = document.getElementById('viewAllModal');
	const closeViewAllModalBtn = document.getElementById('closeViewAllModal');
	const dictionarySearchInput = document.getElementById('dictionarySearchInput');
	const dictionaryWordsList = document.getElementById('dictionaryWordsList');

	// Debug: Check if all elements are found
	console.log('Elements found:', {
		addWordForm: !!addWordForm,
		koreanWordInput: !!koreanWordInput,
		englishMeaningInput: !!englishMeaningInput,
		georgianInput: !!georgianInput
	});

	const sampleWords = {
		'안녕하세요': { korean: '안녕하세요', meaning: 'Hello, good day (formal greeting)', example: '안녕하세요, 만나서 반갑습니다.', exampleTranslation: 'Hello, nice to meet you.' },
		'감사합니다': { korean: '감사합니다', meaning: 'Thank you (formal)', example: '도움을 주셔서 감사합니다.', exampleTranslation: 'Thank you for your help.' },
		'사랑해요': { korean: '사랑해요', meaning: 'I love you', example: '당신을 사랑해요.', exampleTranslation: 'I love you.' },
		'학교': { korean: '학교', meaning: 'School', example: '학교에 가요.', exampleTranslation: 'I go to school.' },
		'친구': { korean: '친구', meaning: 'Friend', example: '좋은 친구가 있어요.', exampleTranslation: 'I have a good friend.' }
	};

	async function performSearch() {
		const query = searchInput.value.trim();
		if (!query) return;

		// Preserve button size so it doesn't shrink during loading
		const btnWidth = searchBtn.offsetWidth;
		const btnHeight = searchBtn.offsetHeight;
		searchBtn.style.width = btnWidth + 'px';
		searchBtn.style.height = btnHeight + 'px';
		searchBtn.disabled = true;

		try {
			// Show CSS mirage loader centered, keep size
			searchBtn.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><div class="loader-container" style="--uib-size: 28px; --uib-color: #ffffff; --uib-speed: 2.2s"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div></div>';
			const resp = await fetch(`/api/translate?word=${encodeURIComponent(query)}`);
			const data = await resp.json();
			if (data && !data.error) {
				updateSearchResultFromApi(data);
				searchResult.classList.remove('hidden');
				emptySearchState.classList.add('hidden');
			} else {
				showNoResults();
			}
		} catch (e) {
			console.error(e);
			showNoResults();
		} finally {
			searchBtn.disabled = false;
			searchBtn.innerHTML = '<span class="search-text">Search</span><i class="ri-loader-4-line loading-spinner hidden"></i>';
			searchBtn.style.width = '';
			searchBtn.style.height = '';
		}
	}

	function updateSearchResult(result) {
		const koreanText = searchResult.querySelector('.korean-text');
		const meaningText = searchResult.querySelector('.meaning-text');
		const exampleKorean = searchResult.querySelector('.example-text .korean-text');
		const exampleMeaning = searchResult.querySelector('.example-text .meaning-text');

		koreanText.textContent = result.korean;
		meaningText.textContent = result.meaning;
		exampleKorean.textContent = result.example;
		exampleMeaning.textContent = result.exampleTranslation;
	}

	function updateSearchResultFromApi(apiData) {
		const koreanText = searchResult.querySelector('.korean-text');
		const meaningText = searchResult.querySelector('.meaning-text');
		const exampleKorean = searchResult.querySelector('.example-text .korean-text');
		const exampleMeaning = searchResult.querySelector('.example-text .meaning-text');

		koreanText.textContent = apiData.koreanWord || '';
		meaningText.textContent = apiData.englishWord || '';
		exampleKorean.textContent = apiData.koreanDef || '';
		exampleMeaning.textContent = apiData.englishExplanation || '';
	}

	function showNoResults() {
		searchResult.classList.add('hidden');
		emptySearchState.innerHTML = `
			<div class="w-16 h-16 flex items-center justify-center bg-red-50 rounded-full mx-auto mb-4">
				<i class="ri-search-line text-red-400 ri-2x"></i>
			</div>
			<h3 class="text-lg font-semibold text-dark mb-2">No Results Found</h3>
			<p class="text-warm">Sorry, we couldn't find "${searchInput.value}". Try searching for another Korean word.</p>
		`;
		emptySearchState.classList.remove('hidden');
	}

	function addWordToDictionary(korean, meaning) {
		const existingWords = dictionaryList.querySelectorAll('.dictionary-card');
		const wordExists = Array.from(existingWords).some(card => card.querySelector('.korean-text').textContent === korean);
		if (wordExists) {
			showNotification('Word already in dictionary!', 'warning');
			return;
		}

		const wordCard = document.createElement('div');
		wordCard.className = 'dictionary-card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3';
		wordCard.innerHTML = `
			<div class="flex-1">
				<div class="korean-text text-lg mb-1">${korean}</div>
				<div class="meaning-text text-sm">${meaning}</div>
			</div>
			<button class="remove-btn w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-full transition-colors" title="Remove">
				<i class="ri-close-line text-red-400 hover:text-red-600"></i>
			</button>
		`;

		const removeBtn = wordCard.querySelector('.remove-btn');
		removeBtn.addEventListener('click', function() {
			wordCard.remove();
			checkEmptyDictionary();
			showNotification('Word removed from dictionary', 'success');
			// Note: This addWordToDictionary is for local demo additions; real DB entries come via server
		});

		dictionaryList.appendChild(wordCard);
		emptyDictionary.classList.add('hidden');
		showNotification('Word added to dictionary!', 'success');
	}

	function checkEmptyDictionary() {
		const words = dictionaryList.querySelectorAll('.dictionary-card');
		if (words.length === 0) {
			emptyDictionary.classList.remove('hidden');
		}
	}

	function showNotification(message, type) {
		const notification = document.createElement('div');
		notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium transform translate-x-full transition-transform duration-300 ${type === 'success' ? 'bg-green-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`;
		notification.textContent = message;
		document.body.appendChild(notification);

		setTimeout(() => { notification.classList.remove('translate-x-full'); }, 100);
		setTimeout(() => {
			notification.classList.add('translate-x-full');
			setTimeout(() => notification.remove(), 300);
		}, 3000);
	}

	function openModal() {
		if (!addWordModal) return;
		addWordModal.classList.remove('hidden');
		koreanWordInput && koreanWordInput.focus();
	}

	function closeModal() {
		if (!addWordModal) return;
		addWordModal.classList.add('hidden');
	}

	// View All Modal functions
	function openViewAllModal() {
		if (!viewAllModal) return;
		viewAllModal.classList.remove('hidden');
		loadAllDictionaryWords();
		updateWordCounts(); // Update count when modal opens
	}

	function closeViewAllModal() {
		if (!viewAllModal) return;
		viewAllModal.classList.add('hidden');
		// Clear search
		if (dictionarySearchInput) dictionarySearchInput.value = '';
	}

	async function loadAllDictionaryWords() {
		try {
			const response = await fetch('/api/dictionary');
			const data = await response.json();
			
			if (data.success) {
				displayAllDictionaryWords(data.words);
			} else {
				showNotification('Failed to load dictionary', 'error');
			}
		} catch (error) {
			console.error('Error loading dictionary:', error);
			showNotification('Failed to load dictionary', 'error');
		}
	}

	function displayAllDictionaryWords(words) {
		if (!dictionaryWordsList) return;
		
		dictionaryWordsList.innerHTML = '';
		
		if (words.length === 0) {
			dictionaryWordsList.innerHTML = `
				<div class="text-center py-6 sm:py-8 text-gray-500 h-full flex flex-col items-center justify-center">
					<i class="ri-book-open-line text-3xl sm:text-4xl mb-2"></i>
					<p class="text-sm sm:text-base">No words in your dictionary yet</p>
				</div>
			`;
			return;
		}
		
		words.forEach(word => {
			const wordCard = document.createElement('div');
			wordCard.className = 'dictionary-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2 sm:mb-3 last:mb-0';
			wordCard.setAttribute('data-id', word.id);
			wordCard.innerHTML = `
				<div class="flex-1">
					<div class="korean-text text-base sm:text-lg mb-1">${word.word}</div>
					<div class="meaning-text text-xs sm:text-sm">${word.meaning}${word.meaning_geo ? ` (${word.meaning_geo})` : ''}</div>
					<div class="text-xs text-gray-400 mt-1">Added: ${new Date(word.created_at).toLocaleDateString()}</div>
				</div>
				<button class="remove-btn w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-red-50 rounded-full transition-colors self-end sm:self-auto" title="Remove">
					<i class="ri-close-line text-red-400 hover:text-red-600 text-sm sm:text-base"></i>
				</button>
			`;
			
			// Add remove functionality (frontend + backend)
			const removeBtn = wordCard.querySelector('.remove-btn');
			removeBtn.addEventListener('click', async function() {
				const id = wordCard.getAttribute('data-id');
				wordCard.remove();
				showNotification('Word removed from dictionary', 'success');
				try {
					await fetch(`/api/dictionary/${id}`, { method: 'DELETE' });
					// Update word counts after successful deletion
					updateWordCounts();
				} catch (e) {
					console.error('Failed to delete word from server:', e);
				}
				checkEmptyDictionary();
			});
			
			dictionaryWordsList.appendChild(wordCard);
		});
	}

	function searchDictionaryWords(searchTerm) {
		if (!dictionaryWordsList) return;
		
		const wordCards = dictionaryWordsList.querySelectorAll('.dictionary-card');
		const searchLower = searchTerm.toLowerCase();
		
		wordCards.forEach(card => {
			const koreanText = card.querySelector('.korean-text').textContent.toLowerCase();
			const meaningText = card.querySelector('.meaning-text').textContent.toLowerCase();
			
			const matches = koreanText.includes(searchLower) || meaningText.includes(searchLower);
			card.style.display = matches ? 'flex' : 'none';
		});
	}

	function handleFormSubmit(e) {
		e.preventDefault();
		const korean = koreanWordInput.value.trim();
		const meaning = englishMeaningInput.value.trim();
		const georgian = georgianInput.value.trim();

		// Clear any previous error highlighting
		koreanWordInput.classList.remove('border-red-500');
		englishMeaningInput.classList.remove('border-red-500');

		// Validate required fields
		if (!korean || !meaning) {
			// Highlight empty required fields
			if (!korean) koreanWordInput.classList.add('border-red-500');
			if (!meaning) englishMeaningInput.classList.add('border-red-500');
			
			showNotification('Please fill in both Korean word and English meaning', 'error');
			return;
		}

		// Validate that Korean word actually contains Korean characters
		const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
		if (!koreanRegex.test(korean)) {
			koreanWordInput.classList.add('border-red-500');
			showNotification('Korean word must contain Korean characters (한글)', 'error');
			return;
		}

		console.log('Form data to send:', { korean, meaning, georgian });

		// Send to backend
		fetch('/vocabulary', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				word: korean,
				meaning: meaning,
				meaning_geo: georgian
			})
		})
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				// Don't add to the page display - just close modal and clear inputs
				// The "My Dictionary" section should only show random words from DB
				koreanWordInput.value = '';
				englishMeaningInput.value = '';
				georgianInput.value = '';
				closeModal();
				showNotification('Word added to dictionary!', 'success');
				// Update word counts
				updateWordCounts();
			} else {
				showNotification(data.error || 'Failed to add word', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('Failed to add word to dictionary', 'error');
		});
	}

	// Event bindings
	searchBtn.addEventListener('click', performSearch);
	searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(); });
	if (addToDictionaryBtn) {
		addToDictionaryBtn.addEventListener('click', function() {
			const korean = searchResult.querySelector('.korean-text').textContent;
			const meaning = searchResult.querySelector('.meaning-text').textContent;
			
			// Validate that Korean word actually contains Korean characters
			const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
			if (!koreanRegex.test(korean)) {
				showNotification('Cannot add: Korean word must contain Korean characters (한글)', 'error');
				return;
			}
			
			// Add to dictionary via server
			fetch('/vocabulary', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					word: korean,
					meaning: meaning,
					meaning_geo: null
				})
			})
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					// Don't add to the page display - just show success message
					// The "My Dictionary" section should only show random words from DB
					showNotification('Word added to dictionary!', 'success');
				} else if (data.error && data.error.includes('already in your dictionary')) {
					showNotification('Word already in your dictionary!', 'warning');
				} else {
					showNotification(data.error || 'Failed to add word', 'error');
				}
			})
			.catch(error => {
				console.error('Error:', error);
				showNotification('Failed to add word to dictionary', 'error');
			});
		});
	}
	
	// Modal events
	if (floatingAddBtn) floatingAddBtn.addEventListener('click', openModal);
	if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
	if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
	if (addWordForm) {
		console.log('Adding form submit listener');
		addWordForm.addEventListener('submit', handleFormSubmit);
	} else {
		console.log('Form not found!');
	}
	
	// View All Modal events
	if (viewAllBtn) viewAllBtn.addEventListener('click', openViewAllModal);
	if (closeViewAllModalBtn) closeViewAllModalBtn.addEventListener('click', closeViewAllModal);
	if (viewAllModal) {
		viewAllModal.addEventListener('click', function(e) {
			if (e.target === viewAllModal) closeViewAllModal();
		});
	}
	
	// Dictionary search functionality
	if (dictionarySearchInput) {
		dictionarySearchInput.addEventListener('input', function() {
			const searchTerm = this.value.trim();
			searchDictionaryWords(searchTerm);
		});
	}
	
	// Real-time validation feedback
	if (koreanWordInput) {
		koreanWordInput.addEventListener('input', function() {
			if (this.value.trim()) {
				this.classList.remove('border-red-500');
			}
		});
	}
	
	if (englishMeaningInput) {
		englishMeaningInput.addEventListener('input', function() {
			if (this.value.trim()) {
				this.classList.remove('border-red-500');
			}
		});
	}
	
	// Close on backdrop click
	if (addWordModal) {
		addWordModal.addEventListener('click', function(e) {
			if (e.target === addWordModal) closeModal();
		});
	}

	window.addWordToDictionary = addWordToDictionary;

	// Remove buttons on initial items
	dictionaryList.querySelectorAll('.remove-btn').forEach(btn => {
		btn.addEventListener('click', function() {
			this.closest('.dictionary-card').remove();
			checkEmptyDictionary();
			showNotification('Word removed from dictionary', 'success');
		});
	});

	// Flashcards functionality
	const flashcardsSection = document.getElementById('flashcards-section');
	const flashcardContainer = document.getElementById('flashcard-container');
	const flashcardsEmpty = document.getElementById('flashcards-empty');
	const flashcardsComplete = document.getElementById('flashcards-complete');
	const startFlashcardsBtn = document.getElementById('startFlashcards');
	const directionEnKo = document.getElementById('directionEnKo');
	const directionKoEn = document.getElementById('directionKoEn');
	const flashcard = document.getElementById('flashcard');
	const cardFrontText = document.getElementById('card-front-text');
	const cardBackText = document.getElementById('card-back-text');
	const currentCardSpan = document.getElementById('current-card');
	const totalCardsSpan = document.getElementById('total-cards');
	const progressBar = document.getElementById('progress-bar');
    const btnWrong = document.getElementById('btn-wrong');
    const btnCorrect = document.getElementById('btn-correct');
    const undoButtons = document.querySelectorAll('[data-undo]');
	const restartFlashcardsBtn = document.getElementById('restart-flashcards');

	// Flashcards Landing Modal elements
	const flashcardsLandingModal = document.getElementById('flashcardsLandingModal');
	const flashcardsLandingClose = document.getElementById('flashcardsLandingClose');
	const flashcardsLandingCancel = document.getElementById('flashcardsLandingCancel');
	const chooseDateOption = document.getElementById('chooseDateOption');
	const buildYourOwnOption = document.getElementById('buildYourOwnOption');

	// Date Picker elements
	const flashcardOptions = document.getElementById('flashcardOptions');
	const datePickerSection = document.getElementById('datePickerSection');
	const prevMonthBtn = document.getElementById('prevMonth');
	const nextMonthBtn = document.getElementById('nextMonth');
	const currentMonthYear = document.getElementById('currentMonthYear');
	const calendarDays = document.getElementById('calendarDays');
	const selectedDateDisplay = document.getElementById('selectedDateDisplay');
	const selectedDateText = document.getElementById('selectedDateText');
	const backToOptionsBtn = document.getElementById('backToOptions');
	const startWithDateBtn = document.getElementById('startWithDate');

	// Word Selection elements
	const wordSelectionSection = document.getElementById('wordSelectionSection');
	const wordSearchInput = document.getElementById('wordSearchInput');
	const selectedWordsCounter = document.getElementById('selectedWordsCounter');
	const selectedCount = document.getElementById('selectedCount');
	const wordsList = document.getElementById('wordsList');
	const backToOptionsFromWordsBtn = document.getElementById('backToOptionsFromWords');
	const startWithSelectedWordsBtn = document.getElementById('startWithSelectedWords');

	// Word count elements
	const dictionarySectionCount = document.getElementById('dictionarySectionCount');
	const dictionaryModalCount = document.getElementById('dictionaryModalCount');

	let flashcards = [];
	let currentCardIndex = 0;
	let currentDirection = 'en-ko'; // 'en-ko' or 'ko-en'
	let remainingCards = [];
	let isFlipped = false;
	let historyStack = [];

	// Date picker state
	let currentDate = new Date();
	let selectedDate = null;
	let currentMonth = currentDate.getMonth();
	let currentYear = currentDate.getFullYear();

	// Word selection state
	let allWords = [];
	let selectedWords = [];
	let filteredWords = [];

	// Initialize flashcards on page load
	loadTodaysWords();
	updateWordCounts();

	async function updateWordCounts() {
		try {
			const response = await fetch('/api/dictionary');
			const data = await response.json();
			
			if (data.success) {
				const count = data.words.length;
				const countText = count === 1 ? '1 word' : `${count} words`;
				
				if (dictionarySectionCount) {
					dictionarySectionCount.textContent = countText;
				}
				if (dictionaryModalCount) {
					dictionaryModalCount.textContent = countText;
				}
			}
		} catch (error) {
			console.error('Error updating word counts:', error);
		}
	}

	function applyDirectionButtonStyles() {
		if (!directionEnKo || !directionKoEn) return;
		const base = 'direction-btn px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200';
		if (currentDirection === 'en-ko') {
			directionEnKo.className = `${base} active bg-white text-primary shadow-sm`;
			directionKoEn.className = `${base} text-gray-600 hover:text-gray-800`;
		} else {
			directionEnKo.className = `${base} text-gray-600 hover:text-gray-800`;
			directionKoEn.className = `${base} active bg-white text-primary shadow-sm`;
		}
	}

	async function loadTodaysWords() {
		try {
			const response = await fetch('/api/flashcards/today');
			const data = await response.json();
			
			if (data.success && data.words.length > 0) {
				flashcards = data.words;
				showFlashcardsSection();
			} else {
				showEmptyState();
			}
		} catch (error) {
			console.error('Error loading today\'s words:', error);
			showEmptyState();
		}
	}

	function showFlashcardsSection() {
		flashcardsEmpty.classList.add('hidden');
		flashcardsComplete.classList.add('hidden');
		flashcardsSection.classList.remove('hidden');
	}

	function showEmptyState() {
		flashcardsEmpty.classList.remove('hidden');
		flashcardContainer.classList.add('hidden');
		flashcardsComplete.classList.add('hidden');
	}

	function showCompleteState() {
		flashcardContainer.classList.add('hidden');
		flashcardsComplete.classList.remove('hidden');
	}

	function startFlashcardSession() {
		// Shuffle the flashcards array for randomization
		remainingCards = [...flashcards].sort(() => Math.random() - 0.5);
		currentCardIndex = 0;
		isFlipped = false;
		historyStack = [];
		
		flashcardContainer.classList.remove('hidden');
		flashcardsEmpty.classList.add('hidden');
		flashcardsComplete.classList.add('hidden');
		
		updateProgress();
		loadCurrentCard();
	}

	function loadCurrentCard() {
		if (remainingCards.length === 0) {
			showCompleteState();
			return;
		}

		// Hide card during content update to avoid any flicker/leak
		flashcard.style.visibility = 'hidden';

		const card = remainingCards[currentCardIndex];
		isFlipped = false;
		flashcard.classList.remove('flipped', 'entering');
		
		// Set card content based on direction (front = prompt, back = answer)
		if (currentDirection === 'en-ko') {
			cardFrontText.textContent = card.meaning;
			cardBackText.textContent = card.word;
		} else {
			cardFrontText.textContent = card.word;
			cardBackText.textContent = card.meaning;
		}

		// Show card only after content is set and state is reset
		requestAnimationFrame(() => {
			flashcard.style.visibility = 'visible';
			// Add entrance animation
			setTimeout(() => {
				flashcard.classList.add('entering');
			}, 20);
		});
	}

	function flipCard() {
		// Toggle flip state to allow unlimited flips before marking
		isFlipped = !isFlipped;
		flashcard.classList.toggle('flipped', isFlipped);
	}

	function nextCard(isCorrect) {
		if (remainingCards.length === 0) return;

		const card = remainingCards[currentCardIndex];
		// Save snapshot for undo
		historyStack.push({
			card: { ...card },
			isCorrect,
			remainingSnapshot: [...remainingCards],
			currentDirection
		});

		// Remove card from remaining cards if correct
		if (isCorrect) {
			remainingCards.splice(currentCardIndex, 1);
		} else {
			// Move to next card but keep current card in the deck
			// Shuffle remaining cards to randomize order, but avoid repeating the same word
			shuffleRemainingCardsAvoidingLast(card);
		}

		// Reset card state and load next
		flashcard.classList.remove('flipped', 'entering');
		updateProgress();
		loadCurrentCard();
	}

	function shuffleRemainingCards() {
		// Shuffle the remaining cards to randomize order
		remainingCards = remainingCards.sort(() => Math.random() - 0.5);
		currentCardIndex = 0;
	}

	function shuffleRemainingCardsAvoidingLast(avoidWord) {
		// Shuffle remaining cards but ensure the avoided word doesn't come first
		if (remainingCards.length <= 1) return;
		
		// Find the index of the word to avoid
		const avoidIndex = remainingCards.findIndex(card => 
			card.word === avoidWord.word && card.meaning === avoidWord.meaning
		);
		
		if (avoidIndex === -1) {
			// Word not found, just shuffle normally
			shuffleRemainingCards();
			return;
		}
		
		// Shuffle until the avoided word is not in the first position
		let attempts = 0;
		do {
			remainingCards = remainingCards.sort(() => Math.random() - 0.5);
			attempts++;
		} while (remainingCards[0].word === avoidWord.word && 
				 remainingCards[0].meaning === avoidWord.meaning && 
				 attempts < 10); // Prevent infinite loop
		
		currentCardIndex = 0;
	}

	function canUndo() {
		return historyStack.length > 0;
	}

    function updateUndoState() {
        if (!undoButtons || undoButtons.length === 0) return;
        const disabled = !canUndo();
        undoButtons.forEach(btn => { btn.disabled = disabled; });
    }

	function undoLast() {
		if (!canUndo()) return;
		const last = historyStack.pop();
		remainingCards = [...last.remainingSnapshot];
		currentDirection = last.currentDirection;
		applyDirectionButtonStyles();
		currentCardIndex = 0;
		isFlipped = false;
		flashcard.classList.remove('flipped', 'entering');
		updateProgress();
		loadCurrentCard();
		updateUndoState();
	}

	function updateProgress() {
		const total = flashcards.length;
		const completed = total - remainingCards.length;
		const current = currentCardIndex + 1;
		
		currentCardSpan.textContent = current;
		totalCardsSpan.textContent = remainingCards.length;
		
		const progress = (completed / total) * 100;
		progressBar.style.width = `${progress}%`;
		updateUndoState();
	}

	function setDirection(direction) {
		currentDirection = direction;
		applyDirectionButtonStyles();
		// Reload current card with new direction
		if (flashcardContainer && !flashcardContainer.classList.contains('hidden')) {
			loadCurrentCard();
		}
	}

	// Flashcards Landing Modal functions
	function openFlashcardsLandingModal() {
		if (!flashcardsLandingModal) return;
		flashcardsLandingModal.classList.remove('hidden');
	}

	function closeFlashcardsLandingModal() {
		if (!flashcardsLandingModal) return;
		flashcardsLandingModal.classList.add('hidden');
	}

	function handleChooseDate() {
		// Show date picker section with smooth animation
		showDatePicker();
	}

	function showDatePicker() {
		// Hide options and show date picker with animation
		flashcardOptions.style.opacity = '0';
		flashcardOptions.style.transform = 'translateX(-20px)';
		
		setTimeout(() => {
			flashcardOptions.classList.add('hidden');
			datePickerSection.classList.remove('hidden');
			datePickerSection.style.opacity = '0';
			datePickerSection.style.transform = 'translateX(20px)';
			
			// Generate calendar for current month
			generateCalendar();
			
			// Animate in
			setTimeout(() => {
				datePickerSection.style.opacity = '1';
				datePickerSection.style.transform = 'translateX(0)';
			}, 50);
		}, 200);
	}

	function hideDatePicker() {
		// Hide date picker and show options with animation
		datePickerSection.style.opacity = '0';
		datePickerSection.style.transform = 'translateX(20px)';
		
		setTimeout(() => {
			datePickerSection.classList.add('hidden');
			flashcardOptions.classList.remove('hidden');
			flashcardOptions.style.opacity = '0';
			flashcardOptions.style.transform = 'translateX(-20px)';
			
			// Reset selected date
			selectedDate = null;
			selectedDateDisplay.classList.add('hidden');
			startWithDateBtn.disabled = true;
			
			// Animate in
			setTimeout(() => {
				flashcardOptions.style.opacity = '1';
				flashcardOptions.style.transform = 'translateX(0)';
			}, 50);
		}, 200);
	}

	function generateCalendar() {
		const today = new Date();
		const firstDay = new Date(currentYear, currentMonth, 1);
		const lastDay = new Date(currentYear, currentMonth + 1, 0);
		const startDate = new Date(firstDay);
		startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
		
		// Update month/year display
		const monthNames = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'
		];
		currentMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
		
		// Clear existing days
		calendarDays.innerHTML = '';
		
		// Generate 42 days (6 weeks)
		for (let i = 0; i < 42; i++) {
			const date = new Date(startDate);
			date.setDate(startDate.getDate() + i);
			
			const dayElement = document.createElement('div');
			dayElement.className = 'calendar-day text-center py-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-200';
			dayElement.textContent = date.getDate();
			
			// Check if this is today
			const isToday = date.toDateString() === today.toDateString();
			const isCurrentMonth = date.getMonth() === currentMonth;
			const isFuture = date > today;
			
			// Style the day
			if (isToday) {
				dayElement.classList.add('bg-primary', 'text-white', 'font-semibold');
				dayElement.classList.remove('hover:bg-gray-200');
			} else if (!isCurrentMonth) {
				dayElement.classList.add('text-gray-400');
				dayElement.classList.remove('hover:bg-gray-200');
			} else if (isFuture) {
				dayElement.classList.add('text-gray-300', 'cursor-not-allowed');
				dayElement.classList.remove('hover:bg-gray-200');
			} else {
				dayElement.classList.add('text-gray-700');
			}
			
			// Add click handler for selectable dates
			if (isCurrentMonth && !isFuture) {
				dayElement.addEventListener('click', () => selectDate(date));
			}
			
			calendarDays.appendChild(dayElement);
		}
		
		// Set today as default selected date
		selectDate(today);
	}

	function selectDate(date) {
		// Remove previous selection
		calendarDays.querySelectorAll('.calendar-day').forEach(day => {
			day.classList.remove('bg-secondary', 'text-white', 'ring-2', 'ring-primary');
		});
		
		// Find and select the clicked date - use the actual date object passed to the function
		// instead of reconstructing it from day number
		const dayElements = calendarDays.querySelectorAll('.calendar-day');
		dayElements.forEach((day, index) => {
			// Calculate the actual date for this calendar cell
			const firstDay = new Date(currentYear, currentMonth, 1);
			const startDate = new Date(firstDay);
			startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
			
			const cellDate = new Date(startDate);
			cellDate.setDate(startDate.getDate() + index);
			
			// Compare the actual dates, not just day numbers
			if (cellDate.toDateString() === date.toDateString()) {
				day.classList.add('bg-secondary', 'text-white', 'ring-2', 'ring-primary');
				day.classList.remove('hover:bg-gray-200');
			}
		});
		
		selectedDate = date;
		selectedDateText.textContent = date.toLocaleDateString('en-US', { 
			weekday: 'long', 
			year: 'numeric', 
			month: 'long', 
			day: 'numeric' 
		});
		selectedDateDisplay.classList.remove('hidden');
		startWithDateBtn.disabled = false;
	}

	function changeMonth(direction) {
		if (direction === 'prev') {
			currentMonth--;
			if (currentMonth < 0) {
				currentMonth = 11;
				currentYear--;
			}
		} else {
			currentMonth++;
			if (currentMonth > 11) {
				currentMonth = 0;
				currentYear++;
			}
		}
		generateCalendar();
	}

	async function startFlashcardsWithDate() {
		if (!selectedDate) return;
		
		closeFlashcardsLandingModal();
		
		try {
			// Format date for API - ensure we use the local date, not UTC
			const year = selectedDate.getFullYear();
			const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
			const day = String(selectedDate.getDate()).padStart(2, '0');
			const dateString = `${year}-${month}-${day}`;
			
			console.log('Selected date:', selectedDate);
			console.log('Formatted date string:', dateString);
			console.log('Date string for API:', dateString);
			
			const response = await fetch(`/api/flashcards/date?date=${dateString}`);
			const data = await response.json();
			
			console.log('API response:', data);
			
			if (data.success && data.words.length > 0) {
				flashcards = data.words;
				showFlashcardsSection();
				startFlashcardSession();
			} else {
				showNotification(`No words found for ${selectedDate.toLocaleDateString()}`, 'warning');
			}
		} catch (error) {
			console.error('Error loading words for date:', error);
			showNotification('Failed to load words for selected date', 'error');
		}
	}

	function handleBuildYourOwn() {
		// Show word selection section with smooth animation
		showWordSelection();
	}

	function showWordSelection() {
		// Hide options and show word selection with animation
		flashcardOptions.style.opacity = '0';
		flashcardOptions.style.transform = 'translateX(-20px)';
		
		setTimeout(() => {
			flashcardOptions.classList.add('hidden');
			wordSelectionSection.classList.remove('hidden');
			wordSelectionSection.style.opacity = '0';
			wordSelectionSection.style.transform = 'translateX(20px)';
			
			// Load words from dictionary
			loadWordsForSelection();
			
			// Animate in
			setTimeout(() => {
				wordSelectionSection.style.opacity = '1';
				wordSelectionSection.style.transform = 'translateX(0)';
			}, 50);
		}, 200);
	}

	function hideWordSelection() {
		// Hide word selection and show options with animation
		wordSelectionSection.style.opacity = '0';
		wordSelectionSection.style.transform = 'translateX(20px)';
		
		setTimeout(() => {
			wordSelectionSection.classList.add('hidden');
			flashcardOptions.classList.remove('hidden');
			flashcardOptions.style.opacity = '0';
			flashcardOptions.style.transform = 'translateX(-20px)';
			
			// Reset selection
			selectedWords = [];
			selectedWordsCounter.classList.add('hidden');
			startWithSelectedWordsBtn.disabled = true;
			wordSearchInput.value = '';
			
			// Animate in
			setTimeout(() => {
				flashcardOptions.style.opacity = '1';
				flashcardOptions.style.transform = 'translateX(0)';
			}, 50);
		}, 200);
	}

	async function loadWordsForSelection() {
		try {
			const response = await fetch('/api/dictionary');
			const data = await response.json();
			
			if (data.success) {
				allWords = data.words;
				filteredWords = [...allWords];
				displayWords();
			} else {
				showNotification('Failed to load dictionary', 'error');
			}
		} catch (error) {
			console.error('Error loading words:', error);
			showNotification('Failed to load dictionary', 'error');
		}
	}

	function displayWords() {
		if (!wordsList) return;
		
		wordsList.innerHTML = '';
		
		if (filteredWords.length === 0) {
			wordsList.innerHTML = `
				<div class="text-center py-8 text-gray-500">
					<i class="ri-book-open-line text-3xl mb-2"></i>
					<p class="text-sm">No words found</p>
				</div>
			`;
			return;
		}
		
		filteredWords.forEach(word => {
			const isSelected = selectedWords.some(selected => selected.id === word.id);
			const wordCard = document.createElement('div');
			wordCard.className = `word-selection-card p-3 rounded-lg border transition-all duration-200 ${isSelected ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'}`;
			wordCard.setAttribute('data-word-id', word.id);
			
			wordCard.innerHTML = `
				<div class="flex items-center justify-between">
					<div class="flex-1">
						<div class="korean-text text-base font-semibold mb-1">${word.word}</div>
						<div class="meaning-text text-sm text-gray-600">${word.meaning}${word.meaning_geo ? ` (${word.meaning_geo})` : ''}</div>
						<div class="text-xs text-gray-400 mt-1">Added: ${new Date(word.created_at).toLocaleDateString()}</div>
					</div>
					<button class="word-action-btn w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${isSelected ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}" data-word-id="${word.id}">
						<i class="${isSelected ? 'ri-subtract-line' : 'ri-add-line'}"></i>
					</button>
				</div>
			`;
			
			// Add click handler for the action button
			const actionBtn = wordCard.querySelector('.word-action-btn');
			actionBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				toggleWordSelection(word);
			});
			
			wordsList.appendChild(wordCard);
		});
	}

	function toggleWordSelection(word) {
		const isSelected = selectedWords.some(selected => selected.id === word.id);
		
		if (isSelected) {
			// Remove from selection
			selectedWords = selectedWords.filter(selected => selected.id !== word.id);
		} else {
			// Add to selection
			selectedWords.push(word);
		}
		
		// Update UI
		updateSelectionUI();
		displayWords(); // Re-render to update button states
	}

	function updateSelectionUI() {
		const count = selectedWords.length;
		selectedCount.textContent = count;
		
		if (count > 0) {
			selectedWordsCounter.classList.remove('hidden');
			startWithSelectedWordsBtn.disabled = false;
		} else {
			selectedWordsCounter.classList.add('hidden');
			startWithSelectedWordsBtn.disabled = true;
		}
	}

	function searchWords() {
		const searchTerm = wordSearchInput.value.toLowerCase().trim();
		
		if (searchTerm === '') {
			filteredWords = [...allWords];
		} else {
			filteredWords = allWords.filter(word => 
				word.word.toLowerCase().includes(searchTerm) || 
				word.meaning.toLowerCase().includes(searchTerm) ||
				(word.meaning_geo && word.meaning_geo.toLowerCase().includes(searchTerm))
			);
		}
		
		displayWords();
	}

	async function startFlashcardsWithSelectedWords() {
		if (selectedWords.length === 0) return;
		
		closeFlashcardsLandingModal();
		
		// Convert selected words to flashcard format
		flashcards = selectedWords.map(word => ({
			word: word.word,
			meaning: word.meaning,
			meaning_geo: word.meaning_geo
		}));
		
		showFlashcardsSection();
		startFlashcardSession();
	}

	// Event listeners
	if (startFlashcardsBtn) {
		startFlashcardsBtn.addEventListener('click', openFlashcardsLandingModal);
	}

	// Flashcards Landing Modal event listeners
	if (flashcardsLandingClose) {
		flashcardsLandingClose.addEventListener('click', closeFlashcardsLandingModal);
	}

	if (flashcardsLandingCancel) {
		flashcardsLandingCancel.addEventListener('click', closeFlashcardsLandingModal);
	}

	if (chooseDateOption) {
		chooseDateOption.addEventListener('click', handleChooseDate);
	}

	if (buildYourOwnOption) {
		buildYourOwnOption.addEventListener('click', handleBuildYourOwn);
	}

	// Date picker event listeners
	if (prevMonthBtn) {
		prevMonthBtn.addEventListener('click', () => changeMonth('prev'));
	}

	if (nextMonthBtn) {
		nextMonthBtn.addEventListener('click', () => changeMonth('next'));
	}

	if (backToOptionsBtn) {
		backToOptionsBtn.addEventListener('click', hideDatePicker);
	}

	if (startWithDateBtn) {
		startWithDateBtn.addEventListener('click', startFlashcardsWithDate);
	}

	// Word selection event listeners
	if (backToOptionsFromWordsBtn) {
		backToOptionsFromWordsBtn.addEventListener('click', hideWordSelection);
	}

	if (startWithSelectedWordsBtn) {
		startWithSelectedWordsBtn.addEventListener('click', startFlashcardsWithSelectedWords);
	}

	if (wordSearchInput) {
		wordSearchInput.addEventListener('input', searchWords);
	}

	// Close modal on backdrop click
	if (flashcardsLandingModal) {
		flashcardsLandingModal.addEventListener('click', function(e) {
			if (e.target === flashcardsLandingModal) {
				closeFlashcardsLandingModal();
			}
		});
	}

	if (directionEnKo) {
		directionEnKo.addEventListener('click', () => setDirection('en-ko'));
	}

	if (directionKoEn) {
		directionKoEn.addEventListener('click', () => setDirection('ko-en'));
	}

	// Enforce initial visual state for direction buttons
	applyDirectionButtonStyles();

	if (flashcard) {
		flashcard.addEventListener('click', flipCard);
	}

	if (btnWrong) {
		btnWrong.addEventListener('click', () => nextCard(false));
	}

	if (btnCorrect) {
		btnCorrect.addEventListener('click', () => nextCard(true));
	}

    if (undoButtons && undoButtons.length > 0) {
        undoButtons.forEach(btn => btn.addEventListener('click', undoLast));
    }

	if (restartFlashcardsBtn) {
		restartFlashcardsBtn.addEventListener('click', startFlashcardSession);
	}

	// Simple click to flip card
	if (flashcard) {
		flashcard.addEventListener('click', flipCard);
	}

	// Keyboard support
	document.addEventListener('keydown', (e) => {
		if (flashcardContainer.classList.contains('hidden')) return;

		switch(e.key) {
			case ' ':
			case 'Enter':
				e.preventDefault();
				if (isFlipped) {
					nextCard(true); // Space/Enter = correct
				} else {
					flipCard();
				}
				break;
			case 'ArrowLeft':
				e.preventDefault();
				if (isFlipped) {
					nextCard(false); // Left arrow = wrong
				}
				break;
			case 'ArrowRight':
				e.preventDefault();
				if (isFlipped) {
					nextCard(true); // Right arrow = correct
				}
				break;
			case 'Escape':
				e.preventDefault();
				flashcardContainer.classList.add('hidden');
				break;
		}
	});
});

