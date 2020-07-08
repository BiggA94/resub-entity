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

import {createPersistentEntityStore} from './PersistentEntityStore';

interface TestObject {
    key: string;
    value: string;
}

interface TestSetObject {
    key: string;
    value: Set<string>;
}

describe('PersistentEntityStore', function () {
    const testEntities = [
        {key: '0', value: '0'},
        {key: '1', value: '1'},
        {key: '2', value: '2'},
    ];

    const testSetEntities = [
        {key: '0', value: new Set(['0'])},
        {key: '1', value: new Set(['1'])},
        {key: '2', value: new Set(['2'])},
    ];

    it('should load saved values', function () {
        const store = createPersistentEntityStore<TestObject, string>({
            selectIdFunction: (entity) => entity.key,
            storageKey: 'persistentStoreTest',
            storageType: sessionStorage,
        });

        store.setAll(testEntities);
        store.persist();

        const store2 = createPersistentEntityStore<TestObject, string>({
            selectIdFunction: (entity) => entity.key,
            storageKey: 'persistentStoreTest',
            storageType: sessionStorage,
        });

        store2.load();
        expect(store2.getAll()).toHaveLength(3);
    });

    it('should persist sets', function () {
        const store = createPersistentEntityStore<TestSetObject, string>({
            selectIdFunction: (entity) => entity.key,
            storageKey: 'persistentStoreTest',
            storageType: sessionStorage,
            replacer: (key, value) => (value instanceof Set ? [...value] : value),
        });

        store.setAll(testSetEntities);
        store.persist();

        const store2 = createPersistentEntityStore<TestSetObject, string>({
            selectIdFunction: (entity) => entity.key,
            storageKey: 'persistentStoreTest',
            storageType: sessionStorage,
            reviver: (key, value) => (key === 'value' ? new Set(value) : value),
        });

        store2.load();
        expect(store2.getAll()).toHaveLength(3);
        let i = 0;
        for (const testSet of testSetEntities) {
            expect(store2.getOne(testSet.key)).toEqual(testSetEntities[i++]);
        }
    });
});
