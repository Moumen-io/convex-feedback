/**
 * Close a routed detail/form screen without assuming it was opened from an
 * in-app stack. Normal navigation still pops the current screen; a cold link
 * is replaced with the caller-provided board route instead.
 */
export function goBackOrReplace<THref>(
  router: {
    canGoBack(): boolean;
    back(): void;
    replace(href: THref): void;
  },
  fallback: THref,
): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
