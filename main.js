import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js";

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccea); // Light blue para sa icy atmosphere
scene.fog = new THREE.Fog(0x88ccea, 10, 100); // Fog

// Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x88ccea);
document.body.appendChild(renderer.domElement);

// Camera Setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 30);
scene.add(camera);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Dynamic Light
const dynamicLight = new THREE.PointLight(0xffffff, 4, 50);
dynamicLight.position.set(10, 20, 10); // Initial light position
scene.add(dynamicLight);

// Ocean Geometry
const geometry = new THREE.PlaneGeometry(75, 75, 300, 300); 
geometry.rotateX(-Math.PI / 2);

// Ocean Shader Material
const oceanMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        waveHeight: { value: 1.5 }, // Wave height
        waveFrequency: { value: 0.5 }, // Wave frequency
        deepColor: { value: new THREE.Color(0x88ccea) }, // Icy deep water color
        shallowColor: { value: new THREE.Color(0xd8f1f9) }, // Icy shallow water color
        lightColor: { value: new THREE.Color(0xffffff) }, // Light
        lightPosition: { value: new THREE.Vector3(10, 20, 10) }, // Dynamic light source
    },
    vertexShader: `
        uniform float time;
        uniform float waveHeight;
        uniform float waveFrequency;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
            vUv = uv;
            vPosition = position;
            vec3 pos = position;
            
            // Complex wave patterns using sine and cosine
            pos.y += sin(pos.x * waveFrequency + time) * waveHeight * 0.8;
            pos.y += cos(pos.z * waveFrequency + time * 1.5) * waveHeight * 0.6;
            pos.y += sin(pos.x * waveFrequency * 0.5 + pos.z * 0.3 + time) * waveHeight * 0.2;

            vNormal = normal; // Pass normal for specular lighting
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 deepColor;
        uniform vec3 shallowColor;
        uniform vec3 lightColor;
        uniform vec3 lightPosition;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
            // Fresnel effect for icy water appearance
            float fresnel = pow(1.0 - dot(vNormal, normalize(vPosition - lightPosition)), 3.0);
            vec3 baseColor = mix(shallowColor, deepColor, vUv.y);
            
            // Specular reflection for shininess
            vec3 lightDir = normalize(lightPosition - vPosition);
            float specular = max(dot(vNormal, lightDir), 0.0);
            specular = pow(specular, 16.0) * fresnel;

            // Combine base color with specular highlights
            vec3 finalColor = baseColor + lightColor * specular;
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
    side: THREE.DoubleSide,
});

// Add Ocean Mesh
const ocean = new THREE.Mesh(geometry, oceanMaterial);
scene.add(ocean);

// Load Buoy Model
const loader = new GLTFLoader();
let buoy = null;

loader.load(
    'https://trystan211.github.io/ite18_activity4_lyndon/starboard_bifurcation_buoy.glb', // Replace with the URL to your buoy model
    (gltf) => {
        buoy = gltf.scene;
        buoy.position.set(1, 0, 1); 
        buoy.scale.set(0.2, 0.2, 0.2); 
        scene.add(buoy);
    },
    undefined,
    (error) => {
        console.error("Error loading the buoy model:", error);
    }
);

// Rain Geometry
const rainCount = 10000;
const rainGeometry = new THREE.BufferGeometry();
const rainPositions = [];
const rainVelocities = [];

for (let i = 0; i < rainCount; i++) {
    const x = (Math.random() - 0.5) * 100;
    const y = Math.random() * 50;
    const z = (Math.random() - 0.5) * 100;
    rainPositions.push(x, y, z);
    rainVelocities.push(-0.2 - Math.random() * 0.5); // Rain falls 
}

rainGeometry.setAttribute("position", new THREE.Float32BufferAttribute(rainPositions, 3));

// Rain Material
const rainMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.2,
    transparent: true,
    opacity: 0.8,
});

// Add Rain Particles
const rain = new THREE.Points(rainGeometry, rainMaterial);
scene.add(rain);

// Animation Loop
const clock = new THREE.Clock();
function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Update Ocean
    oceanMaterial.uniforms.time.value = elapsedTime;

    // Update Rain
    const positions = rain.geometry.attributes.position.array;
    for (let i = 0; i < rainCount; i++) {
        positions[i * 3 + 1] += rainVelocities[i]; // Y-axis movement for  falling effect
        if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 50; // Reset rain drop
        }
    }
    rain.geometry.attributes.position.needsUpdate = true;

    // Moving Light Source
    dynamicLight.position.set(
        10 * Math.sin(elapsedTime * 0.5),
        10,
        10 * Math.cos(elapsedTime * 0.5)
    );

    // To move the Buoy with the waves
    if (buoy) {
        const waveHeight = 1.5; 
        const waveFrequency = 0.5; 

        // Calculate the buoy's Y position base sa wave height at its X/Z
        const buoyWaveHeight =
            Math.sin(buoy.position.x * waveFrequency + elapsedTime) * waveHeight * 0.8 +
            Math.cos(buoy.position.z * waveFrequency + elapsedTime * 1.5) * waveHeight * 0.6;

        buoy.position.y = buoyWaveHeight; // Update buoy's Y position
        buoy.rotation.z = Math.sin(elapsedTime * 1.5) * 0.1; // Add tilt apil ang waves
        buoy.rotation.x = Math.cos(elapsedTime * 1.5) * 0.1; // Add tilt apil ang waves
    }

    // Render Scene
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// Handle Resizing
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});