"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * True only while ChartImageExport is cloning the frame for a PNG.
 * html-to-image copies the live DOM and ignores backface-visibility, so
 * flip cards must unmount their back face for that clone and no longer.
 */
const ChartImageCaptureContext = createContext(false);

export function ChartImageCaptureProvider({
  capturing,
  children,
}: {
  capturing: boolean;
  children: ReactNode;
}) {
  return <ChartImageCaptureContext.Provider value={capturing}>{children}</ChartImageCaptureContext.Provider>;
}

export function useChartImageCapturing(): boolean {
  return useContext(ChartImageCaptureContext);
}
