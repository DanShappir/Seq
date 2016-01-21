(function(name, definition) {
    'use strict';
    if (typeof module !== 'undefined') {
        module.exports = definition();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        define(name, [], definition);
    } else {
        self[name] = definition();
    }
}('Seq', function() {
    'use strict';

    const iterSymbol = self.Symbol ? self.Symbol.iterator : "@@iterator";
    
    const writable = value => ({ writable: true, value });

    const numericArg = (arg, def) => {
        const result = Number(arg);
        return isNaN(result) ? def : result;
    };
    
    const Seq = (source) => {
        if (source) {
            if (typeof source === 'object' && iterSymbol in source) {
                return function* () {
                    yield* source[iterSymbol]();
                };
            }
            if (typeof source === 'function') {
                return source.isGenerator() ? source : function* (...args) {
                    while (true) {
                        yield source(...args);
                    }
                };
            }
            if (typeof source.length === 'number') {
                return function* () {
                    for (let i = 0; i < source.length; ++i) {
                        yield source[i];
                    }
                };
            }
        }
        return function* generatorFromValue() {
            yield source;
        };
    };

    Object.defineProperties(Seq, {
        numbers: writable((initialValue, step) => {
            return function* (initialValue_, step_) {
                let n = initialValue_ || initialValue || 0;
                const s = step_ || step || 1;
                while (true) {
                    yield n;
                    n += s;
                }
            };
        }),
        toFilter: writable(function toFilter(value) {
            if (typeof value === 'function' && !value.isGenerator()) {
                return value;
            }
            const gen = Seq(value);
            return v => gen.filter(x => x === v).head(1).reduce(() => true, false);
        })
    });

    const proto = Object.getPrototypeOf(Seq.numbers());    
    if (!proto.isGenerator) {
        Object.defineProperties(proto, {
            isGenerator: writable(() => true)
        });
        Object.defineProperties(Function.prototype, {
            isGenerator: writable(() => false)
        });
    }
    
    const not = func => (...args) => !func(...args);

    Object.defineProperties(proto, {
        forEach: writable(function (callback, ...args) {
            const i = this(...args);
            let r;
            while (true) {
                const x = i.next(r);
                if (x.done) {
                    break;
                }
                r = callback(x.value);
            }
        }),
        until: writable(function (filter) {
            const gen = this;
            const callback = Seq.toFilter(filter);
            return function* (...args) {
                const i = gen(...args);
                let r;
                for (let counter = 0; ; ++counter) {
                    const x = i.next(r);
                    if (x.done || callback(x.value, r, counter) === true) {
                        return x.value;
                    }
                    r = yield x.value;
                }
            };
        }),
        asLongAs: writable(function (filter) {
            return this.until(not(Seq.toFilter(filter)));
        }),
        head: writable(function (length) {
            return this.until((v, r, counter) => counter >= length);
        }),
        filter: writable(function (filter) {
            const gen = this;
            const callback = Seq.toFilter(filter);
            return function* (...args) {
                for (let i of gen(...args)) {
                    if (callback(i)) {
                        yield i;
                    }
                }
            };
        }),
        exclude: writable(function (filter) {
            return this.filter(not(Seq.toFilter(filter)));
        }),
        skip: writable(function skip(filter) {
            const gen = this;
            if (typeof filter === 'number') {
                const limit = filter;
                filter = (x, counter) => counter <= limit;
            }
            return function* (...args) {
                const callback = Seq.toFilter(filter);
                var iter = gen(...args);
                let counter = 0;
                for (var i of iter) {
                    if (!callback(i, ++counter)) {
                        yield i;
                        break;
                    }
                }
                yield* iter;
            };
        }),
        map: writable(function (callback) {
            const gen = this;
            return function* (...args) {
                const i = gen(...args);
                let r;
                while (true) {
                    const x = i.next(r);
                    const v = callback(x.value, r);
                    if (x.done) {
                        return v;
                    }
                    r = yield v;
                }
            };
        }),
        inverseMap: writable(function (callback) {
            const gen = this;
            return function* (...args) {
                const i = gen(...args);
                let r;
                while (true) {
                    const x = i.next(r);
                    if (x.done) {
                        break;
                    }
                    r = callback(yield x.value, x.value);
                }
            };
        }),
        flatten: writable(function (depth) {
            const gen = this;
            depth = numericArg(depth, 0);
            return function* (...args) {
                for (let i of gen(...args)) {
                    const gen = Seq(i);
                    if (depth === 0 || gen().next().value === i) {
                        yield i;
                    } else {
                        yield* gen.flatten(depth - 1)(...args);
                    }
                }
            };
        }),
        loop: writable(function (times) {
            const gen = this;
            times = numericArg(times, Infinity);
            return function* (...args) {
                for (let i = 0; i < times; ++i) {
                    yield* gen(...args);
                }
            };
        }),
        concat: writable(function (...gens) {
            gens = [this, ...gens.map(Seq)];
            return function* (...args) {
                for (var i of gens) {
                    yield* i(...args);
                }
            };
        }),
        reduce: writable(function (callback, r, ...args) {
            const i = this(...args);
            while (true) {
                const x = i.next(r);
                if (x.done) {
                    break;
                }
                r = callback(r, x.value);
            }
            return r;
        }),
        combine: writable(function (...gens) {
            gens = [this, ...gens.map(Seq)];
            return function* (...args) {
                var iters = gens.map(gen => gen(...args));
                while (true) {
                    const nexts = iters.map(iter => iter.next());
                    const results = nexts.map(r => r.value);
                    if (nexts.some(r => r.done)) {
                        return results;
                    }
                    yield results;
                }
            };
        }),
        tee: writable(function (...args) {
            args.filter(arg => typeof arg === 'function').forEach(arg => arg(this));
            return this;
        }),
        indexOf: writable(function (value, fromIndex, ...args) {
            const gen = args.length ? this.bind(null, ...args) : this;
            return gen
                .combine(Seq.numbers())
                .skip(fromIndex)
                .filter(v => v[0] === value)
                .head()
                .reduce((r, v) => v[1], -1);
        }),
        use: writable(function (callback, ...args) {
            return callback(this(...args));
        })
    });
    return Seq;
}));
