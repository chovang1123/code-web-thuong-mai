const demoShops = [
  { name: "Nhà Mây Handmade", location: "Hà Nội" },
  { name: "Góc Nhỏ Official", location: "TP. Hồ Chí Minh" },
  { name: "Urban Living", location: "Đà Nẵng" },
  { name: "Net Select", location: "Việt Nam" },
];

const replaceNetBrand = (value) =>
  typeof value === "string" ? value.replace(/n\u00e9t/gi, "Net") : value;

export const withSellerDetails = (product, index) => {
  const shop = demoShops[index % demoShops.length];
  return {
    ...product,
    name: replaceNetBrand(product.name),
    description: replaceNetBrand(product.description),
    category: replaceNetBrand(product.category),
    brand: replaceNetBrand(product.brand || "Net Select"),
    sellerName: replaceNetBrand(product.sellerName || shop.name),
    sellerLocation: replaceNetBrand(product.sellerLocation || shop.location),
  };
};
