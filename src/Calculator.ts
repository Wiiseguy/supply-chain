export class Calculator {
    name: string
    logic: (app: IApp) => void
    constructor(name: string, logic: (app: IApp) => void) {
        this.name = name
        this.logic = logic
    }
    calculate(app: IApp) {
        return this.logic(app)
    }
}
