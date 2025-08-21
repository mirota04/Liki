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
        case 'login':
            window.location.href = '/login';
        default:
            console.warn(`Unknown page: ${page}`);
            break;
    }
}

// Progress animation
document.addEventListener('DOMContentLoaded', function() {
    const progressCircle = document.querySelector('.progress-ring-circle');
    const progressValue = 70;
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (progressValue / 100) * circumference;
    setTimeout(() => {
        progressCircle.style.strokeDashoffset = offset;
    }, 500);
});

// Card interactions
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.card-hover');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});

// Button interactions
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.btn-primary');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
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
