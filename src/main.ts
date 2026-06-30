import { createIcons, ArrowDown } from "lucide";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import honorsRaw from "./content/honors.md?raw";
import "./style.css";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
createIcons({ icons: { ArrowDown } });

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollCue = document.querySelector<HTMLButtonElement>(".scroll-cue");
const honorList = document.querySelector<HTMLElement>("[data-honor-list]");
const canvas = document.querySelector<HTMLCanvasElement>("#particle-field");
const ctx = canvas?.getContext("2d", { alpha: true });
const sections = Array.from(document.querySelectorAll<HTMLElement>(".panel"));
const dots = Array.from(document.querySelectorAll<HTMLButtonElement>(".page-dot"));
let activeSection = 0;
let isSectionAnimating = false;
let sectionUnlockTimer: number | undefined;

type Particle = {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
};

const particles: Particle[] = [];
const pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  active: false,
};

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  seedParticles();
}

function seedParticles() {
  particles.length = 0;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const count = Math.min(170, Math.max(70, Math.floor((width * height) / 14500)));
  const mirrorWidth = Math.min(width * 0.78, 980);
  const mirrorHeight = Math.min(height * 0.5, 460);
  const cx = width / 2;
  const cy = height / 2;

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const ring = Math.sqrt(Math.random());
    const ox = cx + Math.cos(angle) * mirrorWidth * 0.5 * ring;
    const oy = cy + Math.sin(angle) * mirrorHeight * 0.5 * ring;

    particles.push({
      x: ox + (Math.random() - 0.5) * width * 0.8,
      y: oy + (Math.random() - 0.5) * height * 0.8,
      ox,
      oy,
      vx: 0,
      vy: 0,
      radius: Math.random() * 1.1 + 0.35,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function drawParticles(time = 0) {
  if (!canvas || !ctx) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.48,
    0,
    width * 0.5,
    height * 0.48,
    Math.max(width, height) * 0.62,
  );
  gradient.addColorStop(0, "rgba(245, 245, 240, 0.07)");
  gradient.addColorStop(0.46, "rgba(52, 65, 214, 0.04)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const sweep = (Math.sin(time * 0.00024) + 1) * 0.5;
  const beamX = width * (0.16 + sweep * 0.68);
  const beam = ctx.createLinearGradient(beamX - width * 0.36, 0, beamX + width * 0.24, height);
  beam.addColorStop(0, "rgba(255,255,255,0)");
  beam.addColorStop(0.43, "rgba(255,255,255,0.02)");
  beam.addColorStop(0.5, "rgba(255,255,255,0.13)");
  beam.addColorStop(0.56, "rgba(52,65,214,0.11)");
  beam.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(beamX - width * 0.48, 0);
  ctx.lineTo(beamX - width * 0.16, 0);
  ctx.lineTo(beamX + width * 0.36, height);
  ctx.lineTo(beamX + width * 0.02, height);
  ctx.closePath();
  ctx.fill();

  const mirrorGlow = ctx.createRadialGradient(width * 0.5, height * 0.52, 0, width * 0.5, height * 0.52, Math.min(width, height) * 0.44);
  mirrorGlow.addColorStop(0, "rgba(255,255,255,0.08)");
  mirrorGlow.addColorStop(0.48, "rgba(52,65,214,0.045)");
  mirrorGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = mirrorGlow;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  particles.forEach((particle, index) => {
    const wave = Math.sin(time * 0.00072 + particle.phase) * 5;
    const targetX = particle.ox + Math.cos(particle.phase + time * 0.00018) * wave;
    const targetY = particle.oy + Math.sin(particle.phase + time * 0.00015) * wave;
    const dx = targetX - particle.x;
    const dy = targetY - particle.y;

    particle.vx += dx * 0.015;
    particle.vy += dy * 0.015;

    if (pointer.active) {
      const px = particle.x - pointer.x;
      const py = particle.y - pointer.y;
      const distance = Math.hypot(px, py);
      if (distance < 130 && distance > 0) {
        const force = (130 - distance) / 130;
        particle.vx += (px / distance) * force * 0.22;
        particle.vy += (py / distance) * force * 0.22;
      }
    }

    particle.vx *= 0.88;
    particle.vy *= 0.88;
    particle.x += particle.vx;
    particle.y += particle.vy;

    const pulse = 0.32 + Math.sin(time * 0.0012 + particle.phase) * 0.18;
    ctx.beginPath();
    ctx.fillStyle = `rgba(238, 237, 232, ${0.18 + pulse * 0.24})`;
    ctx.shadowColor = index % 17 === 0 ? "rgba(52, 65, 214, 0.42)" : "rgba(255, 255, 255, 0.18)";
    ctx.shadowBlur = index % 17 === 0 ? 12 : 5;
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  if (!reduceMotion) {
    requestAnimationFrame(drawParticles);
  }
}

function renderHonors() {
  if (!honorList) return;

  const entries = honorsRaw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).split("|").map((part) => part.trim()))
    .filter((parts) => parts.length >= 2)
    .map(([year, ...descriptionParts]) => ({ year, description: descriptionParts.join(" | ") }));

  honorList.innerHTML = entries
    .map(
      (entry) => `
        <article class="honor-item">
          <time>${entry.year}</time>
          <p>${entry.description}</p>
        </article>
      `,
    )
    .join("");
}

function setActiveDot(index: number) {
  dots.forEach((dot, dotIndex) => {
    const active = dotIndex === index;
    dot.classList.toggle("is-active", active);
    dot.setAttribute("aria-current", active ? "true" : "false");
  });
}

function goToSection(index: number) {
  const nextIndex = Math.max(0, Math.min(sections.length - 1, index));
  const section = sections[nextIndex];
  if (!section || isSectionAnimating || nextIndex === activeSection) return;

  activeSection = nextIndex;
  setActiveDot(activeSection);

  if (reduceMotion) {
    section.scrollIntoView();
    return;
  }

  isSectionAnimating = true;
  window.clearTimeout(sectionUnlockTimer);
  gsap.to(window, {
    duration: 0.62,
    ease: "power2.out",
    scrollTo: { y: section.offsetTop, autoKill: false },
  });
  sectionUnlockTimer = window.setTimeout(() => {
    isSectionAnimating = false;
  }, 520);
}

function setupSectionNavigation() {
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const target = Number(dot.dataset.sectionIndex ?? 0);
      goToSection(target);
    });
  });

  scrollCue?.addEventListener("click", () => goToSection(1));

  window.addEventListener(
    "wheel",
    (event) => {
      if (reduceMotion) return;
      if (isSectionAnimating || Math.abs(event.deltaY) < 12) return;

      const lastIndex = sections.length - 1;
      const lastSectionTop = sections[lastIndex]?.offsetTop ?? 0;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollingInsideLastSection =
        activeSection === lastIndex &&
        ((event.deltaY > 0 && window.scrollY < maxScroll - 2) ||
          (event.deltaY < 0 && window.scrollY > lastSectionTop + 2));

      if (scrollingInsideLastSection) return;

      event.preventDefault();
      goToSection(activeSection + (event.deltaY > 0 ? 1 : -1));
    },
    { passive: false },
  );

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      goToSection(activeSection + 1);
    }

    if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      goToSection(activeSection - 1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      goToSection(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      goToSection(sections.length - 1);
    }
  });

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: () => {
      if (isSectionAnimating) return;
      const nearest = sections.reduce(
        (best, section, index) => {
          const distance = Math.abs(window.scrollY - section.offsetTop);
          return distance < best.distance ? { index, distance } : best;
        },
        { index: activeSection, distance: Number.POSITIVE_INFINITY },
      );
      activeSection = nearest.index;
      setActiveDot(activeSection);
    },
  });
}

function setupMotion() {
  if (reduceMotion) {
    document.documentElement.classList.add("reduced-motion");
    return;
  }

  gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from("#hero-title", { opacity: 0, y: 36, scale: 0.98, filter: "blur(18px)", duration: 1.25 })
    .from(".scroll-cue", { opacity: 0, y: -14, duration: 0.7 }, "-=0.35");

  gsap.from("[data-product]", {
    scrollTrigger: {
      trigger: "#products",
      start: "top 62%",
      end: "bottom 30%",
      scrub: 0.8,
    },
    opacity: 0.42,
    stagger: 0.08,
    ease: "none",
  });

  gsap.from(".honor-item", {
    scrollTrigger: {
      trigger: "#honors",
      start: "top 62%",
    },
    opacity: 0,
    y: 24,
    duration: 0.75,
    stagger: 0.08,
    ease: "power2.out",
  });
}

function setupProductTilt() {
  document.querySelectorAll<HTMLElement>("[data-product]").forEach((product) => {
    product.addEventListener("pointermove", (event) => {
      const rect = product.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      product.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
      product.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
      product.style.setProperty("--tilt-x", `${-y * 4}deg`);
      product.style.setProperty("--tilt-y", `${x * 5}deg`);
    });

    product.addEventListener("pointerleave", () => {
      product.style.removeProperty("--spot-x");
      product.style.removeProperty("--spot-y");
      product.style.setProperty("--tilt-x", "0deg");
      product.style.setProperty("--tilt-y", "0deg");
    });
  });
}

window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
});

window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

window.addEventListener("resize", resizeCanvas);

renderHonors();
resizeCanvas();
drawParticles();
setupSectionNavigation();
setupMotion();
setupProductTilt();
