# Sequences
## Iteration methods for ES6 (JavaScript) Generators / Iterators
After trying out ES6 generators and iterators, it occurred to me that their designers are not big fans of functional programming. Otherwise how can you explain the total lack of iteration functions, and the significant reliance on various incarnations of the *for* loop. But JavaScript is a highly malleable Programming Language, so I decided to add them myself. The result is the **Sequences** library that allows you to write code such as:
```javascript
function* numbers() {
  var n = 0;
  while (true) {
    yield n++;
  }
}
numbers.map(v => 2 * v).head(10).forEach(v => console.log(v));
```
To list the first ten even numbers. Or alternatively:
```javascript
numbers.filter(v => v % 2).head(10).forEach(console.log.bind(console));
```
Now isn't that nice!

As an interesting side-effect, the **Sequences** library essentially eliminates the need for explicitly using iterators, since all the iteration methods are applied directly on the generators.

## Installation
Simply use [Bower](http://bower.io/):

1. Install Bower: *npm install -g bower*
2. Install the package: *bower install sequences*
3. Referrence the file: *bower_components/sequences/js/sequences.js*

For testing purposes, you can simply add the following script URL to your HTML file: [//rawgit.com/DanShappir/Sequences/master/js/sequences.js](//rawgit.com/DanShappir/Sequences/master/js/sequences.js).

## API
The majority of the services provides by the **Sequences** library are accessed as iteration methods implemented on the generator prototype. This means the services are available as methods you can invoke directly on generator instances. Since most of these methods also return a generator instance, they can be chained together. In addition, several service functions are provided in the *Sequences* namespace.

### Sequences.toGenerator(source[, initialValue])
This function accepts a single argument *source*, and transforms it into an appropriate generator. The following transformations rules are applied, in order:

1. If the argument has an iterator, create a generator for the iterator (yield\*)
2. If the argument is already a generator, just return it
3. If the argument is a function, create a generator that repeatdely invokes this function
4. If the argument is a collection that doesn't have an iterator, create a generator that loops over the elements
5. Otherwise create a simple generator that yields the provided argument
 
Using *Sequences.toGenerator* enables you to apply the iteration methods on most any type of element, for example:
```javascript
const sumNumbers = (...args) => {
  return Sequences.toGenerator(args)
    .filter(arg => typeof arg === 'number')
    .reduce((sum, arg) => sum + arg, 0);
};
console.log(sumNumbers(1, 2, 'hello', 3)); // outputs 6
```

### Sequences.numbers([initialValue[, step])
Helper function that returns a generator that emits a sequence of numbers, by default 0, 1, 2, ... You can optionally specify a start value as the *initialValue* first argument. By default the start value is 0. You can also specify a step size. By default the step size is 1.
```javascript
console.log(Sequences.numbers(2, 2).head(5).toArray()); // outputs [2, 4, 6, 8, 10]
```
The generator returned by *Sequences.numbers* can also receive an initial value and a step value. If specified, these values override any initial values provided to *Sequences.numbers* itself.

### Sequences.toFilter(value)
Several of the API methods accept a filter argument. Often this will be a regular function (not a generator), in which case the specified filter works much the same way as callbacks provided to array iteration methods.
```javascript
Sequences.numbers().head(10).filter((v) => v % 2).forEach((v) => console.log(v));
```
In addition, filters that are not functions are also supporting, using the *Sequences.toFilter* helper function. This function is used to synthesize filters from additional types, using the following process:

1. If the argument is a regular function (not a generator) then use it as described above
2. Otherwise use *Sequences.toGenerator* to create a generator from the argument
3. Create a filter function using that generator that tries to match its argument to all the generated values

For example:
```javascript
g.until(['done', 'finished', 'end']).forEach(console.log.bind(console));
```
will display all the values provided by generator *g*, until *g* generates one of the strings 'done', 'finished', or 'end'.

**Note:** be careful when using a generator or an iterator as a filter. Since the value is compared to every item in the sequence until a match is found, the may cause an infinite loop if the sequence is not delimited.

### Initialization
Generators can receive arguments, just like a regular function, and use these arguments to calculate the generated sequence, for example:
```javascript
function* generator(init) {
  var v = init || 0;
  while (true) {
    yield v++;
  }
}
var iter1 = generator(1); // 1, 2. 3, ...
var iter2 = generator(3); // 3, 4, 5, ...
```
The iteration methods allow passing initialization parameters as extra arguments, for example:
```javascript
generator.head(42).forEach(v => console.log(v), null, 5); // 5, 6, 7, ...
```
*5* is the initialization parameter that is ultimately passed to *generator*. (The preceding *null* is the *this* value for the filter function.)

Since binding a generator returns a generator, the *bind* method can also be used to achieve the same effect:
```javascript
generator.head(42).bind(null, 5).forEach((v) => console.log(v)); // 5, 6, 7, ...
```

## Iteration methods
### isGenerator()
Polyfill for a method that is currently only available in Firefox. returns *true* invoked for a generator, and *false* otherwise. Unlike standard behavior in Firefox, this implementation of isGenerator also return true for bound generators.
```javascript
function* generator() {
  yield 'hello';
}
console.log(generator.isGenerator()); // true
console.log((function () {}).isGenerator()); // false
```

### forEach(callback[, generatorInitialization...])
Invoke the specified callback function for every item in the sequence. The callback receives the current item as an argument. If the callback returns a value, that value is provided back to the generator as the result of the *yield* instruction. Any additional optional arguments will be provided as arguments to the generator.
```javascript
Sequences.numbers().head(5).forEach(v => console.log(v), null, 2); // 2, 3, 4, 5, 6
```
**Note:** since *forEach* cannot stop the iteration, do not use it with undelimited generators with it. Instead use methods such as *head* and *until* to limit the sequence.

### until(filter[, generatorInitialization...])
Creates a generator that emits all the provided values until the specified *filter* returns *true* (see [filters](#filters) section for details). If you pass arguments to the created generator, they will be passed on as-is to the original generator.
```javascript
Sequences.numbers().until(v => v > 3).forEach(v => console.log(v)); // 0, 1, 2, 3
```

### asLongAs(filter[, generatorInitialization...])
Creates a generator that emits all the provided values as-long-as the specified *filter* returns *true* (see [filters](#filters) section for details). If you pass arguments to the created generator, they will be passed on as-is to the original generator.

### head([length])
Creates a generator that emits the first *length* provided items. If *length* is omitted then *1* is used. If you pass arguments to the created generator, they will be passed on as-is to the original generator.

### filter(filter)
Creates a generator that emits all the provided items for which the specified *filter* returns *true* (see [filters](#filters) section for details). If you pass arguments to the created generator, they will be passed on as-is to the original generator.
```javascript
Sequences.numbers().filter(v => v % 2 === 0).head(5).forEach(v => console.log(v)); // 0, 2, 4, 6, 8
```

### exclude(filter)
Creates a generator that emits all the provided items for which the specified *filter* does **not** return *true* (see [filters](#filters) section for details). If you pass arguments to the created generator, they will be passed on as-is to the original generator.

### skip(filter)
Creates a generator that emits all the provided items after the specified items are skipped. If the value provided as *filter* is a number then that number of items are skipped. Otherwise that value is used as a filter (see [filters](#filters) section for details). If you pass arguments to the created generator, they will be passed on as-is to the original generator.
```javascript
Sequences.numbers().skip(3).head(5).forEach(v => console.log(v)); // 3, 4, 5, 6, 7
```

### map(callback)
Creates a generator that emits all the provided items as transformed by applying the *callback* function to them. The callback receives the current item as an argument. In addition to the current item, the callback receives as a second argument the value provided by the requesting iterator.
```javascript
Sequences.numbers().map(v => -v).head(5).forEach(v => console.log(v)); // 0, -1, -2, -3, -4
```

### inverseMap(map)
Creates a generator that emits all the provided items as-is, but transforms values returned to the generator by applying the *callback* function to them. The callback receives the value to be returned to the generator as an argument. In addition, the callback receives as a second argument the original value provided by the source generator.

### flatten([depth])
Converts a generator that also emits sequences (collections, generators and iterators), into a generator of simple values. The optional numeric depth argument specifies the level of flattening recursion. If not specified then a value of 0 is used, which means no recursion. For unlimited recursion specify a negative value.
```javascript
Sequences.toGenerator([1,[2,[3,[4,5]]]]).flatten(-1).forEach(v => console.log(v)); // 1, 2, 3, 4, 5
```

### loop([times])
Given a generator that emits a finite sequence, creates a generator that loops over the sequence specified number of *times*. If *times* isn't specified, the created generator will loop forever.
```javascript
Sequences.toGenerator([1,2,3]).loop().head(10).forEach(v => console.log(v)); // 1, 2, 3, 1, 2, 3, 1, 2, 3, 1
```

### concat([s1 [, s2 [, s3 ...]]])
Creates a generator that is the concatenation of the provided items and all the sequences provided as arguments.
```javascript
Sequences.toGenerator([1,2,3]).concat(Sequences.toGenerator([7,8,9])).forEach(v => console.log(v)); // 1, 2, 3, 7, 8, 9
```

### reduce(callback [, seed])
Similar to *Array.reduce* converts a sequence into a value by applying the callback function to previous result and the current element. The optional seed value specifies the result value to pass to the first callback invocation. If not specified *undefined* is used.
```javascript
Sequences.numbers().head(4).reduce((r, v) => r + v) // 6
```
**Note:** since *reduce* cannot stop the iteration, do not use it with undelimited generators with it. Instead use methods such as *head* and *until* to limit the sequence.

### combine([s1 [, s2 [, s3 ...]]])
Creates a generator whose elements are arrays of the provided items and the items of all the sequences provided as arguments. Stops as soon as any of the input sequences is done.

### tee ([f1 [, f2 [, f3 ...]]])
Feeds the given sequence into the functions specified as arguments
```javascript
const isOdd = v => v % 2;

Sequences.numbers().skip(10).head(10)
    .tee(g => g.filter(isOdd).forEach(show)) // 11, 13, 15, 17, 19
    .exclude(isOdd).forEach(show); // 10, 12, 15, 16, 18
```

### indexOf(value[, fromIndex])
Returns that index of the first item in the sequence that matches the given value, otherwise returns -1 if the value doesn't appear in the sequence. Optionally specify the index of the first item from which to start searching for the value.

**Note:** since *indexOf* only stops when the value is found, be careful when using it with undelimited generators.

### use(callback)
Creates an iterator for the given generator, and passes it as an argument to the specified callback. The result is the return value of the callback.
```javascript
var m = Sequences.numbers(1).head(10).combine(Sequences.numbers(-1, -1)).use(i => new Map(i)); // map: 1 -> -1, 2 -> -2, ...
```
