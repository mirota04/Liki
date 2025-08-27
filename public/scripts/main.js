// Profile dropdown functionality
function initProfileDropdown() {
	const profileDropdownBtn = document.getElementById('profileDropdownBtn');
	const profileDropdown = document.getElementById('profileDropdown');

	if (profileDropdownBtn && profileDropdown) {
		// Toggle dropdown on button click
		profileDropdownBtn.addEventListener('click', function(e) {
			e.stopPropagation();
			profileDropdown.classList.toggle('hidden');
		});

		// Close dropdown when clicking outside
		document.addEventListener('click', function(e) {
			if (!profileDropdown.contains(e.target) && !profileDropdownBtn.contains(e.target)) {
				profileDropdown.classList.add('hidden');
			}
		});

		// Close dropdown on escape key
		document.addEventListener('keydown', function(e) {
			if (e.key === 'Escape') {
				profileDropdown.classList.add('hidden');
			}
		});
	}
}

// Dark mode functionality
function initDarkMode() {
	const darkModeToggle = document.getElementById('darkModeToggle');
	const darkModeThumb = document.getElementById('darkModeThumb');
	
	if (darkModeToggle && darkModeThumb) {
		// Check localStorage for saved preference
		const currentTheme = localStorage.getItem('theme') || 'light';
		document.documentElement.setAttribute('data-theme', currentTheme);
		
		// Update toggle state
		if (currentTheme === 'dark') {
			darkModeToggle.classList.add('active');
			darkModeThumb.style.transform = 'translateX(1.25rem)';
		}
		
		// Toggle dark mode
		darkModeToggle.addEventListener('click', function() {
			const currentTheme = document.documentElement.getAttribute('data-theme');
			const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
			
			// Update DOM
			document.documentElement.setAttribute('data-theme', newTheme);
			
			// Update toggle state
			if (newTheme === 'dark') {
				darkModeToggle.classList.add('active');
				darkModeThumb.style.transform = 'translateX(1.25rem)';
			} else {
				darkModeToggle.classList.remove('active');
				darkModeThumb.style.transform = 'translateX(0.125rem)';
			}
			
			// Save to localStorage
			localStorage.setItem('theme', newTheme);
		});
	}
}

// Logout function
function logout() {
	if (confirm('Are you sure you want to logout?')) {
		fetch('/logout', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			}
		})
		.then(() => {
			window.location.href = '/login';
		})
		.catch(error => {
			console.error('Logout error:', error);
			// Fallback: redirect to login anyway
			window.location.href = '/login';
		});
	}
}

// Navigation function for client-side routing
function navigateToPage(page) {
    // Prevent default link behavior
    event.preventDefault();
    
    // Navigate to the page using window.location
    switch (page) {
        case 'home':
            window.location.href = '/home';
            break;
        case 'grammar':
            window.location.href = '/grammar';
            break;
        case 'register':
            window.location.href = '/register';
            break;
        case 'vocabulary':
            window.location.href = '/vocabulary';
            break;
        case 'profile':
            window.location.href = '/profile';
            break;
        case 'login':
            window.location.href = '/login';
        default:
            console.warn(`Unknown page: ${page}`);
            break;
    }
}

// Progress animation
document.addEventListener('DOMContentLoaded', function() {
	// Initialize profile dropdown
	initProfileDropdown();
	
	// Initialize dark mode
	initDarkMode();
	
	// Set initial progress wheel state based on server-side data - IMMEDIATELY
	const progressCircle = document.querySelector('.progress-ring-circle');
	const todayProgressPct = document.getElementById('todayProgressPct');
	
	if (progressCircle && todayProgressPct) {
		// Get initial progress from data attribute (server-side calculated)
		const initialProgress = parseInt(progressCircle.getAttribute('data-initial-progress')) || 0;
		const circumference = 2 * Math.PI * 40;
		const offset = circumference - (initialProgress / 100) * circumference;
		
		// Set initial stroke state IMMEDIATELY - no delay
		progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
		progressCircle.style.strokeDashoffset = offset;
		
		// Also update the text if it doesn't match
		if (todayProgressPct.textContent !== `${initialProgress}%`) {
			todayProgressPct.textContent = `${initialProgress}%`;
		}
	}
	
	// Remove legacy progress animation since we're setting it immediately now
});

// Achievements modal open/close handlers (home page)
document.addEventListener('DOMContentLoaded', function() {
    const openAllAchievementsBtn = document.getElementById('openAllAchievements');
    const achievementsModal = document.getElementById('achievementsModal');
    const closeAchievementsModal = document.getElementById('closeAchievementsModal');

    if (openAllAchievementsBtn && achievementsModal) {
        openAllAchievementsBtn.addEventListener('click', function() {
            achievementsModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    }
    if (closeAchievementsModal && achievementsModal) {
        closeAchievementsModal.addEventListener('click', function() {
            achievementsModal.classList.add('hidden');
            document.body.style.overflow = '';
        });
    }
    if (achievementsModal) {
        achievementsModal.addEventListener('click', function(e) {
            if (e.target === achievementsModal) {
                achievementsModal.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });
    }
});

// Achievements count updater (Home)
(function(){
    async function refreshAchievementsCount(){
        try {
            const res = await fetch('/api/achievements/count');
            if (!res.ok) return;
            const data = await res.json();
            const count = data.count ?? 0;
            
            const achievementsEl = document.getElementById('achievementsCount');
            if (achievementsEl) achievementsEl.textContent = String(count);
        } catch (e) {}
    }

    document.addEventListener('DOMContentLoaded', () => {
        refreshAchievementsCount();
        setInterval(refreshAchievementsCount, 60000); // Update every minute
    });
})();

// Card interactions
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.card-hover');
    if (cards.length > 0) {
        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-4px)';
            });
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        });
    }
});

// Button interactions
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.btn-primary');
    if (buttons.length > 0) {
        buttons.forEach(button => {
            button.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
            });
            button.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        });
    }
});

// Echarts proxy setup
(function(){
    let proxyEcharts = null;
    let originInit = null;

    const DefaultFontOptions = [
        { key: 'xAxis', stylePath: 'xAxis.axisLabel' },
        { key: 'yAxis', stylePath: 'yAxis.axisLabel' },
        { key: 'legend', stylePath: 'legend.textStyle' },
        { key: 'tooltip', stylePath: 'tooltip.textStyle' },
        { key: 'title', stylePath: 'title.textStyle' },
        { key: 'series', stylePath: 'series.n.label', isArray: true },
    ];

    function setVal(source, keys, val, setFn) {
        if (!Array.isArray(keys)) {
            keys = keys.split('.');
        }
        keys = [...keys];
        const valKey = keys.pop();
        while (keys.length) {
            const parentKey = keys.shift();
            if (typeof source[parentKey] !== 'object' && typeof source[parentKey] !== 'function') {
                const childKey = keys[0] === undefined ? valKey : keys[0];
                let newVal = {};
                if (!isNaN(childKey * 1)) {
                    newVal = [];
                }
                if (setFn) {
                    setFn(source, parentKey, newVal);
                } else {
                    source[parentKey] = newVal;
                }
            }
            source = source[parentKey];
        }
        if (setFn) {
            setFn(source, valKey, val);
        } else {
            source[valKey] = val;
        }
    }

    function setFontFamily(options) {
        return options;
    }

    function setSeriesFamily(options) {
        if (options.series) {
            options.series = options.series.map(item => {
                item.label = { ...item.label };
                return item;
            });
        }
        return options;
    }

    function addResizeListener(echartsInstance) {
        const mountDom = echartsInstance.getDom();
        const resizeObserver = new ResizeObserver(() => {
            echartsInstance.resize();
        });
        resizeObserver.observe(mountDom);
        return resizeObserver;
    }

    function proxyInit(...arg) {
        if (!originInit) return null;
        let instance = null;
        try {
            instance = originInit.apply(this, arg);
        } catch (e) {
            console.error(e);
            const div = document.createElement('div');
            div.style.display = 'none';
            document.body.appendChild(div);
            instance = originInit.call(this, div);
            document.body.removeChild(div);
        }
        const originSetOption = instance.setOption;
        addResizeListener(instance);
        instance.setOption = async function setOptionProxy(options) {
            options = options || {};
            options.animation = false;
            try {
                return originSetOption.call(this, options);
            } catch (e) {
                console.error(e);
                return originSetOption.call(this, {});
            }
        };
        return instance;
    }

    Object.defineProperty(globalThis, 'echarts', {
        get() {
            return proxyEcharts;
        },
        set(value) {
            originInit = value.init;
            defineInit(value);
            proxyEcharts = value;
        },
        configurable: true,
    });

    function defineInit(value) {
        Object.defineProperty(value, 'init', {
            get() {
                return proxyInit;
            },
            set(v) {
                originInit = v;
            },
            enumerable: true,
        });
    }
})();

// Console warnings and logs suppression
console.warn = () => {};
console.log = () => {};

// AOS refresh on load
window.addEventListener('load', () => {
    if (typeof AOS !== 'undefined' && AOS) {
        AOS.refresh?.();
    }
});

// Local storage memory implementation
(function () {
    const memoryStorage = {
        local: new Map(),
        session: new Map()
    };

    localStorage.setItem = function (key, value) {
        memoryStorage.local.set(key, value);
    };

    localStorage.getItem = function (key) {
        return memoryStorage.local.get(key) ?? null;
    };

    localStorage.removeItem = function (key) {
        memoryStorage.local.delete(key);
    };

    localStorage.clear = function () {
        memoryStorage.local.clear();
    };

    localStorage.key = function (n) {
        return Array.from(memoryStorage.local.keys())[n] ?? null;
    };

    sessionStorage.setItem = function (key, value) {
        memoryStorage.session.set(key, value);
    };

    sessionStorage.getItem = function (key) {
        return memoryStorage.session.get(key) ?? null;
    };

    sessionStorage.removeItem = function (key) {
        memoryStorage.session.delete(key);
    };

    sessionStorage.clear = function () {
        memoryStorage.session.clear();
    };

    sessionStorage.key = function (n) {
        return Array.from(memoryStorage.session.keys())[n] ?? null;
    };
})();

// Iframe height communication
(function() {
    const imgs = Array.from(document.querySelectorAll('img'));
    Promise.all(imgs.map((img) => new Promise((resolve) => {
        img.onload = () => {
            resolve(null);
        };
    }))).finally(() => {
        window.parent.postMessage({
            type: 'iframeHeight',
            height: document.body.offsetHeight
        }, '*');
    });
})();

// Window open handling
(function () {
    'use strict';
    const originalWindowOpen = window.originalWindowOpen ?? window.open;

    function processAnchor(url) {
        const anchor = document.querySelector(url);
        if (anchor) {
            anchor.scrollIntoView({ behavior: 'smooth' });
        }
        const event = new Event('hashchange');
        event.newURL = url;
        event.oldURL = window.location.href;
        window.location.hash = url;
        window.dispatchEvent(event);
    }

    window.open = function (url, target, features) {
        if (url.startsWith('#')) {
            processAnchor(url);
            return;
        }
        originalWindowOpen(url, '_blank', features);
        return null;
    };
})();

// Link click handling
window.addEventListener('click', (event) => {
    const target = event.target;
    const closest = target.closest('a');
    if (!closest) return;
    if (closest.tagName === 'A') {
        event.preventDefault();
        const href = closest.getAttribute('href');
        if (!href) return;
        if (['#', 'javascript:void(0)', ''].includes(href)) {
            return;
        }
        if (href.startsWith('#')) {
            return;
        }
        window.open(closest.href, '_blank');
    }
});

// Form submission prevention - REMOVED to allow normal form submission
// document.addEventListener('submit', (event) => {
//     event.preventDefault();
// }, true);

// Heartbeat tracker for streaks
(function(){
    const HEARTBEAT_INTERVAL_MS = 30000;
    const IDLE_TIMEOUT_MS = 600000; // 10 minutes - consider idle if no input for 10 minutes

    let lastActivityTs = Date.now();
    let intervalId = null;

    function markActivity() {
        lastActivityTs = Date.now();
    }

    function isActive() {
        const now = Date.now();
        const notIdle = (now - lastActivityTs) <= IDLE_TIMEOUT_MS;
        const visible = document.visibilityState === 'visible';
        return visible && notIdle;
    }

    async function heartbeat() {
        if (!isActive()) return;
        try {
            await fetch('/api/activity/heartbeat', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
            // silent fail
        }
    }

    function startHeartbeat() {
        if (intervalId) return;
        intervalId = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    }

    function stopHeartbeat() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            startHeartbeat();
        } else {
            stopHeartbeat();
        }
    });

    ['mousemove','keydown','scroll','touchstart','click'].forEach(evt => {
        window.addEventListener(evt, markActivity, { passive: true });
    });

    document.addEventListener('DOMContentLoaded', () => {
        markActivity();
        if (document.visibilityState === 'visible') startHeartbeat();
    });
})();

// Streak UI updater (home page)
(function(){
    const THRESHOLD = 3600;
    async function refreshStreakUI(){
        try {
            const res = await fetch('/api/streak');
            if (!res.ok) return;
            const data = await res.json();
            const streak = data.currentStreak ?? 0;
            const seconds = data.activeSeconds ?? 0;
            const pct = Math.min(100, Math.round((seconds / THRESHOLD) * 100));

            const streakCount = document.getElementById('streakCount');
            const streakBadgeText = document.getElementById('streakBadgeText');
            const pctEl = document.getElementById('todayProgressPct');
            const progressCircle = document.querySelector('.progress-ring-circle');

            if (streakCount) streakCount.textContent = String(streak);
            if (streakBadgeText) streakBadgeText.textContent = `${streak} day streak`;
            if (pctEl) pctEl.textContent = `${pct}%`;

            // Update ring stroke offset if present
            if (progressCircle) {
                const circumference = 2 * Math.PI * 40; // r=40 as in SVG
                const offset = circumference - (pct / 100) * circumference;
                progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
                progressCircle.style.strokeDashoffset = offset;
            }
        } catch (e) {
            // ignore
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        refreshStreakUI();
        setInterval(refreshStreakUI, 30000);
    });
})();

// Weekly stats UI (Home)
(function(){
    function formatHoursMinutes(totalSeconds){
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return { hours, minutes };
    }

    async function refreshWeeklyUI(){
        try {
            const [weekRes, todayRes, contentWeekRes] = await Promise.all([
                fetch('/api/stats/week'),
                fetch('/api/streak'),
                fetch('/api/stats/content-week')
            ]);
            if (!weekRes.ok) return;
            const weekData = await weekRes.json();
            const total = weekData.totalSeconds ?? 0;
            const { hours } = formatHoursMinutes(total);

            const hoursEl = document.getElementById('hoursStudiedValue');
            const deltaEl = document.getElementById('hoursStudiedDelta');
            const barEl = document.getElementById('hoursStudiedBar');

            if (hoursEl) hoursEl.textContent = String(hours);

            // Progress bar vs weekly goal: 10 hours
            const WEEK_GOAL_SECONDS = 10 * 3600;
            const pct = Math.min(100, Math.round((total / WEEK_GOAL_SECONDS) * 100));
            if (barEl) barEl.style.width = `${pct}%`;

            // Today delta text
            if (todayRes && todayRes.ok) {
                const todayData = await todayRes.json();
                const todaySeconds = todayData.activeSeconds ?? 0;
                const { hours: th, minutes: tm } = formatHoursMinutes(todaySeconds);
                if (deltaEl) {
                    const parts = [];
                    if (th > 0) parts.push(`${th}h`);
                    if (tm > 0 || th === 0) parts.push(`${tm}m`);
                    deltaEl.textContent = `+${parts.join(' ')} today`;
                }
            }

            // Words/Grammar learned this week (Mon..Sun)
            if (contentWeekRes && contentWeekRes.ok) {
                const contentData = await contentWeekRes.json();
                const grammarWeek = contentData.grammarWeekTotal ?? 0;
                const vocabWeek = contentData.vocabWeekTotal ?? 0;

                const wordsValEl = document.getElementById('wordsLearnedValue');
                const wordsBarEl = document.getElementById('wordsLearnedBar');
                const wordsDeltaEl = document.getElementById('wordsLearnedDelta');
                const grammarValEl = document.getElementById('grammarLearnedValue');
                const grammarBarEl = document.getElementById('grammarLearnedBar');
                const grammarDeltaEl = document.getElementById('grammarLearnedDelta');

                if (wordsValEl) wordsValEl.textContent = String(vocabWeek);
                if (grammarValEl) grammarValEl.textContent = String(grammarWeek);

                const WORDS_GOAL = 100; // max for bar
                const GRAMMAR_GOAL = 12; // max for bar
                const wordsPct = Math.min(100, Math.round((vocabWeek / WORDS_GOAL) * 100));
                const grammarPct = Math.min(100, Math.round((grammarWeek / GRAMMAR_GOAL) * 100));
                if (wordsBarEl) wordsBarEl.style.width = `${wordsPct}%`;
                if (grammarBarEl) grammarBarEl.style.width = `${grammarPct}%`;
                
                // Get today's counts for the delta text
                try {
                    const todayRes = await fetch('/api/daily-challenges');
                    if (todayRes.ok) {
                        const todayData = await todayRes.json();
                        const grammarToday = todayData.grammarToday ?? 0;
                        const vocabToday = todayData.vocabToday ?? 0;
                        
                        if (wordsDeltaEl) wordsDeltaEl.textContent = `+${vocabToday} today`;
                        if (grammarDeltaEl) grammarDeltaEl.textContent = `+${grammarToday} today`;
                    }
                } catch (e) {
                    // Fallback to weekly totals if today's data fails
                    if (wordsDeltaEl) wordsDeltaEl.textContent = `+${vocabWeek} this week`;
                    if (grammarDeltaEl) grammarDeltaEl.textContent = `+${grammarWeek} this week`;
                }
            }
        } catch (e) {}
    }

    document.addEventListener('DOMContentLoaded', () => {
        refreshWeeklyUI();
        setInterval(refreshWeeklyUI, 60000);
    });
})();

// Daily challenges UI (Home)
(function(){
    function updateChallengeIcon(iconId, completed) {
        const icon = document.getElementById(iconId);
        if (icon) {
            if (completed) {
                icon.className = 'w-6 h-6 flex items-center justify-center rounded-full bg-green-100';
                icon.innerHTML = '<i class="ri-check-line text-green-600 text-sm"></i>';
            } else {
                icon.className = 'w-6 h-6 flex items-center justify-center rounded-full bg-gray-100';
                icon.innerHTML = '<i class="ri-close-line text-gray-400 text-sm"></i>';
            }
        }
    }

    function updateProgressText(progressId, current, target, unit = '') {
        const progressEl = document.getElementById(progressId);
        if (progressEl) {
            progressEl.textContent = `${current}${unit}/${target}${unit}`;
        }
    }

    async function refreshDailyChallenges(){
        try {
            const res = await fetch('/api/daily-challenges');
            if (!res.ok) return;
            const data = await res.json();
            
            const {
                grammarQuizTaken,
                vocabQuizTaken,
                mixedQuizTaken,
                grammarQuizCount,
                vocabQuizCount,
                mixedQuizCount,
                grammarToday,
                vocabToday,
                activeHours,
                completedChallenges,
                totalChallenges,
                dailyProgressPercent
            } = data;

            // Update progress bar and text
            const progressBar = document.getElementById('dailyProgressBar');
            const progressText = document.getElementById('dailyProgressText');
            const completeText = document.querySelector('.custom-text-primary span');
            
            if (progressBar) progressBar.style.width = `${dailyProgressPercent}%`;
            if (progressText) progressText.textContent = `${dailyProgressPercent}% Complete`;
            if (completeText) completeText.textContent = `${completedChallenges}/${totalChallenges} Complete`;

            // Update quiz challenge icons
            updateChallengeIcon('grammarQuizIcon', grammarQuizTaken);
            updateChallengeIcon('vocabQuizIcon', vocabQuizTaken);
            updateChallengeIcon('mixedQuizIcon', mixedQuizTaken);

            // Update activity challenge icons and progress
            updateChallengeIcon('grammarActivityIcon', grammarToday >= 3);
            updateChallengeIcon('vocabActivityIcon', vocabToday >= 20);
            updateChallengeIcon('timeActivityIcon', activeHours >= 2);

            updateProgressText('grammarActivityProgress', grammarToday, 3);
            updateProgressText('vocabActivityProgress', vocabToday, 20);
            updateProgressText('timeActivityProgress', Math.round(activeHours * 10) / 10, 2, 'h');

            // Today's Focus ticks/crowns
            function setFocus(iconId, completed, crowned){
                const icon = document.getElementById(iconId);
                if (!icon) return;
                if (crowned) {
                    icon.className = 'w-8 h-8 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-600';
                    icon.innerHTML = '<i class="ri-vip-crown-2-fill"></i>';
                } else if (completed) {
                    icon.className = 'w-8 h-8 flex items-center justify-center rounded-full bg-green-100 text-green-600';
                    icon.innerHTML = '<i class="ri-check-line"></i>';
                } else {
                    icon.className = 'w-8 h-8 flex items-center justify-center rounded-full bg-gray-300 text-white';
                    icon.innerHTML = '<i class="ri-close-line"></i>';
                }
            }

            const grammarCompleted = grammarQuizTaken && grammarToday >= 3;
            const vocabCompleted = vocabQuizTaken && vocabToday >= 20;
            const generalCompleted = mixedQuizTaken;

            const grammarCrowned = grammarQuizCount + grammarToday >= Math.ceil(1.5 * 3) && grammarQuizTaken && grammarToday >= 3;
            const vocabCrowned = vocabQuizCount + vocabToday >= Math.ceil(1.5 * 20) && vocabQuizTaken && vocabToday >= 20;
            const generalCrowned = mixedQuizCount >= Math.ceil(1.5 * 1) && mixedQuizTaken;

            setFocus('focusGrammarIcon', grammarCompleted, grammarCrowned);
            setFocus('focusVocabularyIcon', vocabCompleted, vocabCrowned);
            setFocus('focusGeneralIcon', generalCompleted, generalCrowned);

            // Update hero section progress wheel
            const progressCircle = document.querySelector('.progress-ring-circle');
            const todayProgressPct = document.getElementById('todayProgressPct');
            
            if (progressCircle) {
                const circumference = 2 * Math.PI * 40; // r=40 as in SVG
                const offset = circumference - (dailyProgressPercent / 100) * circumference;
                progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
                progressCircle.style.strokeDashoffset = offset;
            }
            
            if (todayProgressPct) {
                todayProgressPct.textContent = `${dailyProgressPercent}%`;
            }
        } catch (e) {
            console.error('Daily challenges refresh error:', e);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        refreshDailyChallenges();
        setInterval(refreshDailyChallenges, 30000); // Update every 30 seconds
    });
})();

// Smooth scroll to Quick Access when clicking "Take Today's Quizzes"
document.addEventListener('DOMContentLoaded', function(){
	const btn = document.getElementById('takeQuizzesBtn');
	const target = document.getElementById('quickAccess');
	if (btn && target) {
		btn.addEventListener('click', function(){
			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
	}
});

// Quiz Landing Modal handlers
(function(){
	document.addEventListener('DOMContentLoaded', function(){
		const modal = document.getElementById('quizLandingModal');
		if (!modal) return;
		const iconBox = document.getElementById('quizLandingIcon');
		const titleEl = document.getElementById('quizLandingTitle');
		const descEl = document.getElementById('quizLandingDesc');
		const btnStart = document.getElementById('quizLandingStart');

		const modeSelector = document.getElementById('quizModeSelector');
		const modeWords = document.getElementById('modeWords');
		const modeGrammar = document.getElementById('modeGrammar');
		const modeBoth = document.getElementById('modeBoth');
		let selectedMode = 'both';

		let lastOpenedType = 'general';

		function openModal(fromCard){
			if (!fromCard) return;
			const type = fromCard.getAttribute('data-quiz-type') || 'general';
			lastOpenedType = type;
			const title = fromCard.getAttribute('data-quiz-title') || 'Start Quiz';
			const desc = fromCard.getAttribute('data-quiz-desc') || 'Get ready to begin.';
			const icon = fromCard.getAttribute('data-quiz-icon') || 'ri-question-line';

			if (iconBox) {
				iconBox.className = 'w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600';
				iconBox.innerHTML = `<i class="${icon} ri-lg"></i>`;
			}
			if (titleEl) titleEl.textContent = title;
			if (descEl) descEl.textContent = desc;

			// Show mode selector only for general quiz
			if (modeSelector) {
				if (type === 'general') {
					modeSelector.classList.remove('hidden');
					selectedMode = 'both';
					setModeButtonStyles('both');
				} else {
					modeSelector.classList.add('hidden');
				}
			}

			modal.classList.remove('hidden');
			document.body.style.overflow = 'hidden';

			if (btnStart) {
				btnStart.onclick = () => {
					// Navigate based on type
					if (lastOpenedType === 'grammar') {
						window.location.href = '/quiz/grammar';
					} else {
						// TODO: other quiz routes
						closeModal();
					}
				};
			}
		}

		function setModeButtonStyles(mode){
			function setBtn(btn, active){
				if (!btn) return;
				btn.className = active
					? 'px-3 py-2 rounded-button custom-bg-primary custom-text-white text-sm'
					: 'px-3 py-2 rounded-button bg-gray-100 text-dark text-sm';
			}
			setBtn(modeWords, mode === 'words');
			setBtn(modeGrammar, mode === 'grammar');
			setBtn(modeBoth, mode === 'both');
		}

		if (modeWords) modeWords.addEventListener('click', () => { selectedMode = 'words'; setModeButtonStyles('words'); });
		if (modeGrammar) modeGrammar.addEventListener('click', () => { selectedMode = 'grammar'; setModeButtonStyles('grammar'); });
		if (modeBoth) modeBoth.addEventListener('click', () => { selectedMode = 'both'; setModeButtonStyles('both'); });

		function closeModal(){
			if (!modal) return;
			modal.classList.add('hidden');
			document.body.style.overflow = '';
		}

		// Delegated close handlers to ensure reliability
		document.addEventListener('click', function(e){
			const target = e.target;
			if (!modal) return;
			// Click on overlay
			if (target === modal) {
				closeModal();
				return;
			}
			// Click on explicit close buttons
			if (target && (target.id === 'quizLandingClose' || target.closest('#quizLandingClose'))){
				closeModal();
				return;
			}
			if (target && (target.id === 'quizLandingCancel' || target.closest('#quizLandingCancel'))){
				closeModal();
				return;
			}
		});

		// Escape key closes modal
		document.addEventListener('keydown', function(e){
			if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeModal();
		});

		// Bind cards
		['qaGrammar','qaVocabulary','qaMixed','qaGeneral'].forEach(id => {
			const el = document.getElementById(id);
			if (el) el.addEventListener('click', () => openModal(el));
		});
	});
})();
