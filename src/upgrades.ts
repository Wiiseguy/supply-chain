import { CATEGORIES, GROUPS } from './consts'
import { Upgrade } from './Upgrade.js'

export const UPGRADES: Upgrade[] = [
    new Upgrade({
        name: 'Extra Column',
        description: 'Buy an extra column of land',
        initialOwned: 2,
        baseCost: 100,
        costMultiplier: 5,
        category: CATEGORIES.land,
        group: GROUPS.land
    }),
    new Upgrade({
        name: 'Extra Row',
        description: 'Buy an extra row of land',
        initialOwned: 2,
        baseCost: 100,
        costMultiplier: 5,
        category: CATEGORIES.land,
        group: GROUPS.land
    }),
    // Special upgrades
    new Upgrade({
        name: 'Battery',
        description:
            'An old battery you found in the woods that gives you some energy you can use for your automators before you have a proper energy source',
        baseCost: 500,
        max: 1,
        category: CATEGORIES.special,
        group: GROUPS.energy,
        onBuy: app => app.resources.energy.gain(10000),
        icon: '🔋'
    }),
    new Upgrade({
        name: 'Ledger',
        displayName: 'The Ledger',
        description: 'Keep detailed track of your profits in a ledger!',
        baseCost: 5000,
        category: CATEGORIES.special,
        max: 1,
        group: GROUPS.ui
    }),
    new Upgrade({
        name: 'Bulldozer',
        description: 'Unlock the ability to sell and move tiles',
        baseCost: 5000,
        category: CATEGORIES.special,
        max: 1,
        group: GROUPS.ui,
        icon: '🚜'
    }),
    // Final win game upgrade
    new Upgrade({
        name: 'Win Game',
        description: 'Congratulations! You have won the game!',
        baseCost: 1_000_000,
        category: CATEGORIES.special,
        group: GROUPS.ui,
        max: 1,
        icon: '🏆'
    })
]
