// overworld
const GRID_COLS = 5;
const GRID_ROWS = 3;
// local grid
const numTiles = 18;

const uiWidth = 8;
const tileSize = 32;
const spritesheetTileSize = 8;
const bg = "#222323";
const numLevels = 6;
const local_storage_name = "evo-broughlike-scores";
const effectMax = 100;
const GRASS_SPREAD = 0.98;
const FIRE_SPREAD = 0.5;

const SPRITES = {
    // moveable entities: c, r, hp
    player: { c: 13, r: 0, hp: 5000, name: "Player", mana: 6 },

    // enemies
    snake: { c: 4, r: 1, hp: 1, name: "Snake", mana: 6, drops: [{ item: 'hp_potion', chance: 0.7 }, { item: 'mp_potion', chance: 0.7 }, { item: 'coin', chance: 0.5 }] },
    dog: { c: 5, r: 1, hp: 3, name: "Dog", mana: 6, drops: [{ item: 'hp_potion', chance: 0.7 }, { item: 'mp_potion', chance: 0.7 }, { item: 'coin', chance: 0.5 }] },
    rat: { c: 6, r: 1, hp: 2, name: "Rat", mana: 6, drops: [{ item: 'hp_potion', chance: 0.7 }, { item: 'mp_potion', chance: 0.7 }, { item: 'coin', chance: 0.5 }] },
    tick: { c: 7, r: 1, hp: 5, name: "Tick", mana: 6, drops: [{ item: 'hp_potion', chance: 0.7 }, { item: 'mp_potion', chance: 0.7 }, { item: 'coin', chance: 0.5 }] },
    blob: { c: 8, r: 1, hp: 4, name: "Blob", mana: 6, drops: [{ item: 'hp_potion', chance: 0.7 }, { item: 'mp_potion', chance: 0.7 }, { item: 'coin', chance: 0.5 }] },
    ghost: { c: 9, r: 1, hp: 6, name: "Ghost", mana: 6, drops: [{ item: 'hp_potion', chance: 0.7 }, { item: 'mp_potion', chance: 0.7 }, { item: 'coin', chance: 0.5 }] },
    turtle: { c: 10, r: 1, hp: 8, name: "Turtle", mana: 6, drops: [{ item: 'hp_potion', chance: 0.7 }, { item: 'mp_potion', chance: 0.7 }, { item: 'coin', chance: 0.5 }] },
    octopode: { c: 11, r: 1, hp: 2, name: "Octopode", mana: 6, drops: [{ item: 'hp_potion', chance: 0.7 }, { item: 'mp_potion', chance: 0.7 }, { item: 'coin', chance: 0.5 }] },
    mushroom: { c: 12, r: 1, hp: 4, name: "Mushroom", mana: 6, drops: [{ item: 'hp_potion', chance: 0.7 }, { item: 'mp_potion', chance: 0.7 }, { item: 'coin', chance: 0.5 }] },
    fire: { c: 8, r: 8, hp: 5, name: "Fire", mana: 6, drops: [{ item: 'hp_potion', chance: 0.7 }, { item: 'mp_potion', chance: 0.7 }, { item: 'coin', chance: 0.5 }] },
    trap: { c: 1, r: 8, hp: 3, name: "Trap", mana: 6, drops: [{ item: 'hp_potion', chance: 0.7 }, { item: 'mp_potion', chance: 0.7 }, { item: 'coin', chance: 0.5 }] },

    // items
    hp_potion: { c: 7, r: 8, name: "Health potion", amt: 2 },
    mp_potion: { c: 0, r: 10, name: "Mana potion", amt: 2 },
    coin: { c: 8, r: 5, name: "Coin", amt: 1 },

    // env:, c, r
    wall: { c: 2, r: 1 },
    floor1: { c: 4, r: 4 },
    floor2: { c: 1, r: 1 },
    heart: { c: 6, r: 6 },
    grave: { c: 9, r: 7, hp: 10 },
    teleport: { c: 4, r: 8 },
    stairs_down: { c: 4, r: 3 },
    stairs_up: { c: 5, r: 3 },
    ring: { c: 9, r: 5 },
    bolt: { c: 3, r: 8 },
    grass: { c: 5, r: 4 },
    ouch: { c: 5, r: 8 },
    tree1: { c: 4, r: 5 },
    tree2: { c: 5, r: 5 },
    river: { c: 15, r: 5 },
    hriver: { c: 12, r: 6 },
    vriver: { c: 13, r: 6 },
    ladder: { c: 11, r: 5 },
    pavement: { c: 1, r: 10 },

    // ui: c, r

}
const FLOOR_TILES = [SPRITES.floor1, SPRITES.floor2];//, SPRITES.grass];
const TREE_TILES = [SPRITES.tree1, SPRITES.tree2];

// available directions to move in
const DIRS = [
    [-1, 0], [0, -1], [1, 0], [0, 1], [0, 0]
];
// ring around position
const NEIGHBOR_DIRS = [
    [-1, 0], [0, -1], [1, 0], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1]
]

// mana cost per spell
const SPELL_COST = {
    TELEPORT: 2,
    TP_OTHERS: 4,
    AURA: 5,
    QUAKE: 5,
    BOLT: 2,
    CROSS: 2,
    EX: 2,
    TREE_RING: 6,
}

const AIType = {
    random: 0,
    NN: 1,
}

let mouseX = 0;
let mouseY = 0;
let hoverRow = -1;
let hoverCol = -1;
let mouseCells = [];