export function getProductImage(product, extension = 'jpg') {
  if (product?.image && !String(product.image).includes('placeholder-product.svg')) return product.image;
  const id = encodeURIComponent(String(product?.id || ''));
  return id ? `/images/products/${id}.${extension}` : '/placeholder-product.svg';
}

export function imageWithFallback(product, extension = 'jpg') {
  return getProductImage(product, extension);
}
