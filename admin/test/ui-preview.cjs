// Isolated visual review of the production build. No real API requests or orders.
// Run from repository root: node admin/test/ui-preview.cjs
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const dist = path.resolve(__dirname, "../dist");

async function start() {
  const { fallbackProducts } = await import(pathToFileURL(path.resolve(__dirname, "../src/lib/catalog.js")));
  const extras = ["Serum dưỡng ẩm", "Kem dưỡng dịu nhẹ", "Toner hoa cúc", "Kem chống nắng", "Mặt nạ cấp ẩm"].map((name, index) => ({ _id: `beauty-${index}`, name, category: "Làm đẹp", price: 360000 + index * 30000, images: [], stock: 20 }));
  const products = [...fallbackProducts, ...extras].map((product, index) => ({ ...product, stock: 20, originalPrice: Math.round(product.price / .8), averageRating: 4.8, sold: 100 + index * 12, sellerName: "Net Select", createdAt: "2026-11-24" }));
  const fixture = `<script>
    window.__uiFixture = true;
    const fixtureProducts = ${JSON.stringify(products)};
    for (const [key,value] of Object.entries({user:'Khách mẫu',email:'ui@example.test',role:'customer',token:'local-visual-fixture'})) localStorage.setItem('net_store_'+key,value);
    if (!localStorage.getItem('net_store_cart_ui@example.test')) localStorage.setItem('net_store_cart_ui@example.test', JSON.stringify([{...fixtureProducts.find(p=>p._id==='skincare-set'),quantity:1}]));
    let fixtureItems = JSON.parse(localStorage.getItem('net_store_cart_ui@example.test')).map(item=>({product:fixtureProducts.find(p=>p._id===item._id),quantity:item.quantity}));
    window.fetch = async (url,options={}) => {
      if (url.endsWith('/products')) return Response.json(fixtureProducts);
      if (url.endsWith('/cart/web')) {
        if(options.method==='PUT') fixtureItems=JSON.parse(options.body).items.map(item=>({product:fixtureProducts.find(p=>p._id===item.productId),quantity:item.quantity}));
        return Response.json({cart:{items:fixtureItems}});
      }
      if(url.endsWith('/payments/methods')) return Response.json({cod:true,vnpay:true});
      if(url.endsWith('/auth/addresses')) return Response.json({addresses:[{_id:'home',fullName:'Nguyễn Văn An',phoneNumber:'0912345678',state:'TP. Hồ Chí Minh',city:'Quận 1',streetAddress:'12 Nguyễn Huệ',isDefault:true}]});
      if(url.endsWith('/orders/web')) return Response.json({message:'Bản xem thử không tạo đơn hàng.'},{status:400});
      return Response.json([]);
    };
  </script>`;
  const review = `<!doctype html><html lang="vi"><meta charset="utf-8"><title>Kiểm tra giao diện Net Store</title><style>body{margin:0;background:#ece9e2;font:14px system-ui}header{padding:10px;display:flex;gap:12px;align-items:center}button{padding:10px 20px}#frame{display:block;border:0;transform-origin:top left;margin:auto;background:white}#stage{margin:auto;overflow:hidden}</style><header><strong>Kiểm tra bản build · Dữ liệu mẫu</strong><button onclick="resize(1280)">1280px</button><button onclick="resize(768)">768px</button><button onclick="resize(390)">390px</button></header><div id="stage"><iframe id="frame" title="Net Store — bản kiểm tra" src="/shop"></iframe></div><script>let width=1280;function resize(value){width=value;const scale=Math.min(1,(innerWidth-20)/width);const frame=document.getElementById('frame');frame.style.width=width+'px';frame.style.height='1000px';frame.style.transform='scale('+scale+')';const stage=document.getElementById('stage');stage.style.width=width*scale+'px';stage.style.height=1000*scale+'px';}addEventListener('resize',()=>resize(width));resize(width);</script></html>`;
  http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (pathname === "/review") { response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); response.end(review); return; }
    const file = path.resolve(dist, "." + pathname);
    if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(fs.readFileSync(path.join(dist, "index.html"), "utf8").replace('<head>', '<head>' + fixture)); return;
    }
    response.writeHead(200, { "Content-Type": ({ ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" })[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(response);
  }).listen(4174, "127.0.0.1", () => process.stdout.write("UI preview: http://127.0.0.1:4174/review\n"));
}
start().catch(error => { process.stderr.write(error.message); process.exitCode = 1; });
