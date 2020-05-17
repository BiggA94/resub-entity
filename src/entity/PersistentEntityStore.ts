import {idType} from './EntityHandler';
import {EntityStore, EntityStoreProperties, triggerEntityKey} from './EntityStore';

export class PersistentEntityStore<entity, id extends idType = number> extends EntityStore<entity, id> {
    private storage: Storage;

    constructor(protected props: PersistentEntityStoreProperties<entity, id>) {
        super(props);
        this.storage = props.storageType || localStorage;
        if (props.loadOnInit) {
            this.load();
        }
    }

    protected calculateStoreKey(): string {
        return 'PersistentStore_' + this.props.storageKey;
    }

    public persist(): void {
        this.storage.setItem(this.calculateStoreKey(), JSON.stringify(this.entityHandler.getAll()));
    }

    public load(): void {
        const item: string | null = this.storage.getItem(this.calculateStoreKey());
        if (item) {
            const entities: ReadonlyArray<entity> = JSON.parse(item);
            this.entityHandler.setEntities(entities);
            this.trigger(triggerEntityKey);
        }
    }
}

export interface PersistentEntityStoreProperties<entity, id extends idType = number>
    extends EntityStoreProperties<entity, id> {
    storageType?: Storage;
    storageKey: string;
    loadOnInit?: boolean;
}

export function createPersistentEntityStore<entity, id extends idType = number>(
    props: PersistentEntityStoreProperties<entity, id>
): PersistentEntityStore<entity, id> {
    return new PersistentEntityStore<entity, id>(props);
}
