import { resolveProvider } from '@/lib/providers/registry';

async function main() {
  const fixtureId = 1388524;
  const provider = resolveProvider('api-football').provider;
  const odds = await provider.getOdds(fixtureId);
  const item: any = odds.response?.[0];
  if (!item) {
    console.log('No odds item');
    return;
  }
  console.log('bookmakers', item.bookmakers?.length ?? 0);
  for (const b of (item.bookmakers ?? []).slice(0, 6)) {
    console.log(`\nBook: ${b.name} (${b.id})`);
    for (const bet of b.bets ?? []) {
      const n = String(bet.name || '');
      const low = n.toLowerCase();
      if (low.includes('score') || low.includes('assist')) {
        const vals = (bet.values ?? []).slice(0, 8).map((v: any) => `${v.value}:${v.odd}`).join(' | ');
        console.log(`  ${bet.name} -> ${vals}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
