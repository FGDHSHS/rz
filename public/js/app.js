// ─── STATE ─────────────────────────────────────────────────
const state = {
  cart: JSON.parse(localStorage.getItem('rovexa_cart') || '[]'),
  wishlist: JSON.parse(localStorage.getItem('rovexa_wishlist') || '[]'),
  currentPage: 'home',
  filters: { category: '', search: '', sort: '', page: 1, minPrice: '', maxPrice: '', inStock: false, hasDiscount: false },
  currentProduct: null,
  detailQty: 1,
  heroInterval: null,
  currentSlide: 0
};

// ─── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  updateWishlistBadge();
  loadHomePage();
  setupSearch();
  startHeroSlider();
});

// ─── NAVIGATION ─────────────────────────────────────────────
function navigate(page, data) {
  document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');
  state.currentPage = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  switch (page) {
    case 'home':
      document.getElementById('page-home').style.display = 'block';
      break;
    case 'products':
      document.getElementById('page-products').style.display = 'block';
      loadProducts();
      break;
    case 'detail':
      document.getElementById('page-detail').style.display = 'block';
      loadProductDetail(data);
      break;
    case 'deals':
      document.getElementById('page-deals').style.display = 'block';
      loadDeals();
      break;
  }
}

function filterCategory(cat) {
  state.filters = { ...state.filters, category: cat, page: 1, search: '' };
  document.getElementById('search-input').value = '';
  // Set radio button
  const radio = document.querySelector(`input[name="cat"][value="${cat}"]`);
  if (radio) radio.checked = true;
  navigate('products');
}

// ─── HERO SLIDER ────────────────────────────────────────────
function startHeroSlider() {
  state.heroInterval = setInterval(() => {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.dot');
    slides[state.currentSlide].classList.remove('active');
    dots[state.currentSlide].classList.remove('active');
    state.currentSlide = (state.currentSlide + 1) % slides.length;
    slides[state.currentSlide].classList.add('active');
    dots[state.currentSlide].classList.add('active');
  }, 4000);
}

function goSlide(n) {
  clearInterval(state.heroInterval);
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.dot');
  slides[state.currentSlide].classList.remove('active');
  dots[state.currentSlide].classList.remove('active');
  state.currentSlide = n;
  slides[n].classList.add('active');
  dots[n].classList.add('active');
  startHeroSlider();
}

// ─── SEARCH ──────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById('search-input');
  const suggestions = document.getElementById('search-suggestions');
  let timer;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { suggestions.style.display = 'none'; return; }
    timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.length > 0) {
          suggestions.innerHTML = data.map(s =>
            `<div class="search-suggestion-item" onclick="selectSuggestion('${s.replace(/'/g,"\\'")}')">🔍 ${s}</div>`
          ).join('');
          suggestions.style.display = 'block';
        } else { suggestions.style.display = 'none'; }
      } catch {}
    }, 300);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { suggestions.style.display = 'none'; doSearch(); }
    if (e.key === 'Escape') suggestions.style.display = 'none';
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-bar')) suggestions.style.display = 'none';
  });
}

function selectSuggestion(text) {
  document.getElementById('search-input').value = text;
  document.getElementById('search-suggestions').style.display = 'none';
  doSearch();
}

function doSearch() {
  const q = document.getElementById('search-input').value.trim();
  const cat = document.getElementById('search-cat').value;
  state.filters = { ...state.filters, search: q, category: cat, page: 1 };
  navigate('products');
}

// ─── HOME PAGE ───────────────────────────────────────────────
async function loadHomePage() {
  try {
    const [featured, deals, stats] = await Promise.all([
      fetch('/api/featured').then(r => r.json()),
      fetch('/api/deals').then(r => r.json()),
      fetch('/api/stats').then(r => r.json())
    ]);

    // Update category counts
    if (stats.categories) {
      Object.keys(stats.categories).forEach(cat => {
        const el = document.getElementById(`cat-count-${cat}`);
        if (el) el.textContent = `${stats.categories[cat].count} منتج`;
      });
    }

    renderProductsGrid(document.getElementById('featured-grid'), featured.slice(0, 8));
    renderProductsScroll(document.getElementById('deals-row'), deals.slice(0, 10));
  } catch(e) { console.error(e); }
}

// ─── PRODUCTS PAGE ───────────────────────────────────────────
async function loadProducts() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = `<div class="loading" style="grid-column:1/-1"><div class="spinner"></div> جاري التحميل...</div>`;

  const { category, search, sort, page, minPrice, maxPrice, inStock } = state.filters;
  const hasDiscount = document.getElementById('has-discount')?.checked;

  let url = `/api/products?page=${page}&limit=24`;
  if (category) url += `&category=${category}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (sort) url += `&sort=${sort}`;
  if (minPrice) url += `&minPrice=${minPrice}`;
  if (maxPrice) url += `&maxPrice=${maxPrice}`;
  if (inStock) url += `&inStock=true`;

  try {
    const data = await fetch(url).then(r => r.json());
    let { products, total, pages } = data;

    if (hasDiscount) products = products.filter(p => p.discount > 0);

    document.getElementById('results-info').textContent =
      `عرض ${Math.min(24, products.length)} من ${total} منتج${search ? ` لـ "${search}"` : ''}`;

    if (products.length === 0) {
      grid.innerHTML = `<div class="loading" style="grid-column:1/-1">😕 لا توجد نتائج</div>`;
    } else {
      renderProductsGrid(grid, products);
    }
    renderPagination(pages, page);
  } catch(e) {
    grid.innerHTML = `<div class="loading" style="grid-column:1/-1">❌ خطأ في التحميل</div>`;
  }
}

function applyFilters() {
  const cat = document.querySelector('input[name="cat"]:checked')?.value || '';
  const sort = document.getElementById('sort-select')?.value || '';
  const minPrice = document.getElementById('min-price')?.value || '';
  const maxPrice = document.getElementById('max-price')?.value || '';
  const inStock = document.getElementById('in-stock')?.checked || false;

  state.filters = { ...state.filters, category: cat, sort, minPrice, maxPrice, inStock, page: 1 };
  loadProducts();
}

function clearFilters() {
  state.filters = { category: '', search: '', sort: '', page: 1, minPrice: '', maxPrice: '', inStock: false };
  document.querySelectorAll('input[name="cat"]')[0].checked = true;
  document.getElementById('sort-select').value = '';
  if (document.getElementById('min-price')) document.getElementById('min-price').value = '';
  if (document.getElementById('max-price')) document.getElementById('max-price').value = '';
  if (document.getElementById('in-stock')) document.getElementById('in-stock').checked = false;
  if (document.getElementById('has-discount')) document.getElementById('has-discount').checked = false;
  loadProducts();
}

function setPrice(min, max) {
  document.getElementById('min-price').value = min || '';
  document.getElementById('max-price').value = max < 99999 ? max : '';
  applyFilters();
}

function setView(view) {
  const grid = document.getElementById('products-grid');
  document.getElementById('grid-view-btn').classList.toggle('active', view === 'grid');
  document.getElementById('list-view-btn').classList.toggle('active', view === 'list');
  grid.classList.toggle('list-view', view === 'list');
}

function toggleFilters() {
  document.getElementById('filters-sidebar').classList.toggle('open');
}

function renderPagination(totalPages, currentPage) {
  const el = document.getElementById('pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹ السابق</button>`;

  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  if (start > 1) html += `<button class="page-btn" onclick="goPage(1)">1</button>${start > 2 ? '<span>...</span>' : ''}`;
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  if (end < totalPages) html += `${end < totalPages-1 ? '<span>...</span>' : ''}<button class="page-btn" onclick="goPage(${totalPages})">${totalPages}</button>`;
  html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>التالي ›</button>`;

  el.innerHTML = html;
}

function goPage(n) {
  state.filters.page = n;
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── PRODUCT DETAIL ──────────────────────────────────────────
async function loadProductDetail(id) {
  document.getElementById('page-detail').innerHTML = `<div class="container"><div class="loading"><div class="spinner"></div> جاري التحميل...</div></div>`;
  navigate('detail'); // will set to loading state

  try {
    const data = await fetch(`/api/products/${id}`).then(r => r.json());
    const { product: p, related } = data;
    state.currentProduct = p;
    state.detailQty = 1;

    // Rebuild detail page
    document.getElementById('page-detail').innerHTML = `
      <div class="container">
        <div class="breadcrumb">
          <span onclick="navigate('home')">الرئيسية</span>
          <span class="sep">›</span>
          <span onclick="filterCategory('${p.category}')">${p.categoryName}</span>
          <span class="sep">›</span>
          <span>${p.brand}</span>
        </div>
        <div class="product-detail">
          <div class="detail-gallery">
            <img id="detail-main-img" src="${p.image}" alt="${p.name}" onerror="this.src='https://picsum.photos/400/400?random=${p.id}'">
            <div class="detail-thumbs" id="detail-thumbs"></div>
          </div>
          <div class="detail-info">
            <div class="detail-brand">${p.brand}</div>
            <h1 id="detail-name">${p.name}</h1>
            <div class="detail-rating">
              ${renderStars(p.rating)}
              <span style="color:var(--text-muted);font-size:14px">${p.rating} (${p.reviews.toLocaleString('ar')} تقييم)</span>
            </div>
            <div class="detail-price-box">
              <span class="detail-price">${p.price.toLocaleString('ar')} <span style="font-size:18px;font-weight:600">ر.س</span></span>
              ${p.discount > 0 ? `<span class="detail-original">${p.originalPrice.toLocaleString('ar')} ر.س</span><span class="detail-discount">خصم ${p.discount}%</span>` : ''}
            </div>
            ${p.isPrime ? '<div class="detail-prime">✓ Rovexa Prime - شحن مجاني سريع</div>' : ''}
            <div class="detail-stock ${p.inStock ? 'in-stock' : 'out-of-stock'}">${p.inStock ? '✅ متوفر في المخزون' : '❌ غير متوفر حالياً'}</div>
            <div class="detail-desc">${p.description}</div>
            <div class="detail-actions">
              <div class="qty-selector">
                <button onclick="changeQty(-1)">−</button>
                <span id="qty-display">1</span>
                <button onclick="changeQty(1)">+</button>
              </div>
              <button class="add-to-cart-btn" onclick="addDetailToCart()" ${!p.inStock ? 'disabled' : ''}>🛒 أضف إلى السلة</button>
              <button class="wishlist-btn" id="detail-wishlist-btn" onclick="toggleWishlistDetail()">
                ${state.wishlist.includes(p.id) ? '❤️' : '♡'} المفضلة
              </button>
            </div>
          </div>
        </div>
        <div class="related-section">
          <h2>منتجات مشابهة</h2>
          <div class="products-grid" id="related-grid"></div>
        </div>
      </div>`;

    // Thumbnails (use same image with different seeds)
    const thumbsEl = document.getElementById('detail-thumbs');
    thumbsEl.innerHTML = [0,1,2,3].map((_, i) =>
      `<img class="detail-thumb ${i===0?'active':''}" src="${p.image.replace(/\/\d+\/\d+$/, '/400/400')}${i>0?`?t=${i}`:''}" 
       onclick="swapMainImg(this)" alt="">`
    ).join('');

    renderProductsGrid(document.getElementById('related-grid'), related);
  } catch(e) {
    console.error(e);
  }
}

function swapMainImg(thumb) {
  document.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
  document.getElementById('detail-main-img').src = thumb.src;
}

function changeQty(delta) {
  state.detailQty = Math.max(1, Math.min(10, state.detailQty + delta));
  document.getElementById('qty-display').textContent = state.detailQty;
}

function addDetailToCart() {
  if (state.currentProduct) {
    addToCart(state.currentProduct, state.detailQty);
  }
}

function toggleWishlistDetail() {
  if (!state.currentProduct) return;
  toggleWishlist(state.currentProduct.id);
  const btn = document.getElementById('detail-wishlist-btn');
  if (btn) btn.innerHTML = state.wishlist.includes(state.currentProduct.id) ? '❤️ المفضلة' : '♡ المفضلة';
}

// ─── DEALS PAGE ──────────────────────────────────────────────
async function loadDeals() {
  const grid = document.getElementById('deals-grid');
  if (!grid) return;
  grid.innerHTML = `<div class="loading" style="grid-column:1/-1"><div class="spinner"></div></div>`;
  try {
    const deals = await fetch('/api/deals').then(r => r.json());
    renderProductsGrid(grid, deals);
  } catch(e) {}
}

// ─── RENDER HELPERS ──────────────────────────────────────────
function renderProductsGrid(container, products) {
  if (!container) return;
  if (!products.length) {
    container.innerHTML = '<div class="loading" style="grid-column:1/-1">لا توجد منتجات</div>';
    return;
  }
  container.innerHTML = products.map(p => createProductCard(p)).join('');
}

function renderProductsScroll(container, products) {
  if (!container) return;
  container.innerHTML = products.map(p => createProductCard(p)).join('');
}

function createProductCard(p) {
  const inWishlist = state.wishlist.includes(p.id);
  const badgeClass = p.badge === 'خصم كبير' ? 'badge-deal' : p.badge === 'عرض خاص' ? 'badge-offer' : 'badge-new';

  return `
  <div class="product-card" onclick="navigate('detail', ${p.id})">
    ${p.badge ? `<div class="card-badge ${badgeClass}">${p.badge}</div>` : ''}
    <button class="card-wishlist ${inWishlist ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist(${p.id}, this)">
      ${inWishlist ? '❤️' : '♡'}
    </button>
    <div class="card-img-wrap">
      <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://picsum.photos/seed/err${p.id}/400/400'">
    </div>
    <div class="card-body">
      <div class="card-brand">${p.brand}</div>
      <div class="card-name">${p.name}</div>
      <div class="card-rating">
        <span class="stars">${renderStarsText(p.rating)}</span>
        <span class="rating-num">${p.rating} (${p.reviews.toLocaleString('ar')})</span>
      </div>
      <div class="card-price-row">
        <span class="card-price">${p.price.toLocaleString('ar')}</span>
        <span class="card-currency">ر.س</span>
        ${p.discount > 0 ? `<span class="card-original">${p.originalPrice.toLocaleString('ar')}</span><span class="card-discount">-%${p.discount}</span>` : ''}
      </div>
      ${p.isPrime ? '<div class="card-prime">✓ Prime</div>' : ''}
      ${!p.inStock ? '<div class="card-out">غير متوفر</div>' : ''}
    </div>
    <div class="card-footer">
      <button class="add-to-cart" onclick="event.stopPropagation(); quickAddToCart(${p.id})" ${!p.inStock ? 'disabled' : ''}>
        ${p.inStock ? '🛒 أضف للسلة' : 'غير متوفر'}
      </button>
    </div>
  </div>`;
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '<span class="stars">';
  for (let i = 0; i < full; i++) html += '★';
  if (half) html += '½';
  for (let i = full + (half ? 1 : 0); i < 5; i++) html += '☆';
  return html + '</span>';
}

function renderStarsText(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let s = '';
  for (let i = 0; i < full; i++) s += '★';
  if (half) s += '½';
  for (let i = full + (half ? 1 : 0); i < 5; i++) s += '☆';
  return s;
}

// ─── CART ────────────────────────────────────────────────────
async function quickAddToCart(productId) {
  try {
    const data = await fetch(`/api/products/${productId}`).then(r => r.json());
    addToCart(data.product, 1);
  } catch(e) { showToast('خطأ في إضافة المنتج', 'error'); }
}

function addToCart(product, qty = 1) {
  const existing = state.cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, 10);
  } else {
    state.cart.push({ ...product, qty });
  }
  saveCart();
  updateCartBadge();
  renderCartSidebar();
  showToast(`✅ تمت إضافة "${product.name.slice(0, 30)}..." للسلة`, 'success');
}

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  saveCart();
  updateCartBadge();
  renderCartSidebar();
}

function updateCartQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, Math.min(10, item.qty + delta));
  saveCart();
  updateCartBadge();
  renderCartSidebar();
}

function saveCart() {
  localStorage.setItem('rovexa_cart', JSON.stringify(state.cart));
}

function updateCartBadge() {
  const total = state.cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cart-count').textContent = total;
}

function renderCartSidebar() {
  const el = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');

  if (!state.cart.length) {
    el.innerHTML = `<div class="cart-empty"><div>🛒</div><p>سلتك فارغة</p><p style="font-size:13px;margin-top:8px">أضف منتجات للبدء بالتسوق</p></div>`;
    totalEl.textContent = '0';
    return;
  }

  el.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="" onerror="this.src='https://picsum.photos/70/70?random=${item.id}'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name.slice(0, 45)}${item.name.length > 45 ? '...' : ''}</div>
        <div class="cart-item-price">${item.price.toLocaleString('ar')} ر.س</div>
        <div class="cart-item-actions">
          <button class="cart-item-qty-btn" onclick="updateCartQty(${item.id}, -1)">−</button>
          <span class="cart-item-qty">${item.qty}</span>
          <button class="cart-item-qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
          <button class="cart-remove" onclick="removeFromCart(${item.id})">🗑️ حذف</button>
        </div>
      </div>
    </div>`).join('');

  const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  totalEl.textContent = total.toLocaleString('ar');
}

function toggleCart() {
  const sidebar = document.getElementById('cart-sidebar');
  const overlay = document.getElementById('cart-overlay');
  const isOpen = sidebar.classList.contains('open');
  if (!isOpen) renderCartSidebar();
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
  document.body.style.overflow = isOpen ? '' : 'hidden';
}

function checkout() {
  if (!state.cart.length) { showToast('سلتك فارغة!', 'error'); return; }
  const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  showToast(`🎉 تم تأكيد طلبك! المجموع: ${total.toLocaleString('ar')} ر.س`, 'success');
  state.cart = [];
  saveCart();
  updateCartBadge();
  renderCartSidebar();
  setTimeout(toggleCart, 1500);
}

// ─── WISHLIST ────────────────────────────────────────────────
function toggleWishlist(id, btn) {
  const idx = state.wishlist.indexOf(id);
  if (idx === -1) {
    state.wishlist.push(id);
    if (btn) { btn.textContent = '❤️'; btn.classList.add('active'); }
    showToast('❤️ تمت الإضافة إلى المفضلة', 'info');
  } else {
    state.wishlist.splice(idx, 1);
    if (btn) { btn.textContent = '♡'; btn.classList.remove('active'); }
    showToast('تمت الإزالة من المفضلة', 'info');
  }
  localStorage.setItem('rovexa_wishlist', JSON.stringify(state.wishlist));
  updateWishlistBadge();
}

function updateWishlistBadge() {
  document.getElementById('wishlist-count').textContent = state.wishlist.length;
}

// ─── TOAST ───────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}
