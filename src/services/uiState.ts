import { signal } from "@preact/signals-core";

export const sidebarOpenSignal = signal(false);

export const openSidebar = () => {
  sidebarOpenSignal.value = true;
};

export const closeSidebar = () => {
  sidebarOpenSignal.value = false;
};

export const toggleSidebar = () => {
  sidebarOpenSignal.value = !sidebarOpenSignal.value;
};
