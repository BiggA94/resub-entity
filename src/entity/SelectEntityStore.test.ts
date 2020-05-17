import {createSelectEntityStore} from './SelectEntityStore';

interface TestObject {
    key: string;
    value: string;
}

describe('SelectEntityStore', function () {
    const testEntities = [
        {key: '0', value: '0'},
        {key: '1', value: '1'},
        {key: '2', value: '2'},
    ];

    it('should return selected entity', function () {
        const testStore = createSelectEntityStore<TestObject, string>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.setAll(testEntities);

        expect(testStore.getSelected()).toBeUndefined();

        testStore.setSelected('1');
        expect(testStore.getSelected()).not.toBeUndefined();
        expect(testStore.getSelected()).toEqual({key: '1', value: '1'});

        testStore.setSelected(undefined);
        expect(testStore.getSelected()).toBeUndefined();
    });
});
