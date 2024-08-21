export class Resource {
    /**
     *
     * @param {*} name
     * @param { { displayNameSingular: string, displayNamePlural: string, icon: string, basePrice: number, storageBaseSize: number, initialOwned?: number, minimum?: number } } settings
     */
    constructor(name, settings) {
        this.name = name
        this.displayNameSingular = settings.displayNameSingular
        this.displayNamePlural = settings.displayNamePlural
        this.icon = settings.icon
        this.minimum = settings.minimum ?? 0 // The minimum amount of this resource that must be kept, like seeds should not be able to be sold if there are less than 2, because then the game is softlocked
        this.basePrice = settings.basePrice
        this.storageBaseSize = settings.storageBaseSize
        this.price = settings.basePrice
        this.storage = 1 // Number of storage units
        this.lost = 0
        this.sellNum = 1 // How many to sell per click
        this.owned = settings.initialOwned ?? 0
        this.sold = 0
        this.incurred = 0
        this.earnings = 0
        this.totalOwned = this.owned
    }
    get storageSize() {
        return this.storageBaseSize * this.storage
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
    sellPriceTheoretical(n) {
        return n * this.price
    }
    sellPrice(n) {
        return Math.min(n, this.owned - this.minimum) * this.price
    }
    gain(n) {
        this.owned += n
        this.totalOwned += n
        if (this.owned > this.storageSize) {
            this.lost += this.owned - this.storageSize
            this.owned = this.storageSize
        }
    }
    // Subtract n from owned if sufficient, return false if not
    incur(n) {
        if (this.owned + this.minimum < n) {
            return false
        }
        this.owned -= n
        this.incurred += n
        return true
    }
    sell(n) {
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
    getSaveData() {
        return {
            price: this.price,
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
    loadSaveData(data) {
        if (!data) {
            return
        }
        this.price = data.price
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
