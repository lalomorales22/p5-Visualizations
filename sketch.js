let waves = [];
let particles = [];
let time = 0;
let audioContext, analyser, audioData;
let particleImage;

let config = {
  wavePattern: 'sine',
  speed: 0.02,
  frequency: 0.01,
  numLines: 10,
  amplitude: 50,
  lineWidth: 2,
  colorScheme: 'rainbow',
  customColor: '#FFFFFF',
  gradientStart: '#FF0000',
  gradientEnd: '#0000FF',
  backgroundColor: '#000000',
  fadeEffect: 0.1,
  blendMode: 'normal',
  rotationSpeed: 0,
  zoomSpeed: 0,
  symmetry: 1,
  noiseScale: 0.01,
  particleCount: 100,
  interactionMode: 'none',
  interactionStrength: 50,
  audioEnabled: false,
  audioSensitivity: 1,
  fractalDepth: 0,
  is3DEffect: false,
  isPolarCoordinates: false,
  waveComplexity: 1,
  particleShape: 'circle',
  waveTurbulence: 0,
  colorPalette: 'default',
  waveReflection: false,
  harmonics: 0,
  waveCombo: 'single',
  particleBehavior: 'default',
  presetName: 'default',
  customWaveFunction: 'Math.sin(x)',
  particleSize: 4,
  particleImage: '',
  audioFrequencyRange: 'all',
  waveDistortion: 0,
  colorPalette: [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'
  ]
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);
  
  for (let i = 0; i < config.numLines; i++) {
    waves.push(new Wave(i));
  }
  
  for (let i = 0; i < config.particleCount; i++) {
    particles.push(new Particle());
  }
  
  if (config.audioEnabled) {
    setupAudio();
  }
  
  setupUIControls();
}

function draw() {
  background(config.backgroundColor);
  applyFadeEffect();
  
  blendMode(getBlendMode(config.blendMode));
  
  push();
  translate(width / 2, height / 2);
  rotate(time * config.rotationSpeed);
  scale(1 + sin(time * config.zoomSpeed) * 0.1);
  
  for (let i = 0; i < config.symmetry; i++) {
    push();
    rotate((TWO_PI / config.symmetry) * i);
    for (let wave of waves) {
      wave.update();
      wave.display();
    }
    pop();
  }
  
  pop();
  
  for (let particle of particles) {
    particle.update();
    particle.display();
  }
  
  if (config.is3DEffect) apply3DEffect();
  if (config.isPolarCoordinates) applyPolarCoordinates();
  if (config.fractalDepth > 0) {
    drawFractal(width / 2, height / 2, 1, config.fractalDepth);
  }
  
  if (config.audioEnabled) {
    updateAudio();
  }
  
  time += config.speed;
  
  if (isRecording) {
    recordedFrames.push(get());
  }
}

class Wave {
  constructor(index) {
    this.index = index;
  }
  
  update() {
    if (config.audioEnabled) {
      this.amplitude = map(audioData[this.index % audioData.length], 0, 255, 0, config.amplitude);
    }
  }
  
  display() {
    noFill();
    stroke(this.getColor());
    strokeWeight(config.lineWidth);
    
    beginShape();
    for (let x = -width / 2; x < width / 2; x += 5) {
      let y = this.calculateY(x);
      vertex(x, y);
      
      if (config.waveReflection) {
        vertex(x, -y);
      }
    }
    endShape();
  }
  
  calculateY(x) {
    let y = 0;
    let t = x * config.frequency + time + this.index * 0.5;
    
    switch (config.wavePattern) {
      case 'sine':
        y = sin(t);
        break;
      case 'square':
        y = sin(t) > 0 ? 1 : -1;
        break;
      case 'sawtooth':
        y = (t % TWO_PI) / TWO_PI * 2 - 1;
        break;
      case 'triangle':
        y = abs((t % TWO_PI) / TWO_PI * 4 - 2) - 1;
        break;
      case 'noise':
        y = noise(x * config.noiseScale, time, this.index) * 2 - 1;
        break;
      case 'custom':
        try {
          y = eval(config.customWaveFunction.replace(/x/g, 't'));
        } catch (error) {
          console.error('Invalid custom wave function:', error);
          y = 0;
        }
        break;
    }
    
    y *= config.amplitude * (1 + this.index * 0.1);
    y += sin(x * config.waveTurbulence) * config.amplitude * 0.2;
    
    // Apply wave modifiers
    y = applyWaveModifiers(y, x);
    
    // Apply wave distortion
    y += noise(x * 0.1, time) * config.waveDistortion * config.amplitude;
    
    return y;
  }
  
  getColor() {
    let hue;
    switch (config.colorScheme) {
      case 'rainbow':
        hue = (this.index * 30 + time * 10) % 360;
        break;
      case 'custom':
        return color(config.customColor);
      case 'gradient':
        let inter = map(this.index, 0, config.numLines, 0, 1);
        return lerpColor(color(config.gradientStart), color(config.gradientEnd), inter);
      case 'palette':
        return color(config.colorPalette[this.index % config.colorPalette.length]);
      default:
        hue = 0;
    }
    return color(hue, 80, 100);
  }
}

class Particle {
  constructor() {
    this.position = createVector(random(width), random(height));
    this.velocity = p5.Vector.random2D();
    this.size = random(2, 8);
  }
  
  update() {
    this.position.add(this.velocity);
    
    if (this.position.x < 0 || this.position.x > width) this.velocity.x *= -1;
    if (this.position.y < 0 || this.position.y > height) this.velocity.y *= -1;
    
    if (config.interactionMode !== 'none') {
      let force = createVector(width/2 - this.position.x, height/2 - this.position.y);
      force.setMag(config.interactionStrength / 1000);
      
      switch (config.interactionMode) {
        case 'attract':
          this.velocity.add(force);
          break;
        case 'repel':
          this.velocity.sub(force);
          break;
        case 'swirl':
          force.rotate(HALF_PI);
          this.velocity.add(force);
          break;
      }
    }
    
    switch (config.particleBehavior) {
      case 'default':
        // Existing behavior
        break;
      case 'flock':
        this.flock();
        break;
      case 'followPath':
        this.followPath();
        break;
      case 'audioReactive':
        this.reactToAudio();
        break;
      case 'gravity':
        this.velocity.y += 0.1;
        break;
      case 'explosion':
        if (!this.explosionInitialized) {
          this.velocity = p5.Vector.random2D().mult(random(1, 5));
          this.explosionInitialized = true;
        }
        this.velocity.mult(0.98);
        break;
    }
  }
  
  display() {
    noStroke();
    fill(this.getColor());
    
    switch (config.particleShape) {
      case 'circle':
        ellipse(this.position.x, this.position.y, this.size);
        break;
      case 'square':
        rectMode(CENTER);
        square(this.position.x, this.position.y, this.size);
        break;
      case 'triangle':
        triangle(
          this.position.x, this.position.y - this.size/2,
          this.position.x - this.size/2, this.position.y + this.size/2,
          this.position.x + this.size/2, this.position.y + this.size/2
        );
        break;
      case 'star':
        this.drawStar(this.position.x, this.position.y, this.size, this.size / 2, 5);
        break;
      case 'image':
        if (particleImage) {
          image(particleImage, this.position.x, this.position.y, this.size, this.size);
        } else {
          ellipse(this.position.x, this.position.y, this.size);
        }
        break;
    }
  }
  
  flock() {
    // Simple flocking behavior
    let center = createVector(0, 0);
    let count = 0;
    for (let other of particles) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < 50) {
        center.add(other.position);
        count++;
      }
    }
    if (count > 0) {
      center.div(count);
      this.velocity.lerp(p5.Vector.sub(center, this.position).normalize(), 0.05);
    }
  }
  
  followPath() {
    // Follow a simple sine path
    let angle = this.position.x * 0.1;
    let targetY = sin(angle) * height / 4 + height / 2;
    this.velocity.y += (targetY - this.position.y) * 0.05;
  }
  
  reactToAudio() {
    if (config.audioEnabled && audioData) {
      let audioIndex = floor(map(this.position.x, 0, width, 0, audioData.length));
      let audioValue = audioData[audioIndex] / 255;
      this.velocity.y += (audioValue - 0.5) * 2;
    }
  }
  
  drawStar(x, y, radius1, radius2, npoints) {
    let angle = TWO_PI / npoints;
    let halfAngle = angle / 2.0;
    beginShape();
    for (let a = 0; a < TWO_PI; a += angle) {
      let sx = x + cos(a) * radius2;
      let sy = y + sin(a) * radius2;
      vertex(sx, sy);
      sx = x + cos(a + halfAngle) * radius1;
      sy = y + sin(a + halfAngle) * radius1;
      vertex(sx, sy);
    }
    endShape(CLOSE);
  }
  
  getColor() {
    if (config.colorScheme === 'palette') {
      return color(random(config.colorPalette));
    }
    return color(255);
  }
}

function applyFadeEffect() {
  noStroke();
  fill(red(config.backgroundColor), green(config.backgroundColor), blue(config.backgroundColor), config.fadeEffect * 255);
  rect(0, 0, width, height);
}

function getBlendMode(mode) {
  switch (mode) {
    case 'normal': return BLEND;
    case 'multiply': return MULTIPLY;
    case 'screen': return SCREEN;
    case 'overlay': return OVERLAY;
    case 'darken': return DARKEST;
    case 'lighten': return LIGHTEST;
    case 'color-dodge': return DODGE;
    case 'color-burn': return BURN;
    default: return BLEND;
  }
}

function apply3DEffect() {
  push();
  translate(0, 0, -200);
  rotateX(time * 0.1);
  rotateY(time * 0.1);
  for (let wave of waves) {
    wave.display();
    translate(0, 0, -10);
  }
  pop();
}

function applyPolarCoordinates() {
  push();
  translate(width / 2, height / 2);
  for (let wave of waves) {
    beginShape();
    for (let angle = 0; angle < TWO_PI; angle += 0.1) {
      let r = wave.calculateY(angle * 100) + height / 4;
      let x = r * cos(angle);
      let y = r * sin(angle);
      vertex(x, y);
    }
    endShape(CLOSE);
  }
  pop();
}

function drawFractal(x, y, size, depth) {
  if (depth <= 0) return;

  // Draw the main shape
  push();
  translate(x, y);
  scale(size);
  for (let wave of waves) {
    wave.display();
  }
  pop();

  // Draw smaller copies
  let newSize = size * 0.5;
  let offset = size * 0.75;
  drawFractal(x - offset, y - offset, newSize, depth - 1);
  drawFractal(x + offset, y - offset, newSize, depth - 1);
  drawFractal(x - offset, y + offset, newSize, depth - 1);
  drawFractal(x + offset, y + offset, newSize, depth - 1);
}

function setupAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  audioData = new Uint8Array(analyser.frequencyBinCount);

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
      let source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
    })
    .catch(err => console.error('Audio input error:', err));
}

function updateAudio() {
  analyser.getByteFrequencyData(audioData);
  
  let start, end;
  switch (config.audioFrequencyRange) {
    case 'bass':
      start = 0;
      end = Math.floor(audioData.length * 0.1);
      break;
    case 'mid':
      start = Math.floor(audioData.length * 0.1);
      end = Math.floor(audioData.length * 0.5);
      break;
    case 'treble':
      start = Math.floor(audioData.length * 0.5);
      end = audioData.length;
      break;
    default:
      start = 0;
      end = audioData.length;
  }
  
  let sum = 0;
  for (let i = start; i < end; i++) {
    sum += audioData[i];
  }
  let average = sum / (end - start);
  config.audioLevel = average / 255;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function setupUIControls() {
  // Wave Pattern
  select('#wavePattern').changed(() => {
    config.wavePattern = select('#wavePattern').value();
  });

  // Speed
  select('#speed').input(() => {
    config.speed = select('#speed').value();
  });

  // Frequency
  select('#frequency').input(() => {
    config.frequency = select('#frequency').value();
  });

  // Number of Lines
  select('#numLines').input(() => {
    config.numLines = int(select('#numLines').value());
    waves = [];
    for (let i = 0; i < config.numLines; i++) {
      waves.push(new Wave(i));
    }
  });

  // Amplitude
  select('#amplitude').input(() => {
    config.amplitude = select('#amplitude').value();
  });

  // Color Scheme
  select('#colorScheme').changed(() => {
    config.colorScheme = select('#colorScheme').value();
  });

  // Background Color
  select('#backgroundColor').input(() => {
    config.backgroundColor = select('#backgroundColor').value();
  });

  // Blend Mode
  select('#blendMode').changed(() => {
    config.blendMode = select('#blendMode').value();
  });

  // Particle Count
  select('#particleCount').input(() => {
    config.particleCount = int(select('#particleCount').value());
    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
      particles.push(new Particle());
    }
  });

  // Interaction Mode
  select('#interactionMode').changed(() => {
    config.interactionMode = select('#interactionMode').value();
  });

  // Audio Toggle
  select('#audioEnabled').changed(() => {
    config.audioEnabled = select('#audioEnabled').checked();
    if (config.audioEnabled && !audioContext) {
      setupAudio();
    }
  });

  // 3D Effect Toggle
  select('#is3DEffect').changed(() => {
    config.is3DEffect = select('#is3DEffect').checked();
  });

  // Polar Coordinates Toggle
  select('#isPolarCoordinates').changed(() => {
    config.isPolarCoordinates = select('#isPolarCoordinates').checked();
  });

  // Fractal Depth
  select('#fractalDepth').input(() => {
    config.fractalDepth = int(select('#fractalDepth').value());
  });

  select('#harmonics').input(() => {
    config.harmonics = int(select('#harmonics').value());
  });

  select('#waveCombo').changed(() => {
    config.waveCombo = select('#waveCombo').value();
  });

  select('#particleBehavior').changed(() => {
    config.particleBehavior = select('#particleBehavior').value();
  });

  select('#presetSelector').changed(() => {
    loadPreset(select('#presetSelector').value());
  });

  select('#savePreset').mousePressed(savePreset);

  updatePresetSelector();

  select('#customWaveFunction').input(() => {
    config.customWaveFunction = select('#customWaveFunction').value();
  });

  select('#particleSize').input(() => {
    config.particleSize = float(select('#particleSize').value());
  });

  select('#particleImage').input(() => {
    config.particleImage = select('#particleImage').value();
    loadParticleImage();
  });

  select('#audioFrequencyRange').changed(() => {
    config.audioFrequencyRange = select('#audioFrequencyRange').value();
  });

  select('#waveDistortion').input(() => {
    config.waveDistortion = float(select('#waveDistortion').value());
  });

  select('#randomize').mousePressed(randomizeConfig);

  select('#exportImage').mousePressed(exportImage);
  select('#exportAnimation').mousePressed(exportAnimation);
}

function applyWaveModifiers(y, x) {
  // Add harmonics
  for (let i = 1; i <= config.harmonics; i++) {
    y += sin((i + 1) * x * config.frequency + time) * (config.amplitude / (i + 1));
  }
  
  // Combine wave types
  if (config.waveCombo === 'additive') {
    y += (sin(x * config.frequency * 1.5 + time) * config.amplitude * 0.5);
  } else if (config.waveCombo === 'multiplicative') {
    y *= (1 + sin(x * config.frequency * 0.5 + time) * 0.5);
  } else if (config.waveCombo === 'modulation') {
    let carrier = sin(x * config.frequency + time);
    let modulator = sin(x * config.frequency * 0.5 + time);
    y = carrier * modulator * config.amplitude;
  }
  
  return y;
}

// Add preset system functions
const presets = {
  default: { /* current config values */ },
  calm: {
    wavePattern: 'sine',
    speed: 0.01,
    frequency: 0.005,
    amplitude: 30,
    particleBehavior: 'default'
  },
  energetic: {
    wavePattern: 'square',
    speed: 0.05,
    frequency: 0.02,
    amplitude: 70,
    particleBehavior: 'flock'
  },
  psychedelic: {
    wavePattern: 'noise',
    speed: 0.03,
    frequency: 0.015,
    amplitude: 50,
    particleBehavior: 'audioReactive',
    audioEnabled: true
  }
};

function savePreset() {
  const presetName = prompt("Enter a name for this preset:");
  if (presetName) {
    presets[presetName] = Object.assign({}, config);
    updatePresetSelector();
  }
}

function loadPreset(presetName) {
  if (presets[presetName]) {
    Object.assign(config, presets[presetName]);
    updateUIControls();
  }
}

function updatePresetSelector() {
  const presetSelector = select('#presetSelector');
  presetSelector.html('');
  for (let presetName in presets) {
    presetSelector.option(presetName);
  }
}

function updateUIControls() {
  // Update all UI controls to reflect the current config
  select('#wavePattern').value(config.wavePattern);
  select('#speed').value(config.speed);
  // ... (update other controls)
}

function loadParticleImage() {
  if (config.particleImage) {
    loadImage(config.particleImage, img => {
      particleImage = img;
    }, () => {
      console.error('Failed to load particle image');
    });
  } else {
    particleImage = null;
  }
}

function randomizeConfig() {
  config.wavePattern = random(['sine', 'square', 'sawtooth', 'triangle', 'noise']);
  config.speed = random(0, 0.5);
  config.frequency = random(0, 0.5);
  config.amplitude = random(0, 300);
  config.colorScheme = random(['rainbow', 'custom', 'gradient', 'palette']);
  config.blendMode = random(['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn']);
  config.particleBehavior = random(['default', 'flock', 'followPath', 'audioReactive', 'gravity', 'explosion']);
  config.interactionMode = random(['none', 'attract', 'repel', 'swirl', 'distort']);
  config.is3DEffect = random() > 0.5;
  config.isPolarCoordinates = random() > 0.5;
  config.waveCombo = random(['single', 'additive', 'multiplicative', 'modulation']);
  
  updateUIControls();
}

function exportImage() {
  saveCanvas('wave_visualization', 'png');
}

let isRecording = false;
let recordedFrames = [];

function exportAnimation() {
  if (!isRecording) {
    isRecording = true;
    recordedFrames = [];
    select('#exportAnimation').html('Stop Recording');
  } else {
    isRecording = false;
    select('#exportAnimation').html('Export Animation');
    saveGif('wave_animation', recordedFrames, 30);
  }
}