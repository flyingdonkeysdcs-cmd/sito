/* ==========================================================
   MENU MOBILE (hamburger)
   - apre/chiude il menu con il pulsante
   - si chiude cliccando un link, cliccando fuori dall'header
     o premendo Esc
   - chiudendo il menu si chiude anche il roster mobile
   ========================================================== */

(() => {

  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileMenu       = document.getElementById('mobileMenu');
  const siteHeader       = document.querySelector('.site-header');

  if (!mobileMenuToggle || !mobileMenu) return;


  function closeMobileMenu() {
    mobileMenu.classList.remove('is-open');
    mobileMenuToggle.classList.remove('is-open');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');

    // Chiude anche il roster mobile
    const mobileRosterMenu = document.getElementById('mobileRosterMenu');
    const openMobileRoster = document.getElementById('openMobileRoster');

    if (mobileRosterMenu) {
      mobileRosterMenu.hidden = true;
    }

    if (openMobileRoster) {
      openMobileRoster.classList.remove('is-open');
      openMobileRoster.setAttribute('aria-expanded', 'false');
    }
  }


  mobileMenuToggle.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();

    const isOpen = mobileMenu.classList.toggle('is-open');

    mobileMenuToggle.classList.toggle('is-open', isOpen);
    mobileMenuToggle.setAttribute('aria-expanded', String(isOpen));
  });


  // Chiude il menu cliccando i link di navigazione
  mobileMenu
    .querySelectorAll('.mobile-nav a')
    .forEach(link => link.addEventListener('click', closeMobileMenu));


  // Chiude cliccando fuori dall'header
  document.addEventListener('click', event => {
    if (!mobileMenu.classList.contains('is-open')) return;
    if (siteHeader && siteHeader.contains(event.target)) return;

    closeMobileMenu();
  });


  // Esc chiude il menu
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMobileMenu();
    }
  });

})();
