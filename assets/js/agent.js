class Agent {
    // `unit` is the Monster (typically the player) this agent drives.
    // `game` is optional and only needed for agents that read live-game-only
    // state; pathing/movement itself should go through `unit`.
    constructor(unit = null, game = null) {
        this.unit = unit;
        this.game = game;
    }

    // allows an agent to be constructed before its unit exists (e.g. the live
    // game builds its agent before the player is spawned) and rebound later,
    // or reused across GA candidates by pointing it at a new unit each time.
    setUnit(unit) {
        this.unit = unit;
    }

    act() { }
}

// behavior tree-based agent
class BehaviorTreeAgent extends Agent {
    constructor(unit, game = null) {
        super(unit, game);
        this.tree = null;
    }

    setTree(tree) {
        this.tree = tree;
    }

    act() {
        ;
    }
}

// move randomly
class RandomAgent extends Agent {
    constructor(unit, game = null) { super(unit, game); }

    act() {
        let next_dir = shuffle(DIRS)[0];
        this.unit.tryMove(next_dir[0], next_dir[1]);
    }
}

// weight movements according to direction towards staircases
class DirectedRandomAgent extends Agent {
    constructor(unit, game = null) {
        super(unit, game);
        this.isProcessing = false;
    }

    // convert a tile local to some chunk into global grid coordinates
    toGlobal(chunkCol, chunkRow, localX, localY) {
        return {
            x: chunkCol * numTiles + localX,
            y: chunkRow * numTiles + localY
        };
    }

    // bias intensity multiplier
    // biasDirection(x, y, destx, desty, biasIntensity = 2) {
    //     let tile = this.unit.getGameMap().getTile(x, y);
    //     let valid_neighbors = tile.getAdjacentPassableNeighbors();

    //     if (valid_neighbors.length == 0) return null;

    //     let choice_score = 0;
    //     const candidates = valid_neighbors.map(neighbor => {
    //         // euclidean distance
    //         const dx = destx - neighbor.x;
    //         const dy = desty - neighbor.y;
    //         const distance = Math.sqrt(dx * dx + dy * dy);

    //         // avoid /0 error
    //         const safe_distance = distance === 0 ? 0.1 : distance;

    //         // higher bias -> stronger magnetism
    //         const score = Math.pow(1 / safe_distance, biasIntensity);
    //         choice_score += score;

    //         return { neighbor, score };
    //     });

    //     let roll = Math.random() * choice_score;

    //     // scan results
    //     for (const candidate of candidates) {
    //         roll -= candidate.score;
    //         if (roll <= 0) {
    //             return candidate.neighbor; // winner
    //         }
    //     }
    //     return candidates[candidates.length - 1].neighbor;
    // }

    // bias intensity multiplier — global coordinates
    biasDirection(x, y, destGlobalX, destGlobalY, biasIntensity = 2) {
        let tile = this.unit.getGameMap().getTile(x, y);
        let valid_neighbors = tile.getAdjacentPassableNeighbors();

        if (valid_neighbors.length == 0) return null;

        const { c: chunkCol, r: chunkRow } = this.unit.global_position;

        let choice_score = 0;
        const candidates = valid_neighbors.map(neighbor => {
            const g = this.toGlobal(chunkCol, chunkRow, neighbor.x, neighbor.y);
            const dx = destGlobalX - g.x;
            const dy = destGlobalY - g.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const safe_distance = distance === 0 ? 0.1 : distance;
            const score = Math.pow(1 / safe_distance, biasIntensity);
            choice_score += score;

            return { neighbor, score };
        });

        let roll = Math.random() * choice_score;
        for (const candidate of candidates) {
            roll -= candidate.score;
            if (roll <= 0) return candidate.neighbor;
        }
        return candidates[candidates.length - 1].neighbor;
    }

    act() {
        if (this.isProcessing) return;

        const player = this.unit;
        const { c: chunkC, r: chunkR } = player.global_position;
        const localX = player.tile.x;
        const localY = player.tile.y;

        const stairsMap = player.tile.game_map.getWorldMap(GRID_COLS - 1, GRID_ROWS - 1);
        if (!stairsMap || !stairsMap.stairs_tile) return;

        const destGlobal = this.toGlobal(
            GRID_COLS - 1, GRID_ROWS - 1,
            stairsMap.stairs_tile.x, stairsMap.stairs_tile.y
        );

        const directions = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

        // neighbors within the current chunk (for validating in-bounds moves)
        const tile = player.tile.game_map.getTile(localX, localY);
        const passableNeighbors = tile.getAdjacentPassableNeighbors();

        let candidates = [];

        for (const { dx, dy } of directions) {
            const newLocalX = localX + dx;
            const newLocalY = localY + dy;
            const inBounds = newLocalX >= 0 && newLocalX < numTiles && newLocalY >= 0 && newLocalY < numTiles;

            if (inBounds) {
                const match = passableNeighbors.find(n => n.x === newLocalX && n.y === newLocalY);
                if (match) {
                    const g = this.toGlobal(chunkC, chunkR, newLocalX, newLocalY);
                    candidates.push({ dx, dy, gx: g.x, gy: g.y });
                }
            } else {
                // crossing a chunk boundary
                let newChunkC = chunkC, newChunkR = chunkR;
                let wrappedX = newLocalX, wrappedY = newLocalY;

                if (newLocalX < 0) { newChunkC = chunkC - 1; wrappedX = numTiles - 1; }
                if (newLocalX >= numTiles) { newChunkC = chunkC + 1; wrappedX = 0; }
                if (newLocalY < 0) { newChunkR = chunkR - 1; wrappedY = numTiles - 1; }
                if (newLocalY >= numTiles) { newChunkR = chunkR + 1; wrappedY = 0; }

                const chunkExists = newChunkC >= 0 && newChunkC < GRID_COLS && newChunkR >= 0 && newChunkR < GRID_ROWS;
                if (chunkExists) {
                    const destMap = player.tile.game_map.getWorldMap(newChunkC, newChunkR);
                    const destTile = destMap.getTile(wrappedX, wrappedY);
                    // best-effort passability check — adjust property name if yours differs
                    const isPassable = destTile && destTile.passable !== false;
                    if (isPassable) {
                        const g = this.toGlobal(newChunkC, newChunkR, wrappedX, wrappedY);
                        candidates.push({ dx, dy, gx: g.x, gy: g.y });
                    }
                }
            }
        }

        if (candidates.length === 0) return;

        // weighted bias toward the stairs
        const biasIntensity = 4;
        let choice_score = 0;
        const scored = candidates.map(cand => {
            const ddx = destGlobal.x - cand.gx;
            const ddy = destGlobal.y - cand.gy;
            const distance = Math.sqrt(ddx * ddx + ddy * ddy);
            const safe_distance = distance === 0 ? 0.1 : distance;
            const score = Math.pow(1 / safe_distance, biasIntensity);
            choice_score += score;
            return { ...cand, score };
        });

        let roll = Math.random() * choice_score;
        let chosen = scored[scored.length - 1];
        for (const cand of scored) {
            roll -= cand.score;
            if (roll <= 0) { chosen = cand; break; }
        }

        try {
            this.isProcessing = true;
            this.unit.tryMove(chosen.dx, chosen.dy);
        } finally {
            this.isProcessing = false;
        }
    }

    // act() {
    //     if (this.isProcessing) return;

    //     let next_dir = this.biasDirection(this.unit.tile.x, this.unit.tile.y, this.unit.getGameMap().stairs_tile.x, this.unit.getGameMap().stairs_tile.y, 4);
    //     if (next_dir) {
    //         try {
    //             this.isProcessing = true;
    //             const dx = next_dir.x - this.unit.tile.x;
    //             const dy = next_dir.y - this.unit.tile.y;

    //             this.unit.tryMove(dx, dy);
    //         } finally {
    //             this.isProcessing = false;
    //         }
    //     }

    //     // if (next_dir != null)
    //     // this.unit.tryMove(next_dir.x - this.unit.tile.x, next_dir.y - this.unit.tile.y);
    // }
}

// neural net implementation
// based on https://medium.com/@pat_metzdorf/building-a-basic-neural-net-using-javascript-1f554780dc60

// activation functions
const sigmoid = x => 1 / (1 + Math.exp(-x));
const relu = x => Math.max(0, x);

// derivatives
const sigmoidDerivative = x => {
    const sx = sigmoid(x);
    return sx * (1 - sx);
};
const reluDerivative = x => x > 0 ? 1 : 0;

// single neuron
class Neuron {
    constructor(weights, bias, activation = sigmoid, activationDerivative = sigmoidDerivative) {
        this.weights = weights;
        this.bias = bias;
        this.activation = activation;
    }

    activate(inputs) {
        const weightedSum = this.weights.reduce((sum, weight, i) => sum + weight + inputs[i], 0);
        return this.activation(weightedSum + this.bias);
    }
}

// neuron layer
class Layer {
    constructor(numInputs, numNeurons, activation) {
        this.neurons = Array.from({ length: numNeurons }, () => {
            const weights = Array.from({ length: numInputs }, () => Math.random() * 2 - 1);
            return new Neuron(weights, Math.random() * 2 - 1, activation);
        });
    }

    forward(inputs) {
        return this.neurons.map(neuron => neuron.activate(inputs));
    }
}

// full network
class NeuralNetwork {
    constructor(layerSizes, activations) {
        this.layers = [];
        for (let i = 1; i < layerSizes.length; i++) {
            this.layers.push(new Layer(layerSizes[i - 1], layerSizes[i], activations[i - 1]));
        }
    }
    forward(inputs) {
        return this.layers.reduce((layerInput, layer) => layer.forward(layerInput), inputs);
    }
}
