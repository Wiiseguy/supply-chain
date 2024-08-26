import { CATEGORIES } from './consts.js'

export function setBoolPropTimeout(obj, prop, timeOutProp, time) {
    if (globalThis.haltAnimation) return
    clearTimeout(obj[timeOutProp])
    obj[prop] = false
    setTimeout(() => {
        obj[prop] = true
    }, 1)
    obj[timeOutProp] = setTimeout(() => {
        obj[prop] = false
    }, time)
}

export function makeIndex(arr, key) {
    return arr.reduce((acc, item) => {
        acc[item[key]] = item
        return acc
    }, {})
}

export function pluck(arr) {
    return arr.splice(Math.floor(Math.random() * arr.length), 1)[0]
}

export function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

export function pickIndex(arr) {
    return Math.floor(Math.random() * arr.length)
}

export function isLucky(chance) {
    // Returns true or false based on the chance 0 = never, 1 = always
    return Math.random() < chance
}

export function bigNum(n) {
    const sign = Math.sign(n)
    n = Math.abs(n)
    if (n < 1000000) {
        return Math.round(sign * n).toLocaleString()
    }
    const suffixes = [
        '',
        'K',
        'million',
        'billion',
        'trillion',
        'quadrillion',
        'quintillion',
        'sextillion',
        'septillion',
        'octillion',
        'nonillion'
    ]
    let suffixIndex = 0
    while (n >= 1000) {
        n /= 1000
        suffixIndex++
    }
    n *= sign
    const formatted = n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    return `${formatted} ${suffixes[suffixIndex]}`
}

export function humanTime(ms) {
    if (ms < 1000) {
        return `${ms}ms`
    }
    if (ms < 60_000) {
        return `${(ms / 1000).toFixed(1)}s`
    }
    if (ms < 3_600_000) {
        return `${(ms / 60_000).toFixed(1)}m`
    }
    return `${(ms / 3_600_000).toFixed(1)}h`
}

export function encode(str) {
    return btoa(encodeURIComponent(str))
}

export function decode(str) {
    return decodeURIComponent(atob(str))
}

export function createAutomatorUpgrade(opts) {
    return {
        name: '',
        displayName: undefined,
        description: '',
        initialOwned: 0,
        baseCost: 1000,
        costMultiplier: 1.5,
        speed: 1,
        category: CATEGORIES.automation,
        ...opts,
        isVisible: app => (opts.isVisible ? opts.isVisible(app) : true) && app.boughtUpgrades[opts.name] == 0,
        automator: true
    }
}
