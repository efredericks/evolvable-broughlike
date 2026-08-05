// thoughts
// generate grid-based overworld
// must solve grid before moving on
// can backtrack

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

        // noise.seed(Math.random());

        // this.canvas.style.width = this.canvas.width + 'px';
        // this.canvas.style.height = this.canvas.height + 'px';

        this.ctx.imageSmoothingEnabled = false;

        this.spritesheet = new Image();
        this.spritesheet.src = "assets/sprites/kenney_micro-roguelike//Tilemap/colored_tilemap_packed_mod.png";

        this.state = STATES.loading;

        // setup map
        this.level = 1;
        this.score = 0;
        this.turns = 0;

        this.shakeAmount = 0;
        this.shakeX = 0;
        this.shakeY = 0;

        // input handling
        document.querySelector("html").onkeypress = (e) => {
            if (this.state == STATES.title) {
                if (e.key == "C") {
                    this.clearScores();
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.showTitle();
                } else this.startGame();
            } else if (this.state == STATES.dead) this.showTitle();
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
                if (e.key == "8") spells.BOLT(this.player, true);

                // agent
                if (e.key == "p") this.autoplay = !this.autoplay;
                if (e.key == "P") {
                    if (this.interval_speed == 15) this.interval_speed = 120;
                    else this.interval_speed = 15;

                    clearInterval(this.interval);
                    this.interval = setInterval(() => {
                        this.intervalTasks();
                    }, this.interval_speed);
                }
            } else {
                throw "Error: undefined state";
            }
        };

        // agent things
        this.autoplay = false;
        this.interval_speed = 15; // 150
        // this.agent = new RandomAgent(this);
        this.agent = new DirectedRandomAgent(this);

        // this.nn = new NeuralNetwork([2,3,3,3,4,3,2], [relu, sigmoid]);
        // console.log(this.nn.forward([1,0]))

        // start after assets are loaded
        this.spritesheet.onload = () => {
            // draw call
            this.interval = setInterval(() => {
                this.intervalTasks();
                // this.draw();
                // if (this.autoplay && this.state == STATES.running) this.agent.act();
                // }, 120);
            }, 15);

            // agent call
            // setInterval(() => {
            // if (this.autoplay && this.state == STATES.running) this.agent.act();
            // }, 100); 

            this.showTitle();
        };
    }

    // run inside setInterval
    intervalTasks() {
        this.draw();
        if (this.autoplay && this.state == STATES.running) this.agent.act();
    }

    // scores
    getScores() {
        if (localStorage[local_storage_name])
            return JSON.parse(localStorage[local_storage_name]);
        else
            return []
    }
    addScore(score, turns, won) {
        let scores = this.getScores();
        let scoreObject = { score: score, turns: turns, run: 1, totalScore: score, active: won };
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
                rightPad(["RUN", "TURNS", "SCORE", "TOTAL"]),
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
                let scoreText = rightPad([scores[i].run, scores[i].turns, scores[i].score, scores[i].totalScore]);
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
        this.drawText("press any key ([C] to clear scores)", 20, true, this.canvas.height / 3 + 30, "white");

        this.drawScores();

        if (AVAILABLE_MONSTERS.length < numLevels) {
            throw "AVAILABLE MONSTERS too short";
        }
    }

    clearScores() {
        if (localStorage[local_storage_name]) {
            localStorage.removeItem(local_storage_name);
        }
    }

    startGame() {
        this.level = 1;
        this.score = 0;
        this.turns = 0;
        this.autoplay = false;

        this.startLevel(SPRITES.player.hp);
        this.state = STATES.running;

        // setInterval(() => this.draw(), 15);
    }
    startLevel(hp) {
        noise.seed(Math.random());
        // this.spawn_rate = 15;
        // this.spawn_counter = this.spawn_rate;

        this.game_maps = [];
        for (let r = 0; r < GRID_ROWS; r++) {
            this.game_maps[r] = [];
            for (let c = 0; c < GRID_COLS; c++) {
                this.game_maps[r][c] = new GameMap(this, c, r);
                this.game_maps[r][c].generateLevelFromWorld(c, r);

                this.game_maps[r][c].spawn_rate = 15;
                this.game_maps[r][c].spawn_counter = this.game_maps[r][c].spawn_rate;
            }
        }

        // staircase in last corner
        this.game_maps[GRID_ROWS - 1][GRID_COLS - 1].stairs_tile = this.game_maps[GRID_ROWS - 1][GRID_COLS - 1].randomPassableTile();
        this.game_maps[GRID_ROWS - 1][GRID_COLS - 1].stairs_tile.replace(StairsDown);

        this.player = new Player(this, this.game_maps[0][0].randomPassableTile());
        this.player.hp = hp;
        this.player.max_hp = hp;
        console.log(this.player)

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

    getCurrentGameMap() {
        return this.game_maps[this.player.global_position.r][this.player.global_position.c];
    }
    getGameMap(c, r) {
        return this.game_maps[r][c];
    }

    tick() {
        // environmental effects
        for (let r = 0; r < numTiles; r++) {
            for (let c = 0; c < numTiles; c++) {
                let tile = this.getCurrentGameMap().getTile(c, r);
                tile.update();

                // rass spread (visual/
                if (tile instanceof Grass && Math.random() > GRASS_SPREAD) {
                    // if (tile.sprite == SPRITES.grass && Math.random() > GRASS_SPREAD) {
                    let neighbors = tile.getAdjacentPassableNeighbors();
                    for (let n of neighbors) {
                        if (n instanceof Floor) {//} && n.sprite != SPRITES.grass) {
                            n.replace(Grass);
                            // n.sprite = SPRITES.grass;
                        }
                    }
                }
            }
        }

        for (let i = this.getCurrentGameMap().monsters.length - 1; i >= 0; i--) {
            if (!this.getCurrentGameMap().monsters[i].dead) {
                this.getCurrentGameMap().monsters[i].update();

            } else {
                if (this.getCurrentGameMap().monsters.length > 0)
                    this.getCurrentGameMap().monsters.splice(i, 1);
            }
        }

        // agent activity
        if (this.autoplay)
            this.agent.act();

        this.turns++;

        // swap game state
        if (this.player.dead) {
            this.state = STATES.dead;
            this.addScore(this.score, this.turns, false);
        }

        // spawn more monsters
        this.getCurrentGameMap().spawn_counter--;
        if (this.getCurrentGameMap().spawn_counter <= 0) {
            this.getCurrentGameMap().spawnMonster();
            this.getCurrentGameMap().spawn_counter = this.getCurrentGameMap().spawn_rate;
            this.getCurrentGameMap().spawn_rate--;
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
                    this.getCurrentGameMap().getTile(c, r).draw();
                }
            }
            // lines to show allowable movement
            this.ctx.strokeStyle = 'rgba(0, 254, 144, 0.82)';
            this.ctx.lineWidth = 3;

            if (this.player.global_position.c > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(0, this.canvas.height);
                this.ctx.stroke();
            }
            if (this.player.global_position.c < GRID_COLS - 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.canvas.width - uiWidth * tileSize, 0);
                this.ctx.lineTo(this.canvas.width - uiWidth * tileSize, this.canvas.height);
                this.ctx.stroke();
            }
            if (this.player.global_position.r > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(this.canvas.width - uiWidth * tileSize, 0);
                this.ctx.stroke();
            }
            if (this.player.global_position.r < GRID_ROWS - 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, this.canvas.height);
                this.ctx.lineTo(this.canvas.width - uiWidth * tileSize, this.canvas.height);
                this.ctx.stroke();
            }

            // draw on top of gravestones
            let sorted_monsters = this.getCurrentGameMap().monsters.sort((a, b) => b.dead - a.dead);
            for (let sm of sorted_monsters)
                sm.draw();
            // for (let i = this.game_map.monsters.length - 1; i >= 0; i--) {
            //     this.game_map.monsters[i].draw();
            // }
            this.player.draw();

            this.drawUI();
            this.drawMouse();
        }
    }
    // orthogonal/supercover line c/o redblob: https://www.redblobgames.com/grids/line-drawing/
    drawLineToMouse(targetCol, targetRow) {
        const game_map = this.getCurrentGameMap();

        // calculate direction from player to target
        const dx = targetCol - this.player.tile.x;
        const dy = targetRow - this.player.tile.y;

        const nx = Math.abs(dx);
        const ny = Math.abs(dy);

        const sign_x = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
        const sign_y = dy > 0 ? 1 : (dy < 0 ? -1 : 0);

        let current_x = this.player.tile.x;
        let current_y = this.player.tile.y;

        let cells_along_line = [{
            c: current_x,
            r: current_y,
            x: current_x * tileSize,
            y: current_y * tileSize
        }];

        for (let ix = 0, iy = 0; ix < nx || iy < ny;) {
            const decision = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx;

            // safely get tile
            const tile = game_map.tiles[current_y]?.[current_x];

            // check in bounds or hitting wall
            if (!tile || !tile.passable) {
                cells_along_line.push({
                    c: current_x,
                    r: current_y,
                    x: current_x * tileSize,
                    y: current_y * tileSize,
                    passable: false,
                });
                break;
            }

            //// too many cells being drawn in supercover - just using orthogonal
            // if (decision === 0) { // next step diagonal
            //     current_x += sign_x;
            //     current_y += sign_y;
            //     ix++;
            //     iy++;
            // } else 
            if (decision < 0) { // next step horizontal
                current_x += sign_x;
                ix++;
            } else { // next step vertical
                current_y += sign_y;
                iy++;
            }

            cells_along_line.push({
                c: current_x,
                r: current_y,
                x: current_x * tileSize,
                y: current_y * tileSize,
                passable: true,
            });
        }

        return cells_along_line;
    }
    drawMouse() {
        const ht = tileSize / 2;
        let [mx, my] = getCanvasCoords(this.ctx, mouseX, mouseY);

        if (mx >= 0 && mx < this.canvas.width - uiWidth * tileSize && my >= 0 && my <= this.canvas.height) {
            hoverCol = Math.floor(mx / tileSize);
            hoverRow = Math.floor(my / tileSize);

            const x = hoverCol * tileSize;
            const y = hoverRow * tileSize;

            // const cells_to_draw = this.drawLineToMouse(hoverCol, hoverRow);
            mouseCells = this.drawLineToMouse(hoverCol, hoverRow);
            for (let cell of mouseCells) {
                if (cell.passable) {
                    this.ctx.strokeStyle = "#00c8ff";
                } else {
                    this.ctx.strokeStyle = "#ff9500";
                }
                this.ctx.strokeRect(cell.x, cell.y, tileSize, tileSize);
            }

            this.ctx.strokeStyle = "#ff00ff";
            this.ctx.strokeRect(x, y, tileSize, tileSize);
        } else {
            hoverRow = -1;
            hoverCol = -1;
            mouseCells = [];
        }
    }
    drawUI() {
        this.drawText(`Level: ${this.level}/${numLevels}`, 20, false, 40, "violet");
        this.drawText(`Score: ${this.score}`, 20, false, 70, "violet");
        this.drawText(`HP: ${this.player.hp}/${this.player.max_hp}`, 20, false, 100, 'violet')
        this.drawText(`MP: ${this.player.mana}/${this.player.max_mana}`, 20, false, 130, 'violet')
        this.drawText(`Turns: ${this.turns}`, 20, false, 160, 'violet')
        this.drawText(`Position: c:${this.player.global_position.c} r:${this.player.global_position.r}`, 20, false, 190, 'violet')

        if (hoverCol >= 0 && hoverRow >= 0 && hoverCol <= numTiles - 1 && hoverRow <= numTiles - 1) {
            let t = this.getCurrentGameMap().tiles[hoverRow][hoverCol];
            if (t.monster != null) {
                this.drawText(`${t.monster.name} [${t.monster.hp}/${t.monster.max_hp}]`, 20, false, 210, 'yellow');
            }
        }

        // panel consts
        const ui_w = uiWidth * tileSize;
        const ui_x = this.canvas.width - ui_w;
        const padding = 10; // outer margin
        const gap = 4;      // grid spacing
        const available_w = ui_w - (2 * padding);
        const box_w = (available_w - ((GRID_COLS - 1) * gap)) / GRID_COLS;

        // starting coords
        let start_x = ui_x + padding;
        const minimap_total_h = (GRID_ROWS * box_w) + ((GRID_ROWS - 1) * gap);
        let start_y = this.canvas.height - padding - minimap_total_h;

        this.ctx.strokeStyle = "#ffffff";
        this.ctx.strokeWidth = 1;

        // draw grid with slight offset for clearer lines
        for (let r = 0; r < GRID_ROWS; r++) {
            let x = start_x;
            let y = start_y + r * (box_w + gap);

            for (let c = 0; c < GRID_COLS; c++) {
                // Use Math.floor/round to avoid sub-pixel blurry line rendering
                this.ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.floor(box_w), Math.floor(box_w));

                const sprite_w = box_w * 0.8;
                const sprite_off = box_w * 0.1;

                if (this.player.global_position.c == c && this.player.global_position.r == r) {
                    this.drawDirectSprite(SPRITES.player, x + sprite_off, y + sprite_off, sprite_w);
                }
                x += box_w + gap;
            }
        }
    }

    // draw a sprite to a specific coordinate with a specific width
    drawDirectSprite(sprite, x, y, w) {
        this.ctx.drawImage(
            this.spritesheet,
            sprite.c * spritesheetTileSize,
            sprite.r * spritesheetTileSize,
            spritesheetTileSize,
            spritesheetTileSize,
            x,
            y,
            w,
            w);
    }

    drawSprite(sprite, x, y, rot = 0, w = null) {
        if (rot == 0) {
            this.ctx.drawImage(this.spritesheet, sprite.c * spritesheetTileSize, sprite.r * spritesheetTileSize, spritesheetTileSize, spritesheetTileSize, x * tileSize + this.shakeX, y * tileSize + this.shakeY, tileSize, tileSize);
        } else {
            this.ctx.save();

            // move the origin to the center of destination and rotate
            const centerX = x * tileSize + this.shakeX + tileSize / 2;
            const centerY = y * tileSize + this.shakeY + tileSize / 2;
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(rot);
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
