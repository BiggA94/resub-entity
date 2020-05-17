import {createPersistentEntityStore} from './PersistentEntityStore';

interface TestObject {
    key: string;
    value: string;
}

describe('PersistentEntityStore', function () {
    const testEntities = [
        {key: '0', value: '0'},
        {key: '1', value: '1'},
        {key: '2', value: '2'},
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
});
