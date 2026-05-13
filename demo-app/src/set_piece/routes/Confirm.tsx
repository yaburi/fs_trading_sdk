import { useNavigate, useParams } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';

/** Placeholder. Real confirm + auth gate lands in task #8. */
export default function Confirm() {
  const navigate = useNavigate();
  const { marketId: _marketId } = useParams<{ marketId: string }>();

  return (
    <PageShell header={<Header onBack={() => navigate(-1)} centerLabel="Confirm" />}>
      <Card>
        <div className="sp-display-md" style={{ fontSize: '20px' }}>
          Confirm + auth gate lands in task #8
        </div>
        <div className="sp-secondary" style={{ marginTop: '8px', fontSize: '14px' }}>
          When not logged in, the CTA reads <strong>Sign in to kick</strong> and opens a passwordless auth sheet. After auth, the buy retries automatically.
        </div>
      </Card>

      <Pill variant="primary" size="lg" fullWidth onClick={() => navigate('/calls')}>
        Sign in to kick
      </Pill>
    </PageShell>
  );
}
