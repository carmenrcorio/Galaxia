declare module "astronomy-engine" {
  export const Body: Record<string, any>;
  export function EclipticLongitude(body: any, date: Date): number;
  export function SiderealTime(date: Date): number;
  export function SunPosition(date: Date): { elon: number };
}
