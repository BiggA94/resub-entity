/*
MIT License

Copyright (c) 2020 Alexander Weidt (BiggA94)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import {SelectEntityStore, SelectEntityStoreProperties} from './SelectEntityStore';
import {idType} from './EntityHandler';
import {Observable, Subject} from 'rxjs';
import {autoSubscribeWithKey} from 'resub';
import {triggerEntityKey} from './EntityStore';
import {tap} from 'rxjs/operators';

/**
 * This is the time in seconds, the cache should be valid for one item.
 */
const DEFAULT_CACHE_INVALIDATION_TIME = 60 * 5;

/**
 * The DynamicLoadingStore tries to retrieve the object from the Backend, if not available.
 * This is only possible, if the id contains the link to the entity, thus we only allow string here.
 */
export class DynamicLoadingStore<entity, id extends idType = number> extends SelectEntityStore<entity, id> {
    private readonly loadFunction: (id: id) => Observable<entity>;
    private currentlyLoading: Set<id> = new Set<id>();
    private lastLoadedAt: Map<id, Date> = new Map<id, Date>();
    private readonly hashTimeSec: number;
    private readonly dynamicCacheTimeFunction?: (entity: entity) => Date | undefined;
    private readonly dynamicValidUntil?: Map<id, Date>;

    constructor(props: DynamicLoadingStoreProperties<entity, id>) {
        super(props);
        this.loadFunction = props.loadFunction;
        this.hashTimeSec = props.hashTimeSec || DEFAULT_CACHE_INVALIDATION_TIME;
        this.dynamicCacheTimeFunction = props.dynamicValidUntilFunction;
        if (props.dynamicValidUntilFunction) {
            this.dynamicValidUntil = new Map<id, Date>();
        }
    }

    getOne(id: id): Readonly<entity> | undefined {
        const value = super.getOne(id);
        const currentTimestamp = new Date(Date.now());
        const cachedTimestamp = this.lastLoadedAt.get(id);
        if (this.cacheIsInvalid(value, cachedTimestamp, currentTimestamp, id)) {
            this.loadOne(id, currentTimestamp);
        }
        return value;
    }

    protected getLastLoadedTime(id: id): Date | undefined {
        return this.lastLoadedAt.get(id);
    }

    protected isCurrentlyLoading(id: id): boolean {
        return this.currentlyLoading.has(id);
    }

    protected cacheIsInvalid(
        value: Readonly<entity> | undefined,
        cachedTimestamp: Date | undefined,
        currentTimestamp: Date,
        id: id
    ): boolean {
        if (!value || !cachedTimestamp) {
            // only allow one loading at a time
            return !this.currentlyLoading.has(id);
        }

        if (this.dynamicValidUntil && this.dynamicValidUntil.has(id)) {
            const validUntil = this.dynamicValidUntil.get(id);
            if (validUntil) {
                return validUntil < currentTimestamp;
            }
        }
        return cachedTimestamp.getTime() + this.hashTimeSec * 1000 <= currentTimestamp.getTime();
    }

    /**
     * Force load an object, useful for reloading.
     * @param id
     * @param _currTimestamp
     * @param addPipesFunction
     */
    @autoSubscribeWithKey(triggerEntityKey)
    loadOne(
        id: id,
        _currTimestamp?: Date,
        addPipesFunction?: (observable: Observable<entity>) => Observable<entity>
    ): Observable<entity> {
        const currentTimestamp = _currTimestamp || new Date(Date.now());
        this.currentlyLoading.add(id);
        this.lastLoadedAt.set(id, currentTimestamp);
        let loadResult = this.loadFunction(id);

        addPipesFunction && (loadResult = addPipesFunction(loadResult));

        if (this.dynamicCacheTimeFunction && this.dynamicValidUntil) {
            loadResult = loadResult.pipe(
                tap((entity) => {
                    if (this.dynamicCacheTimeFunction && this.dynamicValidUntil) {
                        const cacheTime = this.dynamicCacheTimeFunction(entity);
                        if (cacheTime) {
                            if (!(cacheTime instanceof Date)) {
                                throw new Error('provided cache function does not return a date');
                            }
                            this.dynamicValidUntil.set(id, cacheTime);
                        }
                    }
                })
            );
        }

        const result = new Subject<entity>();

        loadResult.subscribe(
            (e: entity | undefined) => {
                if (e) {
                    this.setOne(e);
                    this.currentlyLoading.delete(id);
                    result.next(e);
                    result.complete();
                } else {
                    result.error(`could not load value for ${id}`);
                }
            },
            (error) => {
                this.currentlyLoading.delete(id);
                result.error(error);
                result.complete();
            }
        );

        return result;
    }

    invalidateCache(ref?: id): void {
        if (!ref) {
            this.lastLoadedAt.clear();
            this.dynamicValidUntil?.clear();
        } else {
            this.lastLoadedAt.delete(ref);
            this.dynamicValidUntil?.delete(ref);
        }
    }
}

export interface DynamicLoadingStoreProperties<entity, id extends idType = number>
    extends SelectEntityStoreProperties<entity, id> {
    loadFunction: (id: id) => Observable<entity>;
    hashTimeSec?: number;
    /**
     * This function returns a Date, until the data is valid.
     * If it returns undefined, the global cache time is used.
     * @param entity
     */
    dynamicValidUntilFunction?: (entity: entity) => Date | undefined;
}

export function createDynamicLoadingStore<entity, id extends idType = number>(
    props: DynamicLoadingStoreProperties<entity, id>
): DynamicLoadingStore<entity, id> {
    return new DynamicLoadingStore<entity, id>(props);
}
