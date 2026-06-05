const revealItems = document.querySelectorAll(".reveal");
const heroVisual = document.querySelector(".hero-visual");

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
