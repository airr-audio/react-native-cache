export interface ICacheOptions {
    backend: any;
    namespace: string;
    policy: ICachePolicy;
}
export interface ICachePolicy {
    maxEntries: number;
    ttl: number;
}
export default class Cache {
    protected backend: any;
    protected namespace: string;
    protected policy: ICachePolicy;
    constructor(options: ICacheOptions);
    clearAll(): Promise<any>;
    enforceLimits(): Promise<void>;
    getAll(): Promise<{
        [key: string]: string;
    }>;
    get(key: string): Promise<string | undefined>;
    peek(key: string): Promise<string | undefined>;
    remove(key: string): Promise<void>;
    set(key: string, value: string): Promise<void>;
    protected addToLRU(key: string): Promise<any>;
    protected getLRU(): Promise<string[]>;
    protected getLRUKey(): string;
    protected makeCompositeKey(key: string): string;
    protected refreshLRU(key: string): Promise<any>;
    protected removeFromLRU(key: string): Promise<any>;
    protected setLRU(lru: string[]): Promise<any>;
}
