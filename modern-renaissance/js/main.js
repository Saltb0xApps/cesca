document.documentElement.classList.add('js');

/* overlay menu */
const menu = document.getElementById('menu');
const setMenu = (open) => {
  menu.classList.toggle('open', open);
  menu.setAttribute('aria-hidden', String(!open));
};
document.getElementById('menuOpen').addEventListener('click', () => setMenu(true));
document.getElementById('menuClose').addEventListener('click', () => setMenu(false));
menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* scroll reveal */
const revealTargets = document.querySelectorAll(
  '.about__text, .about__figure, .statement, .gatherings__head, .gatheringCard, ' +
  '.cta__content, .community__intro, .communityCard, .voice, .letterRow, .footer__subscribe'
);
revealTargets.forEach((el, i) => {
  el.setAttribute('data-reveal', '');
  el.style.transitionDelay = `${(i % 3) * 90}ms`;
});
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
revealTargets.forEach((el) => io.observe(el));

/* ornithopter drifts across the first image break as you scroll */
const drift = document.querySelector('.imageBreak--one .imageBreak__drift');
const driftSection = document.querySelector('.imageBreak--one');
if (drift && driftSection && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const onScroll = () => {
    const r = driftSection.getBoundingClientRect();
    const progress = 1 - (r.bottom / (innerHeight + r.height)); // 0 → 1 through viewport
    const x = (progress - 0.5) * 360;
    drift.style.transform = `translateX(${x}px)`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* subscribe form (front-end only — point it at Substack when ready) */
document.getElementById('subscribeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = e.target.querySelector('input');
  const msg = e.target.querySelector('.footer__formMsg');
  if (!input.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
    msg.textContent = 'Incorrect mail format';
    return;
  }
  msg.textContent = 'Thank you — check your inbox to confirm.';
  input.value = '';
});

/* year */
document.getElementById('year').textContent = new Date().getFullYear();
