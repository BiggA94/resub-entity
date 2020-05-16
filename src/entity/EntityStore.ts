import {
    EntityHandler,
    idType,
    selectIdFunctionType,
    sortFunctionType,
} from './EntityHandler';
import {
    AutoSubscribeStore,
    autoSubscribeWithKey,
    formCompoundKey,
    key,
    StoreBase,
} from 'resub';

export const triggerEntityKey = '!@ENTITY_TRIGGER@!';

@AutoSubscribeStore
export class EntityStore<entity, id extends idType = number> extends StoreBase {
    protected entityHandler: EntityHandler<entity, id>;

    constructor(props: EntityStoreProperties<entity, id>) {
        super(props.throttleMs, props.bypassTriggerBlocks || false);
        this.entityHandler = new EntityHandler<entity, id>(
            props.selectIdFunction,
            props.sortFunction
        );
    }

    public addOne(entity: entity): id {
        const id = this.entityHandler.add(entity);
        this.trigger(formCompoundKey(String(id), triggerEntityKey));
        this.trigger(triggerEntityKey);
        return id;
    }

    addAll(entities: Array<entity>): ReadonlyArray<id> {
        StoreBase.pushTriggerBlock();
        const ids = entities.map(this.addOne.bind(this));
        StoreBase.popTriggerBlock();
        return ids;
    }

    @autoSubscribeWithKey(triggerEntityKey)
    getOne(id: id): entity | undefined {
        return this.entityHandler.getOne(id);
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
    props: EntityStoreProperties<entity, id>
): EntityStore<entity, id> {
    return new EntityStore<entity, id>(props);
}
