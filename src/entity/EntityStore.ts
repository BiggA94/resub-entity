import {EntityHandler, idType, selectIdFunctionType, sortFunctionType} from './EntityHandler';
import {AutoSubscribeStore, autoSubscribeWithKey, formCompoundKey, key, StoreBase} from 'resub';

export const triggerEntityKey = '!@ENTITY_TRIGGER@!';

@AutoSubscribeStore
export class EntityStore<entity, id extends idType = number> extends StoreBase {
    protected entityHandler: EntityHandler<entity, id>;

    constructor(props: EntityStoreProperties<entity, id>) {
        super(props.throttleMs, props.bypassTriggerBlocks || false);
        this.entityHandler = new EntityHandler<entity, id>(props.selectIdFunction, props.sortFunction);
    }

    protected getTriggerForId(id: id): string {
        return formCompoundKey(String(id), triggerEntityKey);
    }

    public getId(entity: entity): id {
        return this.entityHandler.getId(entity);
    }

    public setOne(entity: entity): id {
        const id = this.entityHandler.add(entity);
        this.trigger([this.getTriggerForId(id), triggerEntityKey]);
        return id;
    }

    public setAll(entities: Array<entity>): ReadonlyArray<id> {
        StoreBase.pushTriggerBlock();
        const ids = entities.map(this.setOne.bind(this));
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
            this.trigger(formCompoundKey(String(this.entityHandler.getId(entity)), triggerEntityKey)),
        );

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
        if (removedId) {
            this.trigger([this.getTriggerForId(removedId), triggerEntityKey]);
        }
        return removedId;
    }

    public removeOneById(id: id): entity | undefined {
        const removedEntity = this.entityHandler.removeOneById(id);
        if (removedEntity) {
            this.trigger([this.getTriggerForId(id), triggerEntityKey]);
        }
        return removedEntity;
    }

    // todo: needs proper subscriptions
    @autoSubscribeWithKey(triggerEntityKey)
    public search(searchFilter: (entity: entity) => boolean): ReadonlyArray<entity> {
        return this.entityHandler.getAll().filter(searchFilter);
    }
}

// as @param does not work here, we manually apply key here
key(EntityStore.prototype, 'getOne', 0);
key(EntityStore.prototype, 'hasOne', 0);

export interface EntityStoreProperties<entity, id extends idType = number> {
    throttleMs?: number;
    bypassTriggerBlocks?: boolean;
    selectIdFunction: selectIdFunctionType<entity, id>;
    sortFunction?: sortFunctionType<entity, id>;
}

export function createEntityStore<entity, id extends idType = number>(
    props: EntityStoreProperties<entity, id>,
): EntityStore<entity, id> {
    return new EntityStore<entity, id>(props);
}
