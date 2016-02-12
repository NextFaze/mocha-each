import assert from 'power-assert';
import sinon from 'sinon';
import itEach from '../lib';

/** @test {itEach} */
describe('itEach()', () => {
  const mochaIt = it;
  let _it = null;

  beforeEach(() => {
    _it = sinon.spy();
    global.it = mochaIt;
  });

  it('uses global `it` automatically', () => {
    global.it = _it;
    itEach('', [0], () => {});
    assert(_it.calledOnce);
  });

  it('accepts a fourth argument which specifies `it` explicitly', () => {
    itEach('', [0], () => {}, _it);
    assert(_it.calledOnce);
  });

  context('without Mocha', () => {
    it('throws an error when called', () => {
      delete global.it;
      assert.throws(() => {
        itEach('', [0], () => {});
      }, /is not a function/);
    });
  });

  context('without test name', () => {
    it('defines tests using a default test name', () => {
      const params = ['foo', 'bar', 'baz'];
      itEach(params, () => {}, _it);
      assert.deepEqual(
         _it.args.map(a => a[0]),
        params.map(p => `handles ${JSON.stringify(p)}`)
      );
    });
  });

  context('with string test name', () => {
    it('defines test names using the specified name and each parameter', () => {
      const params = [0, 1, 2, 3];
      itEach('test name', params, () => {}, _it);
      assert.deepEqual(
        _it.args.map(a => a[0]),
        params.map(p => `test name ${JSON.stringify(p)}`)
      );
    });
  });

  context('with function test name', () => {
    it('calls the function and defines tests using its return value', () => {
      const params = [4, 8, 12, 16];
      const makeTitle = p => `generated ${p / 2}`;
      itEach(makeTitle, params, () => {}, _it);
      assert.deepEqual(
        _it.args.map(a => a[0]),
        params.map(makeTitle)
      );
    });
  });

  context('with empty parameters', () => {
    it('defines no test cases', () => {
      itEach('', [], () => {}, _it);
      assert(! _it.calledOnce);
    });
  });

  context('with valid parameters', () => {
    it('defines the same number of test cases as the parameters', () => {
      const params = [0, 1, 2, 3, 4, 5];
      itEach('', params, () => {}, _it);
      assert.equal(_it.callCount, params.length);
    });

    it('gives each parameter as arguments to the test function', () => {
      const params = [
        [0, 1, 2],
        [[2, 4, 6], 40.5],
        [[1, 2, 3], [4, 5, 6]],
        ['foo', 'bar'],
        ['name', { a: 1, b: 1, c: 1 }, {n: []}],
        [null, undefined, undefined, false]
      ];
      const test = sinon.spy();
      itEach('', params, test, (name, body) => body());
      assert.deepEqual(test.args, params);
    });

    context('which is an array of non-array values', () => {
      it('passes each parameter as a first argument', () => {
        const params = [0, 1, 2, 3];
        const test = sinon.spy();
        itEach('', params, test, (name, body) => body());

        const expectedArgs = params.map(p => [p]);
        assert.deepEqual(test.args, expectedArgs);
      });
    });
  });

  context('with invalid arguments', () => {
    context('like wrong numbers of arguments', () => {
      it('throws an error', () => {
        [
          [],
          [''],
          ['', [], () => {}, 1, 2]
        ].forEach(args => {
          assert.throws(() => {
            itEach(...args);
          }, /itEach:/);
        });
      });
    });
  });

  context('for asynchronous test', () => {
    context('when the testBody takes an additional argument', () => {
      it('gives a `done` callback used for asynchronous code', () => {
        let args;
        const resolve = () => {};
        itEach('', [[1, 2]],
          (one, two, done) => args = [one, two, done],
          (name, body) => body(resolve)
        );
        assert.deepEqual(args, [1, 2, resolve]);
      });
    });

    context('when the lengths of parameters are different', () => {
      context('if any param is many more than the arguments', () => {
        it('gives a `done` callback', () => {
          let args = [];
          const resolve = () => {};
          itEach('', [[1, 2], [3, 4, 5], [6]],
           (a, b, c, done) => args.push([a, b, c, done]),
           (name, body) => body(resolve)
          );
          assert.deepEqual(args, [
            [1, 2, resolve, undefined],
            [3, 4, 5, resolve],
            [6, resolve, undefined, undefined]
          ]);
        });
      });

      context('otherwise', () => {
        it('does not give a `done` callback', () => {
          let args = [];
          itEach('', [[1, 2], [3, 4, 5, 6], [7]],
           (a, b, c, d) => args.push([a, b, c, d]),
           (name, body) => body( () => {} )
          );
          assert.deepEqual(args, [
            [1, 2, undefined, undefined],
            [3, 4, 5, 6],
            [7, undefined, undefined, undefined]
          ]);
        });
      });
    });
  });

  /** @test {itEach.only} */
  describe('.only()', () => {
    const mochaDescribe = describe;
    let _describe;

    beforeEach(() => {
      _describe = sinon.spy();
      _describe.only = sinon.spy();
      global.describe = _describe;
    });

    afterEach(() => {
      global.describe = mochaDescribe;
    });

    it('creates a nameless test suite', () => {
      itEach.only('', [0], () => {}, _it);
      const testSuiteName = _describe.only.args[0][0];
      assert.equal(testSuiteName, '');
    });

    it('creates a test suite using its `.only()` method', () => {
      const _descOnly = _describe.only;
      const params = [0, 1, 2, 3];
      itEach.only('', params, () => {}, _it);

      assert.deepEqual(
        [_descOnly.callCount, _it.callCount],
        [1, 0]
      );
      assert.deepEqual(
        _descOnly.args[0].map(a => typeof a),
        ['string', 'function']
      );

      const runTestSuite = _descOnly.args[0][1];
      runTestSuite();

      assert.equal(_it.callCount, params.length);
      assert.equal(_describe.callCount, 0);
    });
  });

  /** @test {itEach.skip} */
  describe('.skip()', () => {
    beforeEach(() => _it.skip = sinon.spy());
    afterEach(() => delete _it.skip);

    it('defines each test case using `it.skip()` method', () => {
      const params = [0, 1, 2, 3];
      const makeTestName = p => `test for ${p}`;
      itEach.skip(makeTestName, params, () => {}, _it);

      assert.deepEqual(
        _it.skip.args.map(a => a[0]),
        params.map(makeTestName)
      );
    });
  });
});
