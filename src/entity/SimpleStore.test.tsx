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
import {AutoSubscribeStore, autoSubscribeWithKey, ComponentBase, formCompoundKey, key, StoreBase} from 'resub';
import {mount} from 'enzyme';

interface TestParameters {
    uniqueId: string;
    testStore: SimpleStore;
    propertyKey: string;
}

interface TestState {
    testObject: number;
}

class TestComponent extends ComponentBase<TestParameters, TestState> {
    render(): number | null {
        if (!this.state.testObject) return null;
        return this.state.testObject;
    }

    protected _buildState(props: TestParameters): Partial<TestState> | undefined {
        return {
            testObject: props.testStore.getVal(props.propertyKey),
        };
    }
}

@AutoSubscribeStore
class SimpleStore extends StoreBase {
    protected value = 0;

    constructor() {
        super();
    }

    public setVal(value: number) {
        this.value = value;
        const trigger = formCompoundKey('value', 'TEST');
        this.trigger(trigger);
    }

    @autoSubscribeWithKey('TEST')
    public getVal(key: string): number {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return this[key];
    }
}

key(SimpleStore.prototype, 'getVal', 0);

describe('SimpleStore', () => {
    function testSimpleStore() {
        const testStore1 = new SimpleStore();
        testStore1.setVal(1);
        const testComponent = mount(
            <TestComponent propertyKey={'value'} testStore={testStore1} uniqueId={new Date().getTime() + '1'} />
        );

        const testStore2 = new SimpleStore();
        testStore2.setVal(2);

        const testComponent2 = mount(
            <TestComponent propertyKey={'value'} testStore={testStore2} uniqueId={new Date().getTime() + '2'} />
        );
        expect(testComponent.contains('1')).toEqual(true);
        expect(testComponent2.contains('2')).toEqual(true);

        testStore1.setVal(2);
        testComponent.update();
        expect(testComponent.contains('2')).toEqual(true);
        expect(testComponent2.contains('2')).toEqual(true);

        testStore2.setVal(1);
        testComponent2.update();
        expect(testComponent.contains('2')).toEqual(true);
        expect(testComponent2.contains('1')).toEqual(true);

        testStore1.setVal(1);
        testComponent.update();
        expect(testComponent.contains('1')).toEqual(true);
        expect(testComponent2.contains('1')).toEqual(true);

        testStore2.setVal(2);
        testComponent2.update();
        expect(testComponent.contains('1')).toEqual(true);
        expect(testComponent2.contains('2')).toEqual(true);
    }

    describe('should contain the correct values', () => {
        it('while using seperate simple stores', testSimpleStore);
    });

    describe('should contain the correct values', () => {
        it('while running the second time..', testSimpleStore);
    });
});
