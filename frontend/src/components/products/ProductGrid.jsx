import ProductCard from './ProductCard';

export default function ProductGrid({ products = [], className = '' }) {
  return (
    <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
