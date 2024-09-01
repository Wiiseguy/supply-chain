export function setBoolPropTimeout(obj: any, prop: string, timeOutProp: string, time: number) {
    /** @ts-ignore */
    if (globalThis.haltAnimation) {
        return
    }
    clearTimeout(obj[timeOutProp])
    obj[prop] = false
    setTimeout(() => {
        obj[prop] = true
    }, 1)
    obj[timeOutProp] = setTimeout(() => {
        obj[prop] = false
    }, time)
}

export function makeIndex<T>(arr: T[], key: string): Record<string, T> {
    return arr.reduce(
        (acc, item: any) => {
            acc[item[key]] = item
            return acc
        },
        {} as Record<string, T>
    )
}

export function pluck<T>(arr: T[]): T {
    return arr.splice(Math.floor(Math.random() * arr.length), 1)[0]
}

export function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

export function pickIndex(arr: any[]) {
    return Math.floor(Math.random() * arr.length)
}

export function isLucky(chance: number) {
    // Returns true or false based on the chance 0 = never, 1 = always
    return Math.random() < chance
}

export function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function bigNum(n: number) {
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

export function humanTime(ms: number) {
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

export function encode(str: string) {
    return btoa(encodeURIComponent(str))
}

export function decode(str: string) {
    return decodeURIComponent(atob(str))
}

export function aOrAn(word: string) {
    return 'aeiou'.includes(word[0].toLowerCase()) ? 'an' : 'a'
}
