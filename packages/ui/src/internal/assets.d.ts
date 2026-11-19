// En apps/web, Next declara estos módulos como StaticImageData; aquí basta con lo que se usa.
declare module "*.png" {
  const image: { src: string; width: number; height: number };
  export default image;
}
