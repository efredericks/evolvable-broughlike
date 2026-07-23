class Tile {
    constructor(game, x, y, sprite, passable) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.sprite = sprite;
        this.passable = passable;
        this.monster = null;
        this.treasure = null;

        this.effect = null;
        this.effect_counter = 0;
    }

    update() {}

    draw() {
        this.game.drawSprite(this.sprite, this.x, this.y);

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
    replace(newTileType){
        if (this instanceof StairsDown) return;

        const newTile = new newTileType(this.game, this.x, this.y);
        if (this.monster) {
            newTile.monster = this.monster;
            this.monster.tile = newTile;
        }
        this.game.game_map.tiles[this.y][this.x] = newTile;
        return newTile;
    }

    getNeighbor(dx, dy) {
        return this.game.game_map.getTile(this.x + dx, this.y + dy);
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
}

class Floor extends Tile {
    constructor(game, x, y) {
        super(game, x, y, shuffle(FLOOR_TILES)[0], true);
    }

    stepOn(monster) {
        if (monster.isPlayer && this.treasure) {
            this.game.score++;
            this.treasure = false;
            this.game.game_map.spawnMonster();
        }
    }
}
class Wall extends Tile {
    constructor(game, x, y) {
        super(game, x, y, SPRITES.wall, false);
    }
}
class StairsDown extends Tile {
    constructor(game, x, y) {
        super(game, x, y, SPRITES.stairs_down, true);
    }

    stepOn(monster) {
        if (monster.isPlayer) {
            if (this.game.level == numLevels) {
                this.game.addScore(this.game.score, true);
                this.game.showTitle();
            } else {
                this.game.level++;
                this.game.startLevel(this.game.player.hp + 1)
            }
        }
    }
}

class Grave extends Tile {
    constructor(game, x, y) {
        super(game, x, y, SPRITES.grave, true);
        this.hp = SPRITES.fire?.hp ?? 1;
    }
    stepOn() {}

    update() {
        this.hp--;
        if (this.hp <= 0) {
            this.replace(Floor);
        }
    }
}
class Fire extends Tile {
    constructor(game, x, y) {
        super(game, x, y, SPRITES.fire, true);
        this.hp = SPRITES.fire?.hp ?? 1;
    }

    update() {
        let neighbors = this.getAdjacentPassableNeighbors();
        for (let n of neighbors) {
            if (n.sprite == SPRITES.grass && Math.random() > FIRE_SPREAD) {
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
        monster.hit(1);
    }
}