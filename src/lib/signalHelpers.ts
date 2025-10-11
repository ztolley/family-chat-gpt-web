import { Signal } from "@lit-labs/signals";

// Shared watcher that batches effects on the next microtask, following the
// approach recommended in the signal-polyfill documentation.
let needsEnqueue = true;
const watcher = new Signal.subtle.Watcher(() => {
  if (needsEnqueue) {
    needsEnqueue = false;
    queueMicrotask(processPending);
  }
});

function processPending() {
  needsEnqueue = true;
  for (const pending of watcher.getPending()) {
    pending.get();
  }
  watcher.watch();
}

export function effect(callback: () => void | (() => void)) {
  let cleanup: void | (() => void);

  const computed = new Signal.Computed(() => {
    if (typeof cleanup === "function") {
      cleanup();
    }
    const result = callback();
    cleanup = typeof result === "function" ? result : undefined;
  });

  watcher.watch(computed);
  computed.get();

  return () => {
    watcher.unwatch(computed);
    if (typeof cleanup === "function") {
      cleanup();
    }
    cleanup = undefined;
  };
}
