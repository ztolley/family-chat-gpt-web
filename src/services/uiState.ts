import { signal } from "@lit-labs/signals";

export const sidebarOpenSignal = signal(false);

export const openSidebar = () => {
  sidebarOpenSignal.set(true);
};

export const closeSidebar = () => {
  sidebarOpenSignal.set(false);
};

export const toggleSidebar = () => {
  sidebarOpenSignal.set(!sidebarOpenSignal.get());
};
