
// map things
class GameMap {
    constructor(game) {
        this.game = game;
        this.tiles = [];
        this.monsters = [];
    }
    generateLevel() {
        // this.generateTiles();
        tryTo('generate connected map', () => {
            return this.generateTiles() == this.randomPassableTile().getConnectedTiles().length;
        });

        this.generateMonsters();
        for (let i = 0; i < 3; i++) {
            this.randomPassableTile().treasure = true;
        }

        // grab some prefabs perhaps
        for (let i = 0; i < 5; i++) {
            let prefab = shuffle(prefabs)[0];

            let sc = randomRange(1, numTiles - prefab[0].length - 1);
            let sr = randomRange(1, numTiles - prefab.length - 1);

            let _r = 0;
            let _c = 0;

            for (let _r = 0; _r < prefab.length; _r++) {
                for (let _c = 0; _c < prefab[_r].length; _c++) {

                    // map to world coords
                    let r = sr + _r;
                    let c = sc + _c;

                    // Safely grab the character token
                    let token = prefab[_r][_c];

                    if (token === "t") {
                        this.tiles[r][c].replace(Tree);
                    } else if (token === " " || token === ".") {
                        this.tiles[r][c].replace(Floor);
                    }
                }
            }
        }

        let r = randomRange(1, numTiles-2);
        let lc = randomRange(1, numTiles-2);
        for (let c = 0; c < numTiles; c++) {
            if (lc == c) this.tiles[r][c].replace(Bridge);
            else this.tiles[r][c].replace(River);
        }
        for (let c = 0; c < numTiles; c++) {
            this.tiles[r-1][c].replace(Floor);
            this.tiles[r+1][c].replace(Floor);
        }

    }
    generateTiles() {
        this.tiles = [];
        let passableTiles = 0;

        for (let r = 0; r < numTiles; r++) {
            this.tiles[r] = [];
            for (let c = 0; c < numTiles; c++) {

                // let's allow the player to be on the boundary to give a bit more space to play with
                if (Math.random() < 0.3) {// || !this.inBounds(c, r)) {
                    this.tiles[r][c] = new Wall(this.game, c, r);
                } else {
                    let t = shuffle(WALKABLE_TILES)[0];
                    this.tiles[r][c] = new t(this.game, c, r);//Floor(this.game, c, r);
                    passableTiles++;
                }
            }
        }
        return passableTiles;
    }

    // local utils
    inBounds(c, r) {
        return c >= 0 && r >= 0 && c <= numTiles - 1 && r <= numTiles - 1;
    }

    // get a tile in range
    getTile(c, r) {
        if (this.inBounds(c, r)) return this.tiles[r][c];
        else return new Wall(this.game, c, r);
    }

    // get a randomly walkable tile without a monster already in it
    randomPassableTile() {
        let tile;
        tryTo('get random walkable tile', () => {
            let c = randomRange(0, numTiles - 1);
            let r = randomRange(0, numTiles - 1);
            tile = this.getTile(c, r);
            return tile.passable && !tile.monster;
        });
        return tile;
    }

    // create monsters per level
    generateMonsters() {
        this.monsters = [];
        let numMonsters = this.game.level + 1;
        for (let i = 0; i < numMonsters; i++) {
            this.spawnMonster();
        }
    }
    spawnMonster() {
        let monsterType = shuffle(AVAILABLE_MONSTERS[this.game.level - 1])[0]; // change into lookup table of difficulty levels
        let monster = new monsterType(this.game, this.randomPassableTile());
        this.monsters.push(monster);
    }

    spawnSpecificMonster(monster, tile, tp = 2) {
        let m = new monster(this.game, tile);
        m.teleport_counter = tp;
        this.monsters.push(m);
    }
}