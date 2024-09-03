interface ResourceSettings {
    displayNameSingular: string
    displayNamePlural: string
    icon: string
    basePrice: number
    storageBaseSize: number
    initialOwned?: number
    minimum?: number
    canOverflow?: boolean
    canTrade?: boolean
    unit?: string
}

export class Resource {
    readonly name: string
    readonly displayNameSingular: string
    readonly displayNamePlural: string
    readonly icon: string
    readonly minimum: number
    readonly basePrice: number
    readonly canOverflow: boolean
    readonly canTrade: boolean
    readonly unit: string
    priceMultiplier: number
    storageBaseSize: number
    storage: number
    storageMultiplier: number
    lost: number
    sellNum: number
    owned: number
    sold: number
    incurred: number
    earnings: number
    totalOwned: number

    constructor(name: string, settings: ResourceSettings) {
        this.name = name
        this.displayNameSingular = settings.displayNameSingular
        this.displayNamePlural = settings.displayNamePlural
        this.icon = settings.icon
        this.minimum = settings.minimum ?? 0 // The minimum amount of this resource that must be kept, like seeds should not be able to be sold if there are less than 2, because then the game is soft-locked
        this.basePrice = settings.basePrice
        this.canOverflow = settings.canOverflow ?? true // Whether this resource can be lost if it exceeds storage capacity. Things like energy should not be able to be lost.
        this.canTrade = settings.canTrade ?? true // Whether this resource can be traded. Things like energy should not be able to be traded.
        this.unit = settings.unit ?? '' // The unit of this resource, like 'g' for grams, 'J' for joules, etc.
        this.priceMultiplier = 1
        this.storageBaseSize = settings.storageBaseSize
        this.storage = 1 // Number of storage units
        this.storageMultiplier = 1
        this.lost = 0
        this.sellNum = 1 // How many to sell per click
        this.owned = settings.initialOwned ?? 0
        this.sold = 0
        this.incurred = 0
        this.earnings = 0
        this.totalOwned = this.owned
    }
    get storageSize() {
        return this.storageBaseSize * this.storage * this.storageMultiplier
    }
    get any() {
        return this.owned - this.minimum > 0
    }
    get sellNumPrice() {
        return Math.min(this.sellNum, this.owned - this.minimum) * this.price
    }
    get sellNumDisplayName() {
        return this.sellNum === 1 ? this.displayNameSingular : this.displayNamePlural
    }
    get price() {
        return this.basePrice * this.priceMultiplier
    }
    sellPriceTheoretical(n: number) {
        return n * this.price
    }
    sellPrice(n: number) {
        if (this.owned === 0) return 0
        return Math.min(n, this.owned - this.minimum) * this.price
    }
    gain(n: number) {
        this.owned += n
        this.totalOwned += n
        if (this.owned > this.storageSize) {
            this.lost += this.owned - this.storageSize
            this.owned = this.storageSize
        }
    }
    flush() {
        this.owned = 0
    }
    incur(n: number) {
        if (this.owned < n) {
            return false
        }
        this.owned -= n
        this.incurred += n
        return true
    }
    sell(n: number) {
        n = Math.min(n, this.owned - this.minimum)
        this.owned -= n
        const sellPrice = n * this.price
        this.sold += n
        this.earnings += sellPrice
        return sellPrice
    }
    reclaim(n = 1) {
        let toReclaim = Math.min(this.lost, n)
        if (this.owned + toReclaim <= this.storageSize) {
            this.lost -= toReclaim
            this.owned += toReclaim
        }
    }
    displayName(n = 1) {
        return n === 1 ? this.displayNameSingular : this.displayNamePlural
    }
    getSaveData() {
        return {
            priceMultiplier: this.priceMultiplier,
            storageMultiplier: this.storageMultiplier,
            storage: this.storage,
            sellNum: this.sellNum,
            owned: this.owned,
            totalOwned: this.totalOwned,
            lost: this.lost,
            sold: this.sold,
            incurred: this.incurred,
            earnings: this.earnings
        }
    }

    loadSaveData(data: Resource) {
        if (!data) {
            return
        }
        // TODO: nullish coalescing operator can be removed when all players have updated to a version that includes it
        this.priceMultiplier = data.priceMultiplier ?? this.priceMultiplier
        this.storageMultiplier = data.storageMultiplier ?? this.storageMultiplier
        this.storage = data.storage
        this.sellNum = data.sellNum
        this.owned = data.owned
        this.totalOwned = data.totalOwned
        this.lost = data.lost
        this.sold = data.sold
        this.incurred = data.incurred
        this.earnings = data.earnings
    }
}
