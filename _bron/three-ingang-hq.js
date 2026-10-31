// Ingang voor de eigen bundel van three r186 (three@0.186.1) voor het 3D-hoofdkwartier van homepage v4c (31/10/2026).
// Gebouwd uit de lokale, ongewijzigde kopie in motion/hoe-het-werkt-v2/assets/vendor/three/ (zelfde npm-tarball als
// site/assets/vendor/three, sha256 8cd06870...3fe7) met esbuild 0.28.2 uit de lokale npm-cache. Niets gedownload.
// Alleen wat assets/js/hq3d.js gebruikt; esbuild laat de rest weg (tree shaking). Geen addons: de omgeving voor de
// spiegelingen bouwt hq3d.js zelf met kernklassen (PMREMGenerator op een eenvoudige nachtscène).
// v2 (31/10/2026, "realistischer met textuur"): MeshStandardMaterial, PMREMGenerator, schaduwen, PointLight, extra geometrie.
export {
  WebGLRenderer, Scene, PerspectiveCamera, Color, Fog, Group, Mesh, InstancedMesh, Object3D, BoxGeometry, CylinderGeometry,
  CapsuleGeometry, SphereGeometry, PlaneGeometry, CircleGeometry, IcosahedronGeometry, BufferGeometry, BufferAttribute,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, HemisphereLight, DirectionalLight, PointLight, CanvasTexture, PMREMGenerator,
  SRGBColorSpace, RepeatWrapping, ACESFilmicToneMapping, PCFShadowMap, AdditiveBlending, CustomBlending, AddEquation, SrcAlphaFactor, OneFactor, ZeroFactor, Vector3, DoubleSide, BackSide
} from '../../motion/hoe-het-werkt-v2/assets/vendor/three/three.module.js';
