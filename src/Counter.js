const COUNTER_SAMPLE_LENGTH = 10

export class Counter {
    constructor(name, fn) {
        this.name = name
        this.fn = fn
        this.delta = 0
        this.prevValues = []
    }
    update() {
        this.prevValues.push(this.fn())
        if (this.prevValues.length > COUNTER_SAMPLE_LENGTH) {
            this.prevValues.shift()

            let deltas = []
            for (let i = 1; i < this.prevValues.length; i++) {
                deltas.push(this.prevValues[i] - this.prevValues[i - 1])
            }
            this.delta = deltas.reduce((acc, val) => acc + val, 0) / deltas.length
        }
    }
}
