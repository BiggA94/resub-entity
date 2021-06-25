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

import React, {ReactElement} from 'react';
import {AutoSubscribeStore, autoSubscribeWithKey, ComponentBase, formCompoundKey, key, StoreBase} from 'resub';
import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

interface TestParameters {
    uniqueId: string;
    testStore: SimpleStore;
    propertyKey: string;
}

interface TestState {
    testObject: number;
}

class TestComponent extends ComponentBase<TestParameters, TestState> {
    render(): ReactElement | null {
        if (!this.state.testObject) return null;
        return <h1 data-testid={this.props.uniqueId}>{this.state.testObject}</h1>;
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
        render(<TestComponent propertyKey={'value'} testStore={testStore1} uniqueId={'1'} />);

        const testStore2 = new SimpleStore();
        testStore2.setVal(2);

        render(<TestComponent propertyKey={'value'} testStore={testStore2} uniqueId={'2'} />);
        expect(screen.getByTestId('1')).toHaveTextContent('1');
        expect(screen.getByTestId('2')).toHaveTextContent('2');

        testStore1.setVal(2);
        expect(screen.getByTestId('1')).toHaveTextContent('2');
        expect(screen.getByTestId('2')).toHaveTextContent('2');

        testStore2.setVal(1);
        expect(screen.getByTestId('1')).toHaveTextContent('2');
        expect(screen.getByTestId('2')).toHaveTextContent('1');

        testStore1.setVal(1);
        expect(screen.getByTestId('1')).toHaveTextContent('1');
        expect(screen.getByTestId('2')).toHaveTextContent('1');

        testStore2.setVal(2);
        expect(screen.getByTestId('1')).toHaveTextContent('1');
        expect(screen.getByTestId('2')).toHaveTextContent('2');
    }

    describe('should contain the correct values', () => {
        it('while using seperate simple stores', testSimpleStore);
    });

    describe('should contain the correct values', () => {
        it('while running the second time..', testSimpleStore);
    });
});
