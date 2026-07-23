spells = {
    // teleport to random tile
    TELEPORT: (e) => {
        e.move(game.game_map.randomPassableTile());
    },

    // teleport all monsters to random cell
    TP_OTHERS: (e) => {
        for (let m of e.game.game_map.monsters) {
            if (m.teleport_counter <= 0) {
                m.move(game.game_map.randomPassableTile());
                m.teleport_counter = 2;
            }
        }
    },

    // heal self and surrounding
    AURA: (e) => {
        e.tile.getAdjacentNeighbors().forEach(function (t) {
            t.setEffect(SPRITES.heart);
            if (t.monster) {
                t.monster.heal(1);
            }
        });
        e.tile.setEffect(SPRITES.heart);
        e.heal(1);
    },

    // dash in last direction


    // damage each monster next to walls
    QUAKE: (e) => {
        for (let r = 0; r < numTiles; r++) {
            for (let c = 0; c < numTiles; c++) {
                let tile = e.game.game_map.getTile(c, r);
                // tile.setEffect(SPRITES.ouch);
                if (tile.monster && !tile.monster.isPlayer) {
                    let num_walls = 4 - tile.getAdjacentPassableNeighbors().length;
                    tile.monster.hit(num_walls * 2);
                }
            }
        }
        e.game.shakeAmount = 20;
    },

    // send bolt along path
    BOLT: (e) => {
        boltTravel(e, e.lastMove, SPRITES.fire, 15 + Math.abs(e.lastMove[1]));
    },
    CROSS: (e) => {
        let dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (let d of dirs)
            boltTravel(e, d, SPRITES.fire, 15 + Math.abs(d[1]));

    },
    EX: (e) => {
        let dirs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        for (let d of dirs)
            boltTravel(e, d, SPRITES.fire, 15 + Math.abs(d[1]));

    }
}

// send a bolt along a path from entity e
function boltTravel(e, direction, effect, dmg) {
    let newTile = e.tile;
    let timeout = 1000;

    while (timeout > 0) {
        timeout--;
        let testTile = newTile.getNeighbor(direction[0], direction[1]);
        if (testTile.passable) {
            newTile = testTile;
            if (newTile.monster) {
                newTile.monster.hit(dmg);
            }
            newTile.setEffect(effect);

            // add new fire entity to burnable things
            if (newTile.sprite == SPRITES.grass) {
                newTile.replace(Fire);
            }

        } else {
            break;
        }
    }
}