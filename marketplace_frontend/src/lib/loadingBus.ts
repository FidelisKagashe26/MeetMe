// src/lib/loadingBus.ts
type Listener = (isLoading: boolean) => void;

let listeners: Listener[] = [];
let activeCount = 0;

export const startGlobalLoading = () => {
  activeCount += 1;
  notify();
};

export const stopGlobalLoading = () => {
  activeCount = Math.max(0, activeCount - 1);
  notify();
};

const notify = () => {
  const isLoading = activeCount > 0;
  listeners.forEach((fn) => fn(isLoading));
};

export const subscribeToGlobalLoading = (listener: Listener) => {
  listeners.push(listener);
  // tuma state ya sasa mara moja
  listener(activeCount > 0);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};
