import { useNavigate } from 'react-router-dom';
import { useMarkets } from '@functionspace/react';
import { PageShell } from '../components/PageShell';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { MarketRow } from '../components/MarketRow';
import { IntroSheet } from '../components/IntroSheet';

export default function MarketList() {
  const navigate = useNavigate();
  const { markets, loading, error, refetch } = useMarkets({
    categories: ['World Cup'],
    state: 'open',
    sortBy: 'totalVolume',
    sortOrder: 'desc',
  });

  return (
    <PageShell header={<Header />}>
      <IntroSheet />
      <div>
        <h1
          className="sp-display"
          style={{
            fontSize: '34px',
            margin: 0,
            marginBottom: '8px',
            letterSpacing: '-0.03em',
          }}
        >
          Predict the World Cup,
          <br />
          one free kick at a time.
        </h1>
        <p
          className="sp-secondary"
          style={{
            fontSize: '15px',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Pick a market. Aim, time, kick. Each kick shapes your prediction. The crowd is the goalkeeper.
        </p>
      </div>

      {loading && <SkeletonList />}

      {error && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="sp-display-md" style={{ fontSize: '18px' }}>
              Couldn't load markets
            </div>
            <div className="sp-secondary" style={{ fontSize: '14px' }}>
              {error.message}
            </div>
            <button
              onClick={() => refetch()}
              style={{
                marginTop: '8px',
                alignSelf: 'flex-start',
                padding: '8px 16px',
                borderRadius: '999px',
                background: 'var(--sp-primary)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Try again
            </button>
          </div>
        </Card>
      )}

      {!loading && !error && markets.length === 0 && (
        <Card>
          <div className="sp-display-md" style={{ fontSize: '18px', marginBottom: '4px' }}>
            No World Cup markets right now
          </div>
          <div className="sp-secondary" style={{ fontSize: '14px' }}>
            Check back closer to kickoff.
          </div>
        </Card>
      )}

      {!loading && !error && markets.length > 0 && (
        <>
          <div
            className="sp-uppercase sp-secondary"
            style={{ marginTop: '8px', marginBottom: '-8px' }}
          >
            {markets.length} {markets.length === 1 ? 'market' : 'markets'} open
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {markets.map((market) => (
              <MarketRow
                key={market.marketId}
                market={market}
                onClick={() => navigate(`/m/${market.marketId}/stake`)}
              />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <div
            style={{
              height: '14px',
              width: '70%',
              background: 'var(--sp-surface-2)',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          />
          <div
            style={{
              height: '14px',
              width: '45%',
              background: 'var(--sp-surface-2)',
              borderRadius: '4px',
              marginBottom: '14px',
            }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <div
              style={{
                height: '18px',
                width: '60px',
                background: 'var(--sp-surface-2)',
                borderRadius: '999px',
              }}
            />
            <div
              style={{
                height: '18px',
                width: '70px',
                background: 'var(--sp-surface-2)',
                borderRadius: '999px',
              }}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
