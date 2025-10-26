declare module 'perspective-transform' {
  export default function PerspectiveTransform(
    src: number[],
    dest: number[]
  ): {
    transformInverse: (x: number, y: number) => [number, number];
    transform: (x: number, y: number) => [number, number];
  };
}
