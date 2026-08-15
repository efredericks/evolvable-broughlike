spells = {
    // teleport to random tile
    TELEPORT: (e) => {
        if (e.checkCast('TELEPORT'))
            e.move(e.getGameMap().randomPassableTile());
        // e.move(game.game_map.randomPassableTile());
    },

    // teleport all monsters to random cell
    TP_OTHERS: (e) => {
        if (e.checkCast('TP_OTHERS')) {
            for (let m of e.getGameMap().monsters) {
                if (m.teleport_counter <= 0) {
                    m.move(e.getGameMap().randomPassableTile());
                    m.teleport_counter = 2;
                }
            }
        }
    },

    // heal self and surrounding
    AURA: (e) => {
        if (e.checkCast('AURA')) {
            e.tile.getAdjacentNeighbors().forEach(function (t) {
                t.setEffect(SPRITES.heart);
                if (t.monster) {
                    t.monster.heal(1);
                }
            });
            e.tile.setEffect(SPRITES.heart);
            e.heal(1);
        }
    },

    // dash in last direction


    // damage each monster next to walls
    QUAKE: (e) => {
        if (e.checkCast('QUAKE')) {
            for (let r = 0; r < numTiles; r++) {
                for (let c = 0; c < numTiles; c++) {
                    let tile = e.getGameMap().getTile(c, r);
                    // tile.setEffect(SPRITES.ouch);
                    if (tile.monster && !tile.monster.isPlayer) {
                        let num_walls = 4 - tile.getAdjacentPassableNeighbors().length;
                        tile.monster.hit(num_walls * 2);
                    }
                }
            }
            e.game.shakeAmount = 20;
        }
    },

    // send bolt along path
    BOLT: (e, along_path = false) => {
        if (along_path && mouseTimer <= 0) return; // TBD: constrains to user path - not ideal

        if (e.checkCast('BOLT')) {
            boltTravel(e, e.lastMove, SPRITES.fire, 15 + Math.abs(e.lastMove[1]), along_path);
        }
    },
    CROSS: (e) => {
        if (e.checkCast('CROSS')) {
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (let d of dirs)
                boltTravel(e, d, SPRITES.fire, 15 + Math.abs(d[1]));

        }
    },
    EX: (e) => {
        if (e.checkCast('EX')) {
            const dirs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
            for (let d of dirs)
                boltTravel(e, d, SPRITES.fire, 15 + Math.abs(d[1]));

        }
    },

    // spawn ring of trees around target
    TREE_RING: (e) => {
        if (mouseCells.length > 0) { // has target
            if (e.checkCast('TREE_RING')) { // can cast
                let cell = mouseCells[mouseCells.length - 1]; // get last cell
                let target = e.getGameMap().getTile(cell.c, cell.r);
                if (target) {
                    e.game.shakeAmount = 20;
                    for (let dir of NEIGHBOR_DIRS) {
                        let neighbor = target.getNeighbor(dir[0], dir[1]);
                        if (neighbor && neighbor.passable) {
                            neighbor.replace(Tree);
                        }
                    }
                }
            }
        }
    }
}

// send a bolt along a path from entity e
function boltTravel(e, direction, effect, dmg, along_path = false) {
    let newTile = e.tile;
    let timeout = 1000;

    while (timeout > 0) {
        timeout--;

        // fire along mouse path
        if (along_path) {
            let game_map = e.getGameMap();
            for (let cell of mouseCells) {
                if (cell.passable) {
                    const tile = game_map.getTile(cell.c, cell.r);
                    if (tile.monster) tile.monster.hit(dmg);

                    if (tile.passable)
                        tile.setEffect(effect);

                    if (tile.can_burn) tile.replace(Fire);

                    let neighbors = tile.getAdjacentNeighbors();
                    for (let n of neighbors) {
                        if (n.can_burn && Math.random() > FIRE_SPREAD) {
                            n.replace(Fire);
                        }
                    }
                }
            }
        } else { // fire in last direction
            let testTile = newTile.getNeighbor(direction[0], direction[1]);
            if (testTile.passable) {
                newTile = testTile;
                if (newTile.monster) {
                    newTile.monster.hit(dmg);
                }
                newTile.setEffect(effect);

                let neighbors = newTile.getAdjacentNeighbors();
                for (let n of neighbors) {
                    if (n.can_burn && Math.random() > FIRE_SPREAD) {
                        n.replace(Fire);
                    }
                }

                // add new fire entity to burnable things
                if (newTile.can_burn) {//sprite == SPRITES.grass) {
                    newTile.replace(Fire);
                }

            } else {
                break;
            }
        }
    }
}



////// sprite modifiers
/*
* distance = each adds 1 tile 
* modifier:
  * fire
  * poison
  * explosion on death
  * trap
  * 

* spawn
  * tree
  * grass
  * water
*/