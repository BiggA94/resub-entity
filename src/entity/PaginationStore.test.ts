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

import {createPaginationStore} from './PaginationStore';
import {Observable, of} from 'rxjs';

function loadPaginated(offset: number, limit: number): Observable<Array<TestClass>> {
    const result: Array<TestClass> = new Array<TestClass>();
    for (let count = offset; count < offset + limit; count++) {
        result.push({id: count});
    }
    return of(result);
}

function load(id: number): Observable<TestClass> {
    return of({id});
}

type TestClass = {
    id: number;
};

describe('PaginationStore', () => {
    it('should return values with correct indices', async (done) => {
        const testStore = createPaginationStore<TestClass>({
            loadFunction: (id) => load(id),
            paginatedLoadFunction: (parameters) => loadPaginated(parameters.offset, parameters.limit),
            selectIdFunction: (entity) => entity.id,
        });

        const loadPaginatedSpy = jest.spyOn(testStore, 'loadPaginated');

        testStore.loadPaginated(5, 0, null, -1).subscribe(async () => {
            expect(testStore.getPaginated(1, 0)).toContainEqual({id: 0});
            expect(testStore.getPaginated(2, 1)).toContainEqual({id: 2});
            expect(testStore.getPaginated(2, 1)).toContainEqual({id: 3});
            expect(loadPaginatedSpy).toHaveBeenCalledTimes(1);

            // only 4 is loaded for now
            expect(testStore.getPaginated(2, 2)).toEqual([{id: 4}]);
            expect(loadPaginatedSpy).toHaveBeenCalledTimes(2);
            expect(testStore.getPaginated(2, 2)).toEqual([{id: 4}, {id: 5}]);
            done();
        });
    });
});
