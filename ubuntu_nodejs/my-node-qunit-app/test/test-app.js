const { add, subtract } = require('../app');
const QUnit = require('qunit');

QUnit.module('Math Functions');

QUnit.test('add() should return the sum of two numbers', assert => {
  assert.equal(add(2, 3), 5, '2 + 3 should equal 5');
});

QUnit.test('subtract() should return the difference of two numbers', assert => {
  assert.equal(subtract(5, 3), 2, '5 - 3 should equal 2');
});

QUnit.test('subtract() should return the difference of two numbers', assert => {
  assert.equal(subtract(2, 3), 2, '5 - 3 should equal 2');
});