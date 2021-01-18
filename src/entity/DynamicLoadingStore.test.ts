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

import {createDynamicLoadingStore} from './DynamicLoadingStore';
import {forkJoin, of} from 'rxjs';
import {EntityHandler} from './EntityHandler';

interface TestClass {
    id: number;
    value: string;
}

const testValues = new Map<number, TestClass>([
    [1, {id: 1, value: 'one'}],
    [2, {id: 2, value: 'two'}],
    [3, {id: 3, value: 'three'}],
    [4, {id: 4, value: 'four'}],
    [5, {id: 5, value: 'five'}],
]);

describe('DynamicLoadingStore', function () {
    it('should load values dynamically', (done) => {
        const store = createDynamicLoadingStore<TestClass, number>({
            selectIdFunction: (entity) => entity.id,
            loadFunction: (id) => of(testValues.get(id) || {id: id, value: 'undefined'}),
        });

        const first = store.loadOne(1);
        first.subscribe((value) => {
            expect(value).toEqual(testValues.get(1));
            expect(store.getAll()).toHaveLength(1);
        });

        const second = store.loadOne(2);
        second.subscribe((value) => {
            expect(value).toEqual(testValues.get(2));
            expect(store.getAll()).toHaveLength(2);
        });

        const third = store.loadOne(3);
        third.subscribe((value) => {
            expect(value).toEqual(testValues.get(3));
            expect(store.getAll()).toHaveLength(3);
        });

        forkJoin([first.toPromise(), second.toPromise(), third.toPromise()]).subscribe(() => done());
    });

    it('can invalidate specific caches', async () => {
        const store = createDynamicLoadingStore<TestClass, number>({
            selectIdFunction: (entity) => entity.id,
            loadFunction: (id) => of(testValues.get(id) || {id: id, value: 'undefined'}),
        });

        const loadSpy = jest.spyOn(store, 'loadOne');
        await store.loadOne(1);
        expect(loadSpy.mock.calls).toHaveLength(1);

        store.invalidateCache(1);
        // now load should be called on get
        store.getOne(1);
        expect(loadSpy.mock.calls).toHaveLength(2);
    });

    describe('can return the correct ids', () => {
        it('while setting new entities', () => {
            const eh = new EntityHandler<number>((entity: number) => entity);

            eh.addAll([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

            expect(eh.getAll()).toHaveLength(10);

            const newEntities = [0, 2, 4, 6, 8, 9];
            const removedEntities = eh.setEntities(newEntities);
            expect(removedEntities).toEqual([1, 3, 5, 7]);
            expect(eh.getAll()).toEqual(newEntities);
        });
    });

    it('can handle strings as ids', () => {
        const eh = new EntityHandler<string, string>((entity: string) => entity);

        eh.addAll(['a', 'b', 'c', 'd', 'e']);

        expect(eh.getAll()).toHaveLength(5);

        const newEntities = ['a', 'e'];
        const removedEntities = eh.setEntities(newEntities);
        expect(removedEntities).toEqual(['b', 'c', 'd']);
        expect(eh.getAll()).toEqual(newEntities);
    });

    it('should load values for search dynamically', function (done) {
        let loadingOffset = 0;
        const store = createDynamicLoadingStore<TestClass, number, number>({
            selectIdFunction: (entity) => entity.id,
            loadFunction: (id) => of(testValues.get(id) || {id: id, value: 'id:' + id}),
            searchFunction: (searchParameter, entity) => entity.value === 'id:' + searchParameter,
            searchLoadFunction: (searchParams) => of(Array.of(searchParams + loadingOffset)),
        });

        const first = store.loadOne(1);
        first.subscribe((value) => {
            expect(value).toEqual(testValues.get(1));
            expect(store.getAll()).toHaveLength(1);

            expect(store.search(1)).toEqual(testValues.get(1));
        });

        const second = store.loadOne(2);
        second.subscribe((value) => {
            expect(value).toEqual(testValues.get(2));
            expect(store.getAll()).toHaveLength(2);
            expect(store.search(2)).toEqual(testValues.get(2));
        });

        expect(store.search(3)).toHaveLength(1);

        loadingOffset = 2;

        expect(store.search(3)).toContainEqual(testValues.get(3));

        // force load of new search items
        // here, ids are loaded
        store.loadSearched(3);
        // now, entities are loading
        store.search(3);
        // and now the entities are loaded
        expect(store.search(3)).toContainEqual(testValues.get(5));

        forkJoin([first, second].map((p) => p.toPromise())).subscribe(() => done());
    });

    it('should load values in a sorted manner', function () {
        const store = createDynamicLoadingStore<TestClass, number, number[]>({
            selectIdFunction: (entity) => entity.id,
            loadFunction: (id) => of(testValues.get(id) || {id: id, value: 'id:' + id}),
            searchFunction: () => true,
            searchLoadFunction: (searchParams) => of(searchParams),
            sortFunction: (entity1, entity2) => {
                if (entity1.id > entity2.id) {
                    return 1;
                } else if (entity2.id > entity1.id) {
                    return -1;
                } else {
                    return 0;
                }
            },
        });

        const testObjects = store.search([1, 2, 5, 4, 3]);
        console.log(testObjects);
        expect(testObjects).toHaveLength(5);
        expect(testObjects).toStrictEqual([
            {id: 1, value: 'one'},
            {id: 2, value: 'two'},
            {id: 3, value: 'three'},
            {id: 4, value: 'four'},
            {id: 5, value: 'five'},
        ]);
    });
});
