
// map things
class GameMap {
    constructor(game, c, r) {
        this.game = game;
        this.global_position = { c: c, r: r };
        this.tiles = [];
        this.monsters = [];
    }

    // generate level from world
    generateLevelFromWorld(wc, wr) {
        this.tiles = [];
        for (let r = 0; r < numTiles; r++) {
            this.tiles[r] = [];
            for (let c = 0; c < numTiles; c++) {
                const zoom = 0.01;
                const world_pos = chunkToWorld(wc, wr, c, r);

                // temporarily give a 'border' around the world to avoid softlocking (doesn't help with walls)
                if (r == 0 || c == 0 || r == numTiles - 1 || c == numTiles - 1) {
                    let t = Floor;
                    this.tiles[r][c] = new t(this.game, c, r, this.global_position);//Floor(this.game, c, r);
                } else {
                    const n = noise.simplex2(world_pos.world_col * zoom, world_pos.world_row * zoom);
                    if (n < -0.85 || n > 0.85) {
                        this.tiles[r][c] = new Wall(this.game, c, r, this.global_position);
                    } else if (n < -0.5 || n > 0.5) {
                        let t = Floor;
                        this.tiles[r][c] = new t(this.game, c, r, this.global_position);//Floor(this.game, c, r);
                    } else if (n < -0.25 || n > 0.25) {
                        this.tiles[r][c] = new Tree(this.game, c, r, this.global_position);
                    } else {
                        let t = Floor;
                        this.tiles[r][c] = new t(this.game, c, r, this.global_position);//Floor(this.game, c, r);
                    }
                    
                    // if floor, replace with grass
                    if (Math.random() > 0.9 && this.tiles[r][c] instanceof Floor)
                        this.tiles[r][c].replace(Grass);

                    // dropped by enemies
                    if (Math.random() > 0.9) {
                        if (this.tiles[r][c].passable)
                            this.tiles[r][c].item = shuffle([SPRITES.addFire, SPRITES.addPoison, SPRITES.addTile])[0];
                    }
                }


                // console.log(`${world_pos.world_col}, ${world_pos.world_row}`)

                // if (world_pos.world_row < 40) {
                // let t = shuffle(WALKABLE_TILES)[0];
                // this.tiles[r][c] = new t(this.game, c, r, this.global_position);//Floor(this.game, c, r);
                // } else {
                //     this.tiles[r][c] = new Wall(this.game, c, r, this.global_position);

                // }
            }
        }

        // generate path to each quadrant
        let start_c = 0;
        let start_r = 0;
        let end_c = numTiles;
        let end_r = numTiles;

        if (wc == 0) start_c = Math.floor(numTiles / 2);
        if (wr == 0) start_r = Math.floor(numTiles / 2);
        if (wc == GRID_COLS - 1) end_c = Math.ceil(numTiles / 2);
        if (wr == GRID_ROWS - 1) end_r = Math.ceil(numTiles / 2);


        let mid_c = Math.floor(numTiles / 2);
        for (let c = start_c; c < end_c; c++) {
            this.tiles[mid_c][c].replace(Pavement);
            if (mid_c - 1 >= 0) this.tiles[mid_c - 1][c].replace(Pavement);
            if (mid_c + 1 < numTiles-1) this.tiles[mid_c + 1][c].replace(Pavement);
        }
        for (let r = start_r; r < end_r; r++) {
            this.tiles[r][mid_c].replace(Pavement);

            if (mid_c - 1 >= 0) this.tiles[r][mid_c - 1].replace(Pavement);
            if (mid_c + 1 < numTiles-1) this.tiles[r][mid_c + 1].replace(Pavement);
        }

    }

    // old level generator - deprecated
    generateLevel() {
        // this.generateTiles();
        tryTo('generate connected map', () => {
            return this.generateTiles() == this.randomPassableTile().getConnectedTiles().length;
        });

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

                    // grab the character token
                    let token = prefab[_r][_c];

                    if (token === "t") {
                        this.tiles[r][c].replace(Tree);
                    } else if (token === " " || token === ".") {
                        this.tiles[r][c].replace(Floor);
                    }
                }
            }
        }

        const map_features = ['river', 'lake', null];
        const sel = shuffle(map_features)[0];

        // lake

        // river
        let river_random = Math.random();
        if (river_random > 0.66) { // horizontal
            let r = randomRange(1, numTiles - 2);
            let lc = randomRange(1, numTiles - 2);
            for (let c = 0; c < numTiles; c++) {
                if (lc == c) this.tiles[r][c].replace(Bridge);
                else {
                    this.tiles[r][c].replace(River);
                    this.tiles[r][c].rot = Math.PI / 2.0;
                    // this.tiles[r][c].rotate();
                }
            }
            for (let c = 0; c < numTiles; c++) {
                this.tiles[r - 1][c].replace(Floor);
                this.tiles[r + 1][c].replace(Floor);
            }
        } else if (river_random > 0.33) { // vertical
            let c = randomRange(1, numTiles - 2);
            let lr = randomRange(1, numTiles - 2);
            for (let r = 0; r < numTiles; r++) {
                if (lr == r) {
                    this.tiles[r][c].replace(Bridge);
                    this.tiles[r][c].rot = Math.PI / 2.0;
                } else {
                    this.tiles[r][c].replace(River);
                    this.tiles[r][c].rot = 0.0;
                }
            }
            for (let r = 0; r < numTiles; r++) {
                this.tiles[r][c - 1].replace(Floor);
                this.tiles[r][c + 1].replace(Floor);
            }
        }

        // monsters and treasures after all map pcg is done
        this.generateMonsters();
        for (let i = 0; i < 3; i++) {
            this.randomPassableTile().treasure = true;
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
                    this.tiles[r][c] = new Wall(this.game, c, r, this.global_position);
                } else {
                    let t = shuffle(WALKABLE_TILES)[0];
                    this.tiles[r][c] = new t(this.game, c, r, this.global_position);//Floor(this.game, c, r);
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
        else return new Wall(this.game, c, r, this.global_position);
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