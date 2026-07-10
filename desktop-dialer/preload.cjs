// Preload — bridges the deep-link number into PopTox's dial field.
// Runs in an isolated world with access to DOM but not Node internals.
const { ipcRenderer } = require('electron');

ipcRenderer.on('dial-number', (_event, rawNumber) => {
  fillDialpad(String(rawNumber || ''));
});

function fillDialpad(number) {
  // Wait for the dialpad to render, then find the display field.
  // PopTox uses an input with id="output" as the dialed-number display.
  const attempt = (tries) => {
    const field =
      document.getElementById('output') ||
      document.querySelector('input[type="text"], input[type="tel"], input#num');
    if (!field) {
      if (tries > 0) return setTimeout(() => attempt(tries - 1), 300);
      return;
    }
    // Native input value setter so React/vanilla listeners both see the change.
    const proto = Object.getPrototypeOf(field);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(field, number);
    else field.value = number;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.focus();
    ipcRenderer.send('dial-log', `filled ${number}`);
    flashHint(number);
  };
  attempt(20);
}

function flashHint(number) {
  const el = document.createElement('div');
  el.textContent = `Ready to dial ${number} — press the green call button`;
  Object.assign(el.style, {
    position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)',
    background: '#f59e0b', color: '#000', padding: '8px 14px', borderRadius: '8px',
    fontFamily: 'system-ui, sans-serif', fontSize: '13px', fontWeight: '600',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: '999999',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
