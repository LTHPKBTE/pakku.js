/**
 * Clones an object from a privileged scope into a less-privileged scope.
 * This is a Firefox-specific API for WebExtensions.
 *
 * @param obj The object to clone.
 * @param targetScope The window object of the target scope.
 * @param options Optional cloning options.
 * @returns The cloned object in the target scope.
 */
declare function cloneInto<T>(obj: T, targetScope: Window, options?: {
  cloneFunctions?: boolean;
  wrapReflectors?: boolean;
}): T;
