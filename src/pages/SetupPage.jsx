import { ShieldCheck } from 'lucide-react';
import { configErrors } from '../lib/supabase';
export default function SetupPage() {
  return (
    <main className="fatal">
      <div className="brand !p-0 !mb-8">
        <span className="brand-mark">J</span>JPMS
      </div>
      <h1>Connect your personal workspace</h1>
      <p>Follow README.md in the project folder to connect your Supabase backend.</p>
      {!!configErrors.length && (
        <div className="alert-error my-5" role="alert">
          <ul className="list-disc pl-5 space-y-2">
            {configErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      <ol className="list-decimal pl-6 space-y-4">
        <li>
          For a new project, run <code>supabase/migrations/001_jpms.sql</code> once in SQL Editor.
          If JPMS is already set up, keep the existing database.
        </li>
        <li>
          Copy <code>.env.example</code> to <code>.env</code>.
        </li>
        <li>
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>. Set{' '}
          <code>VITE_APP_URL</code> to your deployed website origin.
        </li>
        <li>
          Restart with <code>npm run dev</code>, or rebuild your Vercel deployment.
        </li>
      </ol>
      <div className="notice mt-8 flex items-start gap-3">
        <ShieldCheck size={20} />
        <span>
          Use your public publishable or anon key. Never put service-role keys, secret keys or
          database passwords in the frontend.
        </span>
      </div>
    </main>
  );
}
