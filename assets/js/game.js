const STATES = Object.freeze({
    title: 0,
    loading: 1,
    running: 2,
    dead: 3
});
class Game {
    constructor() {
        this.canvas = document.getElementById("game");
        this.ctx = this.canvas.getContext("2d");

        this.canvas.width = tileSize * (numTiles + uiWidth);
        this.canvas.height = tileSize * numTiles;
        this.canvas.style.aspectRatio = `${numTiles + uiWidth} / ${numTiles}`;
        this.canvas.style.width = 'auto';
        this.canvas.style.height = 'auto';

        // this.canvas.style.width = this.canvas.width + 'px';
        // this.canvas.style.height = this.canvas.height + 'px';

        this.ctx.imageSmoothingEnabled = false;

        this.spritesheet = new Image();
        this.spritesheet.src = "assets/sprites/kenney_micro-roguelike//Tilemap/colored_tilemap_packed.png";

        this.state = STATES.loading;

        // setup map
        this.level = 1;
        this.score = 0;

        this.shakeAmount = 0;
        this.shakeX = 0;
        this.shakeY = 0;

        // input handling
        document.querySelector("html").onkeypress = (e) => {
            if (this.state == STATES.title) this.startGame();
            else if (this.state == STATES.dead) this.showTitle();
            else if (this.state == STATES.running) {
                if (e.key == "w") this.player.tryMove(0, -1);
                if (e.key == "s") this.player.tryMove(0, 1);
                if (e.key == "a") this.player.tryMove(-1, 0);
                if (e.key == "d") this.player.tryMove(1, 0);
                if (e.key == ".") this.player.tryMove(0, 0);

                // debug
                if (e.key == "H") this.player.hp = this.player.max_hp;
                if (e.key == "1") spells.TELEPORT(this.player);
                if (e.key == "2") spells.QUAKE(this.player);
                if (e.key == "3") spells.TP_OTHERS(this.player);
                if (e.key == "4") spells.AURA(this.player);
                if (e.key == "5") spells.BOLT(this.player);
                if (e.key == "6") spells.CROSS(this.player);
                if (e.key == "7") spells.EX(this.player);

                // agent
                if (e.key == "p") this.autoplay = !this.autoplay;
            } else {
                throw "Error: undefined state";
            }
        };

        // agent things
        this.autoplay = false;
        this.agent = new DirectedRandomAgent(this);

        // start after assets are loaded
        this.spritesheet.onload = () => {
            // draw call
            setInterval(() => { 
                this.draw();
                if (this.autoplay && this.state == STATES.running) this.agent.act();
            }, 120);//15);

            // agent call
            // setInterval(() => {
                // if (this.autoplay && this.state == STATES.running) this.agent.act();
            // }, 100); 

            this.showTitle();
        };
    }

    // scores
    getScores() {
        if (localStorage[local_storage_name])
            return JSON.parse(localStorage[local_storage_name]);
        else
            return []
    }
    addScore(score, won) {
        let scores = this.getScores();
        let scoreObject = { score: score, run: 1, totalScore: score, active: won };
        let lastScore = scores.pop();

        if (lastScore) {
            if (lastScore.active) {
                scoreObject.run = lastScore.run + 1;
                scoreObject.totalScore += lastScore.totalScore;
            } else {
                scores.push(lastScore);
            }
        }
        scores.push(scoreObject);

        localStorage[local_storage_name] = JSON.stringify(scores);
    }
    drawScores() {
        let scores = this.getScores();
        if (scores.length) {
            this.drawText(
                rightPad(["RUN", "SCORE", "TOTAL"]),
                18,
                true,
                this.canvas.height / 2 + 40,
                "white"
            );

            let newestScore = scores.pop();
            scores.sort(function (a, b) {
                return b.totalScore - a.totalScore;
            });
            scores.unshift(newestScore);

            for (let i = 0; i < Math.min(10, scores.length); i++) {
                let scoreText = rightPad([scores[i].run, scores[i].score, scores[i].totalScore]);
                this.drawText(
                    scoreText,
                    18,
                    true,
                    this.canvas.height / 2 + 24 + i * 24 + 40,
                    i == 0 ? "aqua" : "violet"
                );
            }
        }
    }

    showTitle() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.state = STATES.title;

        this.drawText("evolvable broughlike", 40, true, this.canvas.height / 3, "white");

        this.drawScores();

        if (AVAILABLE_MONSTERS.length < numLevels) {
            throw "AVAILABLE MONSTERS too short";
        }
    }

    startGame() {
        this.level = 1;
        this.score = 0;
        this.autoplay = false;

        this.startLevel(SPRITES.player.hp);
        this.state = STATES.running;

        // setInterval(() => this.draw(), 15);
    }
    startLevel(hp) {
        this.spawn_rate = 15;
        this.spawn_counter = this.spawn_rate;

        this.game_map = new GameMap(this);
        this.game_map.generateLevel();

        this.player = new Player(this, this.game_map.randomPassableTile());
        this.player.hp = hp;
        this.player.max_hp = hp;
        console.log(this.player)

        this.stairs_tile = this.game_map.randomPassableTile();
        this.stairs_tile.replace(StairsDown);
    }

    drawText(text, size, centered, textY, color, _textX = null) {
        this.ctx.fillStyle = color;
        this.ctx.font = size + "px monospace";

        let textX;
        if (_textX == null) {
            if (centered) {
                textX = (this.canvas.width - this.ctx.measureText(text).width) / 2;
            } else {
                textX = this.canvas.width - uiWidth * tileSize + 25;
            }
        } else {
            textX = _textX;
        }

        this.ctx.fillText(text, textX, textY);
    }

    tick() {
        // environmental effects
        for (let r = 0; r < numTiles; r++) {
            for (let c = 0; c < numTiles; c++) {
                let tile = this.game_map.getTile(c, r);
                tile.update();

                // grass spread (visual/
                if (tile.sprite == SPRITES.grass && Math.random() > GRASS_SPREAD) {
                    let neighbors = tile.getAdjacentPassableNeighbors();
                    for (let n of neighbors) {
                        if (n instanceof Floor && n.sprite != SPRITES.grass) {
                            n.sprite = SPRITES.grass;
                        }
                    }
                }
            }
        }

        for (let i = this.game_map.monsters.length - 1; i >= 0; i--) {
            if (!this.game_map.monsters[i].dead) {
                this.game_map.monsters[i].update();

            } else {
                if (this.game_map.monsters.length > 0)
                    this.game_map.monsters.splice(i, 1);
            }
        }

        // agent activity
        if (this.autoplay)
            this.agent.act();

        // swap game state
        if (this.player.dead) {
            this.state = STATES.dead;
            this.addScore(this.score, false);
        }

        // spawn more monsters
        this.spawn_counter--;
        if (this.spawn_counter <= 0) {
            this.game_map.spawnMonster();
            this.spawn_counter = this.spawn_rate;
            this.spawn_rate--;
        }


    }
    draw() {
        if (this.state == STATES.running || this.state == STATES.dead) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.screenshake();

            // ui bar
            this.ctx.strokeStyle = 'rgba(220,220,220,0.8)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width - uiWidth * tileSize, 0);
            this.ctx.lineTo(this.canvas.width - uiWidth * tileSize, this.canvas.height);
            this.ctx.stroke();

            for (let r = 0; r < numTiles; r++) {
                for (let c = 0; c < numTiles; c++) {
                    this.game_map.getTile(c, r).draw();
                }
            }

            // draw on top of gravestones
            let sorted_monsters = this.game_map.monsters.sort((a, b) => b.dead - a.dead);
            for (let sm of sorted_monsters)
                sm.draw();
            // for (let i = this.game_map.monsters.length - 1; i >= 0; i--) {
            //     this.game_map.monsters[i].draw();
            // }
            this.player.draw();

            this.drawUI();
        }
    }
    drawUI() {
        this.drawText(`Level: ${this.level}/${numLevels}`, 20, false, 40, "violet");
        this.drawText(`Score: ${this.score}`, 20, false, 70, "violet");
        this.drawText(`HP: ${this.player.hp}/${this.player.max_hp}`, 20, false, 100, 'violet')
    }

    drawSprite(sprite, x, y, rot = 0) {
        if (rot == 0) {
            this.ctx.drawImage(this.spritesheet, sprite.c * spritesheetTileSize, sprite.r * spritesheetTileSize, spritesheetTileSize, spritesheetTileSize, x * tileSize + this.shakeX, y * tileSize + this.shakeY, tileSize, tileSize);
        } else {
            this.ctx.save();

            // 1. Move the origin to the absolute CENTER of the tile destination
            const centerX = x * tileSize + this.shakeX + tileSize / 2;
            const centerY = y * tileSize + this.shakeY + tileSize / 2;
            this.ctx.translate(centerX, centerY);

            // 2. Rotate around that center point
            this.ctx.rotate(rot);

            // 3. Draw relative to the new center origin (0, 0)
            // Offset by negative half-width and half-height to center it perfectly
            this.ctx.drawImage(
                this.spritesheet,
                sprite.c * spritesheetTileSize,
                sprite.r * spritesheetTileSize,
                spritesheetTileSize,
                spritesheetTileSize,
                -tileSize / 2,
                -tileSize / 2,
                tileSize,
                tileSize
            );

            this.ctx.restore();
        }
    }

    screenshake() {
        if (this.shakeAmount) this.shakeAmount--;

        let shakeAngle = Math.random() * Math.PI * 2;
        this.shakeX = Math.round(Math.cos(shakeAngle) * this.shakeAmount);
        this.shakeY = Math.round(Math.sin(shakeAngle) * this.shakeAmount);
    }
}
