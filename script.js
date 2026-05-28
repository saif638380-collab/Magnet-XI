const revealItems = document.querySelectorAll(".reveal");
const agentButtons = document.querySelectorAll("[data-open-agent]");

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

const interactiveSelectors = [
  "button",
  "[role='button']",
  "a",
  ".button",
  "[class*='launcher']",
  "[class*='bubble']",
  "[class*='widget']",
];

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
  document.body.classList.add("agent-widget-visible");
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
  button.addEventListener("click", openAgentWithRetry);
});
