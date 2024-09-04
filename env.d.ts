/// <reference types="vite/client" />

declare interface IApp {
    DEBUG: boolean
    UPGRADES_INDEX: Record<string, IUpgrade>
    UPGRADES: IUpgrade[]

    stats: IStats
    resources: Record<string, IResource>
    resourcesView: IResource[]
    calculated: Record<string, number>
    boughtUpgrades: Record<string, number>

    land: ITile[]

    hasUpgrade(upgradeName: string): boolean
    sellResource(resource: IResource, amount?: number): void
    showMessage(message: string): void
    showModal(modalName: string, data?: Record<string, any>): void
    closeModal(modalName: string): void
    addTile(tile: ITile): void
    getAdjacentTiles(tile: ITile): ITile[]

    num(num: number): string
}

declare interface IStats {
    treesChopped: number
    luckySeeds: number
    luckyTrees: number
    saplingsKilled: number

    minesOwned: number
    tunnelsDug: number
    resourcesMined: number

    fishMissed: number
    fishRarities: number
    fishCaught: number
    fishTank: Array<[string, number]>

    resourcesBaked: number
}

declare interface IUpgrade {
    speed?: number
    energyCost?: number
}

declare interface ITile {
    tileType: string

    [key: string]: any

    click(manual?: boolean): void
    sell(): void
}
declare interface IForestTile extends ITile {
    type: string
    dig(): string
}
declare interface IMineTile extends ITile {
    type: string
    mine(): void
}

declare interface IPondFind {
    name: string
    icon: string
    gain: number
    nonFish: boolean
    resource?: string
}

declare interface IResource {
    name: string
    displayNameSingular: string
    displayNamePlural: string
    icon: string
    minimum: number
    basePrice: number
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
    storageSize: number
    any: boolean
    sellNumPrice: number
    sellNumDisplayName: string
    price: number
    sellPriceTheoretical(n: number): number
    sellPrice(n: number): number
    gain(n: number): void
    incur(n: number): boolean
    sell(n: number): number
    reclaim(n: number): void
    displayName(n: number): string
    getSaveData(): Record<string, number>
    loadSaveData(data: Record<string, number>): void
}

declare interface ITileStyle {
    bgOpacity: number
    bgRgb: string
}
