// Phase 2 of the compression pipeline. The implementation lives in core
// (packages/core/src/optimize/boilerplate.ts) since the pipeline's OPTIMIZE
// stage runs the same strip on every document conversion.
export { stripBoilerplate, type StripResult } from "@prompt2md/core";
