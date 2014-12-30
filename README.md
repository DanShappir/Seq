# Sequences
## Iteration methods for ES6 (JavaScript) Generators / Iterators
Having played with ES6 generators and iterators, it occured to me that their designers are not fans of functional programming. Otherwise how can you explain the total lack of iteration functions, and the complete reliance on various incarnations of the *for* loop. But JavaScript is a highly malleable Programming Language, so I decided to add them myself. The result is the Sequences library that allows you to write code such as:
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

1. If the argument is an object that has a method that returns an iterator, e.g. an array, obtains an iterator and uses it for the generator
2. If the argument is a generator, just returns it
3. If the argument is a function, uses that function to generate the values of the genetor by invoking it every time a new value is required. A second, optional argument specifies a seed value for the initial function invocation
4. If the argument is a collection (has a numeric length property) creates a generator that yields the collection elements in order. A second, optional argument spcifies that index of the element to start on
5. If the argument is itself an iterator, uses that iterator for the generator
6. If the argument is a regular objects, iterates over the objects properties and yields the name / value pairs
7. Otherwise creates a simple generator that yields the provided argument
 
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
