import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { Header } from '../components/Header';
import { Card } from '../components/Card';

/** Placeholder. Real My Calls lands in task #9. */
export default function MyCalls() {
  const navigate = useNavigate();
  return (
    <PageShell header={<Header onBack={() => navigate('/')} centerLabel="My calls" />}>
      <Card>
        <div className="sp-display-md" style={{ fontSize: '20px' }}>
          Open positions land in task #9
        </div>
        <div className="sp-secondary" style={{ marginTop: '8px', fontSize: '14px' }}>
          Filtered to your World Cup positions via the SDK's PositionTable, restyled to match.
        </div>
      </Card>
    </PageShell>
  );
}
