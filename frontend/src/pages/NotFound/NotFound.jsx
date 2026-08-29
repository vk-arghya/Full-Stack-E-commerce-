import { Link } from 'react-router-dom';
export default function NotFound(){return <section className="container-app py-24 text-center"><h1 className="text-7xl font-black">404</h1><p className="mt-3 text-stone-600">This page went looking for a pickle and got lost.</p><Link className="btn-primary mt-7 inline-block" to="/">Back Home</Link></section>}
