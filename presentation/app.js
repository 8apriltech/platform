/* ==========================================================================
   8April Tech Presentation Experience — Core Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initSlideNavigation();
    initHeroCanvas();
    initPlatformDiagram();
    initCasesTabs();
    initSpotlightEffect();
});

/* ==========================================================================
   1. Navegação de Slides e Controle de Teclado
   ========================================================================== */
function initSlideNavigation() {
    const container = document.querySelector('.presentation-container');
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot-item');
    const currentNum = document.getElementById('current-slide-num');
    const currentTitle = document.getElementById('current-slide-title');

    // Mapeamento de títulos dos slides
    const slideTitles = [
        'INÍCIO',
        'O PROBLEMA',
        'A PLATAFORMA',
        'AGENTES DE IA',
        'PRODUTOS',
        'CORPORATIVO',
        'ARQUITETURA',
        'CASOS DE USO',
        'DIFERENCIAIS',
        'CONTATO'
    ];

    let currentActiveIndex = 0;

    // Configurar Intersection Observer para detectar o slide ativo
    const observerOptions = {
        root: container,
        threshold: 0.5, // Slide é considerado ativo se 50% dele estiver visível
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const activeSlide = entry.target;
                const index = Array.from(slides).indexOf(activeSlide);
                currentActiveIndex = index;
                
                // Atualizar classes nos slides
                slides.forEach(s => s.classList.remove('active'));
                activeSlide.classList.add('active');

                // Atualizar dots laterais
                dots.forEach(d => d.classList.remove('active'));
                if (dots[index]) dots[index].classList.add('active');

                // Atualizar cabeçalho
                if (currentNum) {
                    currentNum.textContent = String(index + 1).padStart(2, '0');
                }
                if (currentTitle) {
                    currentTitle.textContent = slideTitles[index] || 'PLATFORM';
                }
            }
        });
    }, observerOptions);

    slides.forEach(slide => observer.observe(slide));

    // Navegação ao clicar nos dots laterais
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            if (slides[index]) {
                slides[index].scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Controle de Teclado para navegação fluida
    window.addEventListener('keydown', (e) => {
        // Bloquear evento padrão para teclas específicas
        const keysToBlock = ['ArrowUp', 'ArrowDown', 'Space', 'PageUp', 'PageDown'];
        if (keysToBlock.includes(e.code)) {
            e.preventDefault();
        }

        let targetIndex = currentActiveIndex;

        if (e.code === 'ArrowDown' || e.code === 'Space' || e.code === 'PageDown') {
            if (currentActiveIndex < slides.length - 1) {
                targetIndex = currentActiveIndex + 1;
            }
        } else if (e.code === 'ArrowUp' || (e.code === 'Space' && e.shiftKey) || e.code === 'PageUp') {
            if (currentActiveIndex > 0) {
                targetIndex = currentActiveIndex - 1;
            }
        }

        if (targetIndex !== currentActiveIndex && slides[targetIndex]) {
            slides[targetIndex].scrollIntoView({ behavior: 'smooth' });
        }
    }, { passive: false });
}

/* ==========================================================================
   2. Canvas de Partículas Interativas (Hero Background)
   ========================================================================== */
function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 60;
    let mouse = { x: null, y: null, radius: 150 };

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 2 + 1;
            this.color = Math.random() > 0.5 ? 'rgba(0, 242, 254, 0.4)' : 'rgba(0, 82, 255, 0.3)';
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Limites de tela
            if (this.x < 0 || this.x > width) this.vx = -this.vx;
            if (this.y < 0 || this.y > height) this.vy = -this.vy;

            // Repulsão ou atração leve do mouse
            if (mouse.x && mouse.y) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouse.radius) {
                    const force = (mouse.radius - dist) / mouse.radius;
                    this.x -= (dx / dist) * force * 1.5;
                    this.y -= (dy / dist) * force * 1.5;
                }
            }
        }
    }

    // Inicializar partículas
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        // Desenhar e conectar partículas
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 242, 254, ${0.15 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        
        requestAnimationFrame(animate);
    }

    animate();
}

/* ==========================================================================
   3. Conexões Dinâmicas do Diagrama da Plataforma (Slide 03)
   ========================================================================== */
function initPlatformDiagram() {
    const orchestration = document.querySelector('.platform-orchestration');
    const core = document.querySelector('.core-hub-container');
    const nodes = document.querySelectorAll('.peripheral-node');
    const paths = document.querySelectorAll('.flow-path');

    if (!orchestration || !core || nodes.length === 0) return;

    function updateConnectionPaths() {
        const parentRect = orchestration.getBoundingClientRect();
        const coreRect = core.getBoundingClientRect();
        
        const coreX = (coreRect.left + coreRect.width / 2) - parentRect.left;
        const coreY = (coreRect.top + coreRect.height / 2) - parentRect.top;

        const classToPath = {
            'node-pos-crm': '.path-crm',
            'node-pos-fin': '.path-fin',
            'node-pos-bi': '.path-bi',
            'node-pos-onb': '.path-onb',
            'node-pos-deals': '.path-deals',
            'node-pos-ops': '.path-ops'
        };

        nodes.forEach(node => {
            const nodeRect = node.getBoundingClientRect();
            const nodeX = (nodeRect.left + nodeRect.width / 2) - parentRect.left;
            const nodeY = (nodeRect.top + nodeRect.height / 2) - parentRect.top;

            // Encontrar a classe correspondente
            let pathClass = '';
            for (let cls in classToPath) {
                if (node.classList.contains(cls)) {
                    pathClass = classToPath[cls];
                    break;
                }
            }

            if (pathClass) {
                const pathEl = orchestration.querySelector(pathClass);
                if (pathEl) {
                    // Desenha uma curva cúbica elegante em direção ao centro
                    const controlX = (nodeX + coreX) / 2;
                    const pathData = `M ${nodeX} ${nodeY} C ${controlX} ${nodeY}, ${controlX} ${coreY}, ${coreX} ${coreY}`;
                    pathEl.setAttribute('d', pathData);
                }
            }
        });
    }

    // Executar no início e em resizes
    setTimeout(updateConnectionPaths, 200);
    window.addEventListener('resize', updateConnectionPaths);
}

/* ==========================================================================
   4. Abas da Seção de Casos de Uso (Slide 08)
   ========================================================================== */
function initCasesTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');

            // Remover classes ativas de botões e painéis
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // Adicionar classes ativas
            btn.classList.add('active');
            const targetPane = document.getElementById(tabId);
            if (targetPane) targetPane.classList.add('active');
        });
    });
}

/* ==========================================================================
   5. Efeito Radial Spotlight (Vercel-like hover) nos Diferenciais
   ========================================================================== */
function initSpotlightEffect() {
    const cards = document.querySelectorAll('.diff-card, .product-card, .agent-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Define o spotlight de borda usando radial gradient
            card.style.background = `radial-gradient(circle 120px at ${x}px ${y}px, rgba(255, 255, 255, 0.05), transparent 80%), var(--glass-bg)`;
            card.style.borderColor = `rgba(255, 255, 255, 0.15)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.background = 'var(--glass-bg)';
            card.style.borderColor = 'var(--glass-border)';
        });
    });
}
