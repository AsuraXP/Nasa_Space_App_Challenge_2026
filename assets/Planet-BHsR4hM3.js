import { simulationDelta, spinDelta } from "./orbital-motion.js";
import { u as useMotionSettings, a as useScene } from "./index-BS4g53at.js";
import{r as v,a as h,j as r,g}from"./r3f-BNacQy8Q.js";import{aE as b,c as j}from"./three-CxkaggD8.js";import{t as m}from"./index-BS4g53at.js";import{u as y}from"./Experience-Nj6LORV9.js";const S={earth:0,moon:1,mars:2},p=new j(.75,.35,.56).normalize(),P=`
  varying vec3 vObjPos;
  varying vec3 vWorldNormal;
  void main() {
    vObjPos = normalize(position);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,M=`
  uniform float uKind;
  uniform vec3 uSun;
  varying vec3 vObjPos;
  varying vec3 vWorldNormal;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
    return s;
  }

  void main() {
    vec3 p = vObjPos;
    vec3 col;
    if (uKind < 0.5) {
      // Earth: oceans, land, ice caps, thin cloud
      float n = fbm(p * 2.3 + 4.0);
      float land = smoothstep(0.5, 0.53, n);
      vec3 ocean = mix(vec3(0.02, 0.07, 0.2), vec3(0.04, 0.16, 0.34), fbm(p * 5.0));
      vec3 ground = mix(vec3(0.13, 0.27, 0.12), vec3(0.45, 0.38, 0.24), fbm(p * 6.0 + 9.0));
      col = mix(ocean, ground, land);
      col = mix(col, vec3(0.9), smoothstep(0.82, 0.9, abs(p.y) + 0.08 * n));
      float cloud = smoothstep(0.55, 0.72, fbm(p * 3.6 + 20.0));
      col = mix(col, vec3(0.95), cloud * 0.6);
    } else if (uKind < 1.5) {
      // Moon: bright highlands, dark "seas", fine speckle
      float mare = smoothstep(0.42, 0.56, fbm(p * 1.5 + 2.0));
      col = mix(vec3(0.2, 0.2, 0.21), vec3(0.56, 0.55, 0.53), mare);
      col *= 0.82 + 0.36 * fbm(p * 14.0);
    } else {
      // Mars: rust plains, darker regions, polar caps
      float dark = smoothstep(0.4, 0.62, fbm(p * 1.8 + 7.0));
      col = mix(vec3(0.33, 0.16, 0.1), vec3(0.74, 0.4, 0.21), dark);
      col *= 0.85 + 0.3 * fbm(p * 12.0);
      col = mix(col, vec3(0.93, 0.9, 0.86), smoothstep(0.9, 0.95, abs(p.y) + 0.05 * fbm(p * 6.0)));
    }
    float light = max(dot(normalize(vWorldNormal), normalize(uSun)), 0.0);
    // A little fill light so the night side is dim, not black: sites stay findable.
    col *= 0.09 + 0.98 * light;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;function O({kind:e}){const n=v.useMemo(()=>({uKind:{value:S[e]},uSun:{value:p.clone()}}),[e]);return r.jsx("shaderMaterial",{vertexShader:P,fragmentShader:M,uniforms:n})}const x=`
  uniform vec3 uSun;
  varying vec2 vUv;
  varying vec3 vObjPos;
  varying vec3 vSunObj; // sun direction in the globe's own frame (it may spin)
  void main() {
    vUv = uv;
    vObjPos = normalize(position);
    vSunObj = normalize(transpose(mat3(modelMatrix)) * uSun);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,_=`
  uniform sampler2D uMap;
  uniform sampler2D uHeight;
  uniform sampler2D uNight;
  uniform float uBump;    // 0 = no height map
  uniform float uHasNight;
  varying vec2 vUv;
  varying vec3 vObjPos;
  varying vec3 vSunObj;

  void main() {
    vec3 n = normalize(vObjPos);
    if (uBump > 0.0) {
      // Tilt the normal by the height slope (east = +u, north = +v).
      vec2 px = vec2(1.0 / 4096.0, 1.0 / 2048.0);
      float dE = texture2D(uHeight, vUv + vec2(px.x, 0.0)).r - texture2D(uHeight, vUv - vec2(px.x, 0.0)).r;
      float dN = texture2D(uHeight, vUv + vec2(0.0, px.y)).r - texture2D(uHeight, vUv - vec2(0.0, px.y)).r;
      vec3 east = cross(vec3(0.0, 1.0, 0.0), n);
      if (dot(east, east) > 1e-6) {
        east = normalize(east);
        vec3 north = cross(n, east);
        n = normalize(n - uBump * (dE * east + dN * north));
      }
    }
    float ndl = dot(n, vSunObj);
    vec3 col = texture2D(uMap, vUv).rgb * (0.09 + 0.98 * max(ndl, 0.0));
    if (uHasNight > 0.5) {
      float night = 1.0 - smoothstep(-0.08, 0.12, dot(normalize(vObjPos), vSunObj));
      col += texture2D(uNight, vUv).r * night * vec3(1.0, 0.78, 0.45) * 0.9;
    }
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`,U=`
  uniform sampler2D uClouds;
  varying vec2 vUv;
  varying vec3 vObjPos;
  varying vec3 vSunObj;
  void main() {
    float light = max(dot(normalize(vObjPos), vSunObj), 0.0);
    float a = texture2D(uClouds, vUv).r * 0.85;
    gl_FragColor = vec4(vec3(0.06 + 0.94 * light), a * (0.25 + 0.75 * light));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`,f={earth:0,moon:14,mars:0};function z({kind:e,url:n}){const i=f[e]?m(`${e}_height`):void 0,s=m(`${e}_night`),u=[n,i,s].filter(Boolean),o=g(u),t=o[0],a=i?o[1]:null,c=s?o[i?2:1]:null;t.colorSpace=b,t.anisotropy=8;const l=v.useMemo(()=>({uMap:{value:t},uHeight:{value:a??t},uNight:{value:c??t},uBump:{value:a?f[e]:0},uHasNight:{value:c?1:0},uSun:{value:p.clone()}}),[t,a,c,e]);return r.jsx("shaderMaterial",{vertexShader:x,fragmentShader:_,uniforms:l})}function N({url:e,radius:n,segments:i}){const reduceMotion=useMotionSettings(state=>state.reduceMotion),s=g(e),u=v.useMemo(()=>({uClouds:{value:s},uSun:{value:p.clone()}}),[s]),o=v.useRef(null);return h((t,a)=>{!reduceMotion&&o.current&&(o.current.rotation.y+=.004*simulationDelta(a,useScene.getState().speed))}),r.jsxs("mesh",{ref:o,raycast:()=>null,children:[r.jsx("sphereGeometry",{args:[n*1.008,i,i]}),r.jsx("shaderMaterial",{vertexShader:x,fragmentShader:U,uniforms:u,transparent:!0,depthWrite:!1})]})}function E({kind:e,radius:n,position:i,spin:s=0,children:u}){const reduceMotion=useMotionSettings(state=>state.reduceMotion),o=v.useRef(null),{segments:t}=y(),a=m(`${e}_color`),c=a?m(`${e}_clouds`):void 0;return h((l,d)=>{s&&!reduceMotion&&o.current&&(o.current.rotation.y+=spinDelta(d,useScene.getState(),s,e))}),r.jsxs("group",{ref:o,position:i,children:[r.jsxs("mesh",{onPointerOver:l=>l.stopPropagation(),onPointerMove:l=>l.stopPropagation(),onClick:l=>l.stopPropagation(),children:[r.jsx("sphereGeometry",{args:[n,t,t]}),a?r.jsx(z,{kind:e,url:a}):r.jsx(O,{kind:e})]}),c&&r.jsx(N,{url:c,radius:n,segments:t}),u]})}export{E as P,p as S};