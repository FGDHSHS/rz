const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { generateProducts, categories } = require('./data/products');

const PORT = process.env.PORT || 3000;
const ALL_PRODUCTS = generateProducts();
console.log(`✅ تم توليد ${ALL_PRODUCTS.length} منتج`);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}

function jsonRes(res, data, status=200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const q = parsed.query;

  // API Routes
  if (pathname.startsWith('/api/')) {
    
    if (pathname === '/api/products') {
      let results = [...ALL_PRODUCTS];
      if (q.category && q.category !== 'all') results = results.filter(p => p.category === q.category);
      if (q.inStock === 'true') results = results.filter(p => p.inStock);
      if (q.minPrice) results = results.filter(p => p.price >= Number(q.minPrice));
      if (q.maxPrice) results = results.filter(p => p.price <= Number(q.maxPrice));
      if (q.search) {
        const s = q.search.toLowerCase();
        results = results.filter(p => p.name.toLowerCase().includes(s) || p.brand.toLowerCase().includes(s) || p.categoryName.includes(s));
      }
      switch(q.sort) {
        case 'price_asc': results.sort((a,b)=>a.price-b.price); break;
        case 'price_desc': results.sort((a,b)=>b.price-a.price); break;
        case 'rating': results.sort((a,b)=>b.rating-a.rating); break;
        case 'discount': results.sort((a,b)=>b.discount-a.discount); break;
        case 'newest': results.sort((a,b)=>b.id-a.id); break;
        default: results.sort((a,b)=>b.reviews-a.reviews);
      }
      const total = results.length;
      const page = parseInt(q.page)||1;
      const limit = parseInt(q.limit)||24;
      const paginated = results.slice((page-1)*limit, page*limit);
      return jsonRes(res, { products: paginated, total, page, pages: Math.ceil(total/limit) });
    }

    if (pathname === '/api/featured') {
      const f = ALL_PRODUCTS.filter(p=>p.discount>=20||p.rating>=4.8).sort(()=>Math.random()-0.5).slice(0,12);
      return jsonRes(res, f);
    }

    if (pathname === '/api/deals') {
      const d = ALL_PRODUCTS.filter(p=>p.discount>0).sort((a,b)=>b.discount-a.discount).slice(0,20);
      return jsonRes(res, d);
    }

    if (pathname === '/api/stats') {
      const stats = {};
      Object.keys(categories).forEach(c => { stats[c] = { count: ALL_PRODUCTS.filter(p=>p.category===c).length, name: categories[c] }; });
      return jsonRes(res, { total: ALL_PRODUCTS.length, categories: stats });
    }

    if (pathname === '/api/search/suggest') {
      const s = (q.q||'').toLowerCase();
      if (s.length < 2) return jsonRes(res, []);
      const suggestions = [...new Set(ALL_PRODUCTS.filter(p=>p.name.toLowerCase().includes(s)||p.brand.toLowerCase().includes(s)).slice(0,8).map(p=>p.name))];
      return jsonRes(res, suggestions);
    }

    const idMatch = pathname.match(/^\/api\/products\/(\d+)$/);
    if (idMatch) {
      const product = ALL_PRODUCTS.find(p=>p.id===parseInt(idMatch[1]));
      if (!product) return jsonRes(res, {error:'not found'}, 404);
      const related = ALL_PRODUCTS.filter(p=>p.category===product.category&&p.id!==product.id).sort(()=>Math.random()-0.5).slice(0,8);
      return jsonRes(res, { product, related });
    }

    return jsonRes(res, {error:'not found'}, 404);
  }

  // Static Files
  let filePath;
  if (pathname === '/' || !pathname.includes('.')) {
    filePath = path.join(__dirname, 'public', 'index.html');
  } else {
    filePath = path.join(__dirname, 'public', pathname);
  }
  serveStatic(res, filePath);
});

server.listen(PORT, () => console.log(`🚀 Rovexa يعمل على http://localhost:${PORT}`));
