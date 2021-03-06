"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Cache {
    constructor(options) {
        this.namespace = options.namespace;
        this.backend = options.backend;
        this.policy = options.policy;
    }
    async clearAll() {
        const keys = await this.backend.getAllKeys();
        const namespaceKeys = keys.filter((key) => {
            return key.substr(0, this.namespace.length) === this.namespace;
        });
        await this.backend.multiRemove(namespaceKeys);
        return this.setLRU([]);
    }
    async enforceLimits() {
        if (!this.policy.maxEntries) {
            return;
        }
        const lru = await this.getLRU();
        const victimCount = Math.max(0, lru.length - this.policy.maxEntries);
        const victimList = lru.slice(0, victimCount);
        const removePromises = [];
        for (const victimKey of victimList) {
            removePromises.push(this.remove(victimKey));
        }
        await Promise.all(removePromises);
        const survivorList = lru.slice(victimCount);
        return this.setLRU(survivorList);
    }
    async getAll() {
        const keys = await this.backend.getAllKeys();
        const namespaceKeys = keys.filter((key) => {
            return key.substr(0, this.namespace.length) === this.namespace;
        });
        const results = await this.backend.multiGet(namespaceKeys);
        const allEntries = {};
        for (const result of results) {
            const keyComponents = result[0].split(":");
            if (keyComponents.length !== 2) {
                continue;
            }
            const key = keyComponents[1];
            if (key === "_lru") {
                continue;
            }
            allEntries[key] = JSON.parse(result[1]);
        }
        return allEntries;
    }
    async get(key) {
        const value = await this.peek(key);
        if (!value) {
            return;
        }
        this.refreshLRU(key);
        return value;
    }
    async peek(key) {
        const compositeKey = this.makeCompositeKey(key);
        const entryJsonString = await this.backend.getItem(compositeKey);
        let entry;
        if (entryJsonString) {
            entry = JSON.parse(entryJsonString);
        }
        let value;
        if (entry) {
            value = entry.value;
            if (this.policy.ttl && this.policy.ttl > 0) {
                const deadline = new Date(entry.created).getTime() + this.policy.ttl * 1000;
                const now = (new Date()).getTime();
                if (deadline < now) {
                    this.remove(key);
                    value = undefined;
                }
            }
        }
        return value;
    }
    async remove(key) {
        const compositeKey = this.makeCompositeKey(key);
        await this.backend.removeItem(compositeKey);
        return this.removeFromLRU(key);
    }
    async set(key, value) {
        const entry = {
            created: new Date(),
            value
        };
        const compositeKey = this.makeCompositeKey(key);
        const entryString = JSON.stringify(entry);
        await this.backend.setItem(compositeKey, entryString);
        await this.refreshLRU(key);
        return this.enforceLimits();
    }
    async addToLRU(key) {
        const lru = await this.getLRU();
        lru.push(key);
        return this.setLRU(lru);
    }
    async getLRU() {
        const lruString = await this.backend.getItem(this.getLRUKey());
        let lru;
        if (!lruString) {
            lru = [];
        }
        else {
            lru = JSON.parse(lruString);
        }
        return lru;
    }
    getLRUKey() {
        return this.makeCompositeKey("_lru");
    }
    makeCompositeKey(key) {
        return `${this.namespace}:${key}`;
    }
    async refreshLRU(key) {
        await this.removeFromLRU(key);
        return this.addToLRU(key);
    }
    async removeFromLRU(key) {
        const lru = await this.getLRU();
        const newLRU = lru.filter((item) => {
            return item !== key;
        });
        return this.setLRU(newLRU);
    }
    async setLRU(lru) {
        return this.backend.setItem(this.getLRUKey(), JSON.stringify(lru));
    }
}
exports.default = Cache;
//# sourceMappingURL=cache.js.map