// behavior trees - matches opcodes to functions
const nodeStatus = Object.freeze({ SUCCESS: 'success', FAILURE: 'failure' });

// run children in order, stop at first success
// priority list
class Selector {
    constructor(children) { this.children = children; }

    tick(monster) {
        for (const child of this.children) {
            if (child.tick(monster) === nodeStatus.SUCCESS) return nodeStatus.SUCCESS;
        }
        return nodeStatus.FAILURE;
    }
}

// run children in order, stop at first failure
// all most hold - ANDed
class Sequence {
    constructor(children) { this.children = children; }

    tick(monster) {
        for (const child of this.children) {
            if (child.tick(monster) === nodeStatus.FAILURE) return nodeStatus.FAILURE;
        }
        return nodeStatus.SUCCESS;
    }
}

// leaf conditional check 
class Condition {
    constructor(fn) { this.fn = fn; }

    tick(monster) {
        return this.fn(monster) ? nodeStatus.SUCCESS : nodeStatus.FAILURE;
    }
}

// leaf that does something!
// fn expected to return nodeStatus
class Action {
    constructor(fn) { this.fn = fn; }

    tick(monster) {
        // return this.fn(monster);
        return this.fn(monster) ? nodeStatus.SUCCESS : nodeStatus.FAILURE;
    }
}

//////// actions
const isPlayerAdjacent = new Condition(m => m.tile.dist(m.game.player.tile) <= 1);
const isPlayerNearby = new Condition(m => m.tile.dist(m.game.player.tile) <= 5);
const isLowHP = new Condition(m => m.hp / m.max_hp < 0.3);

// follows a player
const chasePlayer = new Action(m => {
    let neighbors = m.tile.getAdjacentPassableNeighbors().filter(t => !t.monster || t.monster.isPlayer);
    if (!neighbors.length) return nodeStatus.FAILURE;
    neighbors.sort((a, b) => a.dist(m.game.player.tile) - b.dist(m.game.player.tile));
    const newTile = neighbors[0];
    m.tryMove(newTile.x - m.tile.x, newTile.y - m.tile.y);
    return nodeStatus.SUCCESS;
});

// runs away from player
const fleeFromPlayer = new Action(m => {
    const neighbors = m.tile.getAdjacentPassableNeighbors().filter(t => !t.monster);
    if (!neighbors.length) return nodeStatus.FAILURE;
    neighbors.sort((a, b) => b.dist(m.game.player.tile) - a.dist(m.game.player.tile)); // farthest first
    const t = neighbors[0];
    m.tryMove(t.x - m.tile.x, t.y - m.tile.y);
    return nodeStatus.SUCCESS;
});

// wander randomly
const wander = new Action(m => {
    const neighbors = m.tile.getAdjacentPassableNeighbors().filter(t => !t.monster);
    if (!neighbors.length) return nodeStatus.FAILURE;
    const t = neighbors[Math.floor(Math.random() * neighbors.length)];
    m.tryMove(t.x - m.tile.x, t.y - m.tile.y);
    return nodeStatus.SUCCESS;
});

//////// archetypes

// default: aways chase
const CHASE_TREE = new Selector([chasePlayer]);

// a coward: flee if hurt, otherwise chase
const SKITTISH_TREE = new Selector([
    new Sequence([isLowHP, fleeFromPlayer]),
    chasePlayer,
]);

// lazy: only chase if nearby, otherwise wander
const LAZY_TREE = new Selector([
    new Sequence([isPlayerNearby, chasePlayer]),
    wander,
]);