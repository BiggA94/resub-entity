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

import {EntityHandler, idType, selectIdFunctionType, sortFunctionType} from './EntityHandler';
import {AutoSubscribeStore, autoSubscribeWithKey, formCompoundKey, key, StoreBase} from 'resub';
import {deterministicStringify} from './util';

export const triggerEntityKey = '!@ENTITY_TRIGGER@!';
export type SearchFunctionType<entity, searchType = string> = (searchParameter: searchType, entity: entity) => boolean;

@AutoSubscribeStore
export class EntityStore<entity, id extends idType = number, searchType = string> extends StoreBase {
    protected readonly searchFunction?: SearchFunctionType<entity, searchType>;
    protected entityHandler: EntityHandler<entity, id>;

    constructor(props: EntityStoreProperties<entity, id, searchType>) {
        super(props.throttleMs, props.bypassTriggerBlocks || false);
        this.entityHandler = new EntityHandler<entity, id>(props.selectIdFunction, props.sortFunction);
        this.searchFunction = props.searchFunction;
    }

    protected getTriggerForId(id: id): string {
        return formCompoundKey(String(id), triggerEntityKey);
    }

    public getId(entity: entity): id {
        return this.entityHandler.getId(entity);
    }

    public setOne(entity: entity): id {
        const id = this.entityHandler.add(entity);
        this.updateSearchResults();
        this.trigger([this.getTriggerForId(id), triggerEntityKey]);
        return id;
    }

    public setAll(entities: Array<entity>): ReadonlyArray<id> {
        StoreBase.pushTriggerBlock();
        const ids = entities.map(this.setOne.bind(this));
        this.updateSearchResults();
        StoreBase.popTriggerBlock();
        return ids;
    }

    /**
     * reset with the given entities instead of adding them.
     * @param entities
     */
    public setEntities(entities: ReadonlyArray<entity>): void {
        if (!(entities instanceof Array)) {
            throw new Error('setEntities needs an Array');
        }

        StoreBase.pushTriggerBlock();
        const removedEntities = this.entityHandler.setEntities(entities);

        // at first, trigger the removed ones
        removedEntities.forEach((id) => this.trigger(formCompoundKey(String(id), triggerEntityKey)));

        // now trigger for the newly added ones
        entities.forEach((entity) =>
            this.trigger(formCompoundKey(String(this.entityHandler.getId(entity)), triggerEntityKey))
        );

        this.updateSearchResults();

        this.trigger(triggerEntityKey);

        StoreBase.popTriggerBlock();
    }

    @autoSubscribeWithKey(triggerEntityKey)
    public getOne(id: id): entity | undefined {
        return this.entityHandler.getOne(id);
    }

    @autoSubscribeWithKey(triggerEntityKey)
    public getAll(): ReadonlyArray<entity> {
        return this.entityHandler.getAll();
    }

    @autoSubscribeWithKey(triggerEntityKey)
    public getAllMapped(): ReadonlyMap<id, entity> {
        return this.entityHandler.getAllMapped();
    }

    @autoSubscribeWithKey(triggerEntityKey)
    public getMultiple(ids: ReadonlyArray<id>): ReadonlyArray<entity> {
        return this.entityHandler.get(ids);
    }

    public clear(): ReadonlyArray<id> {
        const ids = this.entityHandler.clear();
        this.updateSearchResults();
        this.trigger(triggerEntityKey);
        return ids;
    }

    @autoSubscribeWithKey(triggerEntityKey)
    public hasOne(id: id): boolean {
        // todo: subscribe per id
        return this.entityHandler.hasOne(id);
    }

    public removeOne(entity: entity): id | undefined {
        const removedId = this.entityHandler.removeOne(entity);
        this.updateSearchResults();
        if (removedId) {
            this.trigger([this.getTriggerForId(removedId), triggerEntityKey]);
        }
        return removedId;
    }

    public removeOneById(id: Readonly<id>): entity | undefined {
        const removedEntity = this.entityHandler.removeOneById(id);
        this.updateSearchResults();
        if (removedEntity) {
            this.trigger([this.getTriggerForId(id), triggerEntityKey]);
        }
        return removedEntity;
    }

    protected searchResults: Map<string, ReadonlyArray<id>> = new Map<string, ReadonlyArray<id>>();

    // todo: needs proper subscriptions (is this possible?)
    @autoSubscribeWithKey(triggerEntityKey)
    public search(searchParam: searchType): ReadonlyArray<entity> {
        return (
            this.searchIds(searchParam)
                .map(this.getOne.bind(this))
                // no !entity, or else we would not allow 0 or null as return value
                .filter((entity) => entity !== undefined) as ReadonlyArray<entity>
        );
    }

    protected updateSearchResults(): void {
        this.searchResults.clear();
    }

    @autoSubscribeWithKey(triggerEntityKey)
    public searchIds(searchParam: searchType): ReadonlyArray<id> {
        const searchResults = this.searchResults.get(deterministicStringify(searchParam));
        if (searchResults) {
            return searchResults;
        } else {
            if (!this.searchFunction) {
                return [];
            }
            const searchResults = this.entityHandler.getAll().filter(this.searchFunction.bind(this, searchParam));
            const resultIds = searchResults.map(this.getId.bind(this));
            this.searchResults.set(deterministicStringify(searchParam), resultIds);
            this.trigger(triggerEntityKey);
            return resultIds;
        }
    }

    @autoSubscribeWithKey(triggerEntityKey)
    public searchWithOwnFilter(filter: (entity: entity) => boolean): ReadonlyArray<entity> {
        return this.getAll().filter(filter);
    }
}

// as @param does not work here, we manually apply key here
key(EntityStore.prototype, 'getOne', 0);
key(EntityStore.prototype, 'hasOne', 0);

export interface EntityStoreProperties<entity, id extends idType = number, searchType = string> {
    throttleMs?: number;
    bypassTriggerBlocks?: boolean;
    selectIdFunction: selectIdFunctionType<entity, id>;
    sortFunction?: sortFunctionType<entity>;
    searchFunction?: SearchFunctionType<entity, searchType>;
}

export function createEntityStore<entity, id extends idType = number, searchType = string>(
    props: EntityStoreProperties<entity, id, searchType>
): EntityStore<entity, id, searchType> {
    return new EntityStore<entity, id, searchType>(props);
}
