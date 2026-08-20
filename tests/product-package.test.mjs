import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expandCartPackages,
  normalizeProductPackage,
  ProductPackageValidationError,
} from '../lib/catalog/product-package.ts';

const validPackage = {
  net_weight_grams: 720,
  package_length_cm: 28,
  package_width_cm: 20,
  package_height_cm: 4,
};

test('normalizes valid product package data', () => {
  assert.deepEqual(normalizeProductPackage(validPackage), {
    weight: 720,
    length: 28,
    width: 20,
    height: 4,
  });
});

test('preserves decimal centimetre measurements without rounding', () => {
  assert.deepEqual(
    normalizeProductPackage({
      ...validPackage,
      package_length_cm: '28.5',
      package_width_cm: '20.25',
    }),
    { weight: 720, length: 28.5, width: 20.25, height: 4 }
  );
});

test('rejects a missing dimension', () => {
  assert.throws(
    () => normalizeProductPackage({ ...validPackage, package_width_cm: '' }),
    ProductPackageValidationError
  );
});

test('rejects zero, negative, non-finite, and over-precision dimensions', () => {
  for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, '28.555']) {
    assert.throws(
      () => normalizeProductPackage({ ...validPackage, package_height_cm: value }),
      ProductPackageValidationError
    );
  }
});

test('rejects missing or invalid physical weight', () => {
  for (const value of ['', 0, -1, 720.5]) {
    assert.throws(
      () => normalizeProductPackage({ ...validPackage, net_weight_grams: value }),
      ProductPackageValidationError
    );
  }
});

test('expands quantity into one independent package per unit', () => {
  const packages = expandCartPackages([{ ...validPackage, quantity: 3 }]);
  assert.equal(packages.length, 3);
  assert.deepEqual(packages[0], packages[1]);
  assert.notEqual(packages[0], packages[1]);
});

test('does not use legacy inventory weight or invent dimensions', () => {
  const packageWithLegacyWeight = {
    ...validPackage,
    weight_kg: 99,
  };
  assert.equal(normalizeProductPackage(packageWithLegacyWeight).weight, 720);
  assert.throws(
    () => normalizeProductPackage({ net_weight_grams: 720 }),
    ProductPackageValidationError
  );
});
