// Only suppress the known demo URLs. Uploaded replacement images remain intact.
export const imageCorrections = [
  { name: "Sổ kế hoạch 2026", photo: "photo-1499951360447-b19be8fe80f5", reason: "Ảnh bàn máy tính/laptop thay cho sổ kế hoạch." },
  { name: "Bộ chăm sóc da Daily", photo: "photo-1556228578-8c89e6adf883", reason: "Ảnh không khớp bộ sản phẩm theo đối chiếu của người dùng." },
  { name: "Bộ chăm sóc tóc Silk", photo: "photo-1522337360788-8b13dee7a37e", reason: "Ảnh dịch vụ làm tóc thay cho bộ sản phẩm chăm sóc tóc." },
  { name: "Túi mỹ phẩm Travel", photo: "photo-1596462502278-27bfdc403348", reason: "Ảnh mỹ phẩm thay cho túi đựng mỹ phẩm." },
  { name: "Khay đựng bút Desk", photo: "photo-1517842645767-c639042777db", reason: "Ảnh sổ ghi chép thay cho khay đựng bút." },
];

export function getProductImage(product) {
  const source = product?.images?.[0] || "";
  const correction = imageCorrections.find(item => item.name === product?.name && source.includes(item.photo));
  return correction ? "" : source;
}
