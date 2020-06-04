import {createDynamicLoadingStore} from './DynamicLoadingStore';
import {forkJoin, of} from 'rxjs';
import {delay} from 'rxjs/operators';

interface TestClass {
    id: number;
    value: string;
}

const testValues = new Map<number, TestClass>([
    [1, {id: 1, value: 'one'}],
    [2, {id: 2, value: 'two'}],
    [3, {id: 3, value: 'three'}],
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
        await delay(100);
        expect(loadSpy.mock.calls).toHaveLength(2);
    });
});
