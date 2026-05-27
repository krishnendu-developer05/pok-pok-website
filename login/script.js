// Initialize Lucide icons
lucide.createIcons();

// GSAP Plugins
gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
    // Fade in container
    gsap.to('.hero-container', { opacity: 1, duration: 1.2, ease: "power2.inOut" });
    
    // Animate Background Blobs — vivid, organic, always moving
    const blobs = document.querySelectorAll('.blob');
    blobs.forEach((blob, i) => {
        // Each blob gets its own unique motion path
        gsap.to(blob, {
            x: () => gsap.utils.random(-400, 400),
            y: () => gsap.utils.random(-400, 400),
            scale: () => gsap.utils.random(0.7, 1.6),
            rotation: () => gsap.utils.random(-60, 60),
            duration: () => gsap.utils.random(10, 20),
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: i * 1.5
        });
    });
    
    // Elastic entrance for main title
    gsap.from('.title', {
        y: -60,
        scale: 0.5,
        opacity: 0,
        duration: 2,
        ease: "elastic.out(1, 0.3)",
        delay: 0.2
    });

    // Fade in the quote container
    gsap.from('.quote-container', {
        opacity: 0,
        y: 20,
        duration: 0.8,
        delay: 0.5,
        ease: "power2.out"
    });
    
    // Slide up login card
    gsap.from('.login-card', {
        y: 80,
        scale: 0.9,
        opacity: 0,
        duration: 1.2,
        ease: "back.out(1.2)",
        delay: 0.4
    });
    
    // Parallax interactive floating shapes
    gsap.from('.interactive-shape', {
        opacity: 0,
        scale: 0,
        rotation: 180,
        duration: 1.5,
        stagger: 0.2,
        ease: "back.out(1.5)",
        delay: 0.8
    });

    // Scroll Indicator animation
    gsap.from('.scroll-indicator', {
        opacity: 0,
        y: 20,
        duration: 1,
        delay: 1.5
    });

    // Scroll Animations for Members and Events Sections
    gsap.utils.toArray('.gs-reveal-event').forEach(function(elem) {
        gsap.from(elem, {
            scrollTrigger: {
                trigger: elem,
                start: "top 85%", 
                toggleActions: "play none none reverse"
            },
            y: 80,
            opacity: 0,
            scale: 0.9,
            duration: 1.2,
            ease: "back.out(1.2)"
        });
    });
});

// Fun tap/click interaction for the title
const titleEl = document.getElementById('main-title');
if(titleEl) {
    titleEl.addEventListener('click', () => {
        // High-end UI Squish and stretch wobble
        gsap.fromTo(titleEl, 
            { scaleX: 1, scaleY: 1, rotation: 0 },
            { 
                scaleX: 1.25, 
                scaleY: 0.75, 
                rotation: gsap.utils.random(-5, 5),
                duration: 0.15, 
                yoyo: true, 
                repeat: 1,
                ease: "power1.inOut",
                onComplete: () => {
                    gsap.to(titleEl, { 
                        scaleX: 1, 
                        scaleY: 1, 
                        rotation: 0,
                        duration: 1, 
                        ease: "elastic.out(1.5, 0.2)" 
                    });
                }
            }
        );
    });
}

// Mouse movement parallax for shapes (desktop mainly, but works if touched on mobile)
document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 40;
    const y = (e.clientY / window.innerHeight - 0.5) * 40;
    
    gsap.to('.shape-1', { x: x * 1.5, y: y * 1.5, duration: 1, ease: "power2.out" });
    gsap.to('.shape-2', { x: x * -1, y: y * 1.2, duration: 1, ease: "power2.out" });
    gsap.to('.shape-3', { x: x * 1.2, y: y * -1.5, duration: 1, ease: "power2.out" });
    gsap.to('.shape-4', { x: x * -1.5, y: y * -1, duration: 1, ease: "power2.out" });
});

// Scroll down button logic now points to members section
const scrollIndicator = document.getElementById('scroll-indicator');
if(scrollIndicator) {
    scrollIndicator.addEventListener('click', () => {
        document.getElementById('members-section').scrollIntoView({ behavior: 'smooth' });
    });
}

// Theme toggle logic
const themeToggleBtn = document.getElementById('theme-toggle');
const root = document.documentElement;

const savedTheme = localStorage.getItem('chaos-theme');
if (savedTheme) {
    root.setAttribute('data-theme', savedTheme);
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark');
} else {
    root.setAttribute('data-theme', 'light');
}

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Fun spin animation
    gsap.to(themeToggleBtn, {
        rotation: "+=360",
        scale: 1.2,
        duration: 0.6,
        ease: "back.out(1.5)",
        onComplete: () => gsap.to(themeToggleBtn, {scale: 1})
    });
    
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('chaos-theme', newTheme);
});

// Background blobs pulse on scroll for extra depth
window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    gsap.to('.blob-1', { x: scrollY * 0.1, y: scrollY * -0.05, duration: 1, ease: "power1.out" });
    gsap.to('.blob-2', { x: scrollY * -0.08, y: scrollY * 0.06, duration: 1, ease: "power1.out" });
    gsap.to('.blob-3', { x: scrollY * 0.06, y: scrollY * 0.08, duration: 1, ease: "power1.out" });
    gsap.to('.blob-4', { x: scrollY * -0.1, y: scrollY * -0.07, duration: 1, ease: "power1.out" });
});

// 20 Funny/Emotional B.Tech Quotes
const quotes = [
    "Probably debugging. Probably crying.",
    "Attendance: 74.9%. We live on the edge.",
    "One login away from dropping out.",
    "Gamers. Coders. Sleep deprived.",
    "Today's probability of passing: 3%.",
    "We don't need sleep, we need coffee.",
    "4 years of engineering, 40 years of trauma.",
    "The code works, but we don't know why.",
    "Ctrl+C, Ctrl+V, and Insha'Allah.",
    "Friends who fail together, stay together.",
    "WiFi > Lectures. Always.",
    "Our backup plan is also failing.",
    "GPA is just a number. A very sad number.",
    "Deadline tomorrow? Start tomorrow.",
    "We peaked in 12th grade.",
    "Hostel food built different. So did our immunity.",
    "Professor said 'easy paper'. We cried anyway.",
    "One brain cell. Shared among 5 friends.",
    "Running on caffeine, copium, and vibes.",
    "Semester ends. Trauma doesn't."
];

let currentQuoteIdx = 0;
const dynamicQuoteEl = document.getElementById('dynamic-quote');
dynamicQuoteEl.textContent = quotes[currentQuoteIdx];

// 4 different transition styles for variety
const transitions = [
    // 1. Slide up
    {
        out: { y: -25, opacity: 0, scale: 1, rotation: 0 },
        in:  { y: 25 },
        back: { y: 0, opacity: 1, scale: 1, rotation: 0 }
    },
    // 2. Scale pop
    {
        out: { y: 0, opacity: 0, scale: 0.5, rotation: 0 },
        in:  { y: 0, scale: 1.3 },
        back: { y: 0, opacity: 1, scale: 1, rotation: 0 }
    },
    // 3. Slide right
    {
        out: { x: -40, opacity: 0, scale: 1, rotation: 0 },
        in:  { x: 40 },
        back: { x: 0, opacity: 1, scale: 1, rotation: 0 }
    },
    // 4. Tilt away
    {
        out: { y: -15, opacity: 0, scale: 0.9, rotation: -8 },
        in:  { y: 15, rotation: 8 },
        back: { y: 0, opacity: 1, scale: 1, rotation: 0 }
    }
];

// Cycle quotes every 3s with randomized transitions
setInterval(() => {
    const t = transitions[Math.floor(Math.random() * transitions.length)];
    
    gsap.to(dynamicQuoteEl, {
        ...t.out,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => {
            currentQuoteIdx = (currentQuoteIdx + 1) % quotes.length;
            dynamicQuoteEl.textContent = quotes[currentQuoteIdx];
            
            gsap.set(dynamicQuoteEl, t.in);
            
            gsap.to(dynamicQuoteEl, {
                ...t.back,
                duration: 0.45,
                ease: "back.out(1.4)"
            });
        }
    });
}, 3000);

// Form Transition Logic (Login <-> Signup)
const formsWrapper = document.querySelector('.forms-wrapper');
const goToSignupBtn = document.getElementById('go-to-signup');
const goToLoginBtn = document.getElementById('go-to-login');

goToSignupBtn.addEventListener('click', () => {
    gsap.to(formsWrapper, {
        x: '-50%',
        duration: 0.7,
        ease: "back.inOut(1.2)"
    });
});

goToLoginBtn.addEventListener('click', () => {
    gsap.to(formsWrapper, {
        x: '0%',
        duration: 0.7,
        ease: "back.inOut(1.2)"
    });
});

// Form Submit Logic
const handleFormSubmit = (formId, btnId) => {
    const form = document.getElementById(formId);
    const btn = document.getElementById(btnId);
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    const errorMsg = formId === 'login-form' ? document.getElementById('error-message') : null;

    const loadingMessages = [
        "Compiling code...",
        "Convincing professor...",
        "Rolling academic dice...",
        "Fixing a bug from 2014..."
    ];

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (errorMsg) errorMsg.classList.add('hidden');
        
        // Button squish effect
        gsap.to(btn, { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 });

        const randomLoadMsg = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
        btnText.classList.add('hidden');
        btnLoader.textContent = randomLoadMsg;
        btnLoader.classList.remove('hidden');
        
        btn.style.pointerEvents = 'none';
        
        setTimeout(() => {
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
            btn.style.pointerEvents = 'auto';
            
            if (errorMsg) {
                errorMsg.classList.remove('hidden');
                // Erratic, funny shake for error
                gsap.fromTo(errorMsg, 
                    { x: -10, rotation: -2 }, 
                    { x: 10, rotation: 2, duration: 0.08, yoyo: true, repeat: 5, ease: "power1.inOut", onComplete: () => gsap.set(errorMsg, {x: 0, rotation: 0}) }
                );
            } else {
                btnText.textContent = "Welcome to the Chaos";
                setTimeout(() => {
                    gsap.to(formsWrapper, { x: '0%', duration: 0.8, ease: "back.inOut(1.2)" });
                    btnText.textContent = "Sign Me Up"; 
                }, 1500);
            }
        }, 2000);
    });
};

handleFormSubmit('login-form', 'login-btn');
handleFormSubmit('signup-form', 'signup-btn');
