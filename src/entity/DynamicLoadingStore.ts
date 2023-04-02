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
import {forkJoin, Observable, of, ReplaySubject} from 'rxjs';
import {autoSubscribeWithKey, StoreBase} from 'resub';
import {triggerEntityKey} from './EntityStore';
import {tap} from 'rxjs/operators';
import {deterministicStringify} from './util';

/**
 * This is the time in seconds, the cache should be valid for one item.
 */
const DEFAULT_CACHE_INVALIDATION_TIME = 60 * 5;

/**
 * The DynamicLoadingStore tries to retrieve the object from the Backend, if not available.
 * This is only possible, if the id contains the link to the entity, thus we only allow string here.
 */
export class DynamicLoadingStore<entity, id extends idType = number, searchType = string> extends SelectEntityStore<
    entity,
    id,
    searchType
> {
    private readonly loadFunction: (id: id) => Observable<entity>;
    private readonly searchLoadFunction?: (searchParams: searchType) => Observable<ReadonlyArray<id>>;
    private currentlyLoading: Set<id> = new Set<id>();
    private currentlyLoadingSearched: Set<string> = new Set<string>();
    private lastLoadedAt: Map<id, Date> = new Map<id, Date>();
    private lastSearchedAt: Map<string, Date> = new Map<string, Date>();
    private readonly hashTimeSec: number;
    private readonly searchCacheTimeSec: number;
    private readonly dynamicCacheTimeFunction?: (entity: entity) => Date | undefined;
    private readonly dynamicValidUntil?: Map<id, Date>;

    constructor(props: DynamicLoadingStoreProperties<entity, id, searchType>) {
        super(props);
        this.loadFunction = props.loadFunction;
        this.searchLoadFunction = props.searchLoadFunction;
        this.hashTimeSec = props.hashTimeSec || DEFAULT_CACHE_INVALIDATION_TIME;
        this.searchCacheTimeSec = DEFAULT_CACHE_INVALIDATION_TIME;
        this.dynamicCacheTimeFunction = props.dynamicValidUntilFunction;
        if (props.dynamicValidUntilFunction) {
            this.dynamicValidUntil = new Map<id, Date>();
        }
    }

    getOne(id: id): Readonly<entity> | undefined {
        const value = super.getOne(id);
        const currentTimestamp = new Date(Date.now());
        const cachedTimestamp = this.lastLoadedAt.get(id);
        if (this.cacheIsInvalid(cachedTimestamp, currentTimestamp, id)) {
            this.loadOne(id, currentTimestamp);
        }
        return value;
    }

    getOneWithUndefined(id: id | undefined): Readonly<entity> | undefined {
        // this needs to be called before undefined check of id just because of hooks.. :/
        const value = super.getOneWithUndefined(id);
        if (id === undefined) return undefined;
        const currentTimestamp = new Date(Date.now());
        const cachedTimestamp = this.lastLoadedAt.get(id);
        if (this.cacheIsInvalid(cachedTimestamp, currentTimestamp, id)) {
            this.loadOne(id, currentTimestamp);
        }
        return value;
    }

    protected loadOneIfInvalidCache(id: id): Observable<entity | null> {
        const currentTimestamp = new Date(Date.now());
        const cachedTimestamp = this.lastLoadedAt.get(id);
        if (this.cacheIsInvalid(cachedTimestamp, currentTimestamp, id)) {
            return this.loadOne(id, currentTimestamp);
        }
        return of(null);
    }

    protected getLastLoadedTime(id: id): Date | undefined {
        return this.lastLoadedAt.get(id);
    }

    protected isCurrentlyLoading(id: id): boolean {
        return this.currentlyLoading.has(id);
    }

    protected cacheIsInvalid(cachedTimestamp: Date | undefined, currentTimestamp: Date, id: id): boolean {
        if (!cachedTimestamp) {
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

        const result = new ReplaySubject<entity>(1);

        loadResult.subscribe({
            next: (e: entity | undefined) => {
                if (e) {
                    this.setOne(e);
                    this.currentlyLoading.delete(id);
                    result.next(e);
                    result.complete();
                } else {
                    result.error(`could not load value for ${id}`);
                }
            },
            error: (error) => {
                this.currentlyLoading.delete(id);
                result.error(error);
                result.complete();
            },
        });

        return result;
    }

    invalidateCache(ref?: id): void {
        if (!ref) {
            this.lastLoadedAt.clear();
            this.lastSearchedAt.clear();
            this.dynamicValidUntil?.clear();
        } else {
            this.lastLoadedAt.delete(ref);
            this.dynamicValidUntil?.delete(ref);
        }
    }

    invalidateSearch(search?: searchType): void {
        if (!search) {
            this.lastSearchedAt.clear();
        } else {
            this.lastSearchedAt.delete(deterministicStringify(search));
        }
    }

    // no autosubscription per key for now
    @autoSubscribeWithKey(triggerEntityKey)
    getMultiple(ids: ReadonlyArray<id>): ReadonlyArray<entity> {
        // use get function, in order to load all entities, that are not already loaded
        return ids.map(this.getOne.bind(this)).filter((entity) => entity !== undefined) as ReadonlyArray<entity>;
    }

    /**
     * forceLoad background loading of search results
     * @param searchParam
     */
    loadSearched(searchParam: searchType): void {
        if (this.searchLoadFunction) {
            if (!this.currentlyLoadingSearched.has(deterministicStringify(searchParam))) {
                this.currentlyLoadingSearched.add(deterministicStringify(searchParam));
                this.searchLoadFunction(searchParam).subscribe((resultIds) => {
                    this.searchResults.set(deterministicStringify(searchParam), resultIds);
                    this.lastSearchedAt.set(deterministicStringify(searchParam), new Date());
                    StoreBase.pushTriggerBlock();
                    const loadObservables: Array<Observable<entity | null>> = resultIds.map(
                        this.loadOneIfInvalidCache.bind(this)
                    );
                    forkJoin(loadObservables).subscribe(() => {
                        // now we need to resort, after all entities have been loaded
                        const sortedIds = this.entityHandler
                            .get(resultIds)
                            .map((entity) => this.entityHandler.getId(entity));
                        this.searchResults.set(deterministicStringify(searchParam), sortedIds);
                        this.trigger(triggerEntityKey);
                    });
                    this.trigger(triggerEntityKey);
                    StoreBase.popTriggerBlock();
                    this.currentlyLoadingSearched.delete(deterministicStringify(searchParam));
                });
            }
        }
    }

    protected updateSearchResults() {
        // super.updateSearchResults();
        this.invalidateSearch();
    }

    protected searchCacheIsInvalid(
        cachedTimestamp: Date | undefined,
        currentTimestamp: Date,
        searchParam: searchType
    ): boolean {
        if (!cachedTimestamp) {
            // only allow one loading at a time
            return !this.currentlyLoadingSearched.has(deterministicStringify(searchParam));
        }

        return cachedTimestamp.getTime() + this.hashTimeSec * 1000 <= currentTimestamp.getTime();
    }

    search(searchParam: searchType): ReadonlyArray<entity> {
        const lastSearched = this.lastSearchedAt.get(deterministicStringify(searchParam));
        if (this.searchCacheIsInvalid(lastSearched, new Date(Date.now()), searchParam)) {
            this.loadSearched(searchParam);
        }
        return super.search(searchParam);
    }

    searchIds(searchParam: searchType): ReadonlyArray<id> {
        const lastSearched = this.lastSearchedAt.get(deterministicStringify(searchParam));
        if (this.searchCacheIsInvalid(lastSearched, new Date(Date.now()), searchParam)) {
            this.loadSearched(searchParam);
        }
        return super.searchIds(searchParam);
    }
}

export interface DynamicLoadingStoreProperties<entity, id extends idType = number, searchType = string>
    extends SelectEntityStoreProperties<entity, id, searchType> {
    loadFunction: (id: id) => Observable<entity>;
    searchLoadFunction?: (searchParams: searchType) => Observable<ReadonlyArray<id>>;
    hashTimeSec?: number;
    /**
     * This function returns a Date, until the data is valid.
     * If it returns undefined, the global cache time is used.
     * @param entity
     */
    dynamicValidUntilFunction?: (entity: entity) => Date | undefined;
}

export function createDynamicLoadingStore<entity, id extends idType = number, searchType = string>(
    props: DynamicLoadingStoreProperties<entity, id, searchType>
): DynamicLoadingStore<entity, id, searchType> {
    return new DynamicLoadingStore<entity, id, searchType>(props);
}
