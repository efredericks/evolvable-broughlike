class Tile {
    constructor(game, x, y, sprite, passable, global_position) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.sprite = sprite;
        this.passable = passable;
        this.monster = null;
        this.treasure = null;

        this.effect = null;
        this.effect_counter = 0;

        this.can_burn = false;
        this.rot = 0;
        this.global_position = global_position;

        this.game_map = this.game.getGameMap(global_position.c, global_position.r);
    }

    update() { }

    draw() {
        this.game.drawSprite(this.sprite, this.x, this.y, this.rot);

        if (this.treasure) {
            this.game.drawSprite(SPRITES.ring, this.x, this.y);
        }

        if (this.effect_counter > 0) {
            this.effect_counter--;
            this.game.ctx.globalAlpha = this.effect_counter / effectMax;
            this.game.drawSprite(this.effect, this.x, this.y);
            this.game.ctx.globalAlpha = 1;
        }
    }

    setEffect(effect) {
        this.effect = effect;
        this.effect_counter = effectMax;
    }



    // manhattan distance
    dist(other) {
        return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
    }

    // replace a tile with another tile
    replace(newTileType) {
        if (this instanceof StairsDown) return;

        const newTile = new newTileType(this.game, this.x, this.y, this.global_position);
        if (this.monster) {
            newTile.monster = this.monster;
            this.monster.tile = newTile;
        }
        if (this.treasure) {
            newTile.treasure = this.treasure;
        }
        this.game_map.tiles[this.y][this.x] = newTile;
        return newTile;
    }

    getNeighbor(dx, dy) {
        return this.game_map.getTile(this.x + dx, this.y + dy);
    }
    getAdjacentNeighbors() {
        return shuffle([
            this.getNeighbor(0, -1),
            this.getNeighbor(0, 1),
            this.getNeighbor(-1, 0),
            this.getNeighbor(1, 0),
        ]);
    }
    getAdjacentPassableNeighbors() {
        return this.getAdjacentNeighbors().filter(t => t.passable);
    }
    getConnectedTiles() {
        let connectedTiles = [this];
        let frontier = [this];
        while (frontier.length) {
            let neighbors = frontier.pop().getAdjacentPassableNeighbors().filter(t => !connectedTiles.includes(t));
            connectedTiles = connectedTiles.concat(neighbors);
            frontier = frontier.concat(neighbors);
        }
        return connectedTiles;
    }


    stepOn(monster) {
        if (this.passable) {
            if (monster.isPlayer && this.treasure) {
                this.game.score++;
                this.treasure = false;
                this.game_map.spawnMonster();
            }
        }
    }
}

class Floor extends Tile {
    constructor(game, x, y, global_position) {
        super(game, x, y, shuffle(FLOOR_TILES)[0], true, global_position);
    }

    // stepOn(monster) {
    //     if (monster.isPlayer && this.treasure) {
    //         this.game.score++;
    //         this.treasure = false;
    //         this.game.game_map.spawnMonster();
    //     }
    // }
}
class Wall extends Tile {
    constructor(game, x, y, global_position) {
        super(game, x, y, SPRITES.wall, false, global_position);
    }
}
class River extends Tile {
    constructor(game, x, y, global_position, dir) {
        super(game, x, y, SPRITES.river, false, global_position);
        this.rot = 0.0;
    }
    // rotate() {
    //     this.rot = Math.PI / 2.0;
    // }
}
class Bridge extends Tile {
    constructor(game, x, y, global_position) {
        super(game, x, y, SPRITES.ladder, true, global_position);
        this.rot = 0.0;
    }
}
class Tree extends Tile {
    constructor(game, x, y, global_position) {
        super(game, x, y, shuffle(TREE_TILES)[0], false, global_position);
        this.can_burn = true;
    }
}
class Grass extends Tile {
    constructor(game, x, y, global_position) {
        super(game, x, y, SPRITES.grass, true, global_position);
        this.can_burn = true;
    }
    // stepOn(monster) {
    //     if (monster.isPlayer && this.treasure) {
    //         this.game.score++;
    //         this.treasure = false;
    //         this.game.game_map.spawnMonster();
    //     }
    // }
}
class StairsDown extends Tile {
    constructor(game, x, y, global_position) {
        super(game, x, y, SPRITES.stairs_down, true, global_position);
    }

    stepOn(monster) {
        super.stepOn(monster);
        if (monster.isPlayer) {
            if (this.game.level == numLevels) {
                this.game.addScore(this.game.score, this.game.turns, true);
                this.game.showTitle();
            } else {
                this.game.level++;
                this.game.startLevel(this.game.player.hp + 1)
            }
        }
    }
}

class Grave extends Tile {
    constructor(game, x, y, global_position) {
        super(game, x, y, SPRITES.grave, true, global_position);
        this.hp = SPRITES.grave?.hp ?? 1;
    }

    update() {
        this.hp--;
        if (this.hp <= 0) {
            this.replace(Floor);
        }
    }
}
class Fire extends Tile {
    constructor(game, x, y, global_position) {
        super(game, x, y, SPRITES.fire, true, global_position);
        this.hp = SPRITES.fire?.hp ?? 1;
    }

    update() {
        let neighbors = this.getAdjacentNeighbors();
        for (let n of neighbors) {
            // if (n.sprite == SPRITES.grass && Math.random() > FIRE_SPREAD) {
            if (n.can_burn && Math.random() > FIRE_SPREAD) {
                n.replace(Fire);
            }
        }


        this.hp--;
        if (this.hp <= 0) {
            this.replace(Floor);
            this.sprite = SPRITES.floor2
            return;
        }
    }

    stepOn(monster) {
        super.stepOn(monster);
        monster.hit(1);
        // if (monster.isPlayer && this.treasure) {
        //     this.game.score++;
        //     this.treasure = false;
        //     this.game.game_map.spawnMonster();
        // }
    }
}
const WALKABLE_TILES = [Floor, Grass];