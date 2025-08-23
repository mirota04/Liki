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
			<button class="remove-btn w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-full transition-colors">
				<i class="ri-close-line text-red-400 hover:text-red-600"></i>
			</button>
		`;

		const removeBtn = wordCard.querySelector('.remove-btn');
		removeBtn.addEventListener('click', function() {
			wordCard.remove();
			checkEmptyDictionary();
			showNotification('Word removed from dictionary', 'success');
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

	function handleFormSubmit(e) {
		e.preventDefault();
		const korean = koreanWordInput ? koreanWordInput.value.trim() : '';
		const meaning = englishMeaningInput ? englishMeaningInput.value.trim() : '';
		// Georgian is optional; capture if present for future use
		const georgian = georgianInput ? georgianInput.value.trim() : '';

		if (!korean || !meaning) {
			showNotification('Please fill in Korean and English fields', 'error');
			return;
		}

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
				addWordToDictionary(korean, meaning);
				// Clear inputs and close modal
				if (koreanWordInput) koreanWordInput.value = '';
				if (englishMeaningInput) englishMeaningInput.value = '';
				if (georgianInput) georgianInput.value = '';
				closeModal();
				showNotification('Word added to dictionary!', 'success');
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
			addWordToDictionary(korean, meaning);
		});
	}

	// Modal events
	if (floatingAddBtn) floatingAddBtn.addEventListener('click', openModal);
	if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
	if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
	if (addWordForm) addWordForm.addEventListener('submit', handleFormSubmit);
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
});

