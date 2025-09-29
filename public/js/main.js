/**
 * Unify Bot - Main JavaScript
 * 
 * Este archivo maneja la funcionalidad interactiva del sitio web,
 * incluyendo el menú móvil, el tema oscuro, animaciones y más.
 */

// Configuración de la aplicación Discord
const DISCORD_CLIENT_ID = '1397383318063812678';
const DISCORD_REDIRECT_URI = encodeURIComponent(window.location.origin + '/auth/discord/callback');
const DISCORD_SCOPE = 'identify email guilds';
const DISCORD_AUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${DISCORD_REDIRECT_URI}&response_type=code&scope=${DISCORD_SCOPE}`;

// Constantes
const THEME_KEY = 'unify-theme';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';
const PREFERS_DARK = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Elementos del DOM
let menuToggle, mobileMenuToggle, navLinks, overlay, themeToggle, loginButton, heroLoginButton, html, faqItems;

// Inicialización principal
document.addEventListener('DOMContentLoaded', function() {
    // Obtener elementos del DOM
    menuToggle = document.querySelector('.mobile-menu-toggle');
    mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    navLinks = document.querySelector('.nav-links');
    overlay = document.querySelector('.overlay');
    themeToggle = document.querySelector('.theme-toggle');
    loginButton = document.querySelector('.btn-login');
    heroLoginButton = document.querySelector('.hero-cta .btn-primary');
    faqItems = document.querySelectorAll('.faq-item');
    html = document.documentElement;
    
    // Inicializar componentes
    initTheme();
    initMobileMenu();
    initFAQ();
    initAnimations();
    initSmoothScroll();
    
    // Inicializar botones de inicio de sesión
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    
    if (heroLoginButton) {
        heroLoginButton.addEventListener('click', handleLogin);
    }
    
    // Manejar el botón de cambio de tema
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Verificar respuesta de autenticación
    checkAuthResponse();
    
    // Inicializar contadores animados
    initCounters();
    
    // Cargar más elementos al hacer scroll
    window.addEventListener('scroll', handleScroll);
    
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
    
    // Inicializar el tema
    function initTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY) || (PREFERS_DARK ? THEME_DARK : THEME_LIGHT);
        setTheme(savedTheme);
        updateThemeIcon(savedTheme);
        
        // Escuchar cambios en la preferencia del sistema
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem(THEME_KEY)) {
                const newTheme = e.matches ? THEME_DARK : THEME_LIGHT;
                setTheme(newTheme);
                updateThemeIcon(newTheme);
            }
        });
    }
    
    // Cambiar entre temas claro y oscuro
    function toggleTheme() {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
        setTheme(newTheme);
        updateThemeIcon(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
    }
    
    // Establecer el tema
    function setTheme(theme) {
        html.setAttribute('data-theme', theme);
        document.body.classList.toggle('dark-mode', theme === THEME_DARK);
    }
    
    // Actualizar el ícono del tema
    function updateThemeIcon(theme) {
        if (!themeToggle) return;
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = theme === THEME_DARK ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
    
    // Inicializar el menú móvil
    function initMobileMenu() {
        if (!mobileMenuToggle || !navLinks || !overlay) return;
        
        const toggleMenu = () => {
            const isOpen = navLinks.classList.toggle('active');
            mobileMenuToggle.setAttribute('aria-expanded', isOpen);
            overlay.classList.toggle('active', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
            
            // Cambiar ícono del botón
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
            }
        };
        
        // Toggle del menú
        mobileMenuToggle.addEventListener('click', toggleMenu);
        
        // Cerrar menú al hacer clic en un enlace
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 992) {
                    toggleMenu();
                }
            });
        });
        
        // Cerrar menú al hacer clic en el overlay
        overlay.addEventListener('click', toggleMenu);
        
        // Cerrar menú con la tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                toggleMenu();
            }
        });
    }
    
    // Inicializar el acordeón de preguntas frecuentes
    function initFAQ() {
        if (!faqItems.length) return;
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            if (!question) return;
            
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Cerrar otros ítems
                faqItems.forEach(i => {
                    if (i !== item) {
                        i.classList.remove('active');
                    }
                });
                
                // Alternar el ítem actual
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }
    
    // Inicializar animaciones
    function initAnimations() {
        // Configuración del Intersection Observer para animaciones al hacer scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        // Observar elementos con la clase 'animate-on-scroll'
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }
    
    // Inicializar scroll suave para enlaces internos
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
                    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - (headerHeight + 20);
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
    
    // Inicializar contadores animados
    function initCounters() {
        const counters = document.querySelectorAll('.stat-number');
        if (!counters.length) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = +entry.target.getAttribute('data-target');
                    const suffix = entry.target.getAttribute('data-suffix') || '';
                    animateValue(entry.target, 0, target, 2000, suffix);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        counters.forEach(counter => observer.observe(counter));
    }
    
    // Función para animar valores numéricos
    function animateValue(element, start, end, duration, suffix = '') {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            element.textContent = value.toLocaleString() + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
    
    // Manejar scroll infinito o carga perezosa
    function handleScroll() {
        // Ejemplo de carga perezosa de imágenes
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            if (isInViewport(img)) {
                img.src = img.getAttribute('data-src');
                img.removeAttribute('data-src');
            }
        });
        
        // Aquí podrías agregar más lógica de carga bajo demanda
    }
    
    // Verificar si un elemento está en el viewport
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
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
