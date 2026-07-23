const numTiles = 18;
const uiWidth = 8;
const tileSize = 32;
const spritesheetTileSize = 8;
const bg = "#222323";
const numLevels = 6;
const local_storage_name = "evo-broughlike-scores";
const effectMax = 100;
const GRASS_SPREAD = 0.95;
const FIRE_SPREAD = 0.5;

const SPRITES = {
    // moveable entities: c, r, hp
    player: { c: 13, r: 0, hp: 89995 },
    snake: { c: 4, r: 1, hp: 1 },
    dog: { c: 5, r: 1, hp: 3 },
    rat: { c: 6, r: 1, hp: 2 },
    tick: { c: 7, r: 1, hp: 5 },
    blob: { c: 8, r: 1, hp: 4 },
    ghost: { c: 9, r: 1, hp: 6 },
    turtle: { c: 10, r: 1, hp: 8 },
    octopode: { c: 11, r: 1, hp: 2 },
    mushroom: { c: 12, r: 1, hp: 4 },
    fire: { c: 8, r: 8, hp: 5 },
    trap: { c: 1, r: 8, hp: 3 },

    // env:, c, r
    wall: { c: 2, r: 1 },
    floor1: { c: 4, r: 4 },
    floor2: { c: 1, r: 1 },
    heart: { c: 6, r: 6 },
    grave: { c: 9, r: 7, hp: 50 },
    teleport: { c: 4, r: 8 },
    stairs_down: { c: 4, r: 3 },
    stairs_up: { c: 5, r: 3 },
    ring: { c: 9, r: 5 },
    bolt: { c: 3, r: 8 },
    grass: { c: 5, r: 4 },
    ouch: { c: 5, r: 8 },

    // ui: c, r

}
const FLOOR_TILES = [SPRITES.floor1, SPRITES.floor2, SPRITES.grass];

// available directions to move in
const DIRS = [
    [-1, 0], [0, -1], [1, 0], [0, 1], [0, 0]
];

const AIType = {
    random: 0,
    NN: 1,
}