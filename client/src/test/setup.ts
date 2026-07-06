import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// React Testing Library's automatic cleanup only self-registers if it finds a
// global `afterEach` (i.e. when vitest's `test.globals: true` is set). Since
// our test files import `describe`/`it`/`expect` explicitly instead of relying
// on globals, we register cleanup here ourselves so each test starts with a
// fresh DOM instead of accumulating markup from previous tests in the file.
afterEach(() => {
  cleanup();
});
