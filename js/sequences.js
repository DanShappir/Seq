var Sequences;
(function (Sequences) {
    'use strict';

    const iterSymbol = self.Symbol ? self.Symbol.iterator : "@@iterator";
    
    const writable = value => ({ writable: true, value });

    const numericArg = (arg, def) => {
        const result = Number(arg);
        return isNaN(result) ? def : result;
    }

    Object.defineProperties(Sequences, {
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
        toGenerator: writable((source, initialValue) => {
            if (source) {
                if (typeof source === 'object' && iterSymbol in source) { // source has an iterator
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
                        for (let i = initialValue || 0; i < source.length; ++i) {
                            yield source[i];
                        }
                    };
                }
            }
            return function* generatorFromValue() {
                yield source;
            };
        }),
        toFilter: writable(function toFilter(value) {
            if (typeof value === 'function' && !value.isGenerator()) {
                return value;
            }
            const gen = Sequences.toGenerator(value);
            return v => gen.filter(x => x === v).head(1).reduce(() => true, false);
        })
    });

    const proto = Object.getPrototypeOf(Sequences.numbers());    
    if (!proto.isGenerator) {
        Object.defineProperties(proto, {
            isGenerator: writable(() => true)
        });
        Object.defineProperties(Function.prototype, {
            isGenerator: writable(() => false)
        });
    }

    const not = func => function (...args) {
        return !func.apply(this, args)
    };

    const bind = Function.prototype.bind;
    Object.defineProperties(proto, {
        bind: writable(function (...args) {
            const result = bind.apply(this, args);
            Object.setPrototypeOf(result, proto);
            return result;
        }),
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
            const callback = Sequences.toFilter(filter);
            return function* (...args) {
                const i = gen(...args);
                let r;
                while (true) {
                    const x = i.next(r);
                    if (x.done || callback(x.value, r) === true) {
                        break;
                    }
                    r = yield x.value;
                }
            };
        }),
        asLongAs: writable(function (filter) {
            return this.until(not(Sequences.toFilter(filter)));
        }),
        head: writable(function (length) {
            const gen = this;
            length || (length = 1);
            return function* (...args) {
                const i = gen(...args);
                let r;
                for (let counter = 0; counter < length; ++counter) {
                    const x = i.next(r);
                    if (x.done) {
                        break;
                    }
                    r = yield x.value;
                }
            };
        }),
        filter: writable(function (filter) {
            const gen = this;
            const callback = Sequences.toFilter(filter);
            return function* (...args) {
                for (let i of gen(...args)) {
                    if (callback(i)) {
                        yield i;
                    }
                }
            };
        }),
        exclude: writable(function (filter) {
            return this.filter(not(Sequences.toFilter(filter)));
        }),
        skip: writable(function skip(filter) {
            const gen = this;
            if (typeof filter === 'number') {
                const limit = filter;
                filter = counter => counter <= limit;
            }
            return function* (...args) {
                const callback = Sequences.toFilter(filter);
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
                    if (x.done) {
                        break;
                    }
                    r = yield callback(x.value, r);
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
                    const generator = Sequences.toGenerator(i);
                    if (depth === 0 || generator().next().value === i) {
                        yield i;
                    } else {
                        yield* generator.flatten(depth - 1)(...args);
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
        concat: writable(function (...args) {
            const gens = Sequences.toGenerator([this, ...args]).map(Sequences.toGenerator);
            return function* (...args) {
                for (var i of gens()) {
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
            gens = [this, ...gens.map(Sequences.toGenerator)];
            return function* (...args) {
                var iters = gens.map(gen => gen(...args));
                while (true) {
                    const nexts = iters.map(iter => iter.next());
                    if (nexts.some(r => r.done)) {
                        return;
                    }
                    yield nexts.map(r => r.value);
                }
            };
        }),
        tee: writable(function (...args) {
            Sequences.toGenerator(args).filter(arg => typeof arg === 'function').forEach(arg => arg(this));
            return this;
        }),
        indexOf: writable(function (value, fromIndex, ...args) {
            return this
                .bind(this, ...args)
                .combine(Sequences.numbers())
                .skip(fromIndex)
                .filter(v => v[0] === value)
                .head()
                .reduce((r, v) => v[1], -1);
        }),
        use: writable(function (callback, ...args) {
            return callback(this(...args));
        })
    });
}(Sequences || (Sequences = {})));
