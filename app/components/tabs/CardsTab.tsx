import type { RollingStats } from "@/lib/insights/team-stats";
import { ThresholdHitRates } from "@/app/components/ThresholdHitRates";
import type { ThresholdRow } from "@/app/components/ThresholdHitRates";

type Props = {
  homeTeamName: string;
  awayTeamName: string;
  homeStats: RollingStats | null;
  awayStats: RollingStats | null;
  cardThresholds: ThresholdRow[];
  referee?: string;
};

export function CardsTab({
  homeTeamName,
  awayTeamName,
  homeStats,
  awayStats,
  cardThresholds,
  referee,
}: Props) {
  const homeBookingPts = homeStats ? homeStats.yellowCards * 10 + homeStats.redCards * 25 : 0;
  const awayBookingPts = awayStats ? awayStats.yellowCards * 10 + awayStats.redCards * 25 : 0;
  const expectedTotalCards = (homeStats ? homeStats.yellowCards + homeStats.redCards : 0) +
    (awayStats ? awayStats.yellowCards + awayStats.redCards : 0);

  return (
    <div className="space-y-0">
      {/* Discipline snapshot */}
      <section
        className="px-5 py-4 panel-card"
        style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}
      >
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Discipline snapshot</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">Expected cards</span>
            <span className="text-hero-metric">{expectedTotalCards.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">Avg booking pts</span>
            <span className="text-sans text-[20px] font-bold" style={{ fontFeatureSettings: '"tnum"' }}>
              {((homeBookingPts + awayBookingPts) / 2).toFixed(0)}
            </span>
          </div>
          {referee && (
            <div className="col-span-2">
              <span className="text-mono text-[10px] uppercase text-tertiary block mb-1">Referee</span>
              <span className="text-[14px] font-semibold" style={{ color: "var(--text-main)" }}>{referee}</span>
            </div>
          )}
        </div>
      </section>

      <div className="detail-grid">
        {/* Left: team card history */}
        <div className="space-y-0">
          <section className="px-5 py-4 border-t border-[var(--border-light)]" style={{ paddingLeft: "var(--space-md)", paddingRight: "var(--space-md)" }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] mb-3">Team card history (L10 avg)</h2>
            <div className="grid grid-cols-2 gap-4">
              {homeStats && (
                <div>
                  <p className="text-mono text-[10px] uppercase text-tertiary mb-2">
                    {homeTeamName.slice(0, 3).toUpperCase()}
                  </p>
                  <div className="space-y-1 text-[12px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-tertiary">Yellows</span>
                      <span className="text-[var(--text-main)]">{homeStats.yellowCards.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tertiary">Reds</span>
                      <span className="text-[var(--text-main)]">{homeStats.redCards.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tertiary">Fouls</span>
                      <span className="text-[var(--text-main)]">{homeStats.fouls.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tertiary">Booking pts</span>
                      <span className="text-[var(--text-main)] font-semibold">{homeBookingPts.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              )}
              {awayStats && (
                <div>
                  <p className="text-mono text-[10px] uppercase text-tertiary mb-2">
                    {awayTeamName.slice(0, 3).toUpperCase()}
                  </p>
                  <div className="space-y-1 text-[12px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-tertiary">Yellows</span>
                      <span className="text-[var(--text-main)]">{awayStats.yellowCards.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tertiary">Reds</span>
                      <span className="text-[var(--text-main)]">{awayStats.redCards.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tertiary">Fouls</span>
                      <span className="text-[var(--text-main)]">{awayStats.fouls.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-tertiary">Booking pts</span>
                      <span className="text-[var(--text-main)] font-semibold">{awayBookingPts.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right: thresholds */}
        <div>
          {cardThresholds.length > 0 && (
            <ThresholdHitRates title="Card thresholds" thresholds={cardThresholds} />
          )}
        </div>
      </div>
    </div>
  );
}
