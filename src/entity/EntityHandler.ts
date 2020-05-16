import {defaultSortFunction} from './util';

export type idType = number | string;
export type idOrIds = idType | ReadonlyArray<idType>;

export type selectIdFunctionType<entity, id extends idType = number> = (entity: Readonly<entity>) => id;
export type sortFunctionType<entity, id extends idType = number> = (entity1: entity, entity2: entity) => number;

export class EntityHandler<entity, id extends idType = number> {
    private entities: Map<id, entity> = new Map();
    private ids: Set<id> = new Set();

    private readonly selectIdFunction: selectIdFunctionType<entity, id>;
    private readonly sortFunction: sortFunctionType<entity, id>;

    constructor(selectIdFunction: selectIdFunctionType<entity, id>, sortFunction?: sortFunctionType<entity, id>) {
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
}
