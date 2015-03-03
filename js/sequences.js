var Sequences;
(function (Sequences) {
    'use strict';

    var iterSymbol = self.Symbol ? self.Symbol.iterator : "@@iterator";
    var slice = Array.prototype.slice;

    function writable(value) {
        return {
            writable: true,
            value: value
        };
    }

    function numericArg(arg, def) {
        var result = Number(arg);
        return isNaN(result) ? def : result;
    }

    Object.defineProperties(Sequences, {
        numbers: writable(function (initialValue, step) {
            return function* numbers(initialValue_, step_) {
                var n = initialValue_ || initialValue || 0;
                var s = step_ || step || 1;
                while (true) {
                    yield n;
                    n += s;
                }
            };
        }),
        isGenerator: writable(function isGenerator(candidate) {
            return typeof candidate === 'function' && Object.getPrototypeOf(candidate) === proto;
        }),
        toGenerator: writable(function toGenerator(source, initialValue) {
            if (source) {
                if (typeof source.next === 'function') { // source is an iterator
                    return function* generatorFromIterator() {
                        yield* source;
                    };
                }
                if (typeof source === 'object' && iterSymbol in source) { // source has an iterator
                    return function* generatorFromFunction2() {
                        yield* source[iterSymbol]();
                    };
                }
                if (Sequences.isGenerator(source)) {
                    return source;
                }
                if (typeof source === 'function') {
                    return Object.setPrototypeOf(source, proto);
                }
                if (typeof source.length === 'number') {
                    return function* generatorFromCollection() {
                        var i = initialValue || 0;
                        for (; i < source.length; ++i) {
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
            return typeof value === 'function' && !Sequences.isGenerator(value) ?
                value :
                function (v) {
                    return this
                        .filter(function(x) { return x === v; })
                        .head(1)
                        .reduce(function () { return true; }, false);
                }.bind(Sequences.toGenerator(value));
        })
    });

    var proto = Object.getPrototypeOf(Sequences.numbers());

    function not(func) {
        return function () {
            return !func.apply(this, arguments);
        }
    }

    (function () {
        var numbers = Sequences.numbers.bind();
        if (!Sequences.isGenerator(numbers)) {
            var origBind = Sequences.numbers.bind;
            Object.defineProperty(proto, 'bind', {
                writable: true,
                value: function bind() {
                    return Object.setPrototypeOf(origBind.apply(this, arguments), proto);
                }
            });
        }
    }());

    Object.defineProperties(proto, {
        forEach: writable(function forEach(callback) {
            var r, i = this.apply(null, slice.call(arguments, 1));
            while (true) {
                var x = i.next(r);
                if (x.done) {
                    break;
                }
                r = callback(x.value);
            }
        }),
        until: writable(function until(filter) {
            var callback = Sequences.toFilter(filter);
            return function* () {
                var r, i = this.apply(null, arguments);
                while (true) {
                    var x = i.next(r);
                    if (x.done || callback(x.value, r) === true) {
                        break;
                    }
                    r = yield x.value;
                }
            }.bind(this);
        }),
        asLongAs: writable(function asLongAs(filter) {
            return this.until(not(Sequences.toFilter(filter)));
        }),
        head: writable(function head(length) {
            length || (length = 1);
            return function* () {
                var r, i = this.apply(null, arguments);
                for (var counter = 0; counter < length; ++counter) {
                    var x = i.next(r);
                    if (x.done) {
                        break;
                    }
                    r = yield x.value;
                }
            }.bind(this);
        }),
        filter: writable(function filter(filter) {
            var callback = Sequences.toFilter(filter);
            return function* () {
                for (var i of this.apply(null, arguments)) {
                    if (callback(i)) {
                        yield i;
                    }
                }
            }.bind(this);
        }),
        exclude: writable(function exclude(filter) {
            return this.filter(not(Sequences.toFilter(filter)));
        }),
        skip: writable(function skip(filter) {
            return typeof filter === 'number' ?
                function* (number) {
                    var iter = this.apply(null, slice.call(arguments, 1));
                    var counter = 0;
                    for (var i of iter) {
                        if (++counter > number) {
                            yield i;
                            break;
                        }
                    }
                    yield* iter;
                }.bind(this, filter) :
                function* (callback) {
                    var iter = this.apply(null, slice.call(arguments, 1));
                    for (var i of iter) {
                        if (!callback(i)) {
                            yield i;
                            break;
                        }
                    }
                    yield* iter;
                }.bind(this, Sequences.toFilter(filter));
        }),
        map: writable(function map(callback) {
            return function* () {
                var r, i = this.apply(null, arguments);
                while (true) {
                    var x = i.next(r);
                    if (x.done) {
                        break;
                    }
                    r = yield callback(x.value, r);
                }
            }.bind(this);
        }),
        inverseMap: writable(function map(callback) {
            return function* () {
                var r, i = this.apply(null, arguments);
                while (true) {
                    var x = i.next(r);
                    if (x.done) {
                        break;
                    }
                    r = callback(yield x.value, x.value);
                }
            }.bind(this);
        }),
        flatten: writable(function flatten(depth) {
            depth = numericArg(depth, 0);
            return function* () {
                for (var i of this.apply(null, arguments)) {
                    var generator = Sequences.toGenerator(i);
                    if (depth === 0 || generator().next().value === i) {
                        yield i;
                    } else {
                        yield* generator.flatten(depth - 1).apply(null, arguments);
                    }
                }
            }.bind(this);
        }),
        loop: writable(function loop(times) {
            times = numericArg(times, Infinity);
            return function* () {
                for (var i = 0; i < times; ++i) {
                    yield* this.apply(null, arguments);
                }
            }.bind(this);
        }),
        concat: writable(function concat() {
            var args = Sequences.toGenerator(arguments).map(Sequences.toGenerator);
            return function* () {
                yield* this.apply(null, arguments);
                for (var i of args()) {
                    yield* i.apply(null, arguments);
                }
            }.bind(this);
        }),
        reduce: writable(function reduce(callback, r) {
            var i = this.apply(null, slice.call(arguments, 2));
            while (true) {
                var x = i.next(r);
                if (x.done) {
                    break;
                }
                r = callback(r, x.value);
            }
            return r;
        }),
        combine: writable(function combine() {
            var generators = Sequences.toGenerator(arguments).map(Sequences.toGenerator);
            return function* () {
                var args = slice.call(arguments);
                var iters = generators.map(function (g) { return g.apply(null, args); }).toArray();
                iters.unshift(this.apply(null, args));
                while (true) {
                    var nexts = iters.map(function (i) { return i.next(); });
                    if (nexts.some(function (r) { return r.done; })) {
                        return;
                    }
                    yield nexts.map(function (r) { return r.value; });
                }
            }.bind(this);
        }),
        tee: writable(function tee() {
            Sequences.toGenerator(arguments).filter(function (arg) {
                return typeof arg === 'function';
            }).forEach(function (arg) {
                arg(this);
            }.bind(this));
            return this;
        }),
        indexOf: writable(function indexOf(value, fromIndex) {
            return this
                .bind.apply(this, slice.call(arguments, 2))
                .combine(Sequences.numbers())
                .skip(fromIndex)
                .filter(function (v) { return v[0] === value; })
                .head()
                .reduce(function (r, v) { return v[1]; }, -1);
        }),
        toArray: writable(function toArray() {
            return this
                .bind.apply(this, slice.call(arguments))
                .reduce(function (a, v) { return a.push(v), a; }, []);
        }),
        use: writable(function use(callback) {
            return callback(this.apply(null, slice.call(arguments, 1)));
        })
    });
}(Sequences || (Sequences = {})));
