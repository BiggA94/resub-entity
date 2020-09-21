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

import {defaultSortFunction} from './util';

export type idType = number | string;
export type idOrIds = idType | ReadonlyArray<idType>;

export type selectIdFunctionType<entity, id extends idType = number> = (entity: Readonly<entity>) => id;
export type sortFunctionType<entity> = (entity1: entity, entity2: entity) => number;

export class EntityHandler<entity, id extends idType = number> {
    private entities: Map<id, entity> = new Map();
    private ids: Set<id> = new Set();

    private readonly selectIdFunction: selectIdFunctionType<entity, id>;
    private readonly sortFunction: sortFunctionType<entity>;

    constructor(selectIdFunction: selectIdFunctionType<entity, id>, sortFunction?: sortFunctionType<entity>) {
        this.selectIdFunction = selectIdFunction;
        this.sortFunction = sortFunction || defaultSortFunction(selectIdFunction);
    }

    public hasOne(id: id): boolean {
        return this.ids.has(id);
    }

    /**
     * Helper function, that returns the id of a given entity
     * @param entity
     * @return id
     */
    public getId(entity: entity): id {
        return this.selectIdFunction(entity);
    }

    public add(entity: entity): id {
        const id = this.selectIdFunction(entity);
        if (this.hasOne(id)) {
            // check for overwrite if needed here!
        }
        this.entities.set(id, entity);
        this.ids.add(id);
        return id;
    }

    public addAll(entities: ReadonlyArray<entity>): ReadonlyArray<id> {
        return entities.map(this.add.bind(this));
    }

    public getOne(id: id): entity | undefined {
        return this.entities.get(id);
    }

    /**
     *
     * @param ids
     */
    public get(ids: idOrIds): ReadonlyArray<entity> {
        let entities: Array<entity | undefined>;
        if (Array.isArray(ids)) {
            entities = Array.from(ids).map(this.getOne.bind(this));
        } else {
            entities = [this.getOne(ids as id)];
        }
        return entities.filter((entity) => entity !== undefined) as ReadonlyArray<entity>;
    }

    /**
     * returns all values sorted via given sort function
     */
    public getAll(): ReadonlyArray<entity> {
        const entities = Array.from(this.entities.values());
        const sortedEntities = entities.sort(this.sortFunction);
        return sortedEntities;
    }

    getAllMapped(): ReadonlyMap<id, entity> {
        return new Map(this.entities);
    }

    public removeOne(entity: entity): id | undefined {
        const id = this.getId(entity);
        if (this.hasOne(id)) {
            this.entities.delete(id);
            this.ids.delete(id);
            return id;
        }
        return undefined;
    }

    public removeOneById(id: Readonly<id>): entity | undefined {
        const entity = this.entities.get(id);
        const deleted = this.entities.delete(id);
        this.ids.delete(id);
        if (deleted) {
            return entity;
        }
        return undefined;
    }

    /**
     * clears all saved entities
     * @return ids of cleared entities
     */
    public clear(): ReadonlyArray<id> {
        const ids = Array.from(this.ids);
        this.ids.clear();
        this.entities.clear();
        return ids;
    }

    setEntities(entities: ReadonlyArray<entity>): ReadonlyArray<id> {
        if (entities.length === 0) {
            // shortcut, clear entities here
            const result = new Array(...this.ids);
            this.ids.clear();
            this.entities.clear();
            return result;
        }
        // the ids of removed entities are needed in order to trigger the updates correctly
        // so we need to collect them here
        const newIds = entities.map<id>((value) => this.selectIdFunction(value));
        const idsToRemove = [...this.ids].filter((value) => !newIds.includes(value));

        this.ids.clear();
        this.entities.clear();

        this.addAll(entities);

        return idsToRemove;
    }
}
