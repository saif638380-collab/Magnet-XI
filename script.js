const revealItems = document.querySelectorAll(".reveal");
const agentButtons = document.querySelectorAll("[data-open-agent]");
const agentNudge = document.querySelector(".agent-nudge");
let agentWindowMonitor = null;
let agentNudgeDismissed = false;

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
  revealObserver.observe(item);
});

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
