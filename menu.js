const header = document.querySelector('.masthead');
const toggle = header.querySelector('.menu-toggle');
const compact = window.matchMedia('(max-width: 760px)');

function closeMenu(returnFocus = false) {
  toggle.setAttribute('aria-expanded', 'false');
  if (returnFocus) toggle.focus();
}

toggle.addEventListener('click', () => {
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
    closeMenu(true);
  }
});
document.addEventListener('pointerdown', event => {
  if (!header.contains(event.target)) closeMenu();
});
header.addEventListener('focusout', event => {
  if (event.relatedTarget && !header.contains(event.relatedTarget)) closeMenu();
});
compact.addEventListener('change', () => closeMenu());
window.addEventListener('pageshow', () => closeMenu());
header.classList.add('menu-ready');
