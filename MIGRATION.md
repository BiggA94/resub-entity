# Migration Guide

## to version 0.2.0
The old `search`function of the Entity Store is now called `searchWithOwnFilter`. 
The new `search`function can only be used, if the properties object of the store has an `searchFunction`.
The new `searchFunction` object can be the same as the parameter in the old `search` function.