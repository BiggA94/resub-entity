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

import {DynamicLoadingStore, DynamicLoadingStoreProperties} from './DynamicLoadingStore';
import {idType} from './EntityHandler';
import {Observable, ReplaySubject} from 'rxjs';
import {autoSubscribeWithKey, StoreBase} from 'resub';

export const triggerPaginatedAllKey = '!@ENTITY_PAGINATE_ALL_TRIGGER@!';

export class PaginationStore<entity, id extends idType = number> extends DynamicLoadingStore<entity, id> {
    /**
     * gives the index of the last element, that was loaded via pagination.
     * this is needed in order to prevent missing items.
     * @protected
     */
    protected lastSortedIndex = -1;

    private readonly paginatedLoadFunction: (
        parameters: PaginatedLoadFunctionProperties<id>
    ) => Observable<Array<entity>>;

    constructor(props: PaginationStoreProperties<entity, id>) {
        super(props);
        this.paginatedLoadFunction = props.paginatedLoadFunction;
    }

    setOne(entity: Readonly<entity>): id {
        StoreBase.pushTriggerBlock();
        const one = super.setOne(entity);
        this.trigger(triggerPaginatedAllKey);
        this.lastSortedIndex = -1;
        StoreBase.popTriggerBlock();
        return one;
    }

    setAll(entities: Array<entity>): ReadonlyArray<id> {
        StoreBase.pushTriggerBlock();
        const all = super.setAll(entities);
        this.trigger(triggerPaginatedAllKey);
        this.lastSortedIndex = -1;
        StoreBase.popTriggerBlock();
        return all;
    }

    // todo: allow pagination for search, not only for all items
    @autoSubscribeWithKey(triggerPaginatedAllKey)
    getPaginated(pageSize: number, pageNumber: number): ReadonlyArray<entity> {
        const minIndex = pageSize * pageNumber;
        const maxIndex = minIndex + pageSize;

        const entities = this.entityHandler.getAll();
        if (entities.length < maxIndex && !this.loadObservable) {
            // we need to load the entities in front of it also..
            if (this.lastSortedIndex >= maxIndex) {
                // we already tried, but there are no more
            } else {
                const lastLoaded = entities.length > 0 ? this.entityHandler.getId(entities[entities.length - 1]) : null;
                const lastIndex = entities.length - 1;

                this.loadPaginated(pageSize, pageNumber, lastLoaded, lastIndex).subscribe();
            }
        }

        return entities.slice(minIndex, maxIndex);
    }

    private loadObservable: Observable<Array<entity>> | undefined;

    loadPaginated(
        pageSize: number,
        pageNumber: number,
        lastLoaded: id | null,
        lastIndex: number
    ): Observable<Array<entity>> {
        const minIndex = pageSize * pageNumber;

        const resultSubject = new ReplaySubject<Array<entity>>(1);

        if (!this.loadObservable) {
            // we need to load the entities in front of it also..
            this.loadObservable = this.paginatedLoadFunction({
                lastLoaded,
                lastIndex,
                limit: pageSize,
                offset: minIndex,
            });
            this.loadObservable.subscribe((values) => {
                this.setAll(values);
                this.lastSortedIndex = values.length - 1;
                resultSubject.next(values);
                resultSubject.complete();
                // resultSubject.complete();
                this.loadObservable = undefined;
            });
        } else {
            this.loadObservable.subscribe((values) => {
                resultSubject.next(values);
            });
        }
        return resultSubject.asObservable();
    }
}

export type PaginatedLoadFunctionProperties<id extends idType = number> = {
    lastLoaded: id | null;
    // check whether necessary
    lastIndex: number;
    limit: number;
    offset: number;
};

export interface PaginationStoreProperties<entity, id extends idType = number>
    extends DynamicLoadingStoreProperties<entity, id> {
    paginatedLoadFunction: PaginationStore<entity, id>['paginatedLoadFunction'];
}

export function createPaginationStore<entity, id extends idType = number>(
    props: PaginationStoreProperties<entity, id>
): PaginationStore<entity, id> {
    return new PaginationStore<entity, id>(props);
}
