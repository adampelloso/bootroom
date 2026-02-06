#!/usr/bin/env python3
"""Quick test of odds loading and normalization."""

from model_data.odds_loader import load_odds_api_snapshot, aggregate_market_prices
from model_data.odds_utils import decimal_to_prob, remove_vig_three_way

prices = load_odds_api_snapshot("data/odds/epl/upcoming_20260205.json")
match_id = "4ae3a1134fb1d10167c21bf10dff498f"
match_prices = [p for p in prices if p.match_id == match_id]

print(f"Loaded {len(match_prices)} market prices for match {match_id}")

home = aggregate_market_prices(match_prices, "1X2", "H")
draw = aggregate_market_prices(match_prices, "1X2", "D")
away = aggregate_market_prices(match_prices, "1X2", "A")

print(f"Median prices: H={home:.2f}, D={draw:.2f}, A={away:.2f}")

if home and draw and away:
    probs = remove_vig_three_way(
        decimal_to_prob(home), decimal_to_prob(draw), decimal_to_prob(away)
    )
    print(f"Vig-removed probs: H={probs['H']:.1%}, D={probs['D']:.1%}, A={probs['A']:.1%}")

# Check totals
ou_25_over = aggregate_market_prices(match_prices, "OU_2.5", "Over")
ou_25_under = aggregate_market_prices(match_prices, "OU_2.5", "Under")

if ou_25_over and ou_25_under:
    p_over = decimal_to_prob(ou_25_over)
    p_under = decimal_to_prob(ou_25_under)
    total = p_over + p_under
    if total > 0:
        print(f"\nO2.5 market (median):")
        print(f"  Over: {p_over/total:.1%}, Under: {p_under/total:.1%}")
