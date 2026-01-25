/**
 * Floating Lines Background - Converted from React/Next.js to Vanilla JS
 * Uses Three.js with custom GLSL shaders for the flowing wave effect
 */

const vertexShader = `
precision highp float;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

const vec3 BLACK = vec3(0.0);
const vec3 PINK  = vec3(233.0, 71.0, 245.0) / 255.0;
const vec3 BLUE  = vec3(47.0,  75.0, 162.0) / 255.0;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 background_color(vec2 uv) {
  vec3 col = vec3(0.0);

  float y = sin(uv.x - 0.2) * 0.3 - 0.1;
  float m = uv.y - y;

  col += mix(BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
  col += mix(PINK, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
  return col * 0.5;
}

vec3 getLineColor(float t, vec3 baseColor) {
  if (lineGradientCount <= 0) {
    return baseColor;
  }

  vec3 gradientColor;
  
  if (lineGradientCount == 1) {
    gradientColor = lineGradient[0];
  } else {
    float clampedT = clamp(t, 0.0, 0.9999);
    float scaled = clampedT * float(lineGradientCount - 1);
    int idx = int(floor(scaled));
    float f = fract(scaled);
    int idx2 = min(idx + 1, lineGradientCount - 1);

    vec3 c1 = lineGradient[idx];
    vec3 c2 = lineGradient[idx2];
    
    gradientColor = mix(c1, c2, f);
  }
  
  return gradientColor * 0.5;
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;

  float x_offset   = offset;
  float x_movement = time * 0.1;
  float amp        = sin(offset + time * 0.2) * 0.3;
  float y          = sin(uv.x + x_offset + x_movement) * amp;

  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius);
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }

  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;
  
  if (parallax) {
    baseUv += parallaxOffset;
  }

  vec3 col = vec3(0.0);

  vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }
  
  if (enableBottom) {
    for (int i = 0; i < bottomLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(bottomLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      
      float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
        1.5 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.2;
    }
  }

  if (enableMiddle) {
    for (int i = 0; i < middleLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(middleLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      
      float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
        2.0 + 0.15 * fi,
        baseUv,
        mouseUv,
        interactive
      );
    }
  }

  if (enableTop) {
    for (int i = 0; i < topLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(topLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      
      float angle = topWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      ruv.x *= -1.0;
      col += lineCol * wave(
        ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
        1.0 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.1;
    }
  }

  fragColor = vec4(col, 1.0);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`;

// Configuration - Red color gradient (no luminous effect)
const CONFIG = {
    // Red gradient colors
    linesGradient: [
        '#ff3a3a',  // Bright red
        '#ff5555',  // Light red
        '#cc2222',  // Dark red
        '#ff4444',  // Medium red
        '#ff6666',  // Soft red
        '#ee3333',  // Vibrant red
    ],
    enabledWaves: ['top', 'middle', 'bottom'],
    lineCount: [6, 6, 6],
    lineDistance: [5, 5, 5],
    topWavePosition: { x: 10.0, y: 0.5, rotate: -0.4 },
    middleWavePosition: { x: 5.0, y: 0.0, rotate: 0.2 },
    bottomWavePosition: { x: 2.0, y: -0.7, rotate: -1 },
    animationSpeed: 1,
    interactive: true,
    bendRadius: 1.0,        // Much lower = much wider bend area
    bendStrength: 0.5,     // Much stronger push/pull effect
    mouseDamping: 0.05,      // Faster mouse response
    parallax: true,
    parallaxStrength: 0.2,  // Stronger parallax movement
    mixBlendMode: 'normal'  // No luminous effect
};

const MAX_GRADIENT_STOPS = 8;

class FloatingLines {
    constructor() {
        this.container = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.material = null;
        this.clock = null;
        this.animationId = null;

        // Mouse tracking
        this.targetMouse = new THREE.Vector2(-1000, -1000);
        this.currentMouse = new THREE.Vector2(-1000, -1000);
        this.targetInfluence = 1;  // Start with influence on
        this.currentInfluence = 1;
        this.targetParallax = new THREE.Vector2(0, 0);
        this.currentParallax = new THREE.Vector2(0, 0);

        this.init();
    }

    hexToVec3(hex) {
        let value = hex.trim();
        if (value.startsWith('#')) {
            value = value.slice(1);
        }

        let r = 255, g = 255, b = 255;

        if (value.length === 3) {
            r = parseInt(value[0] + value[0], 16);
            g = parseInt(value[1] + value[1], 16);
            b = parseInt(value[2] + value[2], 16);
        } else if (value.length === 6) {
            r = parseInt(value.slice(0, 2), 16);
            g = parseInt(value.slice(2, 4), 16);
            b = parseInt(value.slice(4, 6), 16);
        }

        return new THREE.Vector3(r / 255, g / 255, b / 255);
    }

    getLineCount(waveType) {
        const index = CONFIG.enabledWaves.indexOf(waveType);
        if (index === -1) return 0;
        return Array.isArray(CONFIG.lineCount) ? (CONFIG.lineCount[index] ?? 6) : CONFIG.lineCount;
    }

    getLineDistance(waveType) {
        const index = CONFIG.enabledWaves.indexOf(waveType);
        if (index === -1) return 0.01;
        const dist = Array.isArray(CONFIG.lineDistance) ? (CONFIG.lineDistance[index] ?? 5) : CONFIG.lineDistance;
        return dist * 0.01;
    }

    init() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'hero-canvas-container';
        this.container.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            overflow: hidden;
            mix-blend-mode: ${CONFIG.mixBlendMode};
        `;

        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            heroSection.style.position = 'relative';
            heroSection.insertBefore(this.container, heroSection.firstChild);
        }

        this.setupScene();
        this.addEventListeners();
        this.animate();
    }

    setupScene() {
        // Scene
        this.scene = new THREE.Scene();

        // Orthographic camera
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.camera.position.z = 1;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.container.appendChild(this.renderer.domElement);

        // Clock
        this.clock = new THREE.Clock();

        // Setup uniforms
        const topLineCount = this.getLineCount('top');
        const middleLineCount = this.getLineCount('middle');
        const bottomLineCount = this.getLineCount('bottom');

        this.uniforms = {
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector3(1, 1, 1) },
            animationSpeed: { value: CONFIG.animationSpeed },

            enableTop: { value: CONFIG.enabledWaves.includes('top') },
            enableMiddle: { value: CONFIG.enabledWaves.includes('middle') },
            enableBottom: { value: CONFIG.enabledWaves.includes('bottom') },

            topLineCount: { value: topLineCount },
            middleLineCount: { value: middleLineCount },
            bottomLineCount: { value: bottomLineCount },

            topLineDistance: { value: this.getLineDistance('top') },
            middleLineDistance: { value: this.getLineDistance('middle') },
            bottomLineDistance: { value: this.getLineDistance('bottom') },

            topWavePosition: {
                value: new THREE.Vector3(
                    CONFIG.topWavePosition.x,
                    CONFIG.topWavePosition.y,
                    CONFIG.topWavePosition.rotate
                )
            },
            middleWavePosition: {
                value: new THREE.Vector3(
                    CONFIG.middleWavePosition.x,
                    CONFIG.middleWavePosition.y,
                    CONFIG.middleWavePosition.rotate
                )
            },
            bottomWavePosition: {
                value: new THREE.Vector3(
                    CONFIG.bottomWavePosition.x,
                    CONFIG.bottomWavePosition.y,
                    CONFIG.bottomWavePosition.rotate
                )
            },

            iMouse: { value: new THREE.Vector2(-1000, -1000) },
            interactive: { value: CONFIG.interactive },
            bendRadius: { value: CONFIG.bendRadius },
            bendStrength: { value: CONFIG.bendStrength },
            bendInfluence: { value: 0 },

            parallax: { value: CONFIG.parallax },
            parallaxStrength: { value: CONFIG.parallaxStrength },
            parallaxOffset: { value: new THREE.Vector2(0, 0) },

            lineGradient: {
                value: Array.from({ length: MAX_GRADIENT_STOPS }, () => new THREE.Vector3(1, 1, 1))
            },
            lineGradientCount: { value: 0 }
        };

        // Setup gradient colors
        if (CONFIG.linesGradient && CONFIG.linesGradient.length > 0) {
            const stops = CONFIG.linesGradient.slice(0, MAX_GRADIENT_STOPS);
            this.uniforms.lineGradientCount.value = stops.length;

            stops.forEach((hex, i) => {
                const color = this.hexToVec3(hex);
                this.uniforms.lineGradient.value[i].set(color.x, color.y, color.z);
            });
        }

        // Create material
        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader
        });

        // Create mesh
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(mesh);

        // Set initial size
        this.setSize();
    }

    setSize() {
        const width = this.container.clientWidth || 1;
        const height = this.container.clientHeight || 1;

        this.renderer.setSize(width, height, false);

        const canvasWidth = this.renderer.domElement.width;
        const canvasHeight = this.renderer.domElement.height;
        this.uniforms.iResolution.value.set(canvasWidth, canvasHeight, 1);
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.setSize());

        if (CONFIG.interactive) {
            // Listen on document to capture all mouse movement over hero section
            document.addEventListener('mousemove', (e) => this.onPointerMove(e));
        }
    }

    onPointerMove(event) {
        const heroSection = document.querySelector('.hero-section');
        if (!heroSection) return;

        const rect = heroSection.getBoundingClientRect();

        // Check if mouse is over hero section
        if (event.clientY < rect.top || event.clientY > rect.bottom) return;

        const x = event.clientX;
        const y = event.clientY - rect.top;
        const dpr = this.renderer.getPixelRatio();

        this.targetMouse.set(x * dpr, (rect.height - y) * dpr);
        this.targetInfluence = 1.0;

        if (CONFIG.parallax) {
            const centerX = window.innerWidth / 2;
            const centerY = rect.height / 2;
            const offsetX = (x - centerX) / window.innerWidth;
            const offsetY = -(y - centerY) / rect.height;
            this.targetParallax.set(offsetX * CONFIG.parallaxStrength, offsetY * CONFIG.parallaxStrength);
        }
    }

    onPointerLeave() {
        this.targetInfluence = 0.0;
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // Update time
        this.uniforms.iTime.value = this.clock.getElapsedTime();

        // Smooth mouse following
        if (CONFIG.interactive) {
            this.currentMouse.lerp(this.targetMouse, CONFIG.mouseDamping);
            this.uniforms.iMouse.value.copy(this.currentMouse);

            this.currentInfluence += (this.targetInfluence - this.currentInfluence) * CONFIG.mouseDamping;
            this.uniforms.bendInfluence.value = this.currentInfluence;
        }

        // Parallax
        if (CONFIG.parallax) {
            this.currentParallax.lerp(this.targetParallax, CONFIG.mouseDamping);
            this.uniforms.parallaxOffset.value.copy(this.currentParallax);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof THREE !== 'undefined') {
        new FloatingLines();
    } else {
        console.error('Three.js not loaded');
    }
});
