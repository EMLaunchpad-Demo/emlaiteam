// Ingang voor de eigen bundel van three r186 (three@0.186.1) voor het 3D-hoofdkwartier van homepage v4 (31/10/2026).
// Gebouwd uit de lokale, ongewijzigde kopie in motion/hoe-het-werkt-v2/assets/vendor/three/ (zelfde npm-tarball als
// site/assets/vendor/three, sha256 8cd06870...3fe7) met esbuild 0.28.2 uit de lokale npm-cache. Niets gedownload.
// Alleen wat assets/js/hq3d.js gebruikt; esbuild laat de rest weg (tree shaking). Geen addons: de omgeving voor de
// spiegelingen bouwt hq3d.js zelf met kernklassen (PMREMGenerator op een nachtscène), de gloed (bloom) is eigen code.
// v2 (31/10/2026, "realistischer met textuur"): MeshStandardMaterial, PMREMGenerator, schaduwen, PointLight, extra geometrie.
// v3 (2/11/2026, "nog realistischer"): ShaderMaterial (glas met Fresnel, gloed), WebGLRenderTarget, OrthographicCamera,
// HalfFloatType, LinearFilter, NoBlending, UniformsLib/UniformsUtils (mist in de glas-shader), LatheGeometry en Vector2
// (romp van de figuurtjes). Niet meer nodig: IcosahedronGeometry, DoubleSide.
// v4i (2/11/2026, gebouw in het midden met een achtergrond): Points, PointsMaterial (sterren), SrcAlphaFactor.
// Bouwen (in site-v4): node <esbuild>/bin/esbuild _bron/three-ingang-hq.js --bundle --format=esm --minify --target=es2020
//   --legal-comments=inline --outfile=assets/vendor/three/three-hq.min.js
export {
  WebGLRenderer, Scene, PerspectiveCamera, OrthographicCamera, Color, Fog, Group, Mesh, InstancedMesh, Object3D, BoxGeometry, CylinderGeometry,
  CapsuleGeometry, SphereGeometry, PlaneGeometry, CircleGeometry, LatheGeometry, BufferGeometry, BufferAttribute,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, ShaderMaterial, UniformsLib, UniformsUtils,
  HemisphereLight, DirectionalLight, PointLight, CanvasTexture, PMREMGenerator, WebGLRenderTarget,
  SRGBColorSpace, RepeatWrapping, LinearFilter, HalfFloatType, ACESFilmicToneMapping, PCFShadowMap, AdditiveBlending, CustomBlending, NoBlending,
  AddEquation, OneFactor, ZeroFactor, SrcAlphaFactor, Points, PointsMaterial, Vector2, Vector3, BackSide
} from '../../motion/hoe-het-werkt-v2/assets/vendor/three/three.module.js';
