// thoughts (stage 4)
// encode action as an opcode
// 

class Monster {
    constructor(game, tile, sprite) {
        this.game = game;
        this.move(tile);
        this.sprite = sprite;

        this.hp = sprite?.hp ?? -1;
        this.max_hp = sprite?.hp ?? -1;

        this.mana = sprite?.mana ?? -1;
        this.max_mana = sprite?.mana ?? -1;

        this.name = sprite?.name ?? "MISSING";
        this.drops = sprite?.drops ?? null;
        this.cash = 0;

        this.dead = false;
        this.stunned = false; // can't move
        this.teleport_counter = 2;
        this.lastMove = [-1, 0];

        this.offsetX = 0;
        this.offsetY = 0;

        this.isPlayer = false;
        this.opcodes = [];

        this.global_position = tile.global_position;
    }

    checkCast(spell_name) {
        const mana_cost = SPELL_COST[spell_name] ?? 0;
        if (this.mana >= mana_cost) {
            this.healMP(-mana_cost)
            return true;
        } else {
            if (this.isPlayer) {
                this.game.shakeAmount = 5;
            }
            return false;
        }
    }

    getGameMap() {
        return this.game.getGameMap(this.global_position.c, this.global_position.r);
    }

    draw() {
        if (this.dead) {
            this.game.drawSprite(this.sprite, this.tile.x, this.tile.y);
        }
        else if (this.teleport_counter > 0) {
            // this.game.drawSprite(SPRITES.teleport, this.tile.x, this.tile.y, this.teleport_counter);
            this.game.drawSprite(SPRITES.teleport, this.getDisplayX(), this.getDisplayY(), this.teleport_counter);
        } else {
            // this.game.drawSprite(this.sprite, this.tile.x, this.tile.y);
            this.game.drawSprite(this.sprite, this.getDisplayX(), this.getDisplayY());
            if (!this.dead)
                this.drawHP();
        }

        this.offsetX -= Math.sign(this.offsetX) * (1 / 8);
        this.offsetY -= Math.sign(this.offsetY) * (1 / 8);
    }

    drawHP() {
        // background
        const h = tileSize * 0.15;
        const x = this.getDisplayX() * tileSize;
        const y = this.getDisplayY() * tileSize - 2 * h;//tileSize * 0.15;
        // const x = this.tile.x * tileSize;
        // const y = this.tile.y * tileSize - tileSize * 0.15;

        this.game.ctx.fillStyle = "#ff000033";
        this.game.ctx.fillRect(x, y, tileSize, h);

        // fixed padding for green bar
        const padding = 2;

        // clamp percentage of health
        let hp_perc = Math.max(0, Math.min(1, this.hp / this.max_hp));
        let mp_perc = Math.max(0, Math.min(1, this.mana / this.max_mana));

        // inner size
        const maxInnerWidth = tileSize - (padding * 2);
        const innerHeight = h - (padding * 2);

        // scaling and offsetting
        const w2 = maxInnerWidth * hp_perc;
        const mana_w2 = maxInnerWidth * mp_perc;
        const x2 = x + padding;
        let y2 = y + padding;

        // green
        if (w2 > 0) {
            this.game.ctx.fillStyle = "#00ff00";
            this.game.ctx.fillRect(x2, y2, w2, innerHeight);
        }

        y2 += h;
        this.game.ctx.fillStyle = "#ff000033";
        this.game.ctx.fillRect(x, y, tileSize, h);
        if (w2 > 0) {
            this.game.ctx.fillStyle = "#00d9ff";
            this.game.ctx.fillRect(x2, y2, mana_w2, innerHeight);
        }

        // original from tutorial - heart drawing
        // for (let i = 0; i < this.hp; i++) {
        //     this.game.drawSprite(SPRITES.heart, this.tile.x + (di % 3) * (5 / 16), this.tile.y - Math.floor(i/3) * (5/16));
        // }
    }

    tryMove(dx, dy) {
        let newTile = this.tile.getNeighbor(dx, dy);
        // console.log(newTile)
        if (newTile.passable) {
            this.lastMove = [dx, dy];
            if (!newTile.monster) {
                this.move(newTile);
            } else {
                if (this.isPlayer != newTile.monster.isPlayer) {
                    newTile.monster.hit(1);

                    this.game.shakeAmount = 5;

                    this.offsetX = (newTile.x - this.tile.x) / 2;
                    this.offsetY = (newTile.y - this.tile.y) / 2;
                }
            }
            return true;
        } else {
            // wrap to next grid position
            // right
            if (newTile.x > numTiles - 1 && this.isPlayer && this.global_position.c < GRID_COLS - 1) {
                this.global_position.c++;
                let moveTile = this.getGameMap().getTile(0, this.tile.y);
                this.move(moveTile, true);
                // left
            } else if (newTile.x < 0 && this.isPlayer && this.global_position.c > 0) {
                this.global_position.c--;
                let moveTile = this.getGameMap().getTile(numTiles - 1, this.tile.y);
                this.move(moveTile, true);
            }

            // up
            if (newTile.y > numTiles - 1 && this.isPlayer && this.global_position.r < GRID_ROWS - 1) {
                this.global_position.r++;
                let moveTile = this.getGameMap().getTile(this.tile.x, 0);
                this.move(moveTile, true);
                // down
            } else if (newTile.y < 0 && this.isPlayer && this.global_position.r > 0) {
                this.global_position.r--;
                let moveTile = this.getGameMap().getTile(this.tile.x, numTiles - 1);
                this.move(moveTile, true);
            }
        }
    }

    healMP(amt) {
        if (!this.dead) {
            this.mana += amt;
            this.mana = Math.max(0, Math.min(this.max_mana, this.mana));
        }
    }
    heal(dmg) {
        if (!this.dead) {
            this.hp += dmg;
            this.hp = Math.max(0, Math.min(this.max_hp, this.hp));
        }
    }

    hit(dmg) {
        // damage free while teleporting in
        if (this.teleport_counter > 0) return;

        this.hp -= dmg;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }

    // lookup items to drop and percent chance
    tryDrop() {
        if (this.drops !== null) { // we have drops
            const drop = shuffle(this.drops)[0];
            if (Math.random() > drop.chance) {
                if (this.tile.item === null) {
                    this.tile.item = SPRITES[drop.item];
                }
            }
        }
    }

    die() {
        this.tryDrop();

        if (!this.tile.monster.isPlayer) this.game.score++;

        this.dead = true;
        this.tile.monster = null;
        this.tile.replace(Grave);
        // this.sprite = SPRITES.grave;
    }

    getDisplayX() {
        return this.tile.x + this.offsetX;
    }
    getDisplayY() {
        return this.tile.y + this.offsetY;
    }

    move(tile, tp = false) {
        if (this.tile) {
            this.tile.monster = null;

            if (tp) {
                this.offsetX = 0;
                this.offsetY = 0;
                // this.offsetX = (tile.x - this.tile.x) / 2;
                // this.offsetY = (tile.y - this.tile.y) / 2;
            } else {
                this.offsetX = this.tile.x - tile.x;
                this.offsetY = this.tile.y - tile.y;
            }
        }
        this.tile = tile;
        tile.monster = this;
        tile.stepOn(this);
    }

    update() {
        if (this.dead) return;

        // teleport in or handle stunnded state
        this.teleport_counter--;
        if (this.stunned || this.teleport_counter > 0) {
            this.stunned = false;
            return;
        }

        this.runProgram();
    }
    runProgram() {
        let neighbors = this.tile.getAdjacentPassableNeighbors();
        neighbors = neighbors.filter(t => !t.monster || t.monster.isPlayer);
        if (neighbors.length) {
            neighbors.sort((a, b) => a.dist(this.game.player.tile) - b.dist(this.game.player.tile));
            let newTile = neighbors[0];
            this.tryMove(newTile.x - this.tile.x, newTile.y - this.tile.y);
        }
    }
}
// monsters
class Snake extends Monster {
    constructor(game, tile) {
        super(game, tile, SPRITES.snake);
    }
}
class Dog extends Monster {
    constructor(game, tile) {
        super(game, tile, SPRITES.dog);
    }
}
class Rat extends Monster {
    constructor(game, tile) {
        super(game, tile, SPRITES.rat);
    }
}
class Tick extends Monster {
    constructor(game, tile) {
        super(game, tile, SPRITES.tick);
    }
}
class Blob extends Monster {
    constructor(game, tile) {
        super(game, tile, SPRITES.blob);
    }
}
class Ghost extends Monster {
    constructor(game, tile) {
        super(game, tile, SPRITES.ghost);
    }
}
class Turtle extends Monster {
    constructor(game, tile) {
        super(game, tile, SPRITES.turtle);
    }
}
class Octopode extends Monster {
    constructor(game, tile) {
        super(game, tile, SPRITES.octopode);
    }
}
class Mushroom extends Monster {
    constructor(game, tile) {
        super(game, tile, SPRITES.mushroom);
    }
}
class Trap extends Monster {
    constructor(game, tile) {
        super(game, tile, SPRITES.trap);
        this.spell = shuffle([spells.CROSS, spells.EX])[0];
        this.timer = 30;//timer;
        this.max_timer = 30;//timer;
    }

    update() {
        if (this.teleport_counter <= 0) {
            this.timer--;
            if (this.timer <= 0) {
                this.spell(this);
                this.timer = this.max_timer;
            }
        }

        // normal update
        if (this.dead) return;

        // teleport in or handle stunnded state
        this.teleport_counter--;
        if (this.stunned || this.teleport_counter > 0) {
            this.stunned = false;
            return;
        }

        this.tile.stepOn(this);
    }

    draw() {
        super.draw();
        // if (this.teleport_counter <= 0) {
        //     this.game.ctx.fillStyle = 'white';
        this.game.ctx.font = "10px monospace";
        //     this.game.ctx.fillText(`${this.timer}/${this.max_timer}`,
        //         this.tile.x * tileSize, this.tile.y * tileSize
        //     )
        // }

        if (!this.dead) {
            this.game.ctx.strokeStyle = "#00fff795";
            this.game.ctx.lineWidth = 2;
            this.game.ctx.lineJoin = "round";
            this.game.ctx.strokeText(`${this.timer}/${this.max_timer}`, this.tile.x * tileSize, this.tile.y * tileSize - 8);
            this.game.drawText(
                `${this.timer}/${this.max_timer}`,
                10,
                false,
                this.tile.y * tileSize - 8,
                'rgb(243, 153, 62)',
                this.tile.x * tileSize,
            );
        }
    }
}

// player
class Player extends Monster {
    constructor(game, tile) {
        super(game, tile, SPRITES.player);
        this.isPlayer = true;
        this.teleport_counter = 0;
    }

    tryMove(dx, dy) {
        if (super.tryMove(dx, dy)) {
            this.game.tick();

            if (dx == 0 && dy == 0) {
                super.heal(0.5);
                super.healMP(0.5);
            }
        }
    }
}

// change this to a perc chance lookup per level perhaps
const AVAILABLE_MONSTERS = [
    // [Trap], // 0
    [Trap, Snake, Dog, Rat, Tick, Blob, Ghost, Turtle, Octopode, Mushroom], // 0
    [Trap, Snake, Dog, Rat, Tick, Blob, Ghost, Turtle, Octopode, Mushroom], // 0
    [Trap, Snake, Dog, Rat, Tick, Blob, Ghost, Turtle, Octopode, Mushroom], // 1
    [Trap, Snake, Dog, Rat, Tick, Blob, Ghost, Turtle, Octopode, Mushroom], // 2
    [Trap, Snake, Dog, Rat, Tick, Blob, Ghost, Turtle, Octopode, Mushroom], // 3
    [Trap, Snake, Dog, Rat, Tick, Blob, Ghost, Turtle, Octopode, Mushroom], // 4
    [Trap, Snake, Dog, Rat, Tick, Blob, Ghost, Turtle, Octopode, Mushroom], // 5
    [Trap, Snake, Dog, Rat, Tick, Blob, Ghost, Turtle, Octopode, Mushroom], // 6
    [Trap, Snake, Dog, Rat, Tick, Blob, Ghost, Turtle, Octopode, Mushroom], // 7
    [Trap, Snake, Dog, Rat, Tick, Blob, Ghost, Turtle, Octopode, Mushroom], // 8
];