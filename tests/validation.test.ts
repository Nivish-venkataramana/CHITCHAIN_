import { validateCircleParams, toBaseUnits, fromBaseUnits } from "../lib/validation";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log("▶ Running Unit Tests for ChitChain Circle Validation Rules...");

// 1. Test N=5 duration rules
{
  const testD4 = validateCircleParams({
    name: "Test Chit",
    numPeople: 5,
    monthlyAmount: "1000",
    durationMonths: 4,
  });
  assert(testD4.valid === true, "N=5, D=4 should be valid (N - 1)");

  const testD3 = validateCircleParams({
    name: "Test Chit",
    numPeople: 5,
    monthlyAmount: "1000",
    durationMonths: 3,
  });
  assert(testD3.valid === true, "N=5, D=3 should be valid (N - 2)");

  const testD2 = validateCircleParams({
    name: "Test Chit",
    numPeople: 5,
    monthlyAmount: "1000",
    durationMonths: 2,
  });
  assert(testD2.valid === false, "N=5, D=2 should be invalid");

  const testD5 = validateCircleParams({
    name: "Test Chit",
    numPeople: 5,
    monthlyAmount: "1000",
    durationMonths: 5,
  });
  assert(testD5.valid === false, "N=5, D=5 should be invalid");
}

// 2. Test N=2 edge cases
{
  const testN2D1 = validateCircleParams({
    name: "Trio Chit",
    numPeople: 2,
    monthlyAmount: "500",
    durationMonths: 1,
  });
  assert(testN2D1.valid === true, "N=2, D=1 should be valid (N - 1)");

  const testN2D0 = validateCircleParams({
    name: "Trio Chit",
    numPeople: 2,
    monthlyAmount: "500",
    durationMonths: 0,
  });
  assert(testN2D0.valid === false, "N=2, D=0 should be invalid");

  const testN2D2 = validateCircleParams({
    name: "Trio Chit",
    numPeople: 2,
    monthlyAmount: "500",
    durationMonths: 2,
  });
  assert(testN2D2.valid === false, "N=2, D=2 should be invalid");
}

// 3. Test Amount & Base Unit conversion
{
  assert(toBaseUnits("1000") === "1000000000", "1000 USDC must be 1000000000 base units");
  assert(toBaseUnits("0.5") === "500000", "0.5 USDC must be 500000 base units");
  assert(fromBaseUnits("1000000000") === "1000", "1000000000 base units must format to 1000");

  const testZeroAmount = validateCircleParams({
    name: "Zero Amount Chit",
    numPeople: 4,
    monthlyAmount: "0",
    durationMonths: 3,
  });
  assert(testZeroAmount.valid === false, "Amount 0 should be invalid");

  const testNegAmount = validateCircleParams({
    name: "Negative Amount Chit",
    numPeople: 4,
    monthlyAmount: "-100",
    durationMonths: 3,
  });
  assert(testNegAmount.valid === false, "Negative amount should be invalid");
}

// 4. Test Name requirement
{
  const testEmptyName = validateCircleParams({
    name: "",
    numPeople: 4,
    monthlyAmount: "1000",
    durationMonths: 3,
  });
  assert(testEmptyName.valid === false, "Empty name should be invalid");
}

console.log("✔ All ChitChain Circle Validation Unit Tests PASSED Successfully!");
