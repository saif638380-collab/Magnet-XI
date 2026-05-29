const revealItems = document.querySelectorAll(".reveal");
const agentButtons = document.querySelectorAll("[data-open-agent]");
const agentNudge = document.querySelector(".agent-nudge");
const heroVisual = document.querySelector(".hero-visual");
let agentWindowMonitor = null;
let agentNudgeDismissed = false;

function isMobileHeroView() {
  return window.matchMedia("(max-width: 720px)").matches;
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.14,
    rootMargin: "0px 0px -8% 0px",
  }
);

revealItems.forEach((item) => {
  if (item === heroVisual && isMobileHeroView()) {
    return;
  }

  revealObserver.observe(item);
});

if (heroVisual && isMobileHeroView()) {
  window.setTimeout(() => {
    heroVisual.classList.add("is-visible");
  }, 1300);
}

const launcherSelectors = [
  "chat-widget",
  "div[data-chat-widget]",
  "[data-chat-widget]",
  ".lc_text-widget",
  ".lc-chat-widget",
  ".chat-widget",
  "iframe[src*='leadconnector']",
  "iframe[src*='chat-widget']",
];

const nativeWidgetSelectors = [
  "chat-widget",
  "div[data-chat-widget]",
  "[data-chat-widget]",
  "iframe[src*='leadconnector']",
  "iframe[src*='chat-widget']",
];

const interactiveSelectors = [
  "button",
  "[role='button']",
  "a",
  ".button",
  "[class*='launcher']",
  "[class*='bubble']",
  "[class*='widget']",
];

function isLargeNativeWindow(element) {
  const rect = element.getBoundingClientRect();

  if (!rect.width || !rect.height) {
    return false;
  }

  return rect.width >= 240 && rect.height >= 280;
}

function hasLargeNativeWindow(root = document) {
  for (const selector of nativeWidgetSelectors) {
    const elements = root.querySelectorAll?.(selector) || [];

    for (const element of elements) {
      if (element !== agentNudge && !agentNudge?.contains(element) && isLargeNativeWindow(element)) {
        return true;
      }
    }
  }

  const elements = root.querySelectorAll?.("*") || [];

  for (const element of elements) {
    if (element.shadowRoot) {
      const nestedMatch = hasLargeNativeWindow(element.shadowRoot);

      if (nestedMatch) {
        return true;
      }
    }
  }

  return false;
}

function monitorAgentWindowVisibility() {
  window.clearInterval(agentWindowMonitor);

  let checks = 0;
  const maxChecks = 40;

  agentWindowMonitor = window.setInterval(() => {
    checks += 1;

    if (hasLargeNativeWindow()) {
      window.clearInterval(agentWindowMonitor);
      return;
    }

    if (checks >= maxChecks) {
      window.clearInterval(agentWindowMonitor);
    }
  }, 500);
}

function findAgentLauncher(root = document) {
  for (const selector of launcherSelectors) {
    const element = root.querySelector?.(selector);

    if (element) {
      return element;
    }
  }

  const elements = root.querySelectorAll?.("*") || [];

  for (const element of elements) {
    if (element.shadowRoot) {
      const nestedMatch = findAgentLauncher(element.shadowRoot);

      if (nestedMatch) {
        return nestedMatch;
      }
    }
  }

  return null;
}

function openAgentLauncher(launcher) {
  if (!launcher) {
    return false;
  }

  if (typeof launcher.open === "function") {
    launcher.open();
    return true;
  }

  if (typeof launcher.show === "function") {
    launcher.show();
    return true;
  }

  for (const selector of interactiveSelectors) {
    const target = launcher.shadowRoot?.querySelector(selector) || launcher.querySelector?.(selector);

    if (target) {
      target.click();
      return true;
    }
  }

  launcher.click?.();
  return true;
}

function triggerAgentLoad() {
  const events = ["pointerdown", "click", "keydown", "scroll"];

  events.forEach((eventName) => {
    document.dispatchEvent(new Event(eventName, { bubbles: true }));
    window.dispatchEvent(new Event(eventName, { bubbles: true }));
  });
}

function openAgentWithRetry() {
  document.body.classList.add("agent-widget-open");
  monitorAgentWindowVisibility();
  triggerAgentLoad();

  let attempts = 0;
  const maxAttempts = 24;
  const timer = window.setInterval(() => {
    attempts += 1;
    const launcher = findAgentLauncher();

    if (openAgentLauncher(launcher) || attempts >= maxAttempts) {
      window.clearInterval(timer);
    }
  }, 250);
}

agentButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (agentNudge && !agentNudgeDismissed) {
      agentNudge.classList.add("is-dismissed");
      agentNudgeDismissed = true;
    }

    openAgentWithRetry();
  });
});

function playNotificationSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    return;
  }

  const context = new AudioContext();
  const now = context.currentTime;

  [
    { frequency: 740, start: 0, duration: 0.22 },
    { frequency: 980, start: 0.18, duration: 0.34 },
  ].forEach(({ frequency, start, duration }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = now + start;
    const stopAt = startAt + duration;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt);
  });
}

if (agentNudge) {
  window.setTimeout(() => {
    if (!agentNudgeDismissed) {
      agentNudge.classList.add("is-visible");
      playNotificationSound();
    }
  }, 2000);
}

const heroCanvas = document.getElementById("canvas-3d");

if (heroCanvas && window.THREE) {
  let heroScene;
  let heroCamera;
  let heroRenderer;
  let heroPoints;
  let heroWireframe;
  let heroMouseX = 0;
  let heroMouseY = 0;
  let heroTargetX = 0;
  let heroTargetY = 0;

  const heroGeometry = new THREE.IcosahedronGeometry(6.2, 2);
  const heroPositions = heroGeometry.attributes.position;

  for (let i = 0; i < heroPositions.count; i += 1) {
    if (Math.random() > 0.42) {
      heroPositions.setX(i, heroPositions.getX(i) + (Math.random() - 0.5) * 0.7);
      heroPositions.setY(i, heroPositions.getY(i) + (Math.random() - 0.5) * 0.7);
      heroPositions.setZ(i, heroPositions.getZ(i) + (Math.random() - 0.5) * 0.7);
    }
  }

  function resizeHeroCanvas() {
    if (!heroRenderer || !heroCamera || !heroCanvas.clientWidth || !heroCanvas.clientHeight) {
      return;
    }

    heroCamera.aspect = heroCanvas.clientWidth / heroCanvas.clientHeight;
    heroCamera.updateProjectionMatrix();
    heroRenderer.setSize(heroCanvas.clientWidth, heroCanvas.clientHeight);
  }

  function initHeroScene() {
    heroScene = new THREE.Scene();
    heroCamera = new THREE.PerspectiveCamera(45, heroCanvas.clientWidth / heroCanvas.clientHeight, 0.1, 1000);
    heroCamera.position.z = 24;

    heroRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    heroRenderer.setSize(heroCanvas.clientWidth, heroCanvas.clientHeight);
    heroCanvas.appendChild(heroRenderer.domElement);

    heroScene.add(new THREE.AmbientLight(0xffffff, 0.86));

    const heroPointLight = new THREE.PointLight(0x4f46e5, 2, 50);
    heroPointLight.position.set(6, 6, 6);
    heroScene.add(heroPointLight);

    const heroPointsMaterial = new THREE.PointsMaterial({
      color: 0x4f46e5,
      size: 0.28,
      transparent: true,
      opacity: 0.94,
    });
    heroPoints = new THREE.Points(heroGeometry, heroPointsMaterial);
    heroScene.add(heroPoints);

    const heroWireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x4f46e5,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    heroWireframe = new THREE.Mesh(heroGeometry, heroWireframeMaterial);
    heroScene.add(heroWireframe);

    window.addEventListener("mousemove", (event) => {
      heroMouseX = (event.clientX - window.innerWidth / 2) / 75;
      heroMouseY = (event.clientY - window.innerHeight / 2) / 75;
    });

    window.addEventListener("resize", resizeHeroCanvas);
    resizeHeroCanvas();

    function animateHeroScene() {
      requestAnimationFrame(animateHeroScene);

      const elapsed = Date.now() * 0.0004;

      if (heroPoints && heroWireframe) {
        heroPoints.rotation.y = elapsed * 0.12;
        heroPoints.rotation.x = elapsed * 0.06;
        heroWireframe.rotation.y = elapsed * 0.12;
        heroWireframe.rotation.x = elapsed * 0.06;
      }

      heroTargetX += (heroMouseX - heroTargetX) * 0.05;
      heroTargetY += (heroMouseY - heroTargetY) * 0.05;
      heroCamera.position.x = heroTargetX;
      heroCamera.position.y = -heroTargetY;
      heroCamera.lookAt(heroScene.position);

      heroRenderer.render(heroScene, heroCamera);
    }

    animateHeroScene();
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    initHeroScene();
  } else {
    window.addEventListener("DOMContentLoaded", initHeroScene, { once: true });
  }
}
