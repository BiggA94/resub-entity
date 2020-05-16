import {createEntityStore} from './EntityStore';

interface TestObject {
    key: number;
    value: number;
}

describe('EntityStore', function () {
    it('should return correct values for given keys', function () {
        const testStore = createEntityStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.addAll([
            {key: 0, value: 0},
            {key: 1, value: 1},
            {key: 2, value: 2},
        ]);

        [...Array(3).keys()].forEach((key) => {
            expect(testStore.getOne(key)).toEqual({key, value: key});
        });
    });
});
