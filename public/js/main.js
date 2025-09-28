// Configuración de la aplicación Discord
const DISCORD_CLIENT_ID = '1397383318063812678';
const DISCORD_REDIRECT_URI = encodeURIComponent(window.location.origin + '/auth/discord/callback');
const DISCORD_SCOPE = 'identify email guilds';
const DISCORD_AUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${DISCORD_REDIRECT_URI}&response_type=code&scope=${DISCORD_SCOPE}`;

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    const navContainer = document.getElementById('navContainer');
    const themeToggle = document.getElementById('themeToggle');
    const loginButton = document.getElementById('loginButton');
    const heroLoginButton = document.getElementById('heroLoginButton');
    const html = document.documentElement;
    
    // Inicializar botones de inicio de sesión
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    
    if (heroLoginButton) {
        heroLoginButton.addEventListener('click', handleLogin);
    }
    
    // Función para manejar el inicio de sesión
    function handleLogin() {
        // Mostrar mensaje de carga
        const originalText = loginButton ? loginButton.innerHTML : heroLoginButton.innerHTML;
        const loadingText = '<i class="fas fa-spinner fa-spin"></i> Redirigiendo...';
        
        if (loginButton) loginButton.innerHTML = loadingText;
        if (heroLoginButton) heroLoginButton.innerHTML = loadingText;
        
        // Redirigir a Discord OAuth
        window.location.href = DISCORD_AUTH_URL;
        
        // Restaurar texto original después de un tiempo por si hay un error
        setTimeout(() => {
            if (loginButton) loginButton.innerHTML = originalText;
            if (heroLoginButton) heroLoginButton.innerHTML = originalText;
        }, 3000);
    }
    
    // Verificar si hay un código de autorización en la URL (respuesta de Discord)
    function checkAuthResponse() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (code) {
            // Aquí deberías enviar el código a tu backend para intercambiarlo por un token de acceso
            console.log('Código de autorización recibido:', code);
            // fetch('/api/auth/discord', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ code })
            // })
            // .then(response => response.json())
            // .then(data => {
            //     // Manejar la respuesta del servidor
            //     console.log('Autenticación exitosa:', data);
            //     // Aquí podrías redirigir al usuario o actualizar la UI
            // })
            // .catch(error => {
            //     console.error('Error en la autenticación:', error);
            // });
        } else if (error) {
            console.error('Error de autenticación:', error);
            // Mostrar mensaje de error al usuario
            alert('Error al iniciar sesión con Discord. Por favor, inténtalo de nuevo.');
        }
    }
    
    // Ejecutar la verificación al cargar la página
    checkAuthResponse();
    
    // Define animateOnScroll function
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.feature-card, .step, .terms-section');
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;

            if (elementPosition < screenPosition) {
                element.classList.add('animate');
            }
        });
    };

    // Function to close mobile menu
    function closeMenu() {
        if (navLinks && navContainer && menuToggle) {
            navLinks.classList.remove('active');
            navContainer.classList.remove('active');
            menuToggle.classList.remove('active');
            
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    }

    // Initialize menu toggle if elements exist
    if (menuToggle && navLinks && navContainer) {
        // Toggle menu when clicking the menu button
        menuToggle.addEventListener('click', function(event) {
            event.stopPropagation();
            const isActive = navLinks.classList.toggle('active');
            navContainer.classList.toggle('active', isActive);
            menuToggle.classList.toggle('active', isActive);
            
            // Toggle menu/close icon
            const icon = menuToggle.querySelector('i');
            if (icon) {
                if (isActive) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when clicking a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (navLinks && navContainer && menuToggle && 
                !navContainer.contains(event.target) && 
                !menuToggle.contains(event.target)) {
                closeMenu();
            }
        });

        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 992) {
                closeMenu();
            }
        });
    }

    // Theme toggle functionality
    if (themeToggle) {
        // Function to update theme icon
        function updateThemeIcon(theme) {
            const icon = themeToggle.querySelector('i');
            if (!icon) return;
            
            if (theme === 'dark') {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }

        // Initialize theme
        function initTheme() {
            // Check for saved theme preference or use light theme by default
            const savedTheme = localStorage.getItem('theme');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
            
            // Apply theme
            html.setAttribute('data-theme', currentTheme);
            updateThemeIcon(currentTheme);
        }

        // Toggle theme
        function toggleTheme() {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            // Update theme
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        }

        // Initialize
        initTheme();

        // Add event listener
        themeToggle.addEventListener('click', toggleTheme);

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) { // Only if user hasn't set a preference
                const newTheme = e.matches ? 'dark' : 'light';
                html.setAttribute('data-theme', newTheme);
                updateThemeIcon(newTheme);
            }
        });
    }


    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Initialize animations
    window.addEventListener('load', animateOnScroll);
    window.addEventListener('scroll', animateOnScroll);

    // Active navigation highlighting
    const sections = document.querySelectorAll('section, .terms-container');
    const navLinkElements = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            
            if (pageYOffset >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinkElements.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // Feature cards hover effect
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
            this.style.boxShadow = '0 15px 30px rgba(108, 92, 231, 0.25)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.05)';
        });
    });

    // Animated counter for statistics
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Initialize counters when they become visible
    const statObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumber = entry.target.querySelector('.stat-number');
                if (statNumber) {
                    const target = parseInt(statNumber.getAttribute('data-target'));
                    if (!isNaN(target)) {
                        animateValue(statNumber, 0, target, 2000);
                        statObserver.unobserve(entry.target);
                    }
                }
            }
        });
    }, { threshold: 0.5 });

    // Observe stat items
    document.querySelectorAll('.stat-item').forEach(stat => {
        statObserver.observe(stat);
    });
});
