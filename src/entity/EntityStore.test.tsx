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

import React from 'react';
import {createDynamicLoadingStore, createEntityStore, createPersistentEntityStore, EntityStore} from '../';
import {ComponentBase} from 'resub';
import {Observable, of} from 'rxjs';
import {delay} from 'rxjs/operators';
import {wait} from './testUtil';
import '@testing-library/jest-dom/extend-expect';
import {act, render, screen} from '@testing-library/react';

interface TestObject {
    key: number;
    value: number;
}

interface TestParameters<P, searchType = string> {
    uniqueId: string;
    testStore: EntityStore<P, number, searchType>;
    search?: searchType;
    propertyKey?: number;
}

interface TestState<S> {
    testObject: S | ReadonlyArray<S>;
}

class TestComponent<searchType = string> extends ComponentBase<
    TestParameters<TestObject, searchType>,
    TestState<TestObject>
> {
    public buildStateInvokeCount = 0;

    protected _buildState(props: TestParameters<TestObject, searchType>): Partial<TestState<TestObject>> | undefined {
        this.buildStateInvokeCount++;
        if (props.search) {
            return {
                testObject: props.testStore.search(props.search),
            };
        } else if (props.propertyKey) {
            return {
                testObject: props.testStore.getOne(props.propertyKey),
            };
        } else {
            return {
                testObject: props.testStore.getAll(),
            };
        }
    }

    render(): null | number | number[] | JSX.Element[] | JSX.Element {
        if (!this.state.testObject) return null;
        if (Array.isArray(this.state.testObject)) {
            return this.state.testObject.map((obj: TestObject) => {
                return (
                    <div key={obj.key} data-testid={obj.key} x-value={obj.value}>
                        {obj.value}
                    </div>
                );
            });
        } else {
            return (
                <div data-testid={this.props.propertyKey} x-value={(this.state.testObject as TestObject).value}>
                    {(this.state.testObject as TestObject).value}
                </div>
            );
        }
    }
}

function expectValue(key: string, expectedValue: unknown) {
    expect(screen.getByTestId(key)).toHaveAttribute('x-value', expectedValue);
}

function expectNotValue(key: string, expectedValue: unknown) {
    expect(screen.getByTestId(key)).not.toHaveAttribute('x-value', expectedValue);
}

describe('EntityStore', function () {
    const testEntities = [
        {key: 0, value: 0},
        {key: 1, value: 1},
        {key: 2, value: 2},
    ];

    it('should return correct values for given keys', function () {
        const testStore = createEntityStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.setAll(testEntities);

        [...Array(testEntities.length).keys()].forEach((key) => {
            expect(testStore.getOne(key)).toEqual({key, value: key});
        });
    });

    it('should return all entries', function () {
        const testStore = createEntityStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.setAll(testEntities);
        const allTestObjects = testStore.getAll();
        [...Array(testEntities.length).keys()].forEach((key) => {
            expect(allTestObjects).toContainEqual({key, value: key});
        });
    });

    it('should trigger update in component on change of entity', function () {
        const testStore = createEntityStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.setAll(testEntities);

        render(
            <div>
                <TestComponent propertyKey={1} testStore={testStore} uniqueId={new Date().getTime() + '1'} />
                <TestComponent propertyKey={2} testStore={testStore} uniqueId={new Date().getTime() + '2'} />
            </div>
        );

        expect(screen.getByTestId('1')).toHaveAttribute('x-value', '1');
        expectValue('1', '1');
        expectValue('2', '2');

        act(() => {
            testStore.setOne({key: 1, value: 2});
        });

        expectNotValue('1', '1');
        expectValue('1', '2');
        expectValue('2', '2');

        act(() => {
            testStore.setOne({key: 2, value: 1});
        });

        expectValue('1', '2');
        expectValue('2', '1');
    });

    it('should trigger update in component on setEntities of entity', function () {
        const testStore = createEntityStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.setAll(testEntities);

        render(
            <div>
                <TestComponent propertyKey={1} testStore={testStore} uniqueId={new Date().getTime() + '1'} />
                <TestComponent propertyKey={2} testStore={testStore} uniqueId={new Date().getTime() + '2'} />
            </div>
        );

        expectValue('1', '1');
        expectValue('2', '2');

        act(() => {
            testStore.setEntities([...testStore.getAll().filter((e) => e.key !== 1), {key: 1, value: 2}]);
        });

        expectNotValue('1', '1');
        expectValue('1', '2');

        act(() => {
            testStore.setEntities([...testStore.getAll().filter((e) => e.key !== 2), {key: 2, value: 1}]);
        });

        expectValue('1', '2');
        expectValue('2', '1');
    });

    it('DynamicLoadingStore should trigger update in component on change of entity', function () {
        const testStore = createDynamicLoadingStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
            loadFunction: (id) => of(testEntities.filter((e) => e.key === id)[0]),
        });
        testStore.setAll(testEntities);

        render(
            <div>
                <TestComponent propertyKey={1} testStore={testStore} uniqueId={new Date().getTime() + '1'} />
                <TestComponent propertyKey={2} testStore={testStore} uniqueId={new Date().getTime() + '2'} />
            </div>
        );

        expectValue('1', '1');
        expectValue('2', '2');

        act(() => {
            testStore.setEntities([...testStore.getAll().filter((e) => e.key !== 1), {key: 1, value: 2}]);
        });

        expectNotValue('1', '1');
        expectValue('1', '2');

        act(() => {
            testStore.setEntities([...testStore.getAll().filter((e) => e.key !== 2), {key: 2, value: 1}]);
        });

        expectValue('1', '2');
        expectValue('2', '1');
    });

    it('EntityStore should trigger update in component subscribed to all on change of entity', function () {
        const testStore = createEntityStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.setEntities(testEntities);

        render(<TestComponent testStore={testStore} uniqueId={new Date().getTime() + '1'} />);

        expectValue('0', '0');
        expectValue('1', '1');
        expectValue('2', '2');

        act(() => {
            testStore.removeOneById(1);
        });

        expectValue('0', '0');
        expect(screen.queryByTestId('1')).toBeNull();
        expectValue('2', '2');

        act(() => {
            testStore.setOne({key: 2, value: 1});
        });

        expectValue('0', '0');
        expect(screen.queryByTestId('1')).toBeNull();
        expectValue('2', '1');
    });

    function getFilteredTestEntitiesDelayed(searchParameter: number, delayMs: number): Observable<Array<number>> {
        return of(testEntities.filter((e) => e.key === searchParameter).map((entity) => entity.key)).pipe(
            delay(delayMs)
        );
    }

    it('DynamicLoadingStore should trigger loadSearched only once per searchParameter', async function () {
        let loadFunctionCallCounter = 0;
        const testStore = createDynamicLoadingStore<TestObject, number, number>({
            selectIdFunction: (entity) => entity.key,
            loadFunction: (id) => of(testEntities.filter((e) => e.key === id)[0]),
            searchFunction: (searchParameter, entity) => entity.key === searchParameter,
            searchLoadFunction: (searchParameter) => {
                loadFunctionCallCounter++;
                return getFilteredTestEntitiesDelayed(searchParameter, 0);
            },
        });

        render(<TestComponent uniqueId={new Date().getTime() + '1'} testStore={testStore} search={1} />);

        expect(loadFunctionCallCounter).toEqual(1);
    });

    it('should handle search keys deterministically', function () {
        type searchObject = {
            key1: number;
            key2: string;
            key3: string;
        };
        let loadFunctionCallCounter = 0;
        const testStore = createDynamicLoadingStore<TestObject, number, searchObject>({
            selectIdFunction: (entity) => entity.key,
            loadFunction: (id) => of(testEntities.filter((e) => e.key === id)[0]),
            searchFunction: (searchParameter, entity) => entity.key === searchParameter.key1,
            searchLoadFunction: (searchParameter) => {
                loadFunctionCallCounter++;
                return getFilteredTestEntitiesDelayed(searchParameter.key1, 0);
            },
        });

        testStore.searchIds({
            key1: 1,
            key2: 'test',
            key3: 'value',
        });

        testStore.searchIds({
            key3: 'value',
            key1: 1,
            key2: 'test',
        });

        expect(loadFunctionCallCounter).toEqual(1);
    });

    it('should clear search after entities have changed', function () {
        type searchObject = {
            key1: number;
        };
        const testStore = createEntityStore<TestObject, number, searchObject>({
            selectIdFunction: (entity) => entity.key,
            searchFunction: (searchParameter, entity) => entity.key === searchParameter.key1,
        });

        expect(
            testStore.searchIds({
                key1: 1,
            })
        ).toHaveLength(0);

        testStore.setOne({key: 1, value: 42});

        expect(
            testStore.searchIds({
                key1: 1,
            })
        ).toHaveLength(1);

        expect(
            testStore.search({
                key1: 1,
            })
        ).toEqual([{key: 1, value: 42}]);

        testStore.setOne({key: 1, value: 43});

        expect(
            testStore.searchIds({
                key1: 1,
            })
        ).toHaveLength(1);

        expect(
            testStore.search({
                key1: 1,
            })
        ).toEqual([{key: 1, value: 43}]);
    });

    it('DynamicLoadingStore should trigger update on search', async function () {
        const testStore = createDynamicLoadingStore<TestObject, number, number>({
            selectIdFunction: (entity) => entity.key,
            loadFunction: (id) => {
                return of(testEntities.filter((e) => e.key === id)[0]).pipe(delay(10));
            },
            searchFunction: (searchParameter, entity) => entity.key === searchParameter,
            searchLoadFunction: (searchParameter) => {
                return getFilteredTestEntitiesDelayed(searchParameter, 10);
            },
        });

        render(
            <div>
                <TestComponent testStore={testStore} uniqueId={new Date().getTime() + '1'} search={1} />
                <TestComponent testStore={testStore} uniqueId={new Date().getTime() + '2'} search={2} />
            </div>
        );

        await act(() => wait(100));

        expectValue('1', '1');
        expectValue('2', '2');

        act(() => {
            testStore.setOne({key: 1, value: 2});
            testStore.setEntities([...testStore.getAll().filter((e) => e.key !== 1), {key: 1, value: 2}]);
        });

        expectNotValue('1', '1');
        expectValue('1', '2');

        act(() => {
            testStore.setOne({key: 2, value: 1});
            testStore.setEntities([...testStore.getAll().filter((e) => e.key !== 2), {key: 2, value: 1}]);
        });

        expectValue('1', '2');
        expectValue('2', '1');
    });

    it('PersistentEntityStore should trigger update in component on change of entity', function () {
        const testStore = createPersistentEntityStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
            storageKey: 'tmp',
            storageType: sessionStorage,
        });
        testStore.setAll(testEntities);

        render(
            <div>
                <TestComponent propertyKey={1} testStore={testStore} uniqueId={new Date().getTime() + '1'} />
                <TestComponent propertyKey={2} testStore={testStore} uniqueId={new Date().getTime() + '2'} />
            </div>
        );

        expectValue('1', '1');
        expectValue('2', '2');

        act(() => {
            testStore.setOne({key: 1, value: 2});
        });

        expectNotValue('1', '1');
        expectValue('1', '2');

        act(() => {
            testStore.setOne({key: 2, value: 1});
        });

        expectValue('1', '2');
        expectValue('2', '1');
    });

    it('should return entries, that match the search criteria', function () {
        const testStore = createEntityStore<TestObject, number, number>({
            selectIdFunction: (entity) => entity.key,
            searchFunction: (searchParameter, entity) => entity.value === searchParameter,
        });
        testStore.setAll(testEntities);

        const testObjects = testStore.search(2);
        expect(testObjects).toHaveLength(1);
        expect(testObjects).toStrictEqual([{key: 2, value: 2}]);
    });

    it('should return entries, that match the search with own filter criteria', function () {
        const testStore = createEntityStore<TestObject, number, number>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.setAll(testEntities);

        const testObjects = testStore.searchWithOwnFilter((entity) => entity.value === 2);
        expect(testObjects).toHaveLength(1);
        expect(testObjects).toStrictEqual([{key: 2, value: 2}]);
    });

    it('should trigger update in component via search on change of entity', function () {
        const testStore = createEntityStore<TestObject, number, number>({
            selectIdFunction: (entity) => entity.key,
            searchFunction: (searchParameter, entity) => entity.value == searchParameter,
        });
        testStore.setAll(testEntities);
        expect(testStore.search(1)).toHaveLength(1);
        expect(testStore.search(2)).toHaveLength(1);

        render(
            <div>
                <TestComponent propertyKey={1} search={1} testStore={testStore} uniqueId={new Date().getTime() + '1'} />
                <TestComponent propertyKey={2} search={2} testStore={testStore} uniqueId={new Date().getTime() + '2'} />
            </div>
        );

        expectValue('1', '1');
        expectValue('2', '2');

        act(() => {
            testStore.setOne({key: 1, value: 2});
        });

        expect(testStore.search(1)).toHaveLength(0);
        expect(testStore.search(2)).toHaveLength(2);

        expectNotValue('1', '1');
        expectValue('2', '2');

        act(() => {
            testStore.setOne({key: 2, value: 1});
        });

        expectValue('1', '2');
        expectValue('2', '1');
        // expect(testComponent1.contains('1')).toEqual(true);
        // expect(testComponent2.contains('2')).toEqual(true);

        expect(testStore.search(1)).toHaveLength(1);
        expect(testStore.search(2)).toHaveLength(1);
    });

    it('should remove entity by id', function () {
        const testStore = createEntityStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.setAll(testEntities);
        expect(testStore.getAll()).toHaveLength(3);

        const removed = testStore.removeOneById(1);
        expect(removed?.key).toEqual(1);
        expect(testStore.getAll()).toHaveLength(2);
    });

    it('should remove entity by entity', function () {
        const testStore = createEntityStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.setAll(testEntities);
        expect(testStore.getAll()).toHaveLength(3);

        const removedId = testStore.removeOne({key: 1, value: 1});
        expect(removedId).toEqual(1);
        expect(testStore.getAll()).toHaveLength(2);
    });

    it('should return all the entities to given ids', function () {
        const testStore = createEntityStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.setAll(testEntities);
        expect(testStore.getAll()).toHaveLength(3);

        const multiple = testStore.getMultiple([0, 2]);
        expect(multiple.length).toEqual(2);
        expect(multiple[0].key).toEqual(0);
        expect(multiple[1].key).toEqual(2);
    });

    it('should clear store', function () {
        const testStore = createEntityStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.setAll(testEntities);
        expect(testStore.getAll()).toHaveLength(3);
        testStore.clear();
        expect(testStore.getAll()).toHaveLength(0);
    });

    it('should load values in a sorted manner', function () {
        const store = createEntityStore<TestObject, number, number[]>({
            selectIdFunction: (entity) => entity.key,
            searchFunction: () => true,
            sortFunction: (entity1, entity2) => entity1.key - entity2.key,
        });

        store.setAll([
            {key: 1, value: 1},
            {key: 2, value: 2},
            {key: 3, value: 3},
            {key: 4, value: 4},
            {key: 5, value: 5},
        ]);

        const testObjects = store.search([1, 2, 5, 4, 3]);
        expect(testObjects).toHaveLength(5);
        expect(testObjects).toStrictEqual([
            {key: 1, value: 1},
            {key: 2, value: 2},
            {key: 3, value: 3},
            {key: 4, value: 4},
            {key: 5, value: 5},
        ]);
    });
    it('should return undefined if undefined was given as key', function () {
        const testStore = createEntityStore<TestObject>({
            selectIdFunction: (entity) => entity.key,
        });
        testStore.setAll(testEntities);
        expect(testStore.getOne(undefined)).toBeUndefined();
    });
});
