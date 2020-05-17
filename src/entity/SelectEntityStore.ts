import {idType} from './EntityHandler';
import {EntityStore, EntityStoreProperties} from './EntityStore';
import {autoSubscribeWithKey} from 'resub';

export const triggerSelectedKey = '!@ENTITY_SELECT_TRIGGER@!';

export class SelectEntityStore<entity, id extends idType = number> extends EntityStore<entity, id> {
    protected entityId?: id;

    @autoSubscribeWithKey(triggerSelectedKey)
    public getSelected(): Readonly<entity> | undefined {
        if (this.entityId === undefined) {
            return undefined;
        }
        return this.getOne(this.entityId);
    }

    public setSelected(id: id | undefined): void {
        if (id !== this.entityId) {
            this.entityId = id;
            this.trigger(triggerSelectedKey);
        }
    }

    public setOne(entity: Readonly<entity>): id {
        const updatedId = super.setOne(entity);
        if (updatedId === this.entityId) {
            this.trigger(triggerSelectedKey);
        }
        return updatedId;
    }
}

export type SelectEntityStoreProperties<entity, id extends idType = number> = EntityStoreProperties<entity, id>;

export function createSelectEntityStore<entity, id extends idType = number>(
    props: SelectEntityStoreProperties<entity, id>
): SelectEntityStore<entity, id> {
    return new SelectEntityStore<entity, id>(props);
}
