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
Assuming support for arrow functions.
