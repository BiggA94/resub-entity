import {EntityHandler} from './EntityHandler';

const entities = [...Array(10).keys()];
describe('EntityHandler', function () {
    it('should return correct ids while setting new entities', function () {
        const eh = new EntityHandler<number>((entity: number) => entity);
        const ids = eh.addAll([0.9]);

        expect(ids).toEqual([0.9]);
    });
    it('should return correct entities', function () {
        const eh = new EntityHandler<number>((entity: number) => entity);
        eh.addAll(entities);

        entities.forEach((entity) => {
            expect(eh.getOne(entity)).toEqual(entity);
        });
    });
    it('should support custom sort', function () {
        const eh = new EntityHandler<number>(
            (entity: number) => entity,
            (entity1, entity2) => {
                return entity2 - entity1;
            }
        );
        eh.addAll(entities);

        expect(eh.getAll()).toStrictEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    });

    it('should return id of removed element', function () {
        const eh = new EntityHandler<number>((entity: number) => entity);
        eh.addAll(entities);

        entities.forEach((entity) => {
            expect(eh.removeOne(entity)).toEqual(eh.getId(entity));
        });
    });

    it('should return entity of removed element by id', function () {
        const eh = new EntityHandler<number>((entity: number) => entity);
        eh.addAll(entities);

        entities.forEach((entity) => {
            expect(eh.removeOneById(eh.getId(entity))).toEqual(entity);
        });
    });
    it('should handle strings as ids', function () {
        const eh = new EntityHandler<string, string>((entity) => entity);

        eh.addAll(['1', '2', '3']);

        expect(eh.getAll()).toHaveLength(3);

        const newEntities = ['2', 'a', 'e'];
        const removedEntities = eh.setEntities(newEntities);
        expect(removedEntities).toEqual(['1', '3']);
        expect(eh.getAll()).toEqual(newEntities);
    });
});
