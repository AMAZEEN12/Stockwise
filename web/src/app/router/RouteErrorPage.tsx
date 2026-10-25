import { Link, useRevalidator } from 'react-router';
import { Button } from '../../components/ui/button';
export function RouteErrorPage({ notFound = false }: { notFound?: boolean }) {
  const revalidator = useRevalidator();
  return <main className="session-page"><h1>{notFound ? 'Page not found' : 'Your shop could not be loaded'}</h1><p>{notFound ? 'Return home to continue.' : 'Check your connection and try again.'}</p><div className="flex gap-4 items-center"><Link to="/">Home</Link>{!notFound && <Button size="lg" onClick={() => void revalidator.revalidate()} loading={revalidator.state === 'loading'}>Try again</Button>}</div></main>;
}
