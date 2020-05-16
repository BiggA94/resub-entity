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
