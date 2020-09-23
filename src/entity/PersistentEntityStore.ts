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

import {idType} from './EntityHandler';
import {EntityStore, EntityStoreProperties, triggerEntityKey} from './EntityStore';

export class PersistentEntityStore<entity, id extends idType = number, searchType = number> extends EntityStore<
    entity,
    id,
    searchType
> {
    private storage: Storage;

    constructor(protected props: PersistentEntityStoreProperties<entity, id, searchType>) {
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
        this.storage.setItem(
            this.calculateStoreKey(),
            JSON.stringify(this.entityHandler.getAll(), this.props.replacer)
        );
    }

    public load(): void {
        const item: string | null = this.storage.getItem(this.calculateStoreKey());
        if (item) {
            const entities: ReadonlyArray<entity> = JSON.parse(item, this.props.reviver);
            this.entityHandler.setEntities(entities);
            this.trigger(triggerEntityKey);
        }
    }
}

export interface PersistentEntityStoreProperties<entity, id extends idType = number, searchType = number>
    extends EntityStoreProperties<entity, id, searchType> {
    storageType?: Storage;
    storageKey: string;
    loadOnInit?: boolean;
    replacer?: (key: string, value: unknown) => unknown;
    reviver?: (key: string, value: unknown) => unknown;
}

export function createPersistentEntityStore<entity, id extends idType = number, searchType = number>(
    props: PersistentEntityStoreProperties<entity, id, searchType>
): PersistentEntityStore<entity, id, searchType> {
    return new PersistentEntityStore<entity, id, searchType>(props);
}
