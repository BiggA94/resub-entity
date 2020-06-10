# resub-entity
[![npm](https://img.shields.io/npm/v/resub-entity?style=flat-square)](https://www.npmjs.com/package/resub-entity)
[![npm](https://img.shields.io/npm/v/resub-entity?style=flat-square&color=blue&label=yarn)](https://yarn.pm/resub-entity)

This project eases the use of ReSub by providing a simple function to create a Store for an entity

# different stores

**EntityStore**:
A simple store, that holds one type of objects. 

Creating a store works with the method `createEntityStore<EntityType, idType>`.
Creation looks as follows:
```typescript
class SampleObject {
    id: number;
    value: string;
}

const SampleStore = createEntityStore<SampleObject, number>({selectIdFunction: (so: SampleObject) => so.id});
```

You now can add objects via `SampleStore.setOne({id: 1, value: 'Hello World!'})`.
And you can get an Object via `SampleStore.getOne(1)`.

**SelectEntityStore**:
The same as the EntityStore, but you can select one item per ID with `SampleStore.setSelected(ID)`.

**DynamicLoadingStore**:
The DynamicLoadingStore is a SelectEntityStore, but with the option to load an object asynchonously, if it does not exist in the store.
This is usefull for example for loading values from a service.

Creation of the DynamicLoadingStore looks as follows:

```typescript
class SampleObject {
    id: number;
    value: string;
}

const sampleObjects: Map<number, SampleObject> = new Map<string, string>([[1, {id: 1, value: 'Hello'}], [2, {id: 1, value: 'Hello'}]]);

const SampleStore = createEntityStore<SampleObject, number>({
    selectIdFunction: (so: SampleObject) => so.id,
    loadFunction: (id: number) => sampleObjects[id] 
});
```

`SampleStore.getOne(1)` now loads the Object `{id: 1, value: 'Hello'}` from the sampleObjects map.

*Carefull*:
As it loads values asynchronously, the returnvalue of the getOne function will be undefined on the first call!

Until further documentation, just have a look at the tests.
