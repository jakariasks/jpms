import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <main className="fatal">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The page may have moved or the address may be incorrect.</p>
      <Link className="btn btn-primary" to="/">
        Back to overview
      </Link>
    </main>
  );
}
