import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

const NotFoundPage = () => (
  <div className="not-found-page">
    <div className="not-found-mark"><Compass size={34} /></div>
    <span className="eyebrow">404 / LOST IN THE SIGNAL</span>
    <h1>That page is off the record.</h1>
    <p>We couldn’t find what you were looking for. Head back to discover something new.</p>
    <Link to="/" className="btn btn-primary">Back to Home</Link>
  </div>
);

export default NotFoundPage;
