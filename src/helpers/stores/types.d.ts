import type { DefineStoreOptions, StateTree } from 'pinia';

export declare type PatchFn<P = any> = (payload?: P) => void;
export declare type PatchKey = string;


declare type Patches<
  Id extends string, 
  S extends StateTree, 
  G, P
> = DefineStoreOptions<Id, S, G, P>['actions'];

export declare interface IStoreWithPatchSematics<
  Id extends string, 
  S extends StateTree, 
  G, A, 
  P extends Patches<Id, S, G, Record<PatchKey, PatchFn>>
> extends Pick<DefineStoreOptions<Id, S, G, A>, 'state' | 'actions' | 'getters'> {
  patches: P | null
}

