export class Calculator {
    constructor(name, logic) {
        this.name = name
        this.logic = logic
    }
    calculate(app) {
        return this.logic(app)
    }
}
