// Modal functionality
document.addEventListener('DOMContentLoaded', function() {
    const floatingBtn = document.querySelector('.floating-btn');
    const modal = document.getElementById('addGrammarModal');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    
    floatingBtn.addEventListener('click', function() {
        modal.classList.remove('hidden');
    });
    
    closeModal.addEventListener('click', function() {
        modal.classList.add('hidden');
    });
    
    cancelBtn.addEventListener('click', function() {
        modal.classList.add('hidden');
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});

// Filter functionality
document.addEventListener('DOMContentLoaded', function() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.classList.add('bg-gray-100', 'hover:bg-gray-200', 'text-gray-700');
            });
            this.classList.add('active');
            this.classList.remove('bg-gray-100', 'hover:bg-gray-200', 'text-gray-700');
        });
    });
});

// Radio button functionality
document.addEventListener('DOMContentLoaded', function() {
    const radioInputs = document.querySelectorAll('input[type="radio"]');
    const radioDots = document.querySelectorAll('input[type="radio"] + div > div');
    
    radioInputs.forEach((input, index) => {
        input.addEventListener('change', function() {
            radioDots.forEach(dot => dot.classList.add('hidden'));
            if (this.checked) {
                radioDots[index].classList.remove('hidden');
            }
        });
    });
});

// Copy functionality
document.addEventListener('DOMContentLoaded', function() {
    const copyBtns = document.querySelectorAll('.copy-btn');
    
    copyBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('.grammar-row');
            const korean = row.querySelector('.korean-text').textContent;
            const example = row.querySelectorAll('.korean-text')[1].textContent;
            const copyText = `${korean}\n${example}`;
            
            navigator.clipboard.writeText(copyText).then(() => {
                const icon = this.querySelector('i');
                icon.className = 'ri-check-line text-green-500';
                setTimeout(() => {
                    icon.className = 'ri-file-copy-line text-gray-400 hover:text-primary';
                }, 2000);
            });
        });
    });
});

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const grammarRows = Array.from(document.querySelectorAll('.grammar-row'));
    const grammarCards = Array.from(document.querySelectorAll('.grammar-card')); // mobile cards
    const toggleBtn = document.getElementById('toggleLoadBtn');
    let expanded = false;

    // Initially show only last 3 (most recent assuming sorted desc on server)
    function applyInitialLimit() {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const showCount = isMobile ? 3 : 8;
        grammarRows.forEach((row, index) => {
            row.dataset.index = index;
            row.style.display = index < showCount ? '' : 'none';
        });
        // Mobile card visibility mirrors rows logic (show top 3 by default)
        if (isMobile) {
            grammarCards.forEach((card, index) => {
                card.style.display = index < 3 ? 'block' : 'none';
            });
        } else {
            // On desktop, cards view is hidden via CSS; collapse
            grammarCards.forEach(card => card.style.display = 'none');
        }
        if (toggleBtn) toggleBtn.textContent = 'Load More Grammar Rules';
        expanded = false;
    }

    applyInitialLimit();

    // Keep expanded state across viewport changes (mobile browser UI show/hide)
    function syncVisibility() {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (expanded) {
            // show all, regardless of breakpoint
            grammarRows.forEach(row => { row.style.display = ''; });
            // cards are only visible on mobile
            if (isMobile) {
                grammarCards.forEach(card => { card.style.display = 'block'; });
            } else {
                grammarCards.forEach(card => { card.style.display = 'none'; });
            }
            return;
        }
        // when not expanded, apply the initial collapsed layout
        applyInitialLimit();
    }

    window.addEventListener('resize', syncVisibility);
    window.addEventListener('orientationchange', syncVisibility);

    // Toggle load more / less
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            expanded = !expanded;
            if (expanded) {
                grammarRows.forEach(row => { row.style.display = ''; });
                grammarCards.forEach(card => { card.style.display = 'block'; });
                toggleBtn.textContent = 'Load Less';
            } else {
                applyInitialLimit();
            }
        });
    }
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        grammarRows.forEach(row => {
            const korean = row.querySelector('.korean-text').textContent.toLowerCase();
            const english = row.querySelector('.english-text').textContent.toLowerCase();
            const match = korean.includes(searchTerm) || english.includes(searchTerm);
            row.style.display = match ? '' : 'none';
        });

        // If search is empty and not expanded, re-apply initial last 3 rule
        if (!this.value && !expanded) applyInitialLimit();
    });

    // Mobile card expand/collapse on tap
    // Expand/collapse cards on mobile: show/hide examples
    grammarCards.forEach(card => {
        card.addEventListener('click', () => {
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            if (!isMobile) return;
            // toggle this card
            const isOpen = card.classList.contains('is-open');
            // close others
            grammarCards.forEach(c => c.classList.remove('is-open'));
            if (!isOpen) card.classList.add('is-open');
        });
    });

    // close open card when clicking outside
    document.addEventListener('click', (e) => {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (!isMobile) return;
        const clickedCard = e.target.closest('.grammar-card');
        if (!clickedCard) {
            grammarCards.forEach(c => c.classList.remove('is-open'));
        }
    });
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
                    source[parentKey] = val;
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

// Allow normal form submissions for adding grammar rules
