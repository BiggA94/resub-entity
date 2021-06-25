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

import {idType, selectIdFunctionType} from './EntityHandler';

export function defaultSortFunction<entity, id extends idType = number>(
    idSelectionFunction: selectIdFunctionType<entity, id>
) {
    return (entity1: entity, entity2: entity): number => {
        const id1 = idSelectionFunction(entity1);
        const id2 = idSelectionFunction(entity2);
        if (typeof id1 === 'string' && typeof id2 === 'string') {
            return id1.localeCompare(id2);
        } else if (typeof id1 === 'number' && typeof id2 === 'number') {
            return id1 - id2;
        } else {
            throw new Error('type ' + typeof id1 + ' not supported, please use custom sort function');
        }
    };
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function deterministicStringify(object: object): string {
    // just simple function, because it is only used for id generation
    return JSON.stringify(object, Object.keys(object).sort());
}
