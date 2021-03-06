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
import {EntityStore, EntityStoreProperties} from './EntityStore';
import {autoSubscribeWithKey} from 'resub';

export const triggerSelectedKey = '!@ENTITY_SELECT_TRIGGER@!';

export class SelectEntityStore<entity, id extends idType = number, searchType = string> extends EntityStore<
    entity,
    id,
    searchType
> {
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

    clear(): ReadonlyArray<id> {
        const ids = super.clear();
        this.trigger(triggerSelectedKey);
        return ids;
    }
}

export type SelectEntityStoreProperties<
    entity,
    id extends idType = number,
    searchType = string
> = EntityStoreProperties<entity, id, searchType>;

export function createSelectEntityStore<entity, id extends idType = number, searchType = string>(
    props: SelectEntityStoreProperties<entity, id, searchType>
): SelectEntityStore<entity, id, searchType> {
    return new SelectEntityStore<entity, id, searchType>(props);
}
