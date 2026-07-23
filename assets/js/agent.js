class Agent {
    constructor(game) {
        this.game = game;
    }

    act() { }
}

// move randomly
class RandomAgent extends Agent {
    constructor(game) { super(game); }

    act() {
        let next_dir = shuffle(DIRS)[0];
        this.game.player.tryMove(next_dir[0], next_dir[1]);
    }
}

class DirectedRandomAgent extends Agent {
    constructor(game) {
        super(game);
        this.isProcessing = false;
    }

    // bias intensity multiplier
    biasDirection(x, y, destx, desty, biasIntensity = 2) {
        let tile = this.game.game_map.getTile(x, y);
        let valid_neighbors = tile.getAdjacentPassableNeighbors();

        if (valid_neighbors.length == 0) return null;

        let choice_score = 0;
        const candidates = valid_neighbors.map(neighbor => {
            // euclidean distance
            const dx = destx - neighbor.x;
            const dy = desty - neighbor.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // avoid /0 error
            const safe_distance = distance === 0 ? 0.1 : distance;

            // higher bias -> stronger magnetism
            const score = Math.pow(1 / safe_distance, biasIntensity);
            choice_score += score;

            return { neighbor, score };
        });

        let roll = Math.random() * choice_score;

        // scan results
        for (const candidate of candidates) {
            roll -= candidate.score;
            if (roll <= 0) {
                return candidate.neighbor; // winner
            }
        }
        return candidates[candidates.length - 1].neighbor;
    }

    act() {
        if (this.isProcessing) return;

        let next_dir = this.biasDirection(this.game.player.tile.x, this.game.player.tile.y, this.game.stairs_tile.x, this.game.stairs_tile.y, 4);
        if (next_dir) {
            try {
                this.isProcessing = true;
                const dx = next_dir.x - this.game.player.tile.x;
                const dy = next_dir.y - this.game.player.tile.y;

                this.game.player.tryMove(dx, dy);
            } finally {
                this.isProcessing = false;
            }
        }

        // if (next_dir != null)
        // this.game.player.tryMove(next_dir.x - this.game.player.tile.x, next_dir.y - this.game.player.tile.y);
    }
}