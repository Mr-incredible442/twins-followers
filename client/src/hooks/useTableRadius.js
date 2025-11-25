import { useMemo } from 'react';

const useTableRadius = (windowSize) => {
  return useMemo(() => {
    // Account for header, action bar, and padding
    const headerHeight = windowSize.width < 768 ? 70 : 90;
    const actionBarHeight = 60; // Space for floating action bar
    const padding = windowSize.width < 768 ? 10 : 20;

    const availableHeight =
      windowSize.height - headerHeight - actionBarHeight - padding;
    const availableWidth = windowSize.width - padding * 2;

    // Use the smaller of available dimensions, accounting for player card hands
    // Player hands extend ~110px from table edge (increased to prevent cutoff)
    const cardHandWidth = 110;
    const maxRadius =
      Math.min(availableHeight, availableWidth) / 2 - cardHandWidth;

    // Use a much larger percentage to fill the screen better
    const percentageBased =
      Math.min(windowSize.width, windowSize.height) *
      (windowSize.width < 768 ? 0.36 : 0.33);

    // Use larger minimum and allow table to be bigger, but ensure it fits
    return Math.max(180, Math.min(percentageBased, maxRadius));
  }, [windowSize]);
};

export default useTableRadius;

