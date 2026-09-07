const button = document.querySelector('#run');
const state = document.querySelector('#state');
const steps = [...document.querySelectorAll('[data-step]')];
const preview = document.querySelector('#preview');

let running = false;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

button.addEventListener('click', async () => {
  if (running) return;
  running = true;
  button.disabled = true;
  button.textContent = 'Running…';
  state.textContent = 'processing';
  preview.hidden = true;
  steps.forEach((step) => step.classList.remove('done'));

  for (const step of steps) {
    await sleep(300);
    step.classList.add('done');
  }

  await sleep(180);
  preview.hidden = false;
  state.textContent = 'draft_ready';
  button.textContent = 'Run again';
  button.disabled = false;
  running = false;
});
