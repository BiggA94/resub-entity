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
