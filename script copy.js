document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('high-score');
    const livesCounterElement = document.getElementById('lives-counter');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const expElement = document.getElementById('exp'); // Nuevo elemento para mostrar EXP

    // Configuración del juego
    const gridSize = 20;
    const tileCount = canvas.width / gridSize;
    let speed = 7;
    const baseSpeed = 7;
    
    // Variables del juego
    let snake = [];
    let food = {};
    let enemies = []; // Array para almacenar enemigos temporales
    let velocityX = 0;
    let velocityY = 0;
    let nextVelocityX = 0;
    let nextVelocityY = 0;
    let lastUpdateTime = 0;
    let score = 0;
    let highScore = localStorage.getItem('snakeHighScore') || 0;
    let gameRunning = false;
    let gameOver = false;
    let gameLoop;
    let initialSpeed = 7;
    let waitingForFirstMove = true;
    let lives = 0; // Contador de vidas extra
    let enemyMultiplier = 1; // Multiplicador de enemigos
    let exp = 0; // Experiencia acumulada
    let deathAnimations = []; // Animaciones de muerte de enemigos
    let paused = false; // Nueva variable para controlar la pausa

    // Inicializar el juego
    function initGame() {
        // Inicializar la serpiente
        snake = [
            { x: 10, y: 10 }
        ];
        
        // Inicializar la comida
        placeFood();
        
        // Reiniciar variables
        velocityX = 0;
        velocityY = 0;
        nextVelocityX = 0;
        nextVelocityY = 0;
        lastUpdateTime = 0;
        score = 0;
        gameOver = false;
        waitingForFirstMove = true;
        speed = baseSpeed;
        enemies = []; // Limpiar enemigos
        lives = 0; // Reiniciar vidas
        enemyMultiplier = 1; // Reiniciar multiplicador de enemigos
        exp = 0; // Reiniciar experiencia
        deathAnimations = []; // Limpiar animaciones de muerte
        
        // Actualizar puntuación
        scoreElement.textContent = score;
        highScoreElement.textContent = highScore;
        livesCounterElement.textContent = lives;
        expElement.textContent = exp; // Actualizar EXP
        
        // Dibujar el estado inicial
        draw();
    }
    
    // Crear un enemigo en posición aleatoria
    function createEnemy() {
        // Solo crear enemigos si el juego está en marcha
        if (!gameRunning || gameOver) return;
        
        // Crear múltiples enemigos según el multiplicador actual
        for (let i = 0; i < enemyMultiplier; i++) {
            createSingleEnemy();
        }
        
        // Programar la creación del próximo grupo de enemigos en un tiempo aleatorio entre 2 y 5 segundos
        const nextEnemyDelay = 2000 + Math.random() * 3000;
        setTimeout(createEnemy, nextEnemyDelay);
    }
    
    // Función auxiliar para crear un solo enemigo
    function createSingleEnemy() {
        const enemy = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount),
            createdAt: Date.now(),
            duration: 10000 // 10 segundos en milisegundos
        };

        let validPosition = true;

        // Verificar colisión con la serpiente
        for (let segment of snake) {
            if (segment.x === enemy.x && segment.y === enemy.y) {
                validPosition = false;
                break;
            }
        }

        // Verificar colisión con la comida
        if (food.x === enemy.x && food.y === enemy.y) {
            validPosition = false;
        }

        // Verificar colisión con otros enemigos
        for (let existingEnemy of enemies) {
            if (existingEnemy.x === enemy.x && existingEnemy.y === enemy.y) {
                validPosition = false;
                break;
            }
        }

        // Evitar que el enemigo aparezca frente a la serpiente en los próximos 5 cuadros
        if (validPosition) {
            for (let i = 1; i <= 5; i++) {
                const futureX = snake[0].x + velocityX * i;
                const futureY = snake[0].y + velocityY * i;

                // Ajustar para teleportación en los bordes
                const adjustedX = (futureX + tileCount) % tileCount;
                const adjustedY = (futureY + tileCount) % tileCount;

                if (enemy.x === adjustedX && enemy.y === adjustedY) {
                    validPosition = false;
                    break;
                }
            }
        }

        // Si la posición no es válida, intentar de nuevo con una posición diferente
        if (!validPosition) {
            for (let attempt = 0; attempt < 5; attempt++) {
                enemy.x = Math.floor(Math.random() * tileCount);
                enemy.y = Math.floor(Math.random() * tileCount);

                validPosition = true;

                // Repetir las verificaciones
                for (let segment of snake) {
                    if (segment.x === enemy.x && segment.y === enemy.y) {
                        validPosition = false;
                        break;
                    }
                }

                if (food.x === enemy.x && food.y === enemy.y) {
                    validPosition = false;
                    continue;
                }

                for (let existingEnemy of enemies) {
                    if (existingEnemy.x === enemy.x && existingEnemy.y === enemy.y) {
                        validPosition = false;
                        break;
                    }
                }

                for (let i = 1; i <= 5; i++) {
                    const futureX = snake[0].x + velocityX * i;
                    const futureY = snake[0].y + velocityY * i;

                    const adjustedX = (futureX + tileCount) % tileCount;
                    const adjustedY = (futureY + tileCount) % tileCount;

                    if (enemy.x === adjustedX && enemy.y === adjustedY) {
                        validPosition = false;
                        break;
                    }
                }

                if (validPosition) break;
            }

            if (!validPosition) return;
        }

        enemies.push(enemy);
    }

    // Colocar comida en posición aleatoria
    function placeFood() {
        food = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        
        // Evitar que la comida aparezca sobre la serpiente
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                placeFood();
                break;
            }
        }
    }

    // Verifica si un enemigo está completamente rodeado por la serpiente
    function isEnemyEnclosed(enemy) {
        const offsets = [
            {dx: -1, dy: -1}, {dx: -1, dy: 0}, {dx: -1, dy: 1},
            {dx: 0, dy: -1},               {dx: 0, dy: 1},
            {dx: 1, dy: -1},  {dx: 1, dy: 0}, {dx: 1, dy: 1},
        ];
        for (let offset of offsets) {
            let checkX = (enemy.x + offset.dx + tileCount) % tileCount;
            let checkY = (enemy.y + offset.dy + tileCount) % tileCount;
            if (!snake.some(segment => segment.x === checkX && segment.y === checkY)) {
                return false;
            }
        }
        return true;
    }

    // Función principal de dibujo
    function draw() {
        // Nuevo fondo de la grilla con tono café intermedio
        ctx.fillStyle = '#6D4C41'; // color café intermedio
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar la malla cuadriculada con color claro para mayor contraste
        ctx.strokeStyle = 'rgba(127, 161, 72, 0.2)'; // líneas sutiles en blanco
        ctx.lineWidth = 1;
        for (let i = 0; i <= tileCount; i++) {
            let pos = i * gridSize;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(canvas.width, pos);
            ctx.stroke();
        }
        
        if (gameOver) {
            drawGameOver();
            return;
        }
        
        // Dibujar la comida como una manzana
        const appleX = food.x * gridSize;
        const appleY = food.y * gridSize;
        const appleSize = gridSize;
        
        // Cuerpo de la manzana (rojo)
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(appleX + appleSize/2, appleY + appleSize/2, appleSize/2 - 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Tallo de la manzana (marrón)
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(appleX + appleSize/2 - 1, appleY, 2, appleSize/4);
        
        // Hoja de la manzana (verde)
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.ellipse(appleX + appleSize/2 + 3, appleY + appleSize/6, 3, 5, Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        
        // Dibujar enemigos
        const currentTime = Date.now();
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const elapsedTime = currentTime - enemy.createdAt;
            
            // Eliminar enemigos que han expirado
            if (elapsedTime >= enemy.duration) {
                enemies.splice(i, 1);
                continue;
            }
            
            // Calcular opacidad basada en tiempo restante (efecto de desvanecimiento)
            const timeLeft = 1 - (elapsedTime / enemy.duration);
            
            // Dibujar enemigo
            const minOpacity = 0.4;
            const opacity = minOpacity + (timeLeft * (1 - minOpacity));
            ctx.fillStyle = `rgba(255, 0, 255, ${opacity.toFixed(2)})`;
            
            // Añadir un borde parpadeante cuando está por desaparecer (últimos 3 segundos)
            if (timeLeft < 0.3) {
                const blinkRate = 10 - (timeLeft * 20);
                const blink = Math.sin(currentTime * blinkRate / 1000) > 0;
                
                if (blink) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.lineWidth = 2;
                } else {
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
                    ctx.lineWidth = 2;
                }
            }
            
            // Dibujar enemigo como un diamante
            const centerX = enemy.x * gridSize + gridSize / 2;
            const centerY = enemy.y * gridSize + gridSize / 2;
            const size = gridSize / 2;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - size);
            ctx.lineTo(centerX + size, centerY);
            ctx.lineTo(centerX, centerY + size);
            ctx.lineTo(centerX - size, centerY);
            ctx.closePath();
            ctx.fill();
            
            if (timeLeft < 0.3) {
                ctx.stroke();
            }
            
            const radius = (gridSize / 3) * timeLeft;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Dibujar animaciones de muerte de enemigos
        for (let i = deathAnimations.length - 1; i >= 0; i--) {
            const anim = deathAnimations[i];
            const elapsed = currentTime - anim.created;
            if (elapsed >= anim.duration) {
                deathAnimations.splice(i, 1);
                continue;
            }
            const alpha = 1 - (elapsed / anim.duration);
            const centerX = anim.x * gridSize + gridSize / 2;
            const centerY = anim.y * gridSize + gridSize / 2;
            ctx.strokeStyle = `rgba(255, 0, 0, ${alpha.toFixed(2)})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX - gridSize/4, centerY - gridSize/4);
            ctx.lineTo(centerX + gridSize/4, centerY + gridSize/4);
            ctx.moveTo(centerX + gridSize/4, centerY - gridSize/4);
            ctx.lineTo(centerX - gridSize/4, centerY + gridSize/4);
            ctx.stroke();
        }
        
        // Dibujar la serpiente con forma circular
        snake.forEach((segment, index) => {
            if (index === 0) {
                ctx.fillStyle = '#4CAF50';
            } else {
                ctx.fillStyle = index % 2 === 0 ? '#388E3C' : '#2E7D32';
            }
            
            const centerX = segment.x * gridSize + gridSize / 2;
            const centerY = segment.y * gridSize + gridSize / 2;
            const radius = gridSize / 2 - 1;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            
            if (index === 0) {
                ctx.fillStyle = '#fff';
                
                let eyeOffsetX = 3;
                let eyeOffsetY = -3;
                let eyeSize = 3;
                
                if (velocityX === 1) {
                    eyeOffsetY = -3;
                    eyeOffsetX = 5;
                } else if (velocityX === -1) {
                    eyeOffsetY = -3;
                    eyeOffsetX = -5;
                } else if (velocityY === 1) {
                    eyeOffsetY = 5;
                    eyeOffsetX = -3;
                } else if (velocityY === -1) {
                    eyeOffsetY = -5;
                    eyeOffsetX = -3;
                }
                
                ctx.beginPath();
                ctx.arc(centerX - eyeOffsetX, centerY + eyeOffsetY, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(centerX + eyeOffsetX, centerY + eyeOffsetY, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    // Dibujar pantalla de Game Over
    function drawGameOver() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = '30px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('¡GAME OVER!', canvas.width / 2, canvas.height / 2 - 30);
        
        ctx.font = '20px Arial';
        ctx.fillText(`Puntuación: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
        
        ctx.font = '16px Arial';
        ctx.fillText('Presiona "Reiniciar" para jugar de nuevo', canvas.width / 2, canvas.height / 2 + 50);
    }

    // Actualizar el estado del juego
    function update() {
        if (gameOver || !gameRunning) return;
        
        // Si el juego está pausado, solo se redibuja la escena y se salta el movimiento
        if (paused) {
            draw();
            return;
        }
        
        if (nextVelocityX !== 0 || nextVelocityY !== 0) {
            const canChangeDirection = 
                (nextVelocityX !== 0 && velocityX === 0) || 
                (nextVelocityY !== 0 && velocityY === 0) ||
                (nextVelocityX !== -velocityX || nextVelocityY !== -velocityY);
                
            if (canChangeDirection) {
                velocityX = nextVelocityX;
                velocityY = nextVelocityY;
                nextVelocityX = 0;
                nextVelocityY = 0;
                
                if (waitingForFirstMove) {
                    waitingForFirstMove = false;
                }
            }
        }
        
        if (waitingForFirstMove) {
            draw();
            return;
        }
        
        const head = { x: snake[0].x + velocityX, y: snake[0].y + velocityY };
        
        if (head.x < 0) {
            head.x = tileCount - 1;
        } else if (head.x >= tileCount) {
            head.x = 0;
        }
        
        if (head.y < 0) {
            head.y = tileCount - 1;
        } else if (head.y >= tileCount) {
            head.y = 0;
        }
        
        let collisionWithEnemy = false;
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (head.x === enemy.x && head.y === enemy.y) {
                if (lives > 0) {
                    lives--;
                    livesCounterElement.textContent = lives;
                    score = Math.max(0, score - 150);
                    scoreElement.textContent = score;
                    enemyMultiplier *= 2;
                    
                    const lifeUsedText = document.createElement('div');
                    lifeUsedText.textContent = '¡VIDA USADA! -150 puntos';
                    lifeUsedText.style.position = 'absolute';
                    lifeUsedText.style.color = '#e91e63';
                    lifeUsedText.style.fontWeight = 'bold';
                    lifeUsedText.style.fontSize = '24px';
                    lifeUsedText.style.top = '50px';
                    lifeUsedText.style.left = '50%';
                    lifeUsedText.style.transform = 'translateX(-50%)';
                    lifeUsedText.style.textShadow = '0 0 5px white';
                    lifeUsedText.style.zIndex = '100';
                    document.body.appendChild(lifeUsedText);
                    
                    const enemyWarningText = document.createElement('div');
                    enemyWarningText.textContent = `¡PELIGRO! Enemigos x${enemyMultiplier}`;
                    enemyWarningText.style.position = 'absolute';
                    enemyWarningText.style.color = '#9c27b0';
                    enemyWarningText.style.fontWeight = 'bold';
                    enemyWarningText.style.fontSize = '20px';
                    enemyWarningText.style.top = '80px';
                    enemyWarningText.style.left = '50%';
                    enemyWarningText.style.transform = 'translateX(-50%)';
                    enemyWarningText.style.textShadow = '0 0 5px white';
                    enemyWarningText.style.zIndex = '100';
                    document.body.appendChild(enemyWarningText);
                    
                    setTimeout(() => {
                        document.body.removeChild(lifeUsedText);
                        document.body.removeChild(enemyWarningText);
                    }, 2000);
                    
                    enemies.splice(i, 1);
                } else {
                    collisionWithEnemy = true;
                }
                break;
            }
        }
        
        if (collisionWithEnemy) {
            endGame();
            return;
        }
        
        snake.unshift(head);
        
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            scoreElement.textContent = score;
            
            if (score > highScore) {
                highScore = score;
                highScoreElement.textContent = highScore;
                localStorage.setItem('snakeHighScore', highScore);
            }
            
            placeFood();
            
            const fruitsEaten = score / 10;
            if (fruitsEaten > 0 && fruitsEaten % 10 === 0) {
                speed = speed * 1.1;
                clearInterval(gameLoop);
                gameLoop = setInterval(update, 1000 / speed);
                console.log(`¡Velocidad aumentada a ${speed.toFixed(2)}!`);
            }
            
            if (fruitsEaten > 0 && fruitsEaten % 15 === 0) {
                lives++;
                livesCounterElement.textContent = lives;
                
                const livesGainedText = document.createElement('div');
                livesGainedText.textContent = '¡+1 VIDA!';
                livesGainedText.style.position = 'absolute';
                livesGainedText.style.color = '#4CAF50';
                livesGainedText.style.fontWeight = 'bold';
                livesGainedText.style.fontSize = '24px';
                livesGainedText.style.top = '50px';
                livesGainedText.style.left = '50%';
                livesGainedText.style.transform = 'translateX(-50%)';
                livesGainedText.style.textShadow = '0 0 5px white';
                livesGainedText.style.zIndex = '100';
                document.body.appendChild(livesGainedText);
                
                setTimeout(() => {
                    document.body.removeChild(livesGainedText);
                }, 2000);
                
                console.log(`¡Vida extra ganada! Vidas actuales: ${lives}`);
            }
        } else {
            snake.pop();
        }
        
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (isEnemyEnclosed(enemy)) {
                deathAnimations.push({ x: enemy.x, y: enemy.y, created: Date.now(), duration: 1000 });
                enemies.splice(i, 1);
                exp += 20;
                expElement.textContent = exp;
                if (exp >= 150) {
                    exp -= 150;
                    lives++;
                    livesCounterElement.textContent = lives;
                    const extraLifeText = document.createElement('div');
                    extraLifeText.textContent = '¡+1 VIDA por EXP!';
                    extraLifeText.style.position = 'absolute';
                    extraLifeText.style.color = '#4CAF50';
                    extraLifeText.style.fontWeight = 'bold';
                    extraLifeText.style.fontSize = '24px';
                    extraLifeText.style.top = '50px';
                    extraLifeText.style.left = '50%';
                    extraLifeText.style.transform = 'translateX(-50%)';
                    extraLifeText.style.textShadow = '0 0 5px white';
                    extraLifeText.style.zIndex = '100';
                    document.body.appendChild(extraLifeText);
                    setTimeout(() => {
                        document.body.removeChild(extraLifeText);
                    }, 2000);
                    expElement.textContent = exp;
                }
            }
        }
        
        draw();
    }

    // Finalizar el juego
    function endGame() {
        gameOver = true;
        gameRunning = false;
        clearInterval(gameLoop);
        draw();
    }

    // Iniciar el juego
    function startGame() {
        if (gameRunning) return;
        
        initGame();
        gameRunning = true;
        gameLoop = setInterval(update, 1000 / speed);
        
        setTimeout(createEnemy, 3000);
    }

    // Reiniciar el juego
    function restartGame() {
        clearInterval(gameLoop);
        speed = baseSpeed;
        startGame();
    }

    // Control de teclado
    document.addEventListener('keydown', (event) => {
        if (!gameRunning) return;
        
        // Si se presiona la tecla espaciador, alternar pausa
        if (event.key === ' ') {
            paused = !paused;
            return;
        }
        
        // Si se presiona una tecla de dirección y se estaba en pausa, despausar
        if (paused && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D'].includes(event.key)) {
            paused = false;
        }
        
        switch (event.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (velocityY !== 1) {
                    nextVelocityX = 0;
                    nextVelocityY = -1;
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (velocityY !== -1) {
                    nextVelocityX = 0;
                    nextVelocityY = 1;
                }
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (velocityX !== 1) {
                    nextVelocityX = -1;
                    nextVelocityY = 0;
                }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (velocityX !== -1) {
                    nextVelocityX = 1;
                    nextVelocityY = 0;
                }
                break;
        }
    });

    // Eventos de botones
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);

    highScoreElement.textContent = highScore;
    
    draw();
});
