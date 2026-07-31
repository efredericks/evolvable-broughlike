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
        return this.fn(monster);
    }
}

// leaf that does something!
// fn expected to return nodeStatus
class Action {
    constructor(fn) { this.fn = fn; }

    tick(monster) {
        return this.fn(monster);
    }
}