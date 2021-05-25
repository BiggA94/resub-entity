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

// CAREFUL! Highly experimental!
import {DynamicLoadingStore, DynamicLoadingStoreProperties} from './DynamicLoadingStore';
import {idType} from './EntityHandler';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

class SuspenseWrapper<entity> {
    status: 'pending' | 'error' | 'success' = 'pending';
    protected result?: entity;
    error?: unknown;
    protected subscription?: Promise<void>;

    public read(): entity | undefined {
        if (this.status === 'pending') {
            throw this.subscription;
        } else if (this.status === 'error') {
            throw this.error;
        } else if (this.status === 'success') {
            return this.result;
        }
    }

    constructor(result: Observable<entity> | entity | undefined) {
        if (result instanceof Observable) {
            this.subscription = result.toPromise().then(
                (result) => {
                    this.result = result;
                    this.status = 'success';
                },
                (error) => {
                    this.error = error;
                    this.status = 'error';
                }
            );
        } else {
            this.result = result;
            this.status = 'success';
        }
    }
}

export class SuspenseStore<entity, id extends idType = number> extends DynamicLoadingStore<entity, id> {
    private loadingObservables: Map<id, Observable<entity>> = new Map<id, Observable<entity>>();

    // ignore this for now, decide whether to use same method, or other method for suspense api...
    // eslint-disable-next-line
    // @ts-ignore
    getOne(id: id): SuspenseWrapper<entity> {
        let value: entity | undefined | Observable<entity> = super.getOne(id);
        const currentTimestamp = new Date(Date.now());
        const cachedTimestamp = this.getLastLoadedTime(id);
        if (this.cacheIsInvalid(cachedTimestamp, currentTimestamp, id)) {
            value = this.loadOne(id, currentTimestamp);
        } else {
            // if already loading
            const loadingObservable = this.loadingObservables.get(id);
            if (loadingObservable) {
                value = loadingObservable;
            }
        }
        return new SuspenseWrapper<entity>(value);
    }

    loadOne(
        id: id,
        _currTimestamp?: Date,
        addPipesFunction?: (observable: Observable<entity>) => Observable<entity>
    ): Observable<entity> {
        let result = super.loadOne(id, _currTimestamp, addPipesFunction);
        this.loadingObservables.set(id, result);
        result = result.pipe(tap(() => this.loadingObservables.delete(id)));
        // todo: could introduce problems, if one is actually subscribing to this observable
        result.subscribe();
        return result;
    }
}

export type SuspenseStoreProperties<entity, id extends idType = number> = DynamicLoadingStoreProperties<entity, id>;

export function createSuspenseStore_experimental<entity, id extends idType = number>(
    props: SuspenseStoreProperties<entity, id>
): SuspenseStore<entity, id> {
    return new SuspenseStore<entity, id>(props);
}
