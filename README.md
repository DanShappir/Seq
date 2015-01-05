# Sequences
## Iteration methods for ES6 (JavaScript) Generators / Iterators
Having played with ES6 generators and iterators, it occured to me that their designers are not big fans of functional programming. Otherwise how can you explain the total lack of iteration functions, and the significant reliance on various incarnations of the *for* loop. But JavaScript is a highly malleable Programming Language, so I decided to add them myself. The result is the Sequences library that allows you to write code such as:
```javascript
function* numbers() {
  var n = 0;
  while (true) {
    yield n++;
  }
}
numbers.map(function (v) { return 2 * v; }).head(10).forEach(function (v) { console.log(v); });
```
To list the first ten even numbers. Or alternatively:
```javascript
Sequences.numbers.filter((v) => v % 2).head(10).forEach(console.log.bind(console));
```
assuming support for arrow functions. Now isn't that nice!

As an interesting sideeffect, the Sequences library essentially eliminates the need for iterators, since all the iteration methods are applied directly on the generators.

## Installation
Simply use [Bower](http://bower.io/):

1. Install Bower: *npm install -g bower*
2. Install the package: *bower install sequences*
3. Referrence the file: *bower_components/sequences/js/sequences.js*

## API
The majority of the services provides by the Sequences library are accessed as iteration methods implemented on the generator prototype. This means the services are available as methods you can invoke directly on generator instances. Since most of these methods return a referrence to the generator instance they were invoked on, they can be chained together. In addition, several service functions are provided in the *Sequences* name space.

### Sequences.isGenerator()
This function accepts a single argument, and returns *true* if that argument is a generator, and *false* otherwise.
```javascript
function* generator() {
  yield 'hello';
}
console.log(Sequences.isGenerator(generator)); // true
console.log(Sequences.isGenerator('world')); // false
```

### Sequences.toGenerator()
This function accepts a single argument, and transforms that argument into an appropriate generator. The following transformations rules are applied, in order:

1. If the argument is an iterator, create a generator for it (yield*)
2. If the argument is already a generator, just return it
3. If the argument is an object that has a method that returns a generator, e.g. an array, obtain the generator and return it
4. If the argument is a function, use that function to generate the values of the genetor by invoking it every time a new value is required. A second, optional argument specifies a seed value for the initial function invocation
5. If the argument is a collection (has a numeric length property) create a generator that yields the collection elements in order. A second, optional argument spcifies that index of the element to start on
6. Otherwise create a simple generator that yields the provided argument
 
Using *Sequences.toGenerator* enables you to apply the iteration methods on any type of element, for example:
```javascript
function sumNumbers() {
  return Sequences.toGenerator(arguments)
    .filter(function (arg) { return typeof arg === 'number'; })
    .reduce(function (sum, arg) { return sum + arg; }, 0);
}
console.log(sumNumbers(1, 2, 'hello', 3)); // outputs 6
```

### Sequences.numbers()
Helper function that returns a generator that emits a sequence of integers, by default 0, 1, 2, ... You can optionaly specify a start value as a first argument. By default the start value is 0. You can also specify a step size. By default the step size is 1.
```javascript
console.log(Sequences.numbers(2, 2).head(5).toArray()); // outputs [2, 4, 6, 8, 10]
```
The generator returned by *Sequences.numbers* can also receive an initial value and a step value. If specified, these values override any initial values provided to *Sequences.numbers* itself.

### Filters
Several of the API methods accept a filter argument. Often this will be a regular function (not a generator), in which case a second argument can specify the *this* value for that function. In this scenario, the specified filter works much the same way as callbacks provided to array iteration methods.
```javascript
Sequences.numbers().head(10).filter(function (v) { return v % 2; }).
```
If a specified filter argument is not a function, or is a generator function, a filter function will be automatically synthesized from it, using the following process:

1. Use *Sequences.toGenerator* to transform the the argument into a generator
2. Synthesize a function taking a single argument
3. That function searches for the given argument value in the sequence generated from the generator created in step #1
4. If value is found return *true*, otherwise return *false*
5. Use the Synthesized function as the filter function (ignoring a *this* value, if specified)

For example:
```javascript
g.until(['done', 'finished', 'end']).forEach(console.log.bind(console));
```
will display all the values provided by generator *g*, until *g* generates one of the strings 'done', 'finished', or 'end'.

**Note:** be careful when using a generator or an iterator as a filter. Since the value is comparde to every item in the sequence until a match is found, the may cause an infinite loop if the sequence is not delimited.

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
generator.head(42).forEach(function (v) { console.log(v); }, null, 5); // 5, 6, 7, ...
```
*5* is the initialization parameter that is ultimately passed to *generator*. (The preceeding *null* is the *this* value for the filter function.)

Since binding a generator returns a generator, the *bind* method can also be used to achieve the same effect:
```javascript
generator.head(42).bind(null, 5).forEach(function (v) { console.log(v); }); // 5, 6, 7, ...
```

## Iteration methods
# forEach
