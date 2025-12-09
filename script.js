        // ----------------------------------------------------------
        // BASIC CANVAS + UI
        // ----------------------------------------------------------

        const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");

        // Set canvas to fullscreen resolution
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const startScreen = document.getElementById("startScreen");
        const startBtn = document.getElementById("startBtn");
        const gameOverEl = document.getElementById("gameOver");
        const finalScoreEl = document.getElementById("finalScore");
        const finalCoinsEl = document.getElementById("finalCoins");
        const restartBtn = document.getElementById("restartBtn"); // Hidden one
        const restartBtn2 = document.getElementById("restartBtn2"); // Game Over one
        
        // HUD Elements - Updated for new UI
        const scoreValueEl = document.querySelector("#score .hud-value");
        const coinsValueEl = document.querySelector("#coins .hud-value");
        const healthTextEl = document.getElementById("healthText");
        const ultimateTextEl = document.getElementById("ultimateText");
        const ammoValueEl = document.getElementById("ammoValue");
        
        const hotbarEl = document.getElementById("hotbar");
        const healthBar = document.getElementById("healthBar");
        const ultimateBar = document.getElementById("ultimateBar");
        
        const waveNumEl = document.getElementById("waveNum");
        const enemyCountEl = document.getElementById("enemyCount");
        const waveIndicator = document.getElementById("waveIndicator");
        
        const upgradeShop = document.getElementById("upgradeShop");
        const closeShopBtn = document.getElementById("closeShop");
        const upgradeButtons = document.querySelectorAll('.upgrade-btn');
        
        const weaponSwitchIndicator = document.getElementById('weaponSwitchIndicator');
        const ultimateReadyIndicator = document.getElementById('ultimateReadyIndicator');

        let width = canvas.width;
        let height = canvas.height;
        
        // Update width/height on canvas resize
        const origResizeCanvas = resizeCanvas;
        resizeCanvas = function() {
            origResizeCanvas();
            width = canvas.width;
            height = canvas.height;
        };

        // ----------------------------------------------------------
        // GAME STATE
        // ----------------------------------------------------------

        let running = false;
        let lastTime = 0;
        let spawnTimer = 0;
        let spawnInterval = 1000;
        let score = 0;
        let coins = 0;
        let wave = 1;
        let enemiesInWave = 5;
        let enemiesDefeated = 0;
        let shopOpen = false;

        // Player object
        const player = {
            x: width / 2,
            y: height / 2,
            r: 18,
            speed: 140,
            acceleration: 700,
            friction: 6,
            vx: 0,
            vy: 0,
            health: 100,
            maxHealth: 100,
            baseMaxHealth: 100,
            ultimateReady: true,
            ultimateCooldown: 0,
            ultimateMaxCooldown: 30000, // 30 seconds
            // Melee animation state
            swinging: false,
            swingProgress: 0,
            swingDuration: 0.2, // seconds
            swingAngle: 0
        };

        // Weapon upgrades
        const upgrades = {
            damage: { level: 1, cost: 50, multiplier: 1.2 },
            fireRate: { level: 1, cost: 40, multiplier: 0.8 },
            magazine: { level: 1, cost: 60, multiplier: 1.5 }
        };

        // Inputs
        const keys = {};
        let mouse = { x: 0, y: 0, down: false };

        // Arrays
        const bullets = [];
        const enemyBullets = [];
        const enemies = [];
        const groundLoot = [];
        const healthItems = [];
        const coinsList = [];
        const effects = []; // For visual effects
        const shockWaves = []; // For shock wave ultimate
        const muzzleFlashes = []; // Visual only
        const obstacles = []; // Map obstacles

        // Enemy Types
        const ENEMY_TYPES = {
            STANDARD: { color: "#ff0055", hp: 20, speed: 80, r: 15, score: 10 },
            TANK: { color: "#d97706", hp: 60, speed: 40, r: 25, score: 30 },
            EXPLODER: { color: "#9333ea", hp: 10, speed: 110, r: 12, score: 20, range: 60 },
            RANGED: { color: "#10b981", hp: 30, speed: 70, r: 15, score: 25, range: 250, cooldown: 2500 }
        };

        // ----------------------------------------------------------
        // INVENTORY + HOTBAR
        // ----------------------------------------------------------

        const inventory = new Array(8).fill(null);
        let selectedSlot = 0;

        // Default melee weapon
        // Replace melee knife with a starter machine gun (no melee)
        const meleeWeapon = {
            name: "Machine Gun (CE)",
            type: "gun",
            dmg: 8,
            speed: 80, // fire rate (ms)
            bulletSpeed: 1100,
            magSize: 60,
            ammo: 60,
            reserve: 180,
            reloadTime: 1200,
            reloading: false,
            level: 1,
            projectileCount: 1,
            spread: 0.02
        };

        /*
         * createGun(name, dmg, speed, magSize, reserveAmmo, projectileCount, spread)
         * Returns a weapon template object used for player loadout and loot drops.
         * - name: display name of the weapon
         * - dmg: damage per projectile
         * - speed: fire rate (ms)
         * - magSize: bullets per magazine
         * - reserveAmmo: reserve ammo carried
         * Optional: projectileCount (for shotguns/multi-shot) and spread (in radians)
         */
        // Example gun templates
        function createGun(name, dmg, speed, magSize, reserveAmmo, projectileCount = 1, spread = 0) {
            return {
                name,
                type: "gun",
                dmg,
                speed,
                bulletSpeed: 1200,
                magSize,
                ammo: magSize,
                reserve: reserveAmmo,
                reloadTime: 900,
                reloading: false,
                level: 1,
                projectileCount,
                spread
            };
        }

        /*
         * initializeHotbar()
         * Builds the on-screen hotbar UI (8 slots) and attaches click handlers.
         * Slots are updated by `updateHotbarUI()` when the inventory changes.
         */
        // Create hotbar slots once and reuse them
        function initializeHotbar() {
            hotbarEl.innerHTML = "";
            for (let i = 0; i < 8; i++) {
                const slot = document.createElement("div");
                slot.className = "slot";
                slot.dataset.index = i;
                
                // Add both mousedown and click events for maximum compatibility
                slot.addEventListener('mousedown', handleSlotClick);
                slot.addEventListener('click', handleSlotClick);
                
                hotbarEl.appendChild(slot);
            }
            updateHotbarUI();
        }

        /*
         * handleSlotClick(event)
         * Slot click handler: selects the weapon in the clicked slot, updates UI,
         * and shows a brief weapon-switch indicator.
         */
        // Handle slot clicks
        function handleSlotClick(e) {
            // Prevent the event from bubbling to the canvas
            e.preventDefault();
            e.stopPropagation();
            
            const index = parseInt(e.currentTarget.dataset.index);
            if (inventory[index]) {
                selectedSlot = index;
                updateHotbarUI();
                showWeaponSwitchIndicator();
                updateUI();
            }
        }

        // ----------------------
        // Hotbar UI rendering
        // ----------------------
        function updateHotbarUI() {
            const slots = document.querySelectorAll('.slot');
            
            for (let i = 0; i < 8; i++) {
                const slot = slots[i];
                
                // Reset classes
                slot.className = "slot";
                if (i === selectedSlot) slot.classList.add("selected");
                if (!inventory[i]) slot.classList.add("empty");
                
                // Update content
                if (inventory[i]) {
                    // Clear existing content
                    slot.innerHTML = "";
                    
                    const nameSpan = document.createElement("span");
                    nameSpan.className = "slot-name";
                    nameSpan.textContent = inventory[i].name;
                    
                    const ammoSpan = document.createElement("span");
                    ammoSpan.className = "slot-ammo";
                    
                    if (inventory[i].type === "melee") {
                        ammoSpan.textContent = "MELEE";
                    } else {
                        ammoSpan.textContent = `${inventory[i].ammo}/${inventory[i].reserve}`;
                    }
                    
                    const levelSpan = document.createElement("span");
                    levelSpan.className = "slot-level";
                    levelSpan.textContent = `Lv${inventory[i].level}`;
                    
                    slot.appendChild(nameSpan);
                    slot.appendChild(ammoSpan);
                    slot.appendChild(levelSpan);
                } else {
                    slot.textContent = "-";
                }
            }
        }

        // Initialize the hotbar once
        initializeHotbar();

        // ----------------------------------------------------------
        // UTILS
        // ----------------------------------------------------------

        function rand(min, max) {
            return Math.random() * (max - min) + min;
        }
        
        function dist(a, b) {
            return Math.hypot(a.x - b.x, a.y - b.y);
        }

        function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
            return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
        }

        function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
            const closestX = Math.max(rx, Math.min(cx, rx + rw));
            const closestY = Math.max(ry, Math.min(cy, ry + rh));
            const distanceX = cx - closestX;
            const distanceY = cy - closestY;
            return (distanceX * distanceX) + (distanceY * distanceY) < (cr * cr);
        }

        // Resolve circle vs rect overlap by pushing the circle out the smallest distance
        function resolveCircleRectOverlap(entity, rx, ry, rw, rh) {
            // entity has x,y,r
            const cx = entity.x;
            const cy = entity.y;
            const cr = entity.r;

            const closestX = Math.max(rx, Math.min(cx, rx + rw));
            const closestY = Math.max(ry, Math.min(cy, ry + rh));
            let dx = cx - closestX;
            let dy = cy - closestY;

            const distSq = dx * dx + dy * dy;
            if (distSq === 0) {
                // Circle center is exactly on/in the rect; push out along the minimal axis
                const left = Math.abs(cx - rx);
                const right = Math.abs((rx + rw) - cx);
                const top = Math.abs(cy - ry);
                const bottom = Math.abs((ry + rh) - cy);
                const min = Math.min(left, right, top, bottom);
                if (min === left) {
                    entity.x = rx - cr;
                } else if (min === right) {
                    entity.x = rx + rw + cr;
                } else if (min === top) {
                    entity.y = ry - cr;
                } else {
                    entity.y = ry + rh + cr;
                }
                return true;
            }

            const dist = Math.sqrt(distSq);
            const overlap = cr - dist;
            if (overlap > 0) {
                // normalize
                const nx = dx / dist;
                const ny = dy / dist;
                entity.x += nx * overlap;
                entity.y += ny * overlap;
                return true;
            }
            return false;
        }

        function generateMap() {
            obstacles.length = 0;
            
            // Add buildings around the battlefield
            const buildingColor = "#556b7f";
            const buildingOutline = "#2a3f4d";
            
            // Corner buildings (large)
            obstacles.push({ x: 50, y: 50, w: 150, h: 150, color: buildingColor, outline: buildingOutline }); // Top-left
            obstacles.push({ x: width - 200, y: 50, w: 150, h: 150, color: buildingColor, outline: buildingOutline }); // Top-right
            obstacles.push({ x: 50, y: height - 200, w: 150, h: 150, color: buildingColor, outline: buildingOutline }); // Bottom-left
            obstacles.push({ x: width - 200, y: height - 200, w: 150, h: 150, color: buildingColor, outline: buildingOutline }); // Bottom-right
            
            // Side buildings (medium)
            obstacles.push({ x: width * 0.5 - 75, y: 40, w: 120, h: 100, color: buildingColor, outline: buildingOutline }); // Top center
            obstacles.push({ x: width * 0.5 - 75, y: height - 140, w: 120, h: 100, color: buildingColor, outline: buildingOutline }); // Bottom center
            obstacles.push({ x: 40, y: height * 0.5 - 60, w: 100, h: 120, color: buildingColor, outline: buildingOutline }); // Left center
            obstacles.push({ x: width - 140, y: height * 0.5 - 60, w: 100, h: 120, color: buildingColor, outline: buildingOutline }); // Right center
            
            // Interior buildings (random layout)
            const interiorBuildingColor = "#445566";
            if (Math.random() < 0.6) {
                // Layout A: Central cluster
                obstacles.push({ x: width * 0.5 - 100, y: height * 0.5 - 100, w: 80, h: 80, color: interiorBuildingColor, outline: buildingOutline });
                obstacles.push({ x: width * 0.5 + 40, y: height * 0.5 - 100, w: 80, h: 80, color: interiorBuildingColor, outline: buildingOutline });
                obstacles.push({ x: width * 0.5 - 100, y: height * 0.5 + 40, w: 80, h: 80, color: interiorBuildingColor, outline: buildingOutline });
                obstacles.push({ x: width * 0.5 + 40, y: height * 0.5 + 40, w: 80, h: 80, color: interiorBuildingColor, outline: buildingOutline });
            } else if (Math.random() < 0.5) {
                // Layout B: Diagonal line
                obstacles.push({ x: width * 0.3 - 50, y: height * 0.3 - 50, w: 100, h: 100, color: interiorBuildingColor, outline: buildingOutline });
                obstacles.push({ x: width * 0.5 - 50, y: height * 0.5 - 50, w: 100, h: 100, color: interiorBuildingColor, outline: buildingOutline });
                obstacles.push({ x: width * 0.7 - 50, y: height * 0.7 - 50, w: 100, h: 100, color: interiorBuildingColor, outline: buildingOutline });
            } else {
                // Layout C: Scattered
                for (let i = 0; i < 6; i++) {
                    obstacles.push({
                        x: rand(200, width - 200),
                        y: rand(200, height - 200),
                        w: rand(60, 100),
                        h: rand(60, 100),
                        color: interiorBuildingColor,
                        outline: buildingOutline
                    });
                }
            }
        }
        
        function createScorePopup(x, y, value) {
            const popup = document.createElement("div");
            popup.className = "score-popup";
            popup.textContent = `+${value}`;
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
            document.getElementById("ui").appendChild(popup);
            
            setTimeout(() => {
                popup.remove();
            }, 1000);
        }
        
        function createCoinPopup(x, y, value) {
            const popup = document.createElement("div");
            popup.className = "coin-popup";
            popup.textContent = `+${value}🪙`;
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
            document.getElementById("ui").appendChild(popup);
            
            setTimeout(() => {
                popup.remove();
            }, 1000);
        }
        
        function createAmmoPopup(x, y, weaponName, amount) {
            const popup = document.createElement("div");
            popup.className = "ammo-popup";
            popup.textContent = `+${amount} ${weaponName} Ammo`;
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
            document.getElementById("ui").appendChild(popup);
            
            setTimeout(() => {
                popup.remove();
            }, 1500);
        }
        
        function createHealthPopup(x, y, amount) {
            const popup = document.createElement("div");
            popup.className = "health-popup";
            popup.textContent = `+${amount} Health`;
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
            document.getElementById("ui").appendChild(popup);
            
            setTimeout(() => {
                popup.remove();
            }, 1500);
        }
        
        function createUltimatePopup(x, y) {
            const popup = document.createElement("div");
            popup.className = "ultimate-popup";
            popup.textContent = `SHOCK WAVE!`;
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
            document.getElementById("ui").appendChild(popup);
            
            setTimeout(() => {
                popup.remove();
            }, 1500);
        }
        
        function createHitEffect(x, y) {
            const effect = document.createElement("div");
            effect.className = "enemy-hit";
            effect.style.left = `${x - 10}px`;
            effect.style.top = `${y - 10}px`;
            document.getElementById("ui").appendChild(effect);
            
            setTimeout(() => {
                effect.remove();
            }, 300);
        }
        
        function showWeaponSwitchIndicator() {
            const weapon = inventory[selectedSlot];
            if (weapon) {
                weaponSwitchIndicator.textContent = `EQUIPPED: ${weapon.name.toUpperCase()}`;
                soundManager.playUI('weaponSwitch');
                weaponSwitchIndicator.classList.add('show');
                
                setTimeout(() => {
                    weaponSwitchIndicator.classList.remove('show');
                }, 1500);
            }
        }
        
        function hasWeapon(weaponName) {
            return inventory.some(weapon => weapon && weapon.name === weaponName);
        }
        
        function getWeaponSlot(weaponName) {
            return inventory.findIndex(weapon => weapon && weapon.name === weaponName);
        }
        
        function showAmmoAdded(slotIndex, amount) {
            const slots = document.querySelectorAll('.slot');
            if (slots[slotIndex]) {
                slots[slotIndex].classList.add('ammo-added');
                setTimeout(() => {
                    slots[slotIndex].classList.remove('ammo-added');
                }, 500);
            }
        }

        // ----------------------------------------------------------
        // SHOCK WAVE ULTIMATE
        // ----------------------------------------------------------

        /*
         * activateShockWave()
         * Triggers the player's ultimate ability: a radial shock wave that
         * damages nearby enemies. Respects `paused` and shop/running state.
         */
        function activateShockWave() {
            if (paused) return;
            if (!player.ultimateReady || shopOpen || !running) return;
            
            player.ultimateReady = false;
            player.ultimateCooldown = player.ultimateMaxCooldown;
            
            // Create shock wave effect
            shockWaves.push({
                x: player.x,
                y: player.y,
                radius: 0,
                maxRadius: 300,
                speed: 10,
                damage: 50,
                active: true
            });
            
            // Visual and audio feedback
            createUltimatePopup(player.x, player.y);
            soundManager.playUltimate();
            
            // Update UI
            updateUI();
        }
        
        function updateShockWaves(delta) {
            for (let i = shockWaves.length - 1; i >= 0; i--) {
                const wave = shockWaves[i];
                
                // Expand the wave
                wave.radius += wave.speed;
                
                // Check collision with enemies
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    const distance = dist(wave, enemy);
                    
                    if (distance < wave.radius + enemy.r) {
                        // Damage enemy
                        enemy.hp -= wave.damage;
                        createHitEffect(enemy.x, enemy.y);
                        
                        // Push enemy away from center
                        const angle = Math.atan2(enemy.y - wave.y, enemy.x - wave.x);
                        const pushForce = 15;
                        enemy.x += Math.cos(angle) * pushForce;
                        enemy.y += Math.sin(angle) * pushForce;
                        
                        if (enemy.hp <= 0) {
                            // heal player by 10% of max health on enemy kill
                            player.health = Math.min(player.maxHealth, player.health + player.maxHealth * 0.10);
                            score += 10;
                            coins += 5;
                            createScorePopup(enemy.x, enemy.y, 10);
                            createCoinPopup(enemy.x, enemy.y, 5);
                            soundManager.playExplosion();
                            dropLoot(enemy.x, enemy.y);
                            enemies.splice(j, 1);
                            enemiesDefeated++;
                            checkWaveComplete();
                        }
                    }
                }
                
                // Remove wave if it reaches max radius
                if (wave.radius >= wave.maxRadius) {
                    shockWaves.splice(i, 1);
                }
            }
            
            // Update ultimate cooldown
            if (!player.ultimateReady) {
                player.ultimateCooldown -= delta * 1000;
                
                if (player.ultimateCooldown <= 0) {
                    player.ultimateReady = true;
                    player.ultimateCooldown = 0;
                    
                    // Show ready indicator
                    ultimateReadyIndicator.classList.add('show');
                    setTimeout(() => {
                        ultimateReadyIndicator.classList.remove('show');
                    }, 3000);
                }
                
                updateUI();
            }
        }
        
        function drawShockWaves() {
            for (const wave of shockWaves) {
                // Draw expanding circle
                ctx.beginPath();
                ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(236, 72, 153, ${0.7 - (wave.radius / wave.maxRadius) * 0.6})`;
                ctx.lineWidth = 8;
                ctx.stroke();
                
                // Draw inner glow
                ctx.beginPath();
                ctx.arc(wave.x, wave.y, wave.radius - 4, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 - (wave.radius / wave.maxRadius) * 0.4})`;
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // Draw outer glow
                ctx.beginPath();
                ctx.arc(wave.x, wave.y, wave.radius + 4, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 105, 180, ${0.3 - (wave.radius / wave.maxRadius) * 0.2})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        // ----------------------------------------------------------
        // UPGRADE SYSTEM
        // ----------------------------------------------------------

        function openUpgradeShop() {
            shopOpen = true;
            upgradeShop.classList.remove("hidden");
            updateUpgradeButtons();
        }
        
        function closeUpgradeShop() {
            shopOpen = false;
            upgradeShop.classList.add("hidden");
            startNextWave();
        }
        
        function updateUpgradeButtons() {
            upgradeButtons.forEach(button => {
                const upgradeType = button.dataset.upgrade;
                const upgrade = upgrades[upgradeType];
                const cost = Math.floor(upgrade.cost * Math.pow(1.5, upgrade.level - 1));
                
                // Find parent card body
                const cardBody = button.closest('.card-body');
                if (cardBody) {
                    cardBody.querySelector('.upgrade-cost').textContent = cost;
                    cardBody.querySelector('.upgrade-level').textContent = `Level: ${upgrade.level}`;
                }
                
                if (coins < cost) {
                    button.disabled = true;
                } else {
                    button.disabled = false;
                }
            });
        }
        
        function purchaseUpgrade(type) {
            const upgrade = upgrades[type];
            const cost = Math.floor(upgrade.cost * Math.pow(1.5, upgrade.level - 1));
            
            if (coins >= cost) {
                coins -= cost;
                upgrade.level++;
                soundManager.playUI('purchase');
                
                // Apply upgrade to all weapons
                inventory.forEach(weapon => {
                    if (weapon) {
                        switch(type) {
                            case 'damage':
                                weapon.dmg = Math.floor(weapon.dmg * upgrade.multiplier);
                                break;
                            case 'fireRate':
                                if (weapon.type === 'melee') {
                                    weapon.cooldown = Math.floor(weapon.cooldown * upgrade.multiplier);
                                } else {
                                    weapon.speed = weapon.speed * (2 - upgrade.multiplier);
                                }
                                break;
                            case 'magazine':
                                if (weapon.type === 'gun') {
                                    weapon.magSize = Math.floor(weapon.magSize * upgrade.multiplier);
                                    weapon.reserve = Math.floor(weapon.reserve * upgrade.multiplier);
                                }
                                break;
                        }
                        weapon.level = Math.max(weapon.level, upgrade.level);
                    }
                });
                
                updateUI();
                updateUpgradeButtons();
            }
        }
        
        /*
         * startNextWave()
         * Advances the game to the next wave:
         * - increments `wave`
         * - adjusts spawn counts and interval
         * - increases player's maxHealth (per user request) and refills health
         * - displays the wave indicator briefly
         */
        function startNextWave() {
            wave++;
            enemiesInWave = 5 + wave * 2;
            enemiesDefeated = 0;
            spawnInterval = Math.max(200, 1000 - wave * 50);
            // Increase player's max health by 20% per wave (wave1 = base)
            const increaseFactor = 1 + 0.2 * Math.max(0, wave - 1);
            player.maxHealth = Math.round(player.baseMaxHealth * increaseFactor);
            // Refill player health to new max
            player.health = player.maxHealth;
            updateUI();
            waveIndicator.textContent = `WAVE ${wave}`;
            waveIndicator.style.opacity = 1;
            soundManager.playUI('waveStart');
            setTimeout(() => { waveIndicator.style.opacity = 0.8; }, 2000); // Keep it visible but slightly faded
        }
        
        /*
         * checkWaveComplete()
         * Called when enemies are defeated to determine if the current wave
         * is finished. If so, opens the upgrade shop where the player can
         * purchase upgrades before the next wave starts.
         */
        function checkWaveComplete() {
            if (enemiesDefeated >= enemiesInWave && enemies.length === 0) {
                soundManager.playUI('waveComplete');
                openUpgradeShop();
            }
        }

        // ----------------------------------------------------------
        // INPUT HANDLING
        // ----------------------------------------------------------

        window.addEventListener("keydown", (e) => {
            // Allow unpausing keys through; otherwise ignore input while paused
            if (paused && e.key !== 'Escape' && e.key.toLowerCase() !== 'p') return;
            keys[e.key.toLowerCase()] = true;

            // Hotbar switching 1–8
            if (e.key >= "1" && e.key <= "8") {
                selectedSlot = Number(e.key) - 1;
                updateHotbarUI();
                showWeaponSwitchIndicator();
                updateUI();
            }

            // Shoot (space)
            if (e.code === "Space") {
                e.preventDefault();
                attack();
            }

            // Reload
            if (e.key.toLowerCase() === "r") reloadWeapon();
            
            // Shock Wave Ultimate (Q)
            if (e.key.toLowerCase() === "q") {
                activateShockWave();
            }
        });

        window.addEventListener("keyup", (e) => {
            keys[e.key.toLowerCase()] = false;
        });

        canvas.addEventListener("mousemove", (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
            mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
        });
        
        canvas.addEventListener("mousedown", (e) => {
            // Only register mouse down if not clicking on UI elements
            if (paused) return;
            if (e.target === canvas) {
                mouse.down = true; 
                attack();
            }
        });
        
        canvas.addEventListener("mouseup", () => { 
            mouse.down = false; 
        });
        
        // Mouse wheel weapon switching
        canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            if (shopOpen) return;
            if (paused) return;
            
            // Determine direction (negative deltaY = scroll up, positive = scroll down)
            const direction = e.deltaY > 0 ? 1 : -1;
            
            // Find the next slot with a weapon
            let newSlot = selectedSlot;
            let attempts = 0;
            
            do {
                newSlot = (newSlot + direction + 8) % 8;
                attempts++;
            } while (inventory[newSlot] === null && attempts < 8);
            
            // If we found a weapon, switch to it
            if (inventory[newSlot] !== null) {
                selectedSlot = newSlot;
                updateHotbarUI();
                showWeaponSwitchIndicator();
                updateUI();
            }
        });
        
        // Upgrade shop events
        closeShopBtn.addEventListener("click", closeUpgradeShop);
        upgradeButtons.forEach(button => {
            button.addEventListener("click", () => {
                purchaseUpgrade(button.dataset.upgrade);
            });
        });

        // ----------------------------------------------------------
        // START / RESTART
        // ----------------------------------------------------------

        startBtn.addEventListener("click", startGame);
        if(restartBtn) restartBtn.addEventListener("click", restartGame);
        restartBtn2.addEventListener("click", restartGame);

        // Pause controls (from pause menu)
        const pauseBtn = document.getElementById('pauseBtn');
        const pauseMenu = document.getElementById('pauseMenu');
        const resumeBtn = document.getElementById('resumeBtn');
        const restartBtnPause = document.getElementById('restartBtnPause');

        let paused = false;

        function showPauseMenu() {
            if (pauseMenu) pauseMenu.classList.remove('hidden');
            if (pauseBtn) pauseBtn.classList.add('active');
        }

        function hidePauseMenu() {
            if (pauseMenu) pauseMenu.classList.add('hidden');
            if (pauseBtn) pauseBtn.classList.remove('active');
        }

        function pauseGame() {
            if (!running) return;
            paused = true;
            showPauseMenu();
        }

        function resumeGame() {
            paused = false;
            hidePauseMenu();
            // ensure loop continues
            lastTime = performance.now();
            requestAnimationFrame(loop);
        }

        function togglePause() {
            if (!running) return;
            if (paused) resumeGame(); else pauseGame();
        }

        // Fullscreen toggle helper
        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                const gameContainer = document.getElementById('gameContainer');
                if (gameContainer && gameContainer.requestFullscreen) {
                    gameContainer.requestFullscreen().catch(err => {
                        console.log('Fullscreen request failed:', err.message);
                    });
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }

        if (pauseBtn) pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePause(); });
        if (resumeBtn) resumeBtn.addEventListener('click', (e) => { e.stopPropagation(); resumeGame(); });
        if (restartBtnPause) restartBtnPause.addEventListener('click', (e) => { e.stopPropagation(); restartGame(); hidePauseMenu(); paused = false; });

        // Allow pressing Escape or P to toggle pause
        // Allow pressing P to toggle pause; F for fullscreen; Escape exits fullscreen (browser default)
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'p') {
                e.preventDefault();
                togglePause();
            }
            if (e.key.toLowerCase() === 'f') {
                e.preventDefault();
                toggleFullscreen();
            }
        });

        function startGame() {
            startScreen.classList.add("hidden");
            gameOverEl.classList.add("hidden");
            if(restartBtn) restartBtn.classList.add("hidden");
            running = true;
            reset();
            lastTime = performance.now();
            // Initialize sound manager (requires user interaction)
            soundManager.init();
            // Request fullscreen
            const gameContainer = document.getElementById('gameContainer');
            if (gameContainer && gameContainer.requestFullscreen) {
                gameContainer.requestFullscreen().catch(err => {
                    console.log('Fullscreen request failed:', err.message);
                });
            }
            requestAnimationFrame(loop);
        }

        function restartGame() {
            running = true;
            startScreen.classList.add("hidden");
            gameOverEl.classList.add("hidden");
            if(restartBtn) restartBtn.classList.add("hidden");
            upgradeShop.classList.add("hidden");
            reset();
            lastTime = performance.now();
            requestAnimationFrame(loop);
        }

        function reset() {
            bullets.length = 0;
            enemies.length = 0;
            groundLoot.length = 0;
            healthItems.length = 0;
            coinsList.length = 0;
            effects.length = 0;
            shockWaves.length = 0;
            muzzleFlashes.length = 0;
            enemyBullets.length = 0;
            
            generateMap();

            player.x = width / 2;
            player.y = height / 2;
            player.health = player.maxHealth;
            player.ultimateReady = true;
            player.ultimateCooldown = 0;
            player.swinging = false;
            player.swingProgress = 0;

            score = 0;
            coins = 0;
            wave = 1;
            enemiesInWave = 5;
            enemiesDefeated = 0;
            shopOpen = false;

            // Reset upgrades
            upgrades.damage.level = 1;
            upgrades.fireRate.level = 1;
            upgrades.magazine.level = 1;

            // Reset inventory -> give starter weapons: Machine Gun (CE), APFSDS, HEAT, ATGM
            for (let i = 0; i < 8; i++) inventory[i] = null;
            inventory[0] = {...meleeWeapon}; // Machine Gun (CE)
            inventory[1] = createGun("APFSDS", 45, 900, 8, 32);
            inventory[2] = createGun("HEAT", 10, 70, 30, 120);
            // ATGM: mag 5 / reserve 20, one-shot kill weapon
            inventory[3] = Object.assign(createGun("ATGM", 9999, 800, 5, 20), { oneShot: true, bulletSpeed: 600 });
            
            selectedSlot = 0;
            updateHotbarUI();

            spawnTimer = 0;
            spawnInterval = 1000;

            waveIndicator.textContent = `WAVE ${wave}`;

            updateUI();
        }

        // ----------------------------------------------------------
        // ATTACK + SHOOTING + RELOAD
        // ----------------------------------------------------------

        /*
         * attack()
         * Handles firing the currently selected weapon (melee or gun).
         * - For melee: applies immediate area damage to nearby enemies.
         * - For guns: consumes ammo, spawns player projectiles in `bullets`.
         * The function respects `paused` and `shopOpen` states.
         */
        function attack() {
            if (!running || shopOpen) return;

            const weapon = inventory[selectedSlot];
            if (!weapon) return;

            // --- MELEE ---
            if (weapon.type === "melee") {
                const now = performance.now();
                if (now - weapon.lastAttack < weapon.cooldown) return;
                weapon.lastAttack = now;
                
                // Start swing animation
                player.swinging = true;
                player.swingProgress = 0;
                
                // Play melee sound
                soundManager.playMelee();

                // Melee hit detection
                for (let i = enemies.length - 1; i >= 0; i--) {
                    if (dist(player, enemies[i]) <= weapon.range) {
                        enemies[i].hp -= weapon.dmg;
                        createHitEffect(enemies[i].x, enemies[i].y);
                        
                        if (enemies[i].hp <= 0) {
                            // heal player by 10% of max health on enemy kill
                            player.health = Math.min(player.maxHealth, player.health + player.maxHealth * 0.10);
                            score += 10;
                            coins += 5;
                            createScorePopup(enemies[i].x, enemies[i].y, 10);
                            createCoinPopup(enemies[i].x, enemies[i].y, 5);
                            soundManager.playExplosion();
                            dropLoot(enemies[i].x, enemies[i].y);
                            enemies.splice(i, 1);
                            enemiesDefeated++;
                            checkWaveComplete();
                        }
                    }
                }
                return;
            }

            // --- GUN ---
            if (weapon.type === "gun") {
                    if (paused) return;
                if (weapon.reloading) return;
                
                // Auto-reload if out of ammo
                if (weapon.ammo <= 0) {
                    if (weapon.reserve > 0) {
                        reloadWeapon();
                    }
                    return;
                }

                weapon.ammo--;

                const baseAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
                
                // Muzzle flash
                muzzleFlashes.push({
                    x: player.x + Math.cos(baseAngle) * (player.r + 20),
                    y: player.y + Math.sin(baseAngle) * (player.r + 20),
                    life: 0.05
                });
                
                // Play weapon sound
                soundManager.playWeaponSound(weapon.name);

                // Fire projectiles
                const count = weapon.projectileCount || 1;
                const spread = weapon.spread || 0;
                
                for (let i = 0; i < count; i++) {
                    // Calculate spread angle
                    const angle = baseAngle + (Math.random() - 0.5) * spread;

                    bullets.push({
                        x: player.x + Math.cos(angle) * (player.r + 6),
                        y: player.y + Math.sin(angle) * (player.r + 6),
                        vx: Math.cos(angle) * weapon.bulletSpeed,
                        vy: Math.sin(angle) * weapon.bulletSpeed,
                        r: 5,
                        dmg: weapon.dmg,
                        life: 1200,
                        oneShot: !!weapon.oneShot
                    });
                }

                updateUI();
            }
        }

        /*
         * reloadWeapon()
         * Starts reloading the currently selected gun. Uses `w.reloadTime` to
         * simulate reload delay and updates ammo/reserve when complete.
         */
        function reloadWeapon() {
            const w = inventory[selectedSlot];
                    if (paused) return;
            if (!w || w.type !== "gun") return;
            if (w.ammo === w.magSize) return;
            if (w.reserve <= 0) return;

            w.reloading = true;

            setTimeout(() => {
                const needed = w.magSize - w.ammo;
                const take = Math.min(needed, w.reserve);
                w.ammo += take;
                w.reserve -= take;
                w.reloading = false;
                updateUI();
            }, w.reloadTime);
        }

        // ----------------------------------------------------------
        // AUTO-PICKUP LOOT
        // ----------------------------------------------------------

        function pickupNearbyLoot() {
            // Pick up weapons and ammo
            for (let i = groundLoot.length - 1; i >= 0; i--) {
                const item = groundLoot[i];
                if (dist(player, item) < 40) {
                    // Check if player already has this weapon type
                    if (hasWeapon(item.weapon.name)) {
                        // Find the existing weapon slot
                        const existingSlot = getWeaponSlot(item.weapon.name);
                        const existingWeapon = inventory[existingSlot];
                        
                        // If it's a gun, add ammo to the existing weapon
                        if (existingWeapon.type === "gun") {
                            // Calculate how much ammo to add (base amount from the loot weapon)
                            const ammoToAdd = item.weapon.reserve;
                            existingWeapon.reserve += ammoToAdd;
                            
                            // Show visual feedback
                            showAmmoAdded(existingSlot, ammoToAdd);
                            createAmmoPopup(player.x, player.y - 30, existingWeapon.name, ammoToAdd);
                            soundManager.playPlayerSound('ammoPickup');
                            
                            // Remove the loot
                            groundLoot.splice(i, 1);
                        }
                    } else {
                        // New weapon - find empty slot
                        const emptySlot = inventory.findIndex(s => s === null);
                        if (emptySlot !== -1) {
                            inventory[emptySlot] = {
                                ...item.weapon,
                                ...item.weapon,
                                ammo: item.weapon.magSize,
                                reserve: item.weapon.reserve,
                                level: 1 // Reset level for new pickup or keep logic
                            };
                            
                            // Apply upgrades to new weapon
                            if (inventory[emptySlot].type === 'gun') {
                                inventory[emptySlot].magSize = Math.floor(inventory[emptySlot].magSize * Math.pow(upgrades.magazine.multiplier, upgrades.magazine.level - 1));
                                inventory[emptySlot].reserve = Math.floor(inventory[emptySlot].reserve * Math.pow(upgrades.magazine.multiplier, upgrades.magazine.level - 1));
                                inventory[emptySlot].speed = inventory[emptySlot].speed * Math.pow(2 - upgrades.fireRate.multiplier, upgrades.fireRate.level - 1);
                            }
                            inventory[emptySlot].dmg = Math.floor(inventory[emptySlot].dmg * Math.pow(upgrades.damage.multiplier, upgrades.damage.level - 1));
                            inventory[emptySlot].level = Math.max(upgrades.damage.level, upgrades.fireRate.level, upgrades.magazine.level);
                            
                            createAmmoPopup(player.x, player.y - 30, item.weapon.name, "Equipped");
                            soundManager.playPlayerSound('ammoPickup');
                            groundLoot.splice(i, 1);
                            updateHotbarUI();
                        }
                    }
                }
            }
            
            // Pick up health
            for (let i = healthItems.length - 1; i >= 0; i--) {
                const item = healthItems[i];
                if (dist(player, item) < 30) {
                    if (player.health < player.maxHealth) {
                        player.health = Math.min(player.health + item.value, player.maxHealth);
                        createHealthPopup(player.x, player.y, item.value);
                        soundManager.playPlayerSound('heal');
                        healthItems.splice(i, 1);
                        updateUI();
                    }
                }
            }
            
            // Pick up coins
            for (let i = coinsList.length - 1; i >= 0; i--) {
                const coin = coinsList[i];
                if (dist(player, coin) < 30) {
                    coins += coin.value;
                    createCoinPopup(player.x, player.y, coin.value);
                    soundManager.playPlayerSound('coinPickup');
                    coinsList.splice(i, 1);
                    updateUI();
                }
            }
        }
        
        function dropLoot(x, y) {
            // Chance to drop weapon
            if (Math.random() < 0.3) {
                const randWeapon = Math.random();
                let weaponType;
                // Only drop modernized weapons: APFSDS, HEAT, Machine Gun (CE)
                if (randWeapon < 0.45) weaponType = createGun("APFSDS", 45, 900, 8, 32);
                else if (randWeapon < 0.85) weaponType = createGun("HEAT", 10, 70, 30, 120);
                else weaponType = createGun("Machine Gun (CE)", 8, 80, 60, 180);
                
                groundLoot.push({ x, y, weapon: weaponType });
            }
            
            // Chance to drop health
            if (Math.random() < 0.2) {
                healthItems.push({ x: x + rand(-20, 20), y: y + rand(-20, 20), value: 25 });
            }
            
            // Always drop coins? or chance
            if (Math.random() < 0.5) {
                coinsList.push({ x: x + rand(-10, 10), y: y + rand(-10, 10), value: rand(1, 5) | 0 });
            }
        }

        // ----------------------------------------------------------
        // GAME LOOP
        // ----------------------------------------------------------

        /*
         * update(delta)
         * Core game update function:
         * - Moves player and enemies
         * - Advances bullets and handles collisions
         * - Handles enemy AI (movement + shooting)
         * - Processes pickups, shockwaves, and other timed systems
         * Parameter `delta` is the elapsed time in seconds since last frame.
         */
        function update(delta) {
            // Player movement
            let dx = 0;
            let dy = 0;
            if (keys["w"]) dy = -1;
            if (keys["s"]) dy = 1;
            if (keys["a"]) dx = -1;
            if (keys["d"]) dx = 1;

            // Normalize diagonal
            if (dx !== 0 || dy !== 0) {
                const len = Math.hypot(dx, dy);
                dx /= len;
                dy /= len;
            }

            // Apply acceleration
            if (dx !== 0 || dy !== 0) {
                player.vx += dx * player.acceleration * delta;
                player.vy += dy * player.acceleration * delta;
            }

            // Apply friction
            player.vx -= player.vx * player.friction * delta;
            player.vy -= player.vy * player.friction * delta;

            // Cap speed
            const currentSpeed = Math.hypot(player.vx, player.vy);
            if (currentSpeed > player.speed) {
                const scale = player.speed / currentSpeed;
                player.vx *= scale;
                player.vy *= scale;
            }

            // Stop completely if very slow
            if (Math.abs(player.vx) < 5) player.vx = 0;
            if (Math.abs(player.vy) < 5) player.vy = 0;

            // Move X then resolve collisions robustly
            player.x += player.vx * delta;
            for (const obs of obstacles) {
                if (circleRectCollide(player.x, player.y, player.r, obs.x, obs.y, obs.w, obs.h)) {
                    // push out minimally to avoid getting stuck
                    resolveCircleRectOverlap(player, obs.x, obs.y, obs.w, obs.h);
                    player.vx = 0;
                    player.vy = 0;
                }
            }

            // Move Y then resolve collisions
            player.y += player.vy * delta;
            for (const obs of obstacles) {
                if (circleRectCollide(player.x, player.y, player.r, obs.x, obs.y, obs.w, obs.h)) {
                    resolveCircleRectOverlap(player, obs.x, obs.y, obs.w, obs.h);
                    player.vx = 0;
                    player.vy = 0;
                }
            }

            // Bounds
            player.x = Math.max(player.r, Math.min(width - player.r, player.x));
            player.y = Math.max(player.r, Math.min(height - player.r, player.y));
            
            // Update swing animation
            if (player.swinging) {
                player.swingProgress += delta / player.swingDuration;
                if (player.swingProgress >= 1) {
                    player.swinging = false;
                    player.swingProgress = 0;
                }
            }
            
            // Update muzzle flashes
            for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
                muzzleFlashes[i].life -= delta;
                if (muzzleFlashes[i].life <= 0) {
                    muzzleFlashes.splice(i, 1);
                }
            }

            // Bullets (Player)
            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                b.x += b.vx * delta;
                b.y += b.vy * delta;
                b.life -= delta * 1000;

                // Obstacle collision
                let hitWall = false;
                for (const obs of obstacles) {
                    if (circleRectCollide(b.x, b.y, b.r, obs.x, obs.y, obs.w, obs.h)) {
                        hitWall = true;
                        break;
                    }
                }
                if (hitWall) {
                    bullets.splice(i, 1);
                    continue;
                }

                if (b.life <= 0 || b.x < 0 || b.x > width || b.y < 0 || b.y > height) {
                    bullets.splice(i, 1);
                    continue;
                }

                // Collision with enemies
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const e = enemies[j];
                    if (dist(b, e) < b.r + e.r) {
                        if (b.oneShot) {
                            // instant kill from ATGM
                            e.hp = 0;
                        } else {
                            e.hp -= b.dmg;
                        }
                        createHitEffect(e.x, e.y);

                        if (e.hp <= 0) {
                            // heal player by 10% of max health on enemy kill
                            player.health = Math.min(player.maxHealth, player.health + player.maxHealth * 0.10);
                            score += 10;
                            coins += 5;
                            createScorePopup(e.x, e.y, 10);
                            createCoinPopup(e.x, e.y, 5);
                            soundManager.playExplosion();
                            dropLoot(e.x, e.y);
                            enemies.splice(j, 1);
                            enemiesDefeated++;
                            checkWaveComplete();
                        }
                        bullets.splice(i, 1);
                        break;
                    }
                }
            }

            // Enemy Bullets
            for (let i = enemyBullets.length - 1; i >= 0; i--) {
                const b = enemyBullets[i];
                b.x += b.vx * delta;
                b.y += b.vy * delta;
                b.life -= delta * 1000;

                // Obstacle collision
                let hitWall = false;
                for (const obs of obstacles) {
                    if (circleRectCollide(b.x, b.y, b.r, obs.x, obs.y, obs.w, obs.h)) {
                        hitWall = true;
                        break;
                    }
                }
                if (hitWall) {
                    enemyBullets.splice(i, 1);
                    continue;
                }

                if (b.life <= 0 || b.x < 0 || b.x > width || b.y < 0 || b.y > height) {
                    enemyBullets.splice(i, 1);
                    continue;
                }

                // Collision with Player
                if (dist(b, player) < b.r + player.r) {
                    player.health -= b.dmg;
                    createHitEffect(player.x, player.y);
                    soundManager.playPlayerSound('damage');
                    if (player.health <= 0) gameOver();
                    updateUI();
                    enemyBullets.splice(i, 1);
                }
            }

            // Enemies
            spawnTimer += delta * 1000;
            if (spawnTimer > spawnInterval && enemies.length < enemiesInWave - enemiesDefeated) {
                spawnTimer = 0;
                spawnEnemy();
            }

            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];
                const d = dist(e, player);
                
                // Movement
                let move = true;
                if (e.type === 'ranged' && d < e.range) move = false;

                if (move) {
                    const angle = Math.atan2(player.y - e.y, player.x - e.x);
                    const vx = Math.cos(angle) * e.speed * delta;
                    const vy = Math.sin(angle) * e.speed * delta;

                    e.x += vx;
                    for (const obs of obstacles) {
                        if (circleRectCollide(e.x, e.y, e.r, obs.x, obs.y, obs.w, obs.h)) {
                            e.x -= vx;
                            break;
                        }
                    }

                    e.y += vy;
                    for (const obs of obstacles) {
                        if (circleRectCollide(e.x, e.y, e.r, obs.x, obs.y, obs.w, obs.h)) {
                            e.y -= vy;
                            break;
                        }
                    }
                }

                // Behavior
                if (e.type === 'exploder') {
                    if (d < e.range) {
                        // Explode
                        createHitEffect(e.x, e.y); // Explosion visual
                        // Damage player
                        if (d < e.range + player.r) {
                            player.health -= 15;
                            if (player.health <= 0) gameOver();
                            updateUI();
                        }
                        // Kill enemy
                        enemies.splice(i, 1);
                        enemiesDefeated++;
                        checkWaveComplete();
                        continue;
                    }
                } else if (e.type === 'ranged' || e.type === 'standard' || e.type === 'tank') {
                    const now = performance.now();
                    // Choose behavior by weapon type assigned at spawn
                    // Small tanks / ranged -> machine gun (fast bullets)
                    // Big tanks -> missile launcher (slower, high-dmg)

                    // Helper to handle reload and ammo if present
                    function tryReloadIfNeeded(entity) {
                        if (typeof entity.ammo !== 'undefined' && entity.ammo <= 0) {
                            if (entity.reserve > 0 && !entity.reloading) {
                                entity.reloading = true;
                                setTimeout(() => {
                                    const take = Math.min(entity.magSize || 6, entity.reserve);
                                    entity.ammo = take;
                                    entity.reserve -= take;
                                    entity.reloading = false;
                                }, entity.reloadTime || 1500);
                            }
                            return true; // reloading or out of ammo
                        }
                        return false;
                    }

                    // Machine gun behavior
                    if (e.weapon === 'mg') {
                        const mgRate = e.mgCooldown || 220; // ms between bursts
                        if (now - e.lastAttack > mgRate) {
                            if (e.reloading) { e.lastAttack = now; continue; }
                            if (tryReloadIfNeeded(e)) { e.lastAttack = now; continue; }
                            // Fire single mg bullet
                            e.lastAttack = now;
                            if (typeof e.ammo !== 'undefined') e.ammo = Math.max(0, e.ammo - 1);
                            const angle = Math.atan2(player.y - e.y, player.x - e.x);
                                    // Determine base percent by enemy subtype: standard (small), ranged (medium)
                                    const basePercent = (e.type === 'standard') ? 1 : (e.type === 'ranged') ? 2 : 1;
                                    const percent = basePercent + Math.max(0, (wave || 1) - 1);
                                    const mgDmg = (player && player.maxHealth) ? player.maxHealth * (percent / 100) : (e.bulletDmg || 6);
                                    enemyBullets.push({
                                        x: e.x,
                                        y: e.y,
                                        // slower MG rounds
                                        vx: Math.cos(angle) * (e.bulletSpeed || 420),
                                        vy: Math.sin(angle) * (e.bulletSpeed || 420),
                                        r: e.bulletR || 4,
                                        dmg: mgDmg,
                                        life: e.bulletLife || 2000,
                                        color: e.color
                                    });
                        }

                    // Missile launcher behavior for big tanks
                    } else if (e.weapon === 'missile') {
                        const missileRate = e.missileCooldown || 1800;
                        if (now - e.lastAttack > missileRate) {
                            if (e.reloading) { e.lastAttack = now; continue; }
                            if (tryReloadIfNeeded(e)) { e.lastAttack = now; continue; }
                            e.lastAttack = now;
                            if (typeof e.ammo !== 'undefined') e.ammo = Math.max(0, e.ammo - 1);
                            const angle = Math.atan2(player.y - e.y, player.x - e.x);
                            // Missile has larger radius, higher dmg, slower speed
                            // Big tank missile damage scales per wave: base 5% + (wave-1)
                            const baseTankPercent = 5;
                            const tankPercent = baseTankPercent + Math.max(0, (wave || 1) - 1);
                            const missileDmg = (player && player.maxHealth) ? player.maxHealth * (tankPercent / 100) : (e.missileDmg || 35);
                            enemyBullets.push({
                                x: e.x + Math.cos(angle) * (e.r + 8),
                                y: e.y + Math.sin(angle) * (e.r + 8),
                                // slower missiles
                                vx: Math.cos(angle) * (e.missileSpeed || 180),
                                vy: Math.sin(angle) * (e.missileSpeed || 180),
                                r: e.missileR || 10,
                                dmg: missileDmg,
                                life: e.missileLife || 4000,
                                color: e.color
                            });
                        }
                    }
                }

                // Player collision: treat as bump/knockback, do not inflict instant melee knife damage
                if (dist(e, player) < e.r + player.r) {
                    // Push player slightly away from enemy
                    const pushAngle = Math.atan2(player.y - e.y, player.x - e.x);
                    player.x += Math.cos(pushAngle) * 6;
                    player.y += Math.sin(pushAngle) * 6;
                }
            }
            
            // Shockwaves
            updateShockWaves(delta);
            
            // Loot pickup
            pickupNearbyLoot();

            
        }

        function spawnEnemy() {
            // Spawn at edge
            let ex, ey;
            if (Math.random() < 0.5) {
                ex = Math.random() < 0.5 ? -20 : width + 20;
                ey = Math.random() * height;
            } else {
                ex = Math.random() * width;
                ey = Math.random() < 0.5 ? -20 : height + 20;
            }

            // Determine Enemy Type based on Wave
            let type = ENEMY_TYPES.STANDARD;
            const randType = Math.random();

            if (wave >= 5 && randType < 0.2) {
                type = ENEMY_TYPES.RANGED;
            } else if (wave >= 3 && randType < 0.4) {
                type = ENEMY_TYPES.TANK;
            } else if (wave >= 2 && randType < 0.6) {
                type = ENEMY_TYPES.EXPLODER;
            }

            // Scaling
            const hpScale = 1 + (wave * 0.1);
            const speedScale = 1 + (wave * 0.02);

            enemies.push({
                x: ex,
                y: ey,
                ...type,
                speed: type.speed * speedScale,
                hp: type.hp * hpScale,
                maxHp: type.hp * hpScale,
                type: type === ENEMY_TYPES.RANGED ? 'ranged' : 
                      type === ENEMY_TYPES.EXPLODER ? 'exploder' : 
                      type === ENEMY_TYPES.TANK ? 'tank' : 'standard',
                lastAttack: 0
            });

            // Configure enemy weapon properties based on type
            const spawned = enemies[enemies.length - 1];
            if (spawned.type === 'ranged' || spawned.type === 'standard') {
                // Small tanks / ranged enemies use machine guns
                spawned.weapon = 'mg';
                spawned.mgCooldown = rand(150, 280) | 0; // ms between shots
                spawned.bulletSpeed = 800;
                spawned.bulletDmg = 6;
                spawned.bulletR = 4;
                spawned.bulletLife = 2500;
                // Ammo behavior
                spawned.magSize = 12;
                spawned.ammo = spawned.magSize;
                spawned.reserve = 36;
                spawned.reloadTime = 1200;
                spawned.reloading = false;
            } else if (spawned.type === 'tank') {
                // Big tanks fire missiles
                spawned.weapon = 'missile';
                spawned.missileCooldown = rand(1500, 2400) | 0;
                spawned.missileSpeed = 320;
                spawned.missileDmg = 35;
                spawned.missileR = 10;
                spawned.missileLife = 4000;
                // Ammo / reload
                spawned.magSize = 4;
                spawned.ammo = spawned.magSize;
                spawned.reserve = 8;
                spawned.reloadTime = 2200;
                spawned.reloading = false;
            }
        }

        /*
         * draw()
         * Renders the entire frame: battlefield, obstacles, tanks, bullets,
         * effects and HUD. Called each animation frame by `loop()`.
         */
        function draw() {
            // Draw battleground
            drawBattleground();

            // Draw Obstacles (buildings with details)
            obstacles.forEach(obs => {
                // Main building fill
                ctx.fillStyle = obs.color;
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                
                // Building outline/border
                ctx.strokeStyle = obs.outline || "rgba(255, 255, 255, 0.2)";
                ctx.lineWidth = 3;
                ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                
                // Add window details
                ctx.fillStyle = "rgba(0, 243, 255, 0.1)";
                const windowSize = 15;
                for (let wx = obs.x + 20; wx < obs.x + obs.w - 20; wx += 30) {
                    for (let wy = obs.y + 20; wy < obs.y + obs.h - 20; wy += 30) {
                        ctx.fillRect(wx, wy, windowSize, windowSize);
                    }
                }
            });

            // Draw Ground Loot
            groundLoot.forEach(item => {
                ctx.fillStyle = "#fbbf24";
                ctx.beginPath();
                ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "white";
                ctx.font = "10px Arial";
                ctx.fillText("?", item.x - 3, item.y + 3);
            });

            healthItems.forEach(item => {
                ctx.fillStyle = "#2dd4bf";
                ctx.beginPath();
                ctx.arc(item.x, item.y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "white";
                ctx.font = "10px Arial";
                ctx.fillText("+", item.x - 3, item.y + 3);
            });

            coinsList.forEach(item => {
                ctx.fillStyle = "#f59e0b";
                ctx.beginPath();
                ctx.arc(item.x, item.y, 5, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw Player as tank
            const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
            drawTank(player.x, player.y, angle, player.r, '#00f3ff', true, 1);

            // Draw Muzzle Flashes
            muzzleFlashes.forEach(flash => {
                ctx.beginPath();
                ctx.arc(flash.x, flash.y, rand(5, 12), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 0, ${rand(0.5, 1)})`;
                ctx.fill();
            });
            
            // Draw Shockwaves
            drawShockWaves();

            // Draw Enemy Bullets
            enemyBullets.forEach(b => {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.fillStyle = b.color || "#fff";
                ctx.fill();
            });

            // Draw Enemies (rendered as tanks)
            enemies.forEach(e => {
                const ang = Math.atan2(player.y - e.y, player.x - e.x);
                const col = e.color || "#ff0055";
                // scale e.r to a visual scale so larger 'r' yields bigger tanks
                const scale = Math.max(0.6, e.r / 15);
                drawTank(e.x, e.y, ang, e.r, col, false, scale);

                // Enemy HP bar (scaled)
                const hpPct = e.hp / e.maxHp;
                const barW = 30 * scale;
                const barX = e.x - barW / 2;
                const barY = e.y - (e.r + 12);
                ctx.fillStyle = "red";
                ctx.fillRect(barX, barY, barW, 4);
                ctx.fillStyle = "#0f0";
                ctx.fillRect(barX, barY, barW * hpPct, 4);
            });

            // Draw Bullets
            bullets.forEach(b => {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.fillStyle = "#fff";
                ctx.fill();
                // Trail
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                ctx.lineTo(b.x - b.vx * 0.05, b.y - b.vy * 0.05);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }

        /*
         * loop()
         * Main animation loop powered by requestAnimationFrame. It calculates
         * the delta time, updates game state (unless paused), and renders
         * the scene each frame.
         */
        function loop() {
            if (!running) return;
            const now = performance.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            if (!paused) {
                update(delta);
            }
            draw();

            requestAnimationFrame(loop);
        }
        
        function updateUI() {
            scoreValueEl.textContent = score;
            coinsValueEl.textContent = coins;
            
            // Health
            const healthPct = Math.max(0, (player.health / player.maxHealth) * 100);
            healthBar.style.width = `${healthPct}%`;
            
            if (healthPct < 50) {
                healthBar.classList.add('health-critical');
            } else {
                healthBar.classList.remove('health-critical');
            }
            healthTextEl.textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;
            
            // Ultimate
            if (player.ultimateReady) {
                ultimateBar.style.width = "100%";
                ultimateTextEl.textContent = "READY";
                ultimateTextEl.style.color = "var(--secondary-color)";
            } else {
                const cooldownPct = 100 - (player.ultimateCooldown / player.ultimateMaxCooldown * 100);
                ultimateBar.style.width = `${cooldownPct}%`;
                ultimateTextEl.textContent = `${Math.ceil(player.ultimateCooldown / 1000)}s`;
                ultimateTextEl.style.color = "var(--text-dim)";
            }
            
            // Ammo
            const weapon = inventory[selectedSlot];
            if (weapon) {
                if (weapon.type === "melee") {
                    ammoValueEl.textContent = "∞";
                } else {
                    ammoValueEl.textContent = `${weapon.ammo} / ${weapon.reserve}`;
                    if (weapon.reloading) {
                        ammoValueEl.textContent = "RELOADING...";
                    }
                }
            } else {
                ammoValueEl.textContent = "-";
            }
            
            // Stats
            waveNumEl.textContent = wave;
            enemyCountEl.textContent = enemies.length;
            
            updateHotbarUI();
        }

        function gameOver() {
            running = false;
            gameOverEl.classList.remove("hidden");
            finalScoreEl.textContent = score;
            finalCoinsEl.textContent = coins;
        }

        // ----------------------------------------------------------
        // GRAPHICS: Battleground + Tank Drawing Helpers
        // ----------------------------------------------------------
        function drawBattleground() {
            // Subtle radial vignette + textured tiles for the battleground
            // Base gradient
            const g = ctx.createLinearGradient(0, 0, 0, height);
            g.addColorStop(0, '#0f1622');
            g.addColorStop(1, '#051018');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, height);

            // Tile pattern (faint)
            ctx.save();
            ctx.globalAlpha = 0.06;
            ctx.fillStyle = '#1b2a3a';
            const tile = 48;
            for (let x = 0; x < width; x += tile) {
                for (let y = 0; y < height; y += tile) {
                    if (((x / tile) + (y / tile)) % 2 === 0) {
                        ctx.fillRect(x, y, tile, tile);
                    }
                }
            }
            ctx.restore();

            // Dirt streaks / tracks
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(255,255,255,0.02)';
            for (let i = 0; i < 6; i++) {
                ctx.beginPath();
                const sx = Math.random() * width;
                ctx.moveTo(sx, 0);
                ctx.bezierCurveTo(sx + rand(-100, 100), height * 0.3, sx + rand(-100, 100), height * 0.6, sx + rand(-150, 150), height);
                ctx.stroke();
            }
            ctx.restore();
        }

        function drawTank(x, y, angle, baseR, color = '#888', isPlayer = false, scale = 1) {
            // baseR is used as approximate half-size; scale modifies overall size
            const w = baseR * 2 * scale; // hull width
            const h = baseR * 1.2 * scale; // hull height

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);

            // Treads
            ctx.fillStyle = shadeColor(color, -30);
            const treadH = h * 0.28;
            const treadW = w * 1.05;
            ctx.fillRect(-treadW / 2, -h / 2 - treadH / 2, treadW, treadH);
            ctx.fillRect(-treadW / 2, h / 2 - treadH / 2, treadW, treadH);

            // Hull
            ctx.fillStyle = color;
            roundRect(ctx, -w / 2, -h / 2, w, h, Math.max(4, baseR * 0.2));
            ctx.fill();
            ctx.lineWidth = Math.max(1, baseR * 0.06);
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.stroke();

            // Turret
            const turretR = Math.max(6, baseR * 0.6 * scale);
            ctx.beginPath();
            ctx.fillStyle = shadeColor(color, 20);
            ctx.arc(0, 0, turretR, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.stroke();

            // Barrel
            const barrelLen = Math.max(20, baseR * 1.6 * scale);
            const barrelW = Math.max(4, baseR * 0.18 * scale);
            ctx.fillStyle = shadeColor(color, 40);
            ctx.fillRect(0, -barrelW / 2, barrelLen, barrelW);

            // Player glow
            if (isPlayer) {
                ctx.restore();
                ctx.beginPath();
                ctx.arc(x, y, baseR * 1.6 * scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,243,255,0.06)';
                ctx.fill();
                return;
            }

            ctx.restore();
        }

        // Utility: rounded rect
        function roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }

        // Utility: shade color (lighten/darken)
        function shadeColor(color, percent) {
            // color in format #rrggbb
            const num = parseInt(color.slice(1), 16);
            let r = (num >> 16) + percent;
            let g = ((num >> 8) & 0x00FF) + percent;
            let b = (num & 0x0000FF) + percent;
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
            return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
        }