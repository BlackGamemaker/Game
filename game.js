const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const healthEl = document.getElementById('health');
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const goldEl = document.getElementById('gold');
const upgradeBtn = document.getElementById('upgradeBtn');
const weaponButtons = [...document.querySelectorAll('.weapon-button')];

const weaponTemplates = [
  {
    name: 'Cannonball',
    color: '#ffd15c',
    speed: 690,
    damage: 1,
    cooldown: 0.36,
    radius: 8,
    bounces: 0,
    blastRadius: 0,
    baseCost: 6,
  },
  {
    name: 'Bouncy Shot',
    color: '#6ce5ff',
    speed: 730,
    damage: 2,
    cooldown: 0.46,
    radius: 9,
    bounces: 1,
    blastRadius: 0,
    baseCost: 8,
  },
  {
    name: 'Explosive Shell',
    color: '#ff8b7a',
    speed: 620,
    damage: 3,
    cooldown: 0.78,
    radius: 10,
    bounces: 0,
    blastRadius: 72,
    baseCost: 10,
  },
];

const mouse = { x: canvas.width * 0.7, y: canvas.height * 0.45 };

function createGame() {
  return {
    score: 0,
    health: 5,
    wave: 1,
    gold: 0,
    reload: 0,
    weaponIndex: 0,
    upgrades: [0, 0, 0],
    castle: { x: 120, y: canvas.height - 110, w: 180, h: 90 },
    enemies: [],
    projectiles: [],
    particles: [],
    spawnQueue: 0,
    spawnCooldown: 0,
    waveText: 'Wave 1',
    gameOver: false,
  };
}

let game = createGame();

function weaponStats(index) {
  const template = weaponTemplates[index];
  const level = game.upgrades[index];
  return {
    ...template,
    damage: template.damage + level,
    speed: template.speed + level * 30,
    cooldown: Math.max(0.16, template.cooldown - level * 0.04),
    radius: template.radius + level * 0.5,
    blastRadius: template.blastRadius + level * 10,
    cost: template.baseCost + level * 4,
  };
}

function updateHud() {
  healthEl.textContent = String(game.health);
  scoreEl.textContent = String(game.score);
  waveEl.textContent = String(game.wave);
  goldEl.textContent = String(game.gold);

  weaponButtons.forEach((button, index) => {
    button.classList.toggle('active', index === game.weaponIndex);
  });
}

function setWeapon(index) {
  game.weaponIndex = index;
  updateHud();
}

function getTurretOrigin() {
  return {
    x: game.castle.x + 120,
    y: game.castle.y + 18,
  };
}

function spawnEnemy() {
  const minY = 80;
  const maxY = canvas.height - 180;
  const y = minY + Math.random() * (maxY - minY);
  const speed = 40 + game.wave * 8 + Math.random() * 25;
  const hp = 1 + Math.floor(game.wave / 4);
  const radius = 18 + Math.random() * 16;

  game.enemies.push({
    x: canvas.width + radius + 20,
    y,
    radius,
    speed,
    hp,
    maxHp: hp,
    drift: (Math.random() - 0.5) * 10,
  });
}

function startWave() {
  game.spawnQueue = 5 + game.wave * 2;
  game.spawnCooldown = 0.7;
}

function launchProjectile() {
  if (game.gameOver || game.reload > 0) {
    return;
  }

  const stats = weaponStats(game.weaponIndex);
  const origin = getTurretOrigin();
  const angle = Math.atan2(mouse.y - origin.y, mouse.x - origin.x);

  game.projectiles.push({
    x: origin.x,
    y: origin.y,
    vx: Math.cos(angle) * stats.speed,
    vy: Math.sin(angle) * stats.speed,
    radius: stats.radius,
    damage: stats.damage,
    color: stats.color,
    life: 2.2,
    bounces: stats.bounces,
    blastRadius: stats.blastRadius,
    explosive: stats.blastRadius > 0,
  });

  game.reload = stats.cooldown;
}

function addParticles(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i += 1) {
    const angle = (Math.PI * 2 * i) / amount + Math.random() * Math.PI;
    const speed = 50 + Math.random() * 120;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45 + Math.random() * 0.5,
      color,
      radius: 2 + Math.random() * 4,
    });
  }
}

function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  if (enemy.hp <= 0) {
    game.score += 10;
    game.gold += 2;
    addParticles(enemy.x, enemy.y, '#ffd477', 16);
    const idx = game.enemies.indexOf(enemy);
    if (idx >= 0) game.enemies.splice(idx, 1);
  }
}

function triggerExplosion(x, y, radius, damage) {
  for (const enemy of game.enemies) {
    const dist = Math.hypot(enemy.x - x, enemy.y - y);
    if (dist < radius + enemy.radius) {
      damageEnemy(enemy, damage);
    }
  }
  addParticles(x, y, '#ff786f', 24);
}

function upgradeWeapon() {
  const stats = weaponStats(game.weaponIndex);
  if (game.gold < stats.cost) {
    return;
  }
  game.gold -= stats.cost;
  game.upgrades[game.weaponIndex] += 1;
  updateHud();
}

function resetGame() {
  game = createGame();
  startWave();
  updateHud();
}

function update(dt) {
  if (game.gameOver) {
    return;
  }

  game.reload = Math.max(0, game.reload - dt);

  if (game.spawnQueue > 0) {
    game.spawnCooldown -= dt;
    if (game.spawnCooldown <= 0) {
      spawnEnemy();
      game.spawnQueue -= 1;
      game.spawnCooldown = Math.max(0.32, 1.1 - game.wave * 0.05);
    }
  } else if (game.enemies.length === 0 && game.projectiles.length === 0) {
    game.wave += 1;
    startWave();
  }

  for (const enemy of game.enemies) {
    enemy.x -= enemy.speed * dt;
    enemy.y += enemy.drift * dt;
    if (enemy.y < 70 || enemy.y > canvas.height - 170) {
      enemy.drift *= -1;
      enemy.y = Math.max(70, Math.min(enemy.y, canvas.height - 170));
    }

    if (enemy.x < 210) {
      game.health -= 1;
      const idx = game.enemies.indexOf(enemy);
      if (idx >= 0) {
        game.enemies.splice(idx, 1);
      }
      addParticles(enemy.x, enemy.y, '#ffb48c', 12);
      if (game.health <= 0) {
        game.gameOver = true;
      }
    }
  }

  for (const shot of game.projectiles) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;

    if (shot.bounces > 0) {
      if (shot.x < 0 || shot.x > canvas.width) {
        shot.vx *= -1;
        shot.x = Math.max(0, Math.min(canvas.width, shot.x));
        shot.bounces -= 1;
      }
      if (shot.y < 0 || shot.y > canvas.height) {
        shot.vy *= -1;
        shot.y = Math.max(0, Math.min(canvas.height, shot.y));
        shot.bounces -= 1;
      }
    }

    if (shot.life <= 0 || shot.x < -20 || shot.x > canvas.width + 20 || shot.y < -20 || shot.y > canvas.height + 20) {
      if (shot.explosive) {
        triggerExplosion(shot.x, shot.y, shot.blastRadius, shot.damage);
      }
      shot.life = 0;
      continue;
    }

    for (const enemy of game.enemies) {
      const dist = Math.hypot(shot.x - enemy.x, shot.y - enemy.y);
      if (dist <= shot.radius + enemy.radius) {
        if (shot.explosive) {
          triggerExplosion(shot.x, shot.y, shot.blastRadius, shot.damage);
          shot.life = 0;
        } else {
          damageEnemy(enemy, shot.damage);
          shot.life = 0;
          if (shot.bounces > 0) {
            shot.bounces = 0;
          }
        }
        break;
      }
    }
  }

  game.projectiles = game.projectiles.filter((shot) => shot.life > 0);

  for (const particle of game.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  game.particles = game.particles.filter((particle) => particle.life > 0);

  if (game.gameOver) {
    game.projectiles = [];
  }

  updateHud();
}

function drawCastle() {
  const { x, y, w, h } = game.castle;
  ctx.fillStyle = '#d9b76e';
  ctx.fillRect(x, y + 20, w, h - 20);

  ctx.fillStyle = '#c58d48';
  ctx.fillRect(x + 16, y, 36, 36);
  ctx.fillRect(x + 62, y + 8, 32, 28);
  ctx.fillRect(x + 122, y, 32, 40);

  ctx.fillStyle = '#f4e7b2';
  ctx.fillRect(x + 72, y - 10, 8, 52);
  ctx.fillStyle = '#ff6d6d';
  ctx.beginPath();
  ctx.moveTo(x + 76, y - 10);
  ctx.lineTo(x + 98, y + 8);
  ctx.lineTo(x + 76, y + 26);
  ctx.closePath();
  ctx.fill();

  const turret = getTurretOrigin();
  const angle = Math.atan2(mouse.y - turret.y, mouse.x - turret.x);

  ctx.strokeStyle = '#6a4420';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(turret.x, turret.y);
  ctx.lineTo(turret.x + Math.cos(angle) * 64, turret.y + Math.sin(angle) * 64);
  ctx.stroke();

  ctx.fillStyle = '#d69942';
  ctx.beginPath();
  ctx.arc(turret.x, turret.y, 14, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemy(enemy) {
  const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
  const bodyColor = hpRatio > 0.66 ? '#41c3ff' : hpRatio > 0.35 ? '#ffb247' : '#ff6b6b';

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(enemy.x - enemy.radius, enemy.y);
  ctx.lineTo(enemy.x, enemy.y - enemy.radius * 0.9);
  ctx.lineTo(enemy.x + enemy.radius, enemy.y);
  ctx.lineTo(enemy.x + enemy.radius * 0.5, enemy.y + enemy.radius * 0.8);
  ctx.lineTo(enemy.x - enemy.radius * 0.5, enemy.y + enemy.radius * 0.8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1d3d59';
  ctx.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 8, enemy.radius * 2, 4);
  ctx.fillStyle = '#41f3a2';
  ctx.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 8, enemy.radius * 2 * hpRatio, 4);
}

function drawProjectile(shot) {
  ctx.fillStyle = shot.color;
  ctx.beginPath();
  ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles() {
  for (const particle of game.particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life * 1.4);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawWater() {
  ctx.fillStyle = '#1ca0d8';
  ctx.fillRect(0, canvas.height - 120, canvas.width, 120);

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (let i = 0; i < 12; i += 1) {
    const x = i * 110;
    const y = canvas.height - 100 + (i % 2) * 12;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 40, y - 18, x + 80, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawSky() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#9fe3ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff7c9';
  ctx.beginPath();
  ctx.arc(880, 90, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e8f7ff';
  for (let i = 0; i < 7; i += 1) {
    const x = 80 + i * 150;
    const y = 60 + (i % 2) * 28;
    ctx.fillRect(x, y, 80, 20);
  }
}

function drawGameOver() {
  if (!game.gameOver) return;

  ctx.fillStyle = 'rgba(12, 22, 34, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 54px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('The Shore Falls', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '26px Arial';
  ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 30);
}

function draw() {
  drawSky();
  drawWater();
  drawCastle();

  for (const enemy of game.enemies) {
    drawEnemy(enemy);
  }

  for (const shot of game.projectiles) {
    drawProjectile(shot);
  }

  drawParticles();
  drawGameOver();
}

let lastTime = 0;
function tick(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.033);
  lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(tick);
}

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
});

canvas.addEventListener('click', () => {
  if (!game.gameOver) {
    launchProjectile();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === '1') setWeapon(0);
  if (event.key === '2') setWeapon(1);
  if (event.key === '3') setWeapon(2);
  if (event.key === 'e' || event.key === 'E') upgradeWeapon();
  if (event.key === ' ') {
    event.preventDefault();
    launchProjectile();
  }
  if (event.key === 'r' || event.key === 'R') {
    if (game.gameOver) resetGame();
  }
});

weaponButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setWeapon(Number(button.dataset.weapon));
  });
});

upgradeBtn.addEventListener('click', upgradeWeapon);

startWave();
updateHud();
requestAnimationFrame(tick);
