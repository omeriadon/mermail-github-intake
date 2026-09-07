const button = document.querySelector('#run');
const state = document.querySelector('#state');
const steps = [...document.querySelectorAll('[data-step]')];
const preview = document.querySelector('#preview');
const fingerprintNode = document.querySelector('#fingerprint');

let running = false;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function demoFingerprint() {
  const canonical = JSON.stringify({
    repository: 'example/acme',
    title: 'Export freezes after attaching a 4K screenshot',
    body: 'Observed: export remains Preparing. Expected: PDF export completes. Source: thr_demo_001/msg_demo_001',
    labels: [],
    mailboxId: 'demo-mailbox-public-id',
    threadId: 'thr_demo_001',
    messageId: 'msg_demo_001',
  });
  return `sha256:${await sha256(canonical)}`;
}

button.addEventListener('click', async () => {
  if (running) return;
  running = true;
  button.disabled = true;
  button.textContent = 'Running…';
  state.textContent = 'processing';
  preview.hidden = true;
  fingerprintNode.textContent = 'computing…';
  steps.forEach((step) => step.classList.remove('done'));

  for (const step of steps) {
    await sleep(300);
    step.classList.add('done');
  }

  fingerprintNode.textContent = await demoFingerprint();
  await sleep(180);
  preview.hidden = false;
  state.textContent = 'draft_ready';
  button.textContent = 'Run again';
  button.disabled = false;
  running = false;
});
