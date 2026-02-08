(function () {
  'use strict';

  var GAMES = [
    { id: '1', title: 'Cyber Run', genre: 'Action', price: 29.99, oldPrice: 44.99, initial: 'CR', featured: true },
    { id: '2', title: 'Shadow Realm', genre: 'RPG', price: 49.99, oldPrice: 59.99, initial: 'SR', featured: true },
    { id: '3', title: 'Neon Drift', genre: 'Racing', price: 19.99, oldPrice: 24.99, initial: 'ND', featured: true },
    { id: '4', title: 'Void Hunter', genre: 'Shooter', price: 39.99, initial: 'VH', featured: false },
    { id: '5', title: 'Frost Peak', genre: 'Adventure', price: 34.99, oldPrice: 49.99, initial: 'FP', featured: false },
    { id: '6', title: 'Pulse Arena', genre: 'Fighting', price: 24.99, initial: 'PA', featured: false },
    { id: '7', title: 'Echo Protocol', genre: 'Strategy', price: 29.99, oldPrice: 39.99, initial: 'EP', featured: false },
    { id: '8', title: 'Star Forge', genre: 'Simulation', price: 44.99, initial: 'SF', featured: false },
    { id: '9', title: 'Dark Nexus', genre: 'Horror', price: 27.99, initial: 'DN', featured: false },
    { id: '10', title: 'Sky Breaker', genre: 'Action', price: 31.99, oldPrice: 45.99, initial: 'SB', featured: false }
  ];

  var STORAGE_USER = 'traw_user'; // session (no password)
  var STORAGE_ACCOUNT = 'traw_account'; // persistent account (contains password)
  var STORAGE_CART = 'traw_cart';

  // read account and session separately
  var account = JSON.parse(localStorage.getItem(STORAGE_ACCOUNT) || 'null');
  var user = JSON.parse(localStorage.getItem(STORAGE_USER) || 'null');

  // migrate older installs where account was stored under STORAGE_USER
  if (!account && user && user.password) {
    account = user;
    localStorage.setItem(STORAGE_ACCOUNT, JSON.stringify(account));
    user = null;
    localStorage.removeItem(STORAGE_USER);
  }

  var cart = JSON.parse(localStorage.getItem(STORAGE_CART) || '[]');

  var authModal = document.getElementById('auth-modal');
  var modalClose = document.getElementById('modal-close');
  var btnLogin = document.getElementById('btn-login');
  var btnUser = document.getElementById('btn-user');
  var btnLogout = document.getElementById('btn-logout');
  var formLogin = document.getElementById('form-login');
  var formRegister = document.getElementById('form-register');
  var loginError = document.getElementById('login-error');
  var registerError = document.getElementById('register-error');
  var authTabs = document.querySelectorAll('.auth-tab');
  var authForms = document.querySelectorAll('.auth-form');
  var featuredGrid = document.getElementById('featured-grid');
  var catalogGrid = document.getElementById('catalog-grid');
  var headerCartCount = document.getElementById('header-cart-count');
  var cartEmpty = document.getElementById('cart-empty');
  var cartList = document.getElementById('cart-list');
  var cartFooter = document.getElementById('cart-footer');
  var cartTotalEl = document.getElementById('cart-total');
  var btnCheckout = document.getElementById('btn-checkout');
  var menuToggle = document.getElementById('menu-toggle');
  var nav = document.querySelector('.nav');

  function saveCart() {
    localStorage.setItem(STORAGE_CART, JSON.stringify(cart));
    renderCartCount();
    renderCart();
  }

  function renderCartCount() {
    var total = cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    headerCartCount.textContent = total;
  }

  function formatPrice(n) {
    return '$' + Number(n).toFixed(2);
  }

  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('show'); });
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { toast.remove(); }, 300);
    }, 2500);
  }

  function getGameById(id) {
    return GAMES.find(function (g) { return g.id === id; });
  }

  function updateAuthUI() {
    if (user) {
      btnLogin.classList.add('hidden');
      btnUser.classList.remove('hidden');
      btnUser.querySelector('#user-name').textContent = user.name;
      btnLogout.classList.remove('hidden');
    } else {
      btnLogin.classList.remove('hidden');
      btnUser.classList.add('hidden');
      btnLogout.classList.add('hidden');
    }
  }

  function openAuthModal() {
    authModal.classList.add('open');
    setAuthTab('login');
    loginError.textContent = '';
    registerError.textContent = '';
  }

  function closeAuthModal() {
    authModal.classList.remove('open');
  }

  function setAuthTab(tab) {
    authTabs.forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });
    authForms.forEach(function (f) {
      var isLogin = f.id === 'form-login';
      f.classList.toggle('active', (tab === 'login' && isLogin) || (tab === 'register' && !isLogin));
    });
  }

  function normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
  }

  formLogin.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = normalizeEmail(document.getElementById('login-email').value);
    var password = document.getElementById('login-password').value;
    loginError.textContent = '';
    var stored = JSON.parse(localStorage.getItem(STORAGE_ACCOUNT) || 'null');
    if (!stored) {
      loginError.textContent = 'No account found. Please register.';
      return;
    }
    var storedEmail = normalizeEmail(stored.email);
    if (storedEmail !== email || stored.password !== password) {
      loginError.textContent = 'Invalid email or password.';
      return;
    }

    user = { name: stored.name, email: stored.email };
    // persist session only
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    updateAuthUI();
    closeAuthModal();
    formLogin.reset();
    showToast('Welcome back, ' + user.name + '!');
  });

  formRegister.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('reg-name').value.trim();
    var email = normalizeEmail(document.getElementById('reg-email').value);
    var password = document.getElementById('reg-password').value;
    registerError.textContent = '';

    if (password.length < 6) {
      registerError.textContent = 'Password must be at least 6 characters.';
      return;
    }

    var existing = JSON.parse(localStorage.getItem(STORAGE_ACCOUNT) || 'null');
    if (existing && normalizeEmail(existing.email) === email) {
      registerError.textContent = 'An account with this email already exists.';
      return;
    }

    var toStore = { name: name, email: email, password: password };
    // save persistent account and set session
    localStorage.setItem(STORAGE_ACCOUNT, JSON.stringify(toStore));
    user = { name: name, email: email };
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    updateAuthUI();
    closeAuthModal();
    formRegister.reset();
    showToast('Account created. Welcome, ' + name + '!');
  });

  authTabs.forEach(function (t) {
    t.addEventListener('click', function () {
      setAuthTab(t.getAttribute('data-tab'));
      loginError.textContent = '';
      registerError.textContent = '';
    });
  });

  btnLogout.addEventListener('click', function () {
    user = null;
    // only clear session, keep persistent account
    localStorage.removeItem(STORAGE_USER);
    updateAuthUI();
    showToast('You have been logged out.');
  });

  function addToCart(gameId) {
    var game = getGameById(gameId);
    if (!game) return;
    var entry = cart.find(function (i) { return i.id === gameId; });
    if (entry) entry.qty += 1;
    else cart.push({ id: gameId, qty: 1 });
    saveCart();
    showToast(game.title + ' added to cart.');
  }

  function removeFromCart(gameId) {
    cart = cart.filter(function (i) { return i.id !== gameId; });
    saveCart();
  }

  function renderCart() {
    if (cart.length === 0) {
      cartEmpty.classList.remove('hidden');
      cartList.classList.add('hidden');
      cartFooter.classList.add('hidden');
      return;
    }
    cartEmpty.classList.add('hidden');
    cartList.classList.remove('hidden');
    cartFooter.classList.remove('hidden');

    var total = 0;
    cartList.innerHTML = cart.map(function (item) {
      var game = getGameById(item.id);
      if (!game) return '';
      var subtotal = game.price * item.qty;
      total += subtotal;
      return (
        '<div class="cart-item" data-id="' + game.id + '">' +
          '<span class="cart-item-name">' + game.title + ' × ' + item.qty + '</span>' +
          '<span class="cart-item-price">' + formatPrice(subtotal) + '</span>' +
          '<button type="button" class="cart-item-remove" data-id="' + game.id + '" aria-label="Remove">×</button>' +
        '</div>'
      );
    }).join('');

    cartTotalEl.textContent = formatPrice(total);

    cartList.querySelectorAll('.cart-item-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removeFromCart(btn.getAttribute('data-id'));
      });
    });
  }

  btnCheckout.addEventListener('click', function () {
    if (cart.length === 0) return;
    if (!user) {
      showToast('Please log in to checkout.');
      openAuthModal();
      return;
    }
    var total = cart.reduce(function (sum, item) {
      var g = getGameById(item.id);
      return sum + (g ? g.price * item.qty : 0);
    }, 0);
    cart = [];
    saveCart();
    showToast('Thank you, ' + user.name + '! Order total: ' + formatPrice(total) + '. (Demo: no payment processed.)');
  });

  function renderGameCard(game, container) {
    var card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML =
      '<div class="game-card-cover">' + game.initial + '</div>' +
      '<div class="game-card-body">' +
        '<h3 class="game-card-title">' + game.title + '</h3>' +
        '<p class="game-card-meta">' + game.genre + '</p>' +
        '<div class="game-card-footer">' +
          '<span class="game-card-price">' +
            (game.oldPrice ? '<s>' + formatPrice(game.oldPrice) + '</s> ' : '') +
            formatPrice(game.price) +
          '</span>' +
          '<button type="button" class="btn btn-primary btn-add-cart" data-id="' + game.id + '">Add to Cart</button>' +
        '</div>' +
      '</div>';
    container.appendChild(card);
    card.querySelector('.btn-add-cart').addEventListener('click', function () {
      addToCart(game.id);
    });
  }

  function renderGameGrids() {
    featuredGrid.innerHTML = '';
    catalogGrid.innerHTML = '';
    GAMES.filter(function (g) { return g.featured; }).forEach(function (g) {
      renderGameCard(g, featuredGrid);
    });
    GAMES.forEach(function (g) {
      renderGameCard(g, catalogGrid);
    });
  }

  btnLogin.addEventListener('click', openAuthModal);
  modalClose.addEventListener('click', closeAuthModal);
  authModal.addEventListener('click', function (e) {
    if (e.target === authModal) closeAuthModal();
  });

  menuToggle.addEventListener('click', function () {
    nav.classList.toggle('open');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAuthModal();
  });

  updateAuthUI();
  renderCartCount();
  renderCart();
  renderGameGrids();
})();
