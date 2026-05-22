// ==========================================================
// MOBILE HAMBURGER MENU
// ==========================================================

const mobileMenuToggle =
  document.getElementById('mobileMenuToggle');

const mobileMenu =
  document.getElementById('mobileMenu');

const siteHeader =
  document.querySelector('.site-header');

if (mobileMenuToggle && mobileMenu) {

  function closeMobileMenu() {

    mobileMenu.classList.remove('is-open');

    mobileMenuToggle.classList.remove('is-open');

    mobileMenuToggle.setAttribute(
      'aria-expanded',
      'false'
    );

  }

  mobileMenuToggle.addEventListener(
    'click',
    function(event){

      event.preventDefault();

      event.stopPropagation();

      const isOpen =
        mobileMenu.classList.toggle('is-open');

      mobileMenuToggle.classList.toggle(
        'is-open',
        isOpen
      );

      mobileMenuToggle.setAttribute(
        'aria-expanded',
        String(isOpen)
      );

    }
  );

  // chiude menu cliccando i link nav

  mobileMenu
    .querySelectorAll('.header-nav a')
    .forEach(function(link){

      link.addEventListener(
        'click',
        closeMobileMenu
      );

    });

  // chiude cliccando fuori

  document.addEventListener(
    'click',
    function(event){

      if (
        !mobileMenu.classList.contains('is-open')
      ) return;

      if (
        siteHeader &&
        siteHeader.contains(event.target)
      ) return;

      closeMobileMenu();

    }
  );

  // ESC chiude menu

  document.addEventListener(
    'keydown',
    function(event){

      if (event.key === 'Escape') {

        closeMobileMenu();

      }

    }
  );

}